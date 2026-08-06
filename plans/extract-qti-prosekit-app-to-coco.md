# Extract `qti-prosekit-app` into QTI-Coco and host it on App Service

Goal: run `qti-prosekit-app` as a second app inside the QTI-Coco monorepo, deployed to its own Azure
App Service in the same resource group as `qti-coco`, so it sits on the same host shape that can
reach the Azure AI agent through a managed identity.

**Decision: it becomes `apps/qti-prosekit-app` in QTI-Coco, not a third repository.** QTI-Coco
already contains everything the extraction needs — a copy of the unpublished `prose-qti-ui`, an
app-agnostic agent proxy, and a pipeline that has been debugged against real Azure. A separate repo
would duplicate all three and re-earn the same bugs.

**Scope: hosting only. No AI feature work.** The app has no AI code today, and its editor chrome is
Lit inside a React shell, so porting Coco's Lit AI blocks is a separate piece of work. The Express
server it will run already exposes `POST /api/ai/chat`, so the capability arrives with the host at
no extra cost; nothing in the app calls it yet.

> **This is QTI-Editor's primary app**, not a demo. Root `build`, `preview` and
> `deploy:build:editor` all target it, and it had commits on the day this plan was written. Read
> "Open questions" before starting — the single most important decision is what happens to the
> original.

> **No sensitive information in this document.** No keys, tokens, connection strings,
> subscription/tenant/principal identifiers, Firebase project identifiers, or the AI endpoint URL.
> Environment variables appear by **name only**. Resource group and web app names are included
> because the plan is not actionable without them; they are not credentials.

---

## Phase 0 — Facts established (do not re-discover)

### 0.A What the app actually is (measured)

| | |
|---|---|
| Shape | React 18 shell (`src/main.tsx` → `src/editor.tsx`), but the editor core is **Lit** — `src/components/qti-editor-app.ts` plus 25 files under `src/components/blocks/`, 8 of which are still plain `.js` |
| Routing | **None.** No `react-router` anywhere. A single mounted component; `firebase.json` sets `"rewrites": []` accordingly |
| Backend | **None of its own.** Firebase Auth (email/password) + Firestore, called straight from the browser |
| Auth | **Optional.** The app works signed out against `localStorage`; signing in only enables Firestore sync |
| AI | **None.** No LLM, agent, or MCP call anywhere in `src/` |
| Size | ~97 files, 90 under `src/` |
| Tests | Two: `src/qti-editor-app.browser.test.ts` (mounts the real element in Chromium) and `src/extensions/locked-header-extension.browser.test.ts` (pure unit, despite the name) |
| Stories / VRT | None for this app |

**Workspace coupling — the extraction surface.** Three `workspace:*` packages:

- `@citolab/prose-qti` (published) — 16 subpaths, `/interfaces` alone imported 14×
- `@citolab/prose-extensions` (published) — `/prosekit` and `/prosekit-extensions`
- `@citolab/prose-qti-ui` (**private, unpublished, ships raw TypeScript**) — `/editor-context`,
  `/components/attributes-panel`, `/components/interaction-insert-menu`

Plus exactly one direct `@qti-components/*` use: `@qti-components/theme/item.css`, via the pnpm
`catalog:` protocol.

**No cross-app runtime imports.** Two comments name a sibling app, but only to record that code was
moved *in*. There is one cross-app **test** import: `../../e2e/stories/fixtures/ITEM001.xml?raw`.

**Verified, contrary to first impressions:** `apps/qti-prosekit-app/.env` is gitignored and has
**never been committed** (`git log --all -- apps/qti-prosekit-app/.env` is empty). There is no
leaked-secret cleanup to do. Its six variables are named in Phase 3.

### 0.B What the Coco extraction already proved (reuse, do not rediscover)

Everything below cost real debugging time on `qti-prosekit-item`. It applies unchanged here.

1. **`optimizeDeps.exclude` must NOT be carried over.** QTI-Editor excludes thirteen
   `@qti-components/*` packages and several `@citolab/prose-*` subpaths. That is right *there*,
   where those specifiers are aliased to workspace source. In QTI-Coco they are ordinary npm
   packages, and excluding one makes Vite serve it raw so its own `prosekit`/`lit` imports load a
   **second copy** beside the pre-bundled one. Symptom: page renders the header and nothing else,
   `ProseKitError: Assertion failed` from `unionFacetNode`, plus Lit's "Multiple versions of Lit
   loaded". **Dev-only** — `vite build` and Vitest each use one module graph, so both stay green
   while the app is broken. Only loading the page catches it.
