---
name: qti-editor-architecture-onboarding
description: Use this skill when users ask for architecture summaries, package ownership decisions, or safe implementation paths for plugin, panel, event, and serialization changes in qti-editor.
---

# QTI Editor Architecture Onboarding

## Purpose
Provide decision-oriented architectural guidance for this repository before implementation.

## When To Use
Use this skill when a request involves:
- Project architecture overview.
- Ownership questions (which package/file should change).
- Adding or modifying plugins, panels, events, or serialization outputs.
- Planning implementation and validation strategy across packages.

## Required Workflow
1. Read `docs/architecture.md` first.
2. Identify impacted package(s) and integration points.
3. Read only relevant source files for the requested feature.
4. Return guidance with:
   - Ownership decision (where change belongs).
   - Interface/type/event impacts.
   - Ordered implementation steps.
   - Verification commands (narrow to broad).

## Output Contract
For each request, provide:
- Affected files/packages.
- Existing contract(s) that must be preserved.
- Required additions/changes to types and events.
- Validation steps and expected outcomes.
- Explicit risks or assumptions.

## Boundaries
- Do not propose moving domain logic into app wiring unless required.
- Do not silently introduce breaking event contract changes.
- Do not mutate files unless explicitly requested.

## Practical Prompt Examples
- "Use $qti-editor-architecture-onboarding to summarize this repo architecture for a new contributor."
- "Use $qti-editor-architecture-onboarding to decide where XML export logic should live."
- "Use $qti-editor-architecture-onboarding to plan adding a new panel mode safely."
