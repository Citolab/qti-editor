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
- Canonical architecture reference: `docs/architecture.md`
- Skill catalog and definitions: `SKILLS.md`, `.codex/skills/`

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

## Architecture Source Of Truth
- Use `docs/architecture.md` as the canonical architecture reference.
- Keep AGENTS and SKILLS guidance aligned with that document.

## Handoff Protocol
- Summarize what changed and why.
- Include exact file references.
- Report validation performed and any skipped checks.
- List concrete next steps when follow-up is expected.
