# AGENTS.md

## Scope And Precedence
- This file defines repository-wide defaults for contributors and coding agents.
- A package-level `AGENTS.md` may add stricter rules for that package.
- Package-level rules must not weaken core safety, quality, and verification requirements in this root file.

## Repository Map
- App entrypoint: `apps/qti-prosekit-app/src/main.tsx`
- App package: `apps/qti-prosekit-app/`
- Example apps: `apps/qti-prosekit-item/` (minimal ProseKit), `apps/qti-prosemirror-item/` (minimal pure-ProseMirror)
- Docs site app: `apps/site/` (Astro). Its rendered content lives in `apps/site/src/content/docs/` — this is what docs-sync automation updates, and it is distinct from the `docs/` folder below.
- QTI and editor packages: `packages/prose-qti/`, `packages/prose-extensions/`
- UI component registry: `packages/prose-qti-ui/` (see Registry Pattern below)
- AI extensions package: `packages/prose-ai/` (private, vendored from `@prosekit/ai`)
- Canonical architecture reference: `docs/architecture.md`. Also see `docs/cookbook.md` (editor-building patterns) and `docs/syncing-with-qti-components.md` (local qti-components dependency workflow).
- Skill catalog and definitions: `SKILLS.md`

## Canonical Commands
- Install dependencies: `pnpm install`
- Start app dev server: `pnpm dev`
- Build all packages and app: `pnpm build`
- Build all workspace packages only: `pnpm -r --filter "./packages/**" run build`
- Run app only (dev/build/preview):
  - `pnpm --filter @qti-editor/prosekit-app dev`
  - `pnpm --filter @qti-editor/prosekit-app build`
  - `pnpm --filter @qti-editor/prosekit-app preview`
- Lint check (non-mutating default): `pnpm lint:check`

## Coding Defaults
- Keep package boundaries explicit and clean.
- Add or change shared types at plugin boundaries first.
- Preserve event contracts (event names + payload shape) unless a deliberate breaking change is requested.
- Keep app integration decisions in `apps/qti-prosekit-app/src/` composition files (`main.tsx`, `App.tsx`, `editor.tsx`, and extension wiring); keep domain logic in package modules.
- Make focused changes and avoid opportunistic refactors unless requested.
- Keep the base interaction rendering as close as possible to the actual runtime interaction.
- Put editor-only affordances in popovers or similar edit-mode UI that appears only while the interaction is being edited.
- When rendering QTI interactions, load `@qti-components/theme/item.css` for the upstream item theme. Load `@citolab/prose-qti/core-css.css` after it when editor-specific overrides are needed.

## Registry Pattern
- **What it is**: A shadcn-style component registry in `packages/prose-qti-ui/` for distributing reusable UI components to external consumers.
- **Monorepo usage**: Within this monorepo, apps import directly from `@citolab/prose-qti-ui/components/*` as normal package imports. This avoids duplication and keeps development simple.
- **External consumer usage**: External apps use the registry pattern - they copy components and own their local versions.
- **Why separate patterns**:
  - **Monorepo apps**: Import directly for easier maintenance, shared improvements, and reduced duplication
  - **External apps**: Copy components for customization without affecting others or creating breaking changes
- **Registry structure**:
  - `packages/prose-qti-ui/registry.json` - Component metadata and file paths for registry distribution
  - `packages/prose-qti-ui/package.json` exports - Module paths for each component
  - `packages/prose-qti-ui/src/index.ts` - Named exports for type references
  - `packages/prose-qti-ui/src/components/` - Flattened component source (all components at top level)
- **Monorepo app imports**:
  - Import directly: `import '@citolab/prose-qti-ui/components/attributes-panel'`
  - No local copies needed - apps share the canonical source
  - Custom components (like custom slash menus) live in app-specific directories
- **Registry distribution**: Run `pnpm --filter @citolab/prose-qti-ui registry:build` to generate distribution files for external consumers

## Component File Organization
- **Folder-File matching pattern**: Component files must match their folder names for easy discoverability.
  - Pattern: `folder-name/folder-name.{ts,js}` + `folder-name/index.{ts,js}`
  - Example: `attributes-panel/attributes-panel.ts` + `attributes-panel/index.ts`
  - The index file imports then re-exports: `import './attributes-panel.js'; export * from './attributes-panel.js';`
  - **Why import before export**: Ensures `@customElement` decorators are executed to register custom elements
  - Additional supporting files (like `patch-event.ts`) can exist alongside
- **Applies to**:
  - Registry: `packages/prose-qti-ui/src/components/*/`
  - App custom components: `apps/*/src/components/blocks/*/` (for app-specific customizations)
- **Why**: Makes it easy to find the main component file - it always matches the folder name. Index files provide convenient re-exports for consumers.

## Testing Architecture
- **Stories render. Tests interact.** `apps/e2e/stories/*.stories.ts` exist only to build a schema, mount an editor, and expose the import/export pipeline. They must contain **no interaction logic and no `play` functions**. All interaction lives in the sibling `*.browser.test.ts`.
- **Drive the UI with real Playwright events, never synthetic ones.** Use vitest browser-mode `page` locators and `userEvent` (CDP-backed, trusted events). Do **not** use `element.click()`, `dispatchEvent(new MouseEvent(...))`, or any hand-built event.
  - **Why**: ProseMirror reads selection and composition state that only trusted events produce. Synthetic events appear to work, then silently diverge from real editing behaviour.
