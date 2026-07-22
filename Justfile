# QTI-Editor task menu.  Run `just` (no args) to see this list.
# One-time install:  brew install just
#
# Recipes wrap the pnpm scripts so there is a single source of truth and CI
# keeps calling `pnpm run …` directly. You stop reading package.json; you read this.

# Show this menu
default:
	@just --list --unsorted

# Start the editor dev server (qti-prosemirror-item) with HMR
[group('primary')]
dev:
	pnpm run dev:prosemirror-item

# Run the test suite. Extra args pass through to vitest: `just test qti-gap`, `just test --project browser`
[group('primary')]
test *args:
	pnpm run test {{args}}

# Same, but re-runs on change: `just test-watch qti-gap`
[group('primary')]
test-watch *args:
	pnpm run test:watch {{args}}

# Linked dev: yalc-couple local qti-components + run its build→yalc:push watcher alongside the qti-prosemirror-item app (HMR / full refresh on push)
[group('primary')]
yalc:
	pnpm run dev:linked

# Undo the yalc coupling: retreat local links, drop the root .yalc pnpm overrides, reinstall from the registry (keeps .yalc/ + yalc.lock for a fast `just yalc`)
[group('primary')]
unyalc:
	pnpm run yalc:remove-all
	pnpm install

# Full teardown: unyalc plus removal of every .yalc directory and yalc.lock
[group('primary')]
unyalc-hard: unyalc
	find . -name yalc.lock -not -path '*/node_modules/*' -delete
	find . -type d -name .yalc -not -path '*/node_modules/*' -prune -exec rm -rf {} +
