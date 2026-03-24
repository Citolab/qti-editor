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

This repo supports pinning selected `@qti-components/*` packages to a specific
GitHub commit without publishing to npm.

Configuration lives in root `package.json`:

- `qtiComponentsGitOverrides`: source-of-truth Git specs
- `pnpm.overrides`: generated local `file:` tarball overrides used by installs

Supported Git spec format:

- `github:<org>/<repo>#<sha>&path:/<package/subdir>`

Workflow:

1. Update `qtiComponentsGitOverrides` entries (repo + commit SHA + package path).
2. Run:
```sh
pnpm run qti-components:install
```
3. Commit the resulting updates:
- `package.json`
- `pnpm-lock.yaml`
- `.qti-components-packs/<sha>/*.tgz`

Helper commands:

- `pnpm run qti-components:status` shows current source Git overrides and active `file:` overrides.
- `pnpm run qti-components:sync` refreshes only the tarball overrides in `package.json`.
- `pnpm run qti-components:install` runs sync + `pnpm install --no-frozen-lockfile`.

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