2. **`resolve.dedupe` means "resolve from the project root."** The `@prosekit/*` entries are
   prosekit's own nested sub-packages and are not at the root under pnpm. This is harmless *only*
   while nothing is excluded from the optimizer. Exclude something that imports prosekit and it
   fails with `Failed to resolve import "@prosekit/extensions/text"`.
3. **The `@qti-components` pin should not be named at all.** `prose-qti` re-exports the stylesheet
   as `@citolab/prose-qti/qti-prose.css` (item.css + core-css.css, in the one order that layers
   correctly) and the transform pipeline as `@citolab/prose-qti/transformers`. Using those seams
   means no `catalog:`, no pkg.pr.new sha to sync, and no risk of resolving a different components
   build than `prose-qti` pins — which surfaces as "custom element already defined", not as a
   version conflict.
4. **~50 of the app's Vite aliases are dead.** Every `@qti-editor/*` alias points at a directory
   that no longer exists, and no source file uses those specifiers. Only the five
   `@lit/reactive-element` aliases and the `core-css.css` one do anything.
5. **pnpm's `node_modules` cannot be zipped.** It is symlinks into a virtual store, and
   `pnpm deploy` produces symlinks too. The deploy package is assembled with
   `npm install --omit=dev`, which is safe only because the `api` manifest has no `workspace:` deps.
6. **A typecheck must not depend on build output.** Pointing tsc at a gitignored `dist/` makes
   `pnpm typecheck` fail on any clean checkout. Types come from source; only the runtime import
   points at the build.
7. **Commit `pnpm-lock.yaml` with every manifest change**, or `pnpm install --frozen-lockfile` fails
   in CI.
8. **Static Web Apps cannot do this.** Its managed functions run in a Microsoft-owned subscription
   with no system-assigned identity to grant a role to, so `DefaultAzureCredential` has nothing to
   be. That is why `qti-coco` is an App Service.
9. **SSE needs `X-Accel-Buffering: no`** or App Service's reverse proxy buffers the whole stream.
10. Deployment settings that matter: `SCM_DO_BUILD_DURING_DEPLOYMENT=false` (the package ships ready
    to run), startup command `node dist/server.js`, Node 22, and a `/healthz` the pipeline probes
    without spending an agent request.

### 0.C What QTI-Coco already provides

- `packages/prose-qti-ui/` — the private package, already copied. **This removes the single biggest
  extraction blocker**; the new app consumes it as `workspace:*` with no change.
- `api/src/agent.ts` — app-agnostic apart from endpoint/agent-name defaults, both env-overridable.
- `api/src/server.ts` — generic Express host: static root (already env-overridable via
  `COCO_STATIC_ROOT`), `POST /api/ai/chat`, `/healthz`, SPA fallback.
- `azure-pipelines.yml` — the build → package → deploy → smoke-test shape, already debugged.
- `apps/qti-prosekit-item/vite.config.ts` — the *corrected* Vite config to copy from.

---

## Phase 1 — Bring the app into the monorepo

**Goal:** `apps/qti-prosekit-app` exists in QTI-Coco and installs.

**Files:**
- Copy `QTI-Editor/apps/qti-prosekit-app/{src,index.html,README.md}` → `QTI-Coco/apps/qti-prosekit-app/`.
  Do **not** copy `dist/`, `.env`, `components.json` (its aliases name a package that does not
  exist), or `vite.config.ts` (rewritten in Phase 2).
- Copy `QTI-Editor/apps/e2e/stories/fixtures/ITEM001.xml` → `apps/qti-prosekit-app/src/fixtures/ITEM001.xml`
  and repoint the test import. (Same move already made for `qti-prosekit-item`.)
- `apps/qti-prosekit-app/package.json` — rename to `@coco/qti-prosekit-app`; swap the three
  `workspace:*` prose deps to `@citolab/prose-qti` and `@citolab/prose-extensions` at the versions
  Coco already pins, and `@citolab/prose-qti-ui` stays `workspace:*`; **drop `@qti-components/theme`
  entirely** (Phase 2); add the deps it imports but never declared — `prosemirror-model`, plus
  `vitest` and `shadow-dom-testing-library` if the tests come along.

**Verification:**
- `pnpm install` succeeds; `pnpm ls @qti-components/theme -r` reports **one** copy, present only as
  `prose-qti`'s dependency.
