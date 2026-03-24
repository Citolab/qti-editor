# qti-editor

## Architecture

The repository now uses layered packages instead of umbrella bundles:

- `@qti-editor/prosemirror`
  Generic ProseMirror utilities such as block-select, node-attrs-sync, and virtual-cursor.
- `@qti-editor/interaction-*`
  ProseMirror-first interaction packages.
- `@qti-editor/prosemirror-attributes*`
  The generic attributes engine plus the supported ProseKit-oriented attributes UI.
- `@qti-editor/qti-core`
  QTI composition, XML generation, and serialization semantics.
- `@qti-editor/qti-editor-kit`
  Supported editor assembly surfaces.
- `@qti-editor/ui`
  Canonical copyable UI source plus shadcn-compatible registry artifacts.

Dev workflow (auto-regenerate CEM + schema while the editor runs):
```sh
pnpm dev
```

## Firebase Hosting

This repo uses one Firebase Hosting site with a staged deploy bundle:
- `/` editor app
- `/storybook/` Storybook docs
- `/r/` shadcn registry JSON

1. Set your Firebase project id in `.firebaserc` (replace `your-firebase-project-id`).
2. Fill `apps/editor/.env` with your Firebase Web app config values.
3. Build all hosting artifacts and deploy:
```sh
pnpm firebase:deploy
```

Local hosting emulation:
```sh
pnpm firebase:serve
```

## QTI Components Git Overrides

This repo uses a local-only override file so dependency overrides do not touch
`package.json` or `pnpm-lock.yaml`.

How it works:

- `.pnpmfile.cjs` reads `pnpm-local-overrides.json` (if present).
- When `enabled: true`, matching dependencies are rewritten during resolution.
- The local config file is gitignored.

Create `pnpm-local-overrides.json` in the repo root:

```json
{
  "enabled": true,
  "sourceOverrides": {
    "@qti-components/interactions-core": "github:Citolab/qti-components#648154ec0c5b3dac8a5118ab450df3d6c508c8a3&path:/packages/interactions/core",
    "@qti-components/choice-interaction": "github:Citolab/qti-components#648154ec0c5b3dac8a5118ab450df3d6c508c8a3&path:/packages/interactions/choice-interaction"
  },
  "overrides": {
    "@qti-components/interactions-core": "file:.qti-components-packs/648154ec0c5b3dac8a5118ab450df3d6c508c8a3/qti-components-interactions-core-1.1.0.tgz",
    "@qti-components/choice-interaction": "file:.qti-components-packs/648154ec0c5b3dac8a5118ab450df3d6c508c8a3/qti-components-choice-interaction-1.1.0.tgz"
  }
}
```

Automation commands:

```sh
pnpm run qti-overrides:status
pnpm run qti-overrides:sync
pnpm run qti-overrides:install
```

`qti-overrides:sync` builds tarballs from `sourceOverrides` and writes `file:` paths to `overrides`.

Disable quickly by setting `"enabled": false` (or deleting the file).

## Component Registry

QTI Editor provides a shadcn-compatible component registry for customizable UI components.

### Architecture

- **`@qti-editor/qti-core`** - QTI composition and export semantics
- **`@qti-editor/qti-editor-kit`** - supported editor-kit assembly surfaces
- **Registry components** - Customizable Lit components (copied into your project)

### Using the Registry

Build and serve the registry locally:
```sh
pnpm registry:build
pnpm registry:serve
```

Install a component into your project:
```sh
npx shadcn add http://localhost:4100/r/qti-attributes-panel.json
```

## Git Hooks (Optional)

If you use `yalc add`, it can leave `file:`/`link:` dependencies in `package.json`.
This repo provides a manual pre-commit hook that runs `yalc check` to prevent
committing those.

To enable it:

1. `ln -s ../../scripts/git-hooks/pre-commit .git/hooks/pre-commit`
2. Install `@jimsheen/yalc` globally so the `yalc` command is available.
