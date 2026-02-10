# qti-editor

## ProseMirror QTI Schema

The ProseMirror-native QTI schema and components are provided by
`@qti-components/prosemirror` and re-exported via
`@qti-editor/plugin-qti-interactions`. The editor uses a thin ProseKit adapter
to wire these into ProseKit.

Dev workflow (auto-regenerate CEM + schema while the editor runs):
```sh
pnpm dev
```

## Firebase Hosting

This repo now includes Firebase Hosting configuration for the editor app.

1. Set your Firebase project id in `.firebaserc` (replace `your-firebase-project-id`).
2. Fill `apps/editor/.env` with your Firebase Web app config values.
3. Build and deploy:
```sh
pnpm firebase:deploy
```

Local hosting emulation:
```sh
pnpm firebase:serve
```

## Git Hooks (Optional)

If you use `yalc add`, it can leave `file:`/`link:` dependencies in `package.json`.
This repo provides a manual pre-commit hook that runs `yalc check` to prevent
committing those.

To enable it:

1. `ln -s ../../scripts/git-hooks/pre-commit .git/hooks/pre-commit`
2. Install `@jimsheen/yalc` globally so the `yalc` command is available.