- `grep -rn "@qti-components/" apps/qti-prosekit-app --include=package.json` → 0 hits.

**Anti-pattern guards:**
- Do **not** add a `catalog:` block to QTI-Coco. The absence of one is deliberate and documented in
  its `pnpm-workspace.yaml`.
- Do **not** copy the committed `dist/` from the working tree.

---

## Phase 2 — Rewrite the config surface

**Goal:** the app builds under Coco's resolution rules rather than QTI-Editor's.

**`apps/qti-prosekit-app/vite.config.ts`** — write fresh, copying
`apps/qti-prosekit-item/vite.config.ts` and adding `react()`. Keep: the five
`@lit/reactive-element` aliases, `tailwindcss()`, `tsconfigPaths({ ignoreConfigErrors: true })`,
serve-only `dedupe`, `server.port` (use a port other than 5174), the `watch-node-modules` reload
plugin. Drop: all ~50 `@qti-editor/*` aliases, the `@citolab/prose-qti/core-css.css` source alias,
`optimizeDeps.force`, `server.fs.allow` of the monorepo root, the `watch.usePolling` block, and the
reference to `./src/components/qti-slash-menu.ts` (that file does not exist). Add **no**
`optimizeDeps.exclude` — see 0.B.1.

**`apps/qti-prosekit-app/tsconfig.json`** — extends Coco's `tsconfig.base.json`; keep
`jsx: react-jsx`, `allowJs: true`, `checkJs: false`, `types: ["vite/client"]`. Coco's base already
sets `useDefineForClassFields: false`, which the Lit decorators require — confirm it, do not
override it.

**`apps/qti-prosekit-app/src/style.css`** — replace the two imports

```css
@import '@qti-components/theme/item.css';
@import '@citolab/prose-qti/core-css.css';
```

with the single seam

```css
@import '@citolab/prose-qti/qti-prose.css';
```

and repoint `@source "../../../packages/prose-qti-ui/src/**/*.{ts,js}"` (same relative depth in
Coco, so verify rather than assume). Apply the same collapse in the browser test.

**Verification:**
- `pnpm --filter @coco/qti-prosekit-app build` succeeds.
- `grep -c "@layer qti-components" <built css>` ≥ 1 — a silently unresolved bare-specifier
  `@import` is the failure mode here.
- **`pnpm dev` and open the page.** Console must be clean apart from Lit's dev-mode notice; the
  editor must render. Neither the build nor the tests catch 0.B.1.

**Anti-pattern guards:**
- Do **not** port `tsconfig.base.json`'s ~180-entry `paths` map. It exists to resolve `@citolab/*`
  to source in a monorepo that owns those packages; here npm `exports` do the job, and a paths entry
  would make tsc and Vite disagree.
- Do **not** reintroduce `optimizeDeps.exclude` "to be safe". It is the specific cause of a blank
  page that passes CI.

---

## Phase 3 — Firebase configuration

**Goal:** the app keeps Auth + Firestore, with no secret in the repo.

Firebase config is read from six Vite variables, by name:
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

**Files:** add `apps/qti-prosekit-app/.env.example` listing the six **names with empty values** (the
original repo has no example file); confirm `.env` is gitignored in QTI-Coco.

**Three things that are easy to get wrong:**

1. **These are build-time, not runtime.** Vite inlines them into the bundle, so they must be present
   in the pipeline's *build* stage, not as App Service application settings. In Azure DevOps that is
   a variable group with the six marked secret.
2. **They end up in the client bundle regardless.** That is normal for Firebase web config — the
   security boundary is `firestore.rules` (`request.auth.uid == userId`), not secrecy of the key.
   Do not spend effort hiding them; do keep them out of git.
3. **The new hostname must be added to the Firebase project's Authorized Domains**, or email/password
   sign-in fails on the deployed site while working locally. This is a console step, not a code
   change, and it is the most likely cause of "auth works on localhost but not in Azure".

**Verification:** deployed site, signed out — editor loads and saves to `localStorage`. Signed in —
the status bar reports sync and a document round-trips through Firestore.

---

## Phase 4 — Host it

**Goal:** a second App Service beside `qti-coco`, in resource group `rg-qti-mcp`, on the existing
`asp-proto-shared-linux` plan (so no new plan cost).

**Serving.** Reuse `api/` unchanged. The server is already generic; the deployment package differs
only in which app's `dist` becomes `wwwroot`. Concretely, the pipeline produces **two** packages
from one server build. The app has no client-side router, so the existing SPA fallback is harmless.

