# CSS Source Map Verification

This checklist verifies CSS source mapping quality for:
- Storybook runtime CSS (Vite dev sourcemaps)
- Lit component styles migrated to external CSS files
- upstream theme CSS consumed from qti-components

## 1. Verify Storybook Runtime CSS Maps

Start Storybook:

```sh
pnpm storybook
```

Open a story and DevTools, then inspect rules coming from:
- @qti-components/theme/item.css
- packages/prose-qti/src/core-css/core-css.css
- local story CSS imports

Check that rule locations point to source files where possible.

Storybook CSS map settings are enabled in:
- .storybook/main.ts

## 2. Verify Lit Style Provenance (Local Components)

Use a component migrated to external CSS, for example:
- packages/prose-qti/src/components/shared/components/qti-gap/qti-gap.ts
- packages/prose-qti/src/components/shared/components/qti-gap/qti-gap.css

In Storybook DevTools console, run:

```js
window.__qtiInspectStyles('qti-gap')
```

This prints style origins for:
- document stylesheets and style tags
- shadowRoot adoptedStyleSheets

The helper is registered in:
- .storybook/preview.ts

## 3. Verify Upstream Theme CSS Mapping

Because editor stories consume the qti-components theme package, map quality for that theme depends on qti-components build artifacts.

Quick check in qti-components:

```sh
pnpm css
ls dist/item.css dist/item.css.map
```

Then in editor Storybook, inspect rules from @qti-components/theme/item.css and verify DevTools location links.

## Notes

- Lit css template literals remain less traceable than external CSS files. Prefer external .css for styles that need frequent debugging.
- If a mapped location points to a mixin definition, that is expected with expanded PostCSS mixin output.
