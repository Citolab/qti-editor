# QTI Editor App

Internal playground and authoring environment used by CITO to author and test QTI assessments. It is **not** designed as a drop-in component or starter template for external consumers — the structure reflects our own workflows and will change without notice.

You are welcome to read through the code and take inspiration from it, but expect it to be opinionated and tightly coupled to our infrastructure.

## What it is

A full-featured QTI item editor built on top of the packages in this monorepo. It wires together:

- **ProseKit** (ProseMirror) as the rich-text editing core
- **Lit** web components for the QTI interaction renderers (`@qti-components/*`)
- **React** for the surrounding application shell and UI panels
- **Firebase** for persistence (item storage, auth)
- **i18next / react-i18next** for localisation
- **Tailwind CSS + DaisyUI** for styling

All QTI interaction types in the monorepo are integrated here: choice, inline-choice, text-entry, extended-text, associate, gap-match, hottext, match, order, and select-point.

## What it is used for

- Manual QA and exploratory testing of new interactions and editor features
- Day-to-day item authoring by the internal team
- End-to-end validation of the QTI roundtrip (import → edit → export)

## Running locally

```bash
pnpm install          # from monorepo root
pnpm --filter @qti-editor/app dev
```

Firebase credentials are required for persistence features. Without them the app still runs but save/load will not work.

## Relationship to the rest of the monorepo

The app is intentionally the most "upstream" consumer of every workspace package. If something works here it is a good signal that the packages compose correctly. Think of it as an integration harness as much as a product.