**Azure resources** (mirroring what `qti-coco` already has):
- Web app on the existing plan, Linux, Node 22, in `rg-qti-mcp`.
- Startup command `node dist/server.js`; `SCM_DO_BUILD_DURING_DEPLOYMENT=false`; HTTPS only.
- **System-assigned identity + a `Foundry User` role assignment scoped to the AI account** (not the
  subscription). Strictly optional while the app makes no AI call — but it is one command, and it is
  what makes "can reach the agent" true rather than aspirational. Note the role name: the documented
  "Azure AI User" does not exist in this tenant; `Foundry User` is the role the working developer
  account holds.

**Pipeline** — extend `azure-pipelines.yml` rather than adding a second file: build both apps,
assemble both packages, deploy both, smoke-test both `/healthz`. Keep the deploy stage gated to
`main` so PRs validate without publishing.

**Verification:**
- `/healthz` returns 200 on the new hostname.
- The editor loads; create a document, reload, and confirm it persists.
- If the identity was granted: `POST /api/ai/chat` on the new host streams a response — proving the
  agent is reachable even though no UI calls it.

**Anti-pattern guards:**
- Do **not** let the host build the app. A host-side build image without pnpm dies on
  `sh: 1: pnpm: not found`; that is exactly how the SWA deploy failed.
- Do **not** ship `api/node_modules` from a pnpm install — see 0.B.5.

---

## Phase 5 — Tests

**Goal:** the two existing tests run in Coco, or are consciously dropped.

`locked-header-extension.browser.test.ts` is a pure unit test and should port unchanged.
`qti-editor-app.browser.test.ts` mounts the real element and needs the ITEM001 fixture from Phase 1.

Coco's root `vitest.config.ts` already defines the single Chromium `browser` project and globs
`apps/**/src/**/*.browser.test.ts`, so both are picked up with no config change. QTI-Editor's
`globalSetup` (vendoring the QTI runtime) and `setupFiles` (`toEqualXml` matchers) are **not**
needed — neither test uses them.

**Verification:** `pnpm test` from the Coco root — the existing `qti-prosekit-item` tests plus these
two, all green.

---

## Migrating off Firebase — analysis, decision deferred

Not part of the extraction, but it should be decided before the app has been running on Azure long
enough to accumulate documents. **Leading direction: Entra ID via Easy Auth, and Cosmos DB behind
the Express server.** Recorded here rather than committed to, because the sequencing question in
"The trap" below may change the order.

### Why it is on the table now

`qti-coco` already sits behind App Service Authentication. Give this app the same treatment and a
user signs in **twice** — once to Entra ID to reach the site at all, then again with an email and
password to Firebase, purely so their documents sync. The second sign-in carries no additional
meaning once the first has happened.

### The surface is small (measured)

Firebase does exactly two things here, and they are separable.

