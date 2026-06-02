# AGENTS.md

## Scope And Precedence
- This file defines repository-wide defaults for contributors and coding agents.
- A package-level `AGENTS.md` may add stricter rules for that package.
- Package-level rules must not weaken core safety, quality, and verification requirements in this root file.

## Repository Map
- App entrypoint: `apps/editor/src/main.ts`
- App package: `apps/editor/`
- Plugin packages: `packages/plugin-*`
- ProseMirror utility plugins: `packages/prosemirror-*`
- UI component registry: `packages/ui/` (see Registry Pattern below)
- Canonical architecture reference: `docs/architecture.md`
- Skill catalog and definitions: `SKILLS.md`

## Canonical Commands
- Install dependencies: `pnpm install`
- Start app dev server: `pnpm dev`
- Build all packages and app: `pnpm build`
- Build all workspace packages only: `pnpm -r --filter "./packages/**" run build`
- Run app only (dev/build/preview):
  - `pnpm --filter @qti-editor/app dev`
  - `pnpm --filter @qti-editor/app build`
  - `pnpm --filter @qti-editor/app preview`
- Lint check (non-mutating default): `pnpm lint:check`

## Coding Defaults
- Keep package boundaries explicit and clean.
- Add or change shared types at plugin boundaries first.
- Preserve event contracts (event names + payload shape) unless a deliberate breaking change is requested.
- Keep app integration decisions in `apps/editor/src/main.ts`; keep domain logic in package modules.
- Make focused changes and avoid opportunistic refactors unless requested.
- Keep the base interaction rendering as close as possible to the actual runtime interaction.
- Put editor-only affordances in popovers or similar edit-mode UI that appears only while the interaction is being edited.

## Registry Pattern
- **What it is**: A shadcn-style component registry in `packages/ui/` for distributing reusable UI components to external consumers.
- **Monorepo usage**: Within this monorepo, apps import directly from `@qti-editor/ui/components/*` as normal package imports. This avoids duplication and keeps development simple.
- **External consumer usage**: External apps use the registry pattern - they copy components and own their local versions.
- **Why separate patterns**:
  - **Monorepo apps**: Import directly for easier maintenance, shared improvements, and reduced duplication
  - **External apps**: Copy components for customization without affecting others or creating breaking changes
- **Registry structure**:
  - `packages/ui/registry.json` - Component metadata and file paths for registry distribution
  - `packages/ui/package.json` exports - Module paths for each component
  - `packages/ui/src/index.ts` - Named exports for type references
  - `packages/ui/src/components/` - Flattened component source (all components at top level)
- **Monorepo app imports**:
  - Import directly: `import '@qti-editor/ui/components/attributes-panel'`
  - No local copies needed - apps share the canonical source
  - Custom components (like custom slash menus) live in app-specific directories
- **Registry distribution**: Run `pnpm --filter @qti-editor/ui registry:build` to generate distribution files for external consumers

## Component File Organization
- **Folder-File matching pattern**: Component files must match their folder names for easy discoverability.
  - Pattern: `folder-name/folder-name.{ts,js}` + `folder-name/index.{ts,js}`
  - Example: `attributes-panel/attributes-panel.ts` + `attributes-panel/index.ts`
  - The index file imports then re-exports: `import './attributes-panel.js'; export * from './attributes-panel.js';`
  - **Why import before export**: Ensures `@customElement` decorators are executed to register custom elements
  - Additional supporting files (like `patch-event.ts`) can exist alongside
- **Applies to**:
  - Registry: `packages/ui/src/components/*/`
  - App custom components: `apps/*/src/components/blocks/*/` (for app-specific customizations)
- **Why**: Makes it easy to find the main component file - it always matches the folder name. Index files provide convenient re-exports for consumers.

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

## Lossless QTI Roundtrip Packages
- `@qti-editor/qti-roundtrip-export` and `@qti-editor/qti-roundtrip-import` (under `packages/qti/roundtrip-{export,import}/`) form a **paired, self-roundtrip** for the editor's own save/load — they are **NOT** a generic QTI 3.0 import/export.
- Export writes ProseMirror authoring attributes (e.g. `correct-response`, `score`, `case-sensitive`, `area-mappings`) onto QTI interaction tags as `data-*` mirrors. Import strips `qti-response-declaration` and `qti-response-processing` and rehydrates ProseMirror attrs from those `data-*` mirrors.
- **Rules:**
  - Do not refactor the importer to read `qti-response-declaration` / `qti-response-processing` as a source of authoring state. They are intentionally ignored.
  - Any new `data-*` mapping must be added to BOTH packages in the same commit, with a row in the contract table in `packages/qti/roundtrip-export/ROUNDTRIP.md` and a passing roundtrip test.
  - Do not rename or repurpose these packages for third-party QTI import — the names `@qti-editor/qti-export` / `qti-import` are reserved for a separate future generic implementation.
- See `packages/qti/roundtrip-export/ROUNDTRIP.md` for the full contract.

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
