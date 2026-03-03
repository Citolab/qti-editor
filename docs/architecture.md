# QTI Editor Architecture

## Purpose
This document is the canonical architecture reference for this repository. Use it to decide where changes belong before writing code.

## System Map
- App shell: `apps/editor/src/main.ts`
- Editor runtime: ProseKit editor created with `createEditor` and composed via `union(...)`
- Plugin packages: `packages/plugin-*`
- ProseMirror utility plugins: `packages/prosemirror-*`

## Extension Composition And Order
The app wires extensions in `apps/editor/src/main.ts` using this order:
1. `defineQtiExtension()` from `packages/plugin-qti-interactions/src/prosekit.ts`
2. `qtiAttributesExtension(...)` from `packages/plugin-qti-attributes/index.ts`
3. `qtiEditorEventsExtension(...)` from `packages/plugin-editor-events/index.ts`
4. `qtiCodePanelExtension(...)` from `packages/plugin-qti-code/index.ts`
5. `defineToolbarExtension(...)` from `packages/plugin-toolbar/src/prosekit.ts`
6. `blockSelectExtension` from `packages/prosemirror-block-select-plugin`

Why order matters:
- QTI node specs/keymaps must be present before downstream plugins consume document shape.
- Attribute/code/events plugins observe state and emit data for UI panels.
- Toolbar extension mounts UI around editor DOM and expects editor instance already created.

## Data And Event Flow
### ProseMirror Updates
- ProseMirror state updates inside plugin `view.update(...)` handlers.
- Plugins serialize or inspect state, then emit custom events to configured event targets.

### Event Targets In App
Defined in `apps/editor/src/main.ts`:
- `attributesEventTarget`
- `editorEventsTarget`
- `codeEventTarget`

Each target is passed into its plugin and matching panel/listener.

### Event Contracts
Editor events plugin (`packages/plugin-editor-events/index.ts`):
- `qti:content:change` -> `QtiContentChangeEventDetail` (`json`, `html`, `timestamp`)
- `qti:selection:change` -> `QtiSelectionChangeEventDetail` (`from`, `to`, `empty`, `timestamp`)

Attributes plugin (`packages/plugin-qti-attributes/index.ts`):
- `qti:attributes:update` -> `SidePanelEventDetail` (`nodes`, `activeNode`, `open`)

Code plugin (`packages/plugin-qti-code/index.ts`):
- `qti:code:update` -> `QtiCodeUpdateDetail` (`json`, `html`, `xml`, `timestamp`)

## UI Components And Responsibilities
- `qti-attributes-panel` (`packages/plugin-qti-attributes/qti-attributes-panel.ts`):
  - Consumes `SidePanelEventDetail`
  - Renders editable node attrs
  - Applies attr updates back to editor view
- `qti-code-panel` (`packages/plugin-qti-code/qti-code-panel.ts`):
  - Consumes `QtiCodeUpdateDetail`
  - Shows HTML/JSON/XML tabs for generated output
- Toolbar component (`packages/plugin-toolbar/src/toolbar.ts` + `packages/plugin-toolbar/src/prosekit.ts`):
  - Mounted near editor root
  - Provides insert actions/menu wiring

## Serialization Boundaries
- Content serialization lives in event/code plugins, not in app shell.
- `QtiCodeUpdateDetail` is produced in `packages/plugin-qti-code/index.ts`.
- Current XML path in code plugin:
  - Build HTML from ProseMirror DOM serializer
  - Wrap HTML in `<qti-item-body>`
  - Parse with `DOMParser(..., 'application/xml')`
  - Serialize with `XMLSerializer`
  - Fall back to wrapped string when parser reports `parsererror`

## Interaction Composition Ownership
- Interaction packages own XML normalization and response declaration generation in per-interaction `*.compose.ts` modules.
- Core composer (`packages/core/src/composer/index.ts`) orchestrates document assembly only:
  - append response declarations
  - apply identifier normalization
  - emit outcomes and response-processing
- Adding support for a new interaction requires:
  - interaction compose module
  - composer handler in `packages/interactions/src/composer/handlers/`
  - registration in `packages/interactions/src/composer/registry.ts`
- Core composer should not gain per-interaction special-casing logic.

## Package Boundaries
Belongs in plugin packages:
- ProseMirror plugin definitions and options
- Event payload types and event names
- Panel/component behavior tied to that plugin domain

Belongs in app wiring (`apps/editor/src/main.ts`):
- Extension composition order
- Event target ownership
- Cross-plugin integration decisions
- App-level trigger predicates and menu configuration

## Change Patterns
### Add A Plugin Safely
1. Create plugin package entrypoint and typed options/events.
2. Export integration surface.
3. Wire extension in `apps/editor/src/main.ts` with explicit order.
4. If UI is needed, mount a dedicated component and connect event target.

### Add A New Emitted Event Safely
1. Define event detail type in plugin package.
2. Emit from plugin `view` lifecycle with dedup logic when needed.
3. Add listener/consumer in app or panel with matching target and event name.
4. Keep event name stable; document breaking changes.

### Add A Panel Mode/Output Safely
1. Extend detail contract first (producer + type).
2. Add rendering mode in panel component.
3. Keep fallback content for empty state.
4. Verify output tab content with realistic editor state.

## Verification Checklist
Run the narrowest useful check first:
1. Changed package build:
   - `pnpm --filter @qti-editor/plugin-qti-code build`
   - `pnpm --filter @qti-editor/plugin-qti-attributes build`
   - `pnpm --filter @qti-editor/plugin-editor-events build`
2. App build:
   - `pnpm --filter @qti-editor/app build`
3. Cross-package verification:
   - `pnpm -r --filter "./packages/**" run build`
4. Repository lint check (non-mutating):
   - `pnpm lint:check`

## Known Constraints
- Some QTI dependencies are linked via yalc overrides (`package.json` `pnpm.overrides`).
- App styling uses Tailwind + DaisyUI (`apps/editor`); light DOM components can consume those classes directly.
- Shadow DOM components do not automatically receive app-level utility classes unless styles are provided in shadow scope.
- Firebase hosting scripts exist for deploy/serve; local app development remains Vite-based.

## Ownership Pointers
- QTI schema and interaction node specs: `packages/plugin-qti-interactions`
- Attribute side panel and update flow: `packages/plugin-qti-attributes`
- Code preview and serialization payloads: `packages/plugin-qti-code`
- Generic editor event emission: `packages/plugin-editor-events`
- Toolbar integration: `packages/plugin-toolbar`
