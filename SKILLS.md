# SKILLS.md

Repository skill catalog for contributors and coding agents.

## Skill: `qti-editor-architecture-onboarding`

**Display name:** QTI Architecture Onboarding  
**Short description:** Map ownership and safe change paths  
**Default prompt:** "Use $qti-editor-architecture-onboarding to map impacted packages, contracts, and verification steps for this qti-editor change."  
**Implicit invocation:** allowed

### Purpose
Provide decision-oriented architectural guidance for this repository before implementation.

### When To Use
Use this skill when a request involves:
- Project architecture overview.
- Ownership questions (which package/file should change).
- Adding or modifying plugins, panels, events, or serialization outputs.
- Planning implementation and validation strategy across packages.

### Required Workflow
1. Read `docs/architecture.md` first.
2. Identify impacted package(s) and integration points.
3. Read only relevant source files for the requested feature.
4. Return guidance with:
   - Ownership decision (where change belongs).
   - Interface/type/event impacts.
   - Ordered implementation steps.
   - Verification commands (narrow to broad).

### Output Contract
For each request, provide:
- Affected files/packages.
- Existing contract(s) that must be preserved.
- Required additions/changes to types and events.
- Validation steps and expected outcomes.
- Explicit risks or assumptions.

### Boundaries
- Do not propose moving domain logic into app wiring unless required.
- Do not silently introduce breaking event contract changes.
- Do not mutate files unless explicitly requested.

### Practical Prompt Examples
- "Use $qti-editor-architecture-onboarding to summarize this repo architecture for a new contributor."
- "Use $qti-editor-architecture-onboarding to decide where XML export logic should live."
- "Use $qti-editor-architecture-onboarding to plan adding a new panel mode safely."

---

## Local Override Workflow (No Skill)
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
