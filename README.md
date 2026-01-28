# qti-editor

## Custom Elements + ProseMirror Schema

Annotate custom element classes with ProseMirror JSDoc tags to drive schema generation:

```ts
/**
 * Callout block.
 * @pmNode block
 * @pmGroup block
 * @pmContent inline*
 * @pmDefining true
 */
export class MyCallout extends HTMLElement {
  // ...
}
```

Supported tags on the class:
- `@pmNode` block|inline
- `@pmGroup` block|inline|<custom group>
- `@pmContent` ProseMirror content expression
- `@pmMarks` marks list or `_` for all
- `@pmAtom` true|false
- `@pmSelectable` true|false
- `@pmDefining` true|false
- `@pmIsolating` true|false
- `@pmToolbar` true|false (controls QTI dropdown visibility)

Generated outputs (package-local):
- CEM file: `packages/plugin-qti-interactions/custom-elements.json`
- ProseMirror schema: `packages/plugin-qti-interactions/src/schema/prosemirror-schema.ts`

Run the pipeline (interactions package):
```sh
pnpm --filter @qti-editor/plugin-qti-interactions cem
pnpm --filter @qti-editor/plugin-qti-interactions schema
pnpm --filter @qti-editor/plugin-qti-interactions schema:validate
pnpm --filter @qti-editor/plugin-qti-interactions build:schema
```

Dev workflow (auto-regenerate CEM + schema while the editor runs):
```sh
pnpm dev
```
