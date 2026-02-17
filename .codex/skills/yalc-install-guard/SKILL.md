---
name: yalc-install-guard
description: Keep yalc-linked @qti-components packages consistent after pnpm install by running the repository yalc sync workflow.
---

# Yalc Install Guard

## Purpose
Prevent `pnpm install` from breaking local yalc links used by this repository.

## When To Use
Use this skill when:
- Running `pnpm install` (or `pnpm i`).
- Dependencies were reinstalled and yalc links disappeared.
- Builds fail with unresolved `@qti-components/*` imports after install.

## Required Workflow
1. Ensure root scripts include:
   - `yalc:add` for root package links.
   - `yalc` as recursive workspace sync (`pnpm -r --if-present yalc:add`).
   - `postinstall` that runs `pnpm yalc`.
2. Ensure workspace packages that need yalc links expose a `yalc:add` script.
3. After dependency changes, run:
   - `pnpm install`
   - `pnpm --filter @qti-editor/app build`

## Verification
- Confirm `apps/editor/node_modules/@qti-components/*` links exist.
- Confirm root `node_modules/@qti-components/*` links exist.
- Confirm app build succeeds.

## Boundaries
- Do not remove existing yalc dependency declarations without explicit request.
- Keep the hook non-destructive and idempotent.
