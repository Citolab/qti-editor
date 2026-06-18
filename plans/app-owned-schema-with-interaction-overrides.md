# Plan: App-owned schema topology with per-interaction overrides

## Goal

ProseMirror schemas are designed to be **authored as one document** — content expressions, group memberships, and the doc topology only make sense when the whole shape is visible in one place. Today the schema is **assembled** from N interaction packages: each package exports a complete `NodeSpec` including `content` and `group`, and `prosemirror-qti.ts` merges them. That fragments exactly the part of the schema that has to be coherent.

This plan moves the **topology seat** into the app while keeping interaction packages responsible for their own DOM serialization.

**End state**

- **Interaction packages** own DOM concerns: `attrs`, `parseDOM`, `toDOM`, `inline`/`atom`/`selectable`, widget rendering. Local knowledge — nobody else knows how to serialize `qti-match-interaction`.
- **The app** owns topology concerns: `content`, `group`, lists, tables, what fits inside `block richtext`, where interactions are allowed. Cross-cutting knowledge — only the app sees all the participants.

**Path to that end state** (this plan):

1. Keep the descriptor pattern (it does useful work for compose handlers, commands, plugins, attribute panels — leave it alone).
2. Add a per-name **override layer** between the descriptor merge and the `Schema` constructor.
3. The app's new `schema.ts` uses overrides to *replace whole NodeSpecs* for the nodes whose topology it wants to control — copying the package spec's DOM bits verbatim and rewriting `content`/`group`.
4. Treat the override layer as a **stopgap**. Once 2–3 interactions need overrides, the duplication (re-typing `parseDOM`/`toDOM` to add a group) will be obvious, and the formal split into `*DomSpec` + `*DefaultNodeSpec` becomes a mechanical refactor. See "Phase 5 (deferred)" below.

Non-goals for this plan: changing how descriptors register plugins/commands/composer handlers; introducing the `*DomSpec`/`*DefaultNodeSpec` split; touching marks. Single concern this iteration: **app authors the topology, packages provide defaults the app can replace.**

---

## Phase 0 — Facts established (do not re-discover)

### Current schema construction

The `Schema` is built in `prosemirror-qti.ts`, not `main.ts`:

| Concern | Location |
|---|---|
| `createSchema(extraNodes)` definition | [apps/qti-prosemirror-item/src/prosemirror-qti.ts:89-110](apps/qti-prosemirror-item/src/prosemirror-qti.ts#L89-L110) |
| Descriptor array (registry) | [apps/qti-prosemirror-item/src/prosemirror-qti.ts:66-78](apps/qti-prosemirror-item/src/prosemirror-qti.ts#L66-L78) |
| NodeSpecs flatten — last-write-wins via `Object.fromEntries` | [apps/qti-prosemirror-item/src/prosemirror-qti.ts:80-82](apps/qti-prosemirror-item/src/prosemirror-qti.ts#L80-L82) |
| App-owned `listNodes` + `tableSchemaNodes` (today inline) | [apps/qti-prosemirror-item/src/main.ts:87-93](apps/qti-prosemirror-item/src/main.ts#L87-L93) |
| `createSchema` call site | [apps/qti-prosemirror-item/src/main.ts:95](apps/qti-prosemirror-item/src/main.ts#L95) — passes `{ ...listNodes, ...tableSchemaNodes, qtiLayoutDiv: qtiLayoutDivNodeSpec }` |

Concrete merge code today (lines 80–82):
```ts
const qtiNodes = Object.fromEntries(
  descriptors.flatMap(d => d.nodeSpecs).map(({ name, spec }) => [name, spec])
);
```
Already last-write-wins — but the overriding object has to come from a descriptor, which means forking. The plan adds an explicit override step after this merge.

### The topology problem to fix

`listNodes` in `main.ts` already declares a custom group `'block richtext'`:
```ts
ordered_list: { ...orderedList, content: 'list_item+', group: 'block richtext' },
bullet_list: { ...bulletList, content: 'list_item+', group: 'block richtext' },
```
But **no interaction is currently a member of `block richtext`** — the interaction NodeSpecs declare their own groups inside their packages. So a list-item cannot contain an interaction, and there's no clean way to say "interactions go where rich block content goes" without either editing every package or shipping group names from the app into the packages. This is the concrete pain the override layer solves.

### Descriptor shape

```ts
export interface InteractionDescriptor {
  tagName: string;
  nodeTypeName: string;
  nodeSpecs: InteractionNodeSpecEntry[]; // [{ name, spec }, ...]
  baseSchemaDependencies?: InteractionBaseSchemaDependencies;
  insertCommand?: Command;
  // ...plugins, composer metadata, attribute panel metadata
}
```
[packages/prose-qti/src/interfaces/descriptor.ts:31-79](packages/prose-qti/src/interfaces/descriptor.ts#L31-L79)

Match's descriptor carries **six** specs: `qtiMatchInteraction`, `qtiPrompt`, `qtiPromptParagraph`, `qtiSimpleMatchSet`, `qtiSimpleAssociableChoice`, `qtiSimpleAssociableChoiceParagraph`. Any of these can be replaced by name.

### Interaction NodeSpec shape

Each interaction exports a single flat `NodeSpec` literal (no factory). Verified for:
- `qtiMatchInteractionNodeSpec` — [match schema](packages/prose-qti/src/components/match/components/qti-match-interaction/qti-match-interaction.schema.ts) lines 3–57. Content `'qtiPrompt? qtiSimpleMatchSet{2}'`.
- `qtiOrderInteractionNodeSpec` — [order schema](packages/prose-qti/src/components/order/components/qti-order-interaction/qti-order-interaction.schema.ts) lines 3–45. Content `'qtiPrompt? qtiSimpleChoice+'`.
- `qtiTextEntryInteractionNodeSpec` — [text-entry schema](packages/prose-qti/src/components/text-entry/components/qti-text-entry-interaction/qti-text-entry-interaction.schema.ts) lines 3–73. Inline atom.

Pure data — safe to spread/clone in app land.

### Gap to verify, not assume

- `matchInteractionDescriptor` declares `baseSchemaDependencies: { nodeGroups: ['qtiMedia'] }` but no interaction owns `qtiMedia`. Out of scope here — do not delete.

---

## Phase 1 — App-side `schema.ts` carrying the topology

**What to implement**

Create [apps/qti-prosemirror-item/src/schema.ts](apps/qti-prosemirror-item/src/schema.ts) that owns the entire schema composition. The file exports:

1. `appExtraNodes` — the object currently inline in main.ts (`listNodes`, `tableSchemaNodes`, `qtiLayoutDiv`). Move it here verbatim.
2. `appNodeSpecOverrides: Record<string, NodeSpec>` — initially `{}`. **This is where the app re-authors topology** for any interaction whose `content`/`group` it wants to control. Documented with a comment explaining: "Anything named here replaces the descriptor-provided spec wholesale. Use to rewrite `content`/`group` while copying `attrs`/`parseDOM`/`toDOM` from the package spec verbatim. This is a stopgap until interaction packages export `*DomSpec` + `*DefaultNodeSpec` (see plan)."
3. `appSchema: Schema` — produced by calling `composeSchema({ descriptors, extraNodes, overrides })` (added in Phase 2).

`main.ts` then imports `appSchema` instead of calling `createSchema(...)`. Lines [main.ts:87-95](apps/qti-prosemirror-item/src/main.ts#L87-L95) shrink to a single import.

**Documentation references / patterns to follow**

- Copy `listNodes` and `tableSchemaNodes` blocks **verbatim** from [main.ts:87-93](apps/qti-prosemirror-item/src/main.ts#L87-L93).
- Mirror the existing import path for `qtiLayoutDivNodeSpec` — don't invent a new symbol path.
- `NodeSpec` type from `'prosemirror-model'` — same import path used by [prosemirror-qti.ts](apps/qti-prosemirror-item/src/prosemirror-qti.ts).

**Verification checklist**

- `grep -n "listNodes\|tableSchemaNodes\|qtiLayoutDivNodeSpec" apps/qti-prosemirror-item/src/main.ts` → no hits after refactor.
- `grep -n "appSchema\|composeSchema" apps/qti-prosemirror-item/src/` → `schema.ts` defines, `main.ts` imports.
- App builds (verify the exact pnpm filter name from package.json first).
- App loads in the browser without schema errors. `Object.keys(appSchema.nodes).sort()` matches the pre-refactor list exactly when overrides is `{}`.

**Anti-patterns to avoid**

- Do **not** re-export the `descriptors` array from `schema.ts` — keep that registry in `prosemirror-qti.ts` for now; `schema.ts` just consumes it.
- Do **not** invent a new `NodeSpec` factory pattern in the interactions. The seam this phase introduces is the override map, period.
- Do **not** move marks into `schema.ts` yet — out of scope.

---

## Phase 2 — `composeSchema` with override precedence

**What to implement**

Add `composeSchema`. Location: **start app-local** in `apps/qti-prosemirror-item/src/schema.ts` (or a sibling). Don't move it into `packages/prose-qti` until a second consumer exists — premature centralization.

Signature:
```ts
export function composeSchema(options: {
  descriptors: InteractionDescriptor[];
  baseNodes: Record<string, NodeSpec>;     // prosemirror-schema-basic nodes (doc/paragraph/text)
  extraNodes?: Record<string, NodeSpec>;   // app-supplied (lists, tables, qtiLayoutDiv)
  overrides?: Record<string, NodeSpec>;    // app per-name overrides — applied LAST
  marks?: Record<string, MarkSpec>;
  docAttrs?: Record<string, { default?: unknown }>;
}): Schema
```

Merge order (last wins):
1. `baseNodes`
2. Flattened `descriptors[].nodeSpecs` (the current behavior at [prosemirror-qti.ts:80-82](apps/qti-prosemirror-item/src/prosemirror-qti.ts#L80-L82))
3. `extraNodes`
4. `overrides` — **the new layer**

Reuse the doc-attrs handling at [prosemirror-qti.ts:102-106](apps/qti-prosemirror-item/src/prosemirror-qti.ts#L102-L106) verbatim.

Rewrite the existing `createSchema(extraNodes)` helper as a thin wrapper that calls `composeSchema({ overrides: {} })`, OR delete it if no other callers exist (`grep -rn "createSchema" apps packages`).

**Documentation references / patterns to follow**

- Existing merge: [prosemirror-qti.ts:89-110](apps/qti-prosemirror-item/src/prosemirror-qti.ts#L89-L110) is the source pattern.
- `Schema` constructor: `new Schema({ nodes, marks, topNode })`.

**Verification checklist**

- Schema unchanged when `overrides = {}`: diff `Object.keys(appSchema.nodes).sort()` and each spec's `content`/`group` strings before and after the refactor.
- Smoke test: instantiate `composeSchema({ ..., overrides: { qtiMatchInteraction: { ...qtiMatchInteractionNodeSpec, group: 'block richtext interaction' } } })` and assert `schema.nodes.qtiMatchInteraction.spec.group === 'block richtext interaction'`.
- Typecheck clean.

**Anti-patterns to avoid**

- Do **not** mutate descriptor-provided `NodeSpec` objects in place — treat them as frozen, always build a new object via spread.
- Do **not** "merge" overrides field-by-field (deep merge of `attrs`, `content`, etc.). The override **replaces** the whole spec for that name. Deep merging hides surprises (e.g., a partial attr override silently dropping the package spec's `parseDOM`).
- Do **not** introduce a side channel where descriptors push overrides back into the app. One direction only: app → schema.

---

## Phase 3 — Worked example: topology override of `qtiMatchInteraction`

**Why this example.** It directly demonstrates the architecture: app re-authors **content + group**, package keeps owning DOM. After this phase you'll have proven that the override seam handles the cross-cutting concern (group memberships) that motivated the plan.

**What to implement**

In `schema.ts`, populate `appNodeSpecOverrides` with an entry for `qtiMatchInteraction` that:

1. **Joins the app-defined `block richtext` group.** Today the spec's group string lives in the package; rewriting it here lets a `list_item` contain a match interaction without any package change.
2. **Optionally tightens the content expression** to whatever the app actually wants (e.g. require the prompt: `'qtiPrompt qtiSimpleMatchSet{2}'`). Pick *one* small change — if there's no real app constraint to encode, just do the group join.

Concretely:

```ts
// apps/qti-prosemirror-item/src/schema.ts
import { qtiMatchInteractionNodeSpec } from '@citolab/prose-qti/components/match';

const appMatchNodeSpec: NodeSpec = {
  ...qtiMatchInteractionNodeSpec,            // attrs, parseDOM, toDOM — DOM concerns from the package
  group: 'block richtext interaction',       // app-authored topology
  // content: 'qtiPrompt qtiSimpleMatchSet{2}',   // uncomment if the app wants to require the prompt
};

export const appNodeSpecOverrides: Record<string, NodeSpec> = {
  qtiMatchInteraction: appMatchNodeSpec,
};
```

**Documentation references / patterns to follow**

- Source spec to extend (and to leave the DOM bits inherited from): [qti-match-interaction.schema.ts:3-57](packages/prose-qti/src/components/match/components/qti-match-interaction/qti-match-interaction.schema.ts#L3-L57)
- Re-export path: verified reachable via the match component barrel — [packages/prose-qti/src/components/match/index.ts:1-8](packages/prose-qti/src/components/match/index.ts#L1-L8).
- Group naming: the `block richtext` group is defined inline in `listNodes` at [main.ts:87-93](apps/qti-prosemirror-item/src/main.ts#L87-L93) — move with the rest into `schema.ts`.

**Verification checklist**

- `appSchema.nodes.qtiMatchInteraction.spec.group === 'block richtext interaction'`.
- The descriptor-provided `qtiMatchInteractionNodeSpec.group` is unchanged (no mutation): `qtiMatchInteractionNodeSpec.group === <original value from package>`.
- In the editor, a `qti-match-interaction` can be inserted inside a `list_item` — concrete proof the group join took effect. (If lists don't accept `block richtext` content today, fix the `list_item` content expression in `appExtraNodes` at the same time — that's also app topology.)
- Roundtrip an existing fixture: serialize → parse → identical doc. Confirms `parseDOM`/`toDOM` inheritance still works.

**Anti-patterns to avoid**

- Do **not** require the interaction package to know about `block richtext`. The whole point of the seam is that group names are app-private.
- Do **not** modify the match compose handler / response declaration. This phase is schema-only.
- Do **not** pass a partial spec expecting a deep merge — per Phase 2's contract, the override replaces the whole spec for that name. Always start from `{ ...qtiMatchInteractionNodeSpec, ... }`.

---

## Phase 4 — Verification & docs

**What to implement**

1. Snapshot or pinned assertions: enumerate `Object.keys(appSchema.nodes).sort()` plus the `content` and `group` strings of every interaction node. Pin them so the next person changing overrides notices the diff.
2. Update `apps/qti-prosemirror-item/README.md` (or the app's onboarding doc — confirm it exists before writing) with a "Schema composition" section pointing at `schema.ts` and explaining the override slot. Two paragraphs max.
3. Sweep for stragglers: `grep -rn "createSchema\|listNodes\|tableSchemaNodes" apps packages` — anything outside `schema.ts` / `prosemirror-qti.ts` is a leftover.

**Verification checklist**

- Full repo build clean.
- Typecheck clean for both `apps/qti-prosemirror-item` and `packages/prose-qti`.
- Existing roundtrip tests pass — import/export story unchanged.
- Manual: launch the app, insert each interaction type, confirm rendering. Drop a match interaction into a list item to validate the Phase 3 group join.

**Anti-patterns to avoid**

- Do **not** add the override seam to the `InteractionDescriptor` interface (no `nodeSpecOverrides?` field on descriptors). The whole point is that overrides live in the app.
- Do **not** ship a second schema constructor alongside `composeSchema`. One way to build the schema.

---

## Phase 5 (deferred — not part of this plan, but the destination)

Track this as the medium-term endpoint, with a concrete trigger so it doesn't get forgotten.

**Trigger condition.** When 2–3 interactions need overrides for the *same* reason (e.g., joining `block richtext`), the duplication of `attrs`/`parseDOM`/`toDOM` re-typing in `schema.ts` will be obvious. That's the signal to split.

**The split.** Each interaction package exports two artifacts instead of one:

```ts
// inside the package
export const qtiMatchInteractionDomSpec = {
  attrs, parseDOM, toDOM,
  // no `content`, no `group` — DOM concerns only
};

export const qtiMatchInteractionDefaultNodeSpec: NodeSpec = {
  ...qtiMatchInteractionDomSpec,
  content: 'qtiPrompt? qtiSimpleMatchSet{2}',
  group: 'block',
};
```

The descriptor's `nodeSpecs` keeps emitting `*DefaultNodeSpec` for backward compatibility / standalone tests / Storybook. The **app**, instead of overriding via `appNodeSpecOverrides`, declares each topology-controlled node inline using `*DomSpec`:

```ts
qtiMatchInteraction: {
  ...qtiMatchInteractionDomSpec,
  content: 'qtiPrompt? qtiSimpleMatchSet{2}',
  group: 'block richtext interaction',
},
```

Mechanical refactor — no behavior change, just makes the seam explicit instead of leaning on override semantics. Do not undertake until the trigger condition is met.

**Out of scope long-term.** Don't go all the way to "one big QTI schema in the app." Descriptors are doing useful work for compose handlers, commands, plugins, and attribute-panel metadata. Move *only* topology (content + group) to the app; everything else stays in the packages.

---

## Open questions to confirm before executing

1. Should `composeSchema` live app-local (recommended — keep it in `apps/qti-prosemirror-item/src/schema.ts`) or in `packages/prose-qti/src/integration/`? Only centralize if a second consumer is plausible within ~6 months.
2. Marks: any need to override marks in this iteration, or nodes only? Plan currently scopes to nodes.
3. Phase 3 specifics: is the `block richtext` group join sufficient, or does the app also want to tighten any match content expression (e.g. require the prompt)? If unclear, do the group join alone — narrowest concrete change.
