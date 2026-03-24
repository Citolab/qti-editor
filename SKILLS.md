# SKILLS.md

Repository skill catalog for contributors and coding agents.

## Skill Location
- Installable skills are stored in `.codex/skills/`.
- Each skill must include a `SKILL.md` with YAML frontmatter (`name`, `description`).

## Skill Catalog

### Skill: `qti-editor-architecture-onboarding`
- Path: `.codex/skills/qti-editor-architecture-onboarding/SKILL.md`
- Use when:
  - You need a project architecture summary.
  - You need to decide where a change belongs.
  - You need to add a plugin/panel/event safely.
- Typical trigger phrases:
  - "summarize architecture"
  - "where should this change live"
  - "add plugin/panel/event safely"
- Inputs:
  - Target package or feature area.
- Expected outputs:
  - Impacted files and package boundaries.
  - Relevant contracts/types/events.
  - Recommended implementation path.
  - Verification commands.
- Boundaries:
  - Must not mutate source code unless explicitly asked.
  - Must start from `docs/architecture.md` as canonical context.

### Local Override Workflow (No Skill)
- This repository currently uses local pnpm override automation instead of a dedicated `yalc` skill.
- Use when:
  - You need local `@qti-components/*` overrides without changing committed `package.json` / lockfile.
  - You need to pin local overrides to a Git SHA and convert them to local tarballs.
- Relevant files:
  - `.pnpmfile.cjs`
  - `pnpm-local-overrides.json` (local, gitignored)
  - `scripts/qti-local-overrides-sync.mjs`
- Commands:
  - `pnpm run qti-overrides:status`
  - `pnpm run qti-overrides:sync`
  - `pnpm run qti-overrides:install`

## Planned Future Skills (Reserved)
- `workspace-build-test-runner`: standard build/lint/test command workflows.
- `panel-event-contract-changes`: safe contract evolution across plugins/panels.
- `qti-serialization-export`: JSON/HTML/XML serialization and export responsibilities.
