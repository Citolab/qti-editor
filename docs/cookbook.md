# Cookbook Editors

This repository now provides multiple runnable editor variants that demonstrate different integration depths.

## Variant Matrix

| Variant | Engine | UI Source | Includes |
| --- | --- | --- | --- |
| `@qti-editor/cookbook-prosemirror-minimal` | Pure ProseMirror | Minimal local UI + `prosemirror-menu` | QTI interaction schema + insert actions |
| `@qti-editor/cookbook-prosemirror-context-attrs` | Pure ProseMirror | Shadcn registry components | Metadata form, attributes panel, code panel, composer XML |
| `@qti-editor/cookbook-prosekit-full` | ProseKit | Shadcn registry components + toolbar | Full editor stack (toolbar, attributes, code, composer) |
| `@qti-editor/coco` | ProseKit (packaged) | Shadcn registry components | Single `<qti-coco-editor>` web component |

## Which One To Choose

- Use `cookbook-prosemirror-minimal` when you only want schema + commands and no QTI side panels.
- Use `cookbook-prosemirror-context-attrs` when you need pure ProseMirror but still want QTI metadata/context and attribute editing.
- Use `cookbook-prosekit-full` when you want the complete app-level integration as a reference implementation.
- Use `@qti-editor/coco` when you need one embeddable web component in another app.

## Run Commands

```sh
pnpm --filter @qti-editor/cookbook-prosemirror-minimal dev
pnpm --filter @qti-editor/cookbook-prosemirror-context-attrs dev
pnpm --filter @qti-editor/cookbook-prosekit-full dev
```

Build checks:

```sh
pnpm --filter @qti-editor/cookbook-prosemirror-minimal build
pnpm --filter @qti-editor/cookbook-prosemirror-context-attrs build
pnpm --filter @qti-editor/cookbook-prosekit-full build
pnpm --filter @qti-editor/coco build
```

## `@qti-editor/coco` Usage

```ts
import '@qti-editor/coco';

const editor = document.createElement('qti-coco-editor');
editor.value = '<p>Initial content</p>';
editor.readonly = false;
editor.addEventListener('qti-coco-change', event => {
  const { html, json, xml } = (event as CustomEvent).detail;
  console.log(html, json, xml);
});
```