**Auth** — email/password only. No OAuth providers, no custom claims. `src/context/auth-context.tsx`
uses four SDK calls: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`,
`onAuthStateChanged`.

**Storage** — `src/lib/firestoreSync.ts` is the whole of it: three functions over one collection.

| Function | Operation |
|---|---|
| `syncSaveFile(userId, file)` | `setDoc` — whole document, overwrite |
| `syncDeleteFile(userId, fileId)` | `deleteDoc` |
| `pullRemoteFiles(userId)` | `getDocs` over the collection, merged into `localStorage`, later `savedAt` wins |

No queries, no indexes, no transactions, no realtime listeners, no pagination. Authorization is a
single rule: `request.auth.uid == userId`. Anything with per-user document storage can host this.

**And the app already works without it.** Documents live in `localStorage` under a scope key, and
every Firestore call is guarded by `if (user)`. Sync is an enhancement, not a dependency — which is
what makes a staged migration possible instead of a big-bang cutover.

### The trap: user IDs change, and documents are keyed by them

`getStorageScopeForUser` in `src/lib/fileStore.ts` scopes local storage to `user:{uid}`, and the
Firestore path is `users/{uid}/files/{fileId}`. That `uid` is a **Firebase** identifier. Switching
identity provider issues a different one, so on first sign-in after the switch every existing
document — local *and* remote — becomes invisible to its owner. Nothing errors; the shelf is just
empty.

This is the part to design deliberately: either a one-off migration keyed on email address, or an
explicit accepted reset with users warned first. It is also the reason **auth and storage should not
migrate in the same step** — changing both at once makes a failed migration hard to attribute.

### Options

**Identity**

1. **Entra ID via Easy Auth** — already configured on `qti-coco`, so the platform does the work. The
   server reads the injected principal header; the client drops the Firebase Auth SDK and the login
   modal entirely. Ends the double sign-in. Ties the app to Azure sign-in, which is the intent.
2. **Keep Firebase Auth** — zero work now, permanent double sign-in, and two identity systems to
   reason about.

**Storage**

1. **Cosmos DB behind the Express server** *(leading)* — closest to Firestore's document model, so
   `firestoreSync.ts` is reshaped rather than rethought. Crucially, the server **already has a
   managed identity**: it can reach Cosmos with a role assignment and no connection string, exactly
   the pattern the AI agent already uses. That also moves the database credential out of the browser,
   which Firebase never could.
2. **Table or Blob Storage** — cheaper and simpler for a per-user document store, same keyless
   managed-identity access. More reshaping of the sync code, and less room to grow if querying is
   ever wanted.
3. **Keep Firestore** — the client keeps talking directly to Google with a build-time key. Works, but
   leaves the app split across two clouds.
4. **Drop remote sync** — local-first only. Simplest, and loses cross-device documents.

### Shape of the work, if it goes ahead

Roughly: add `GET/PUT/DELETE /api/files` to the existing Express server, backed by Cosmos through the
managed identity, with the user taken from the Easy Auth principal header rather than from a request
body. Then reduce `firestoreSync.ts` to three `fetch` calls against those routes — its signatures can
stay, which keeps `use-file-operations.ts` untouched. Then remove the Firebase SDK, the login modal,
and the six `VITE_FIREBASE_*` variables. `firestore.rules` disappears; its single rule becomes the
server deriving the user from the header and never trusting a client-supplied id.

Note the direction of travel: authorization moves from a declarative rules file to server code, which
is more powerful and easier to get wrong. Whatever replaces it should be the first thing tested.

---

## Out of scope

- **Any AI feature work in this app.** No `prose-ai`, no AI toolbars, no chat sidebar. The Lit→React
  port of Coco's AI blocks is a separate plan.
- **Executing** the Firebase migration. It is analysed below and the direction is recorded, but the
  extraction does not depend on it and must not be blocked by it.
- Retiring QTI-Editor's Firebase hosting path, its `deploy.yml` job, `scripts/prepare-hosting-editor.mjs`,
  or the `hosting/editor` target. Nothing here removes them.
- Cleaning up the stale artefacts this investigation found but which are not in the way:
  repo-root `index.html` pointing at a `.ts` entry that does not exist, `scripts/prepare-hosting.mjs`
  referencing long-gone directories, and `components.json`'s alias to a non-existent package.

---

## Open questions

1. **What happens to `apps/qti-prosekit-app` in QTI-Editor?** This is the decision that matters most
   and the plan deliberately does not assume it. It is the repo's primary build and deploy target
   and is under active development, so a copy in Coco means two diverging copies of the same app
   almost immediately. Three options: (a) leave both and accept drift for a trial period, with a
   fixed date to choose; (b) make Coco authoritative and reduce QTI-Editor to packages plus its
   demo/e2e apps, repointing root `build`/`deploy:build:editor`; (c) do not extract — add the
   Express server and pipeline inside QTI-Editor and deploy from there, keeping one copy.
   **Recommendation: (b) if the intent is to move hosting to Azure permanently, (c) if the intent is
   only to get it onto App Service.** (a) is the one to avoid — it is the option that quietly costs
   the most.
2. **Should the new app sit behind App Service Authentication, and does Firebase then go?** `qti-coco`
   now does, and turning it on here produces the double sign-in described in "Migrating off Firebase"
   above. The leading direction is Entra ID plus Cosmos DB behind the Express server, but the order
   matters more than the destination: migrate identity and storage in **separate** steps, and settle
   the user-id change first — documents are keyed by the Firebase `uid`, so switching provider
   orphans them silently.
3. **One web app or two?** This plan assumes two, mirroring `qti-coco`. A single app serving both
   editors under different paths is possible but would need a `base` set in each Vite build and a
   routing decision in the server; nothing about the current setup calls for it.
4. **Does the pipeline's service connection cover the new app?** The existing one deploys to
   `rg-qti-mcp`; the same connection should work, but it is worth confirming before the first run.
