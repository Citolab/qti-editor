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

### Skill: `yalc-install-guard`
- Path: `.codex/skills/yalc-install-guard/SKILL.md`
- Use when:
  - Running `pnpm install` / `pnpm i`.
  - Yalc links are missing after reinstall.
  - Builds fail on unresolved `@qti-components/*` imports.
- Expected outputs:
  - Root/app/package `yalc:add` scripts are present.
  - Root `postinstall` triggers yalc sync.
  - Verification commands and build status.

## Planned Future Skills (Reserved)
- `workspace-build-test-runner`: standard build/lint/test command workflows.
- `panel-event-contract-changes`: safe contract evolution across plugins/panels.
- `qti-serialization-export`: JSON/HTML/XML serialization and export responsibilities.