- **Querying**: pierce shadow DOM with `shadow-dom-testing-library` (`*ByShadowText`, `*ByShadowLabelText`). Prefer text/label queries over CSS. Do not drill through `.shadowRoot.querySelector('[part="…"]')` in tests — `part` is a styling contract, not a test contract.
  - Role queries (`getByRole`) work only where a component renders a **native** control (e.g. `qti-text-entry-interaction` renders a real `<input>` → implicit `textbox`). Custom-element controls currently expose no roles; see `docs/testing-findings.md`.
- **Runtime (scoring) assertions** run against the frozen `__file_snapshots__/*.xml` inside the iframe harness (`apps/e2e/stories/runtime-harness.ts`), reached with `page.frameLocator(...)`. Assert **both** a correct and an incorrect response so scoring is pinned in both directions.
- **Test file placement**: `*.browser.test.ts`, colocated. The `browser` vitest project globs `packages/**/src/**/*.browser.test.ts` and `apps/**/*.browser.test.ts`.
- Record any product bug or upstream gap found while writing tests in `docs/testing-findings.md` rather than silently working around it.

## Story Alignment Requirements
- **Goal**: Keep editor regression stories one-to-one with upstream qti-components stories so rendering and behavior stay aligned.
- **Primary scope**: `apps/e2e/stories/*.regression.stories.ts` in this repo, aligned against corresponding interaction stories and canonical item fixtures in qti-components.
- **Parity unit**: Treat each item as its own alignment unit (for example ITEM001, ITEM002). Complete and verify one item before moving to the next.
- **Story responsibilities**: Editor stories should only build the schema, mount editor/runtime harness, and expose import/export roundtrip. Keep interaction behavior assertions in sibling `*.browser.test.ts` files.
- **Roundtrip requirement**: Use the current roundtrip import/export path used by ITEM001 as the baseline pattern. Do not reintroduce older import/export shortcuts that can drop layout semantics.
- **Layout parity**: Keep max-width and container constraints identical between editor and qti-components stories. Prefer story meta/layout configuration over ad hoc per-story wrappers unless required.
- **Theme parity**: Use qti-components theme CSS as the visual source of truth. Put shared visual corrections upstream first; keep editor-only overrides minimal and explicit.
- **Diff policy**: For each item, compare these dimensions explicitly: fixture XML, story args, view mode behavior, layout meta, and runtime harness wiring.
- **Verification checklist per item**:
  - Story renders in editor Storybook and qti-components Storybook.
  - Roundtrip output preserves expected structure/attributes for that item.
  - Runtime rendering matches upstream interaction behavior for both correct and incorrect response paths where applicable.
  - No new lint/type errors in changed files.
- **Execution order**: Continue in item order unless requested otherwise. Current next target is ITEM002 after ITEM001 parity was confirmed.
- **Change discipline**: While doing story parity work, avoid unrelated HMR/linking workflow changes unless they are direct blockers to item alignment.

## Verification Defaults
- Validate with the narrowest useful command first (changed package).
- Validate app build second when package behavior surfaces in UI.
- Run full package build only when changes span multiple packages or shared contracts.
- Prefer `pnpm lint:check` by default; use auto-fix only when explicitly requested.

## Safety And Review
- Do not use destructive git operations unless explicitly requested.
- Do not revert unrelated working tree changes.
- If unexpected modifications appear during work, stop and ask how to proceed.
- Surface behavioral risks, compatibility concerns, and unverified assumptions in handoff.

## QTI Item Export / Import
- `@citolab/prose-qti/item-export` and `@citolab/prose-qti/package-builder` (under `packages/prose-qti/src/item-export/` and `packages/prose-qti/src/package-builder/`) serialize the editor's ProseMirror tree to **standard QTI 3.0**. `@citolab/prose-qti/qti3-item-import` (under `packages/prose-qti/src/qti3-item-import/`) reads any QTI 3.0 item back — it is a generic importer.
- The packaged QTI is standard: editor authoring state is folded into `qti-response-declaration` / `qti-response-processing`. There are **no `data-*` mirrors** and no editor-origin markers. The editor's own *roundtrip item-body* representation carries authoring attributes (`correct-response`, `score`, `case-sensitive`, `area-mappings`) as **canonical, unprefixed** attributes.
- On import, `roundtripQtiItem` runs idempotent transforms that hoist `correct-response` / `score` from the native declarations onto each interaction as canonical attributes. A generic fallback covers any interaction with a `response-identifier`; per-type transforms add type-specific behaviour. A final `roundtripItemBody` transform copies `identifier` / `title` onto `qti-item-body`.
- **Rules:**
  - The non-QTI attribute set lives in exactly one place — each interaction's `strippedAttributes` in `packages/prose-qti/src/components/*/composer/metadata.ts` — exposed via `getStrippedAttributeSources`.
  - Editor-only hints with no standard-QTI source (`case-sensitive`, `area-mappings`) are only reconstructed if the source item carried them.
- See [Itembody-only QTI subformat](apps/site/src/content/docs/packages/itembody-subformat.mdx) and `docs/architecture.md` for the full model.

## Architecture Source Of Truth
- Use `docs/architecture.md` as the canonical architecture reference.
- Keep AGENTS and SKILLS guidance aligned with that document.

## Handoff Protocol
- Summarize what changed and why.
- Include exact file references.
- Report validation performed and any skipped checks.
- List concrete next steps when follow-up is expected.


<claude-mem-context>
# Memory Context

# claude-mem status

This project has no memory yet. The current session will seed it; subsequent sessions will receive auto-injected context for relevant past work.

Memory injection starts on your second session in a project.

`/learn-codebase` is available if the user wants to front-load the entire repo into memory in a single pass (~5 minutes on a typical repo, optional). Otherwise memory builds passively as work happens.

Live activity: http://localhost:37701
How it works: `/how-it-works`

This message disappears once the first observation lands.
</claude-mem-context>
