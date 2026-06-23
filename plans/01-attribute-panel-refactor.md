# Plan — Refactor attribute panel onto the prosemirror-item ancestor-walker model

## Context & target

The user has migrated `title` and `identifier` to be **document attributes on the prosemirror doc node** (already done in [apps/qti-prosemirror-item/src/schema.ts:58](apps/qti-prosemirror-item/src/schema.ts#L58); also defined for prosekit-item via [apps/qti-prosekit-app/src/extensions/basic-extension.ts:55-56](apps/qti-prosekit-app/src/extensions/basic-extension.ts#L55-L56)). The reference implementation of the desired panel is the plugin-based ancestor-walker in [apps/qti-prosemirror-item/src/attributes-panel-plugin.ts](apps/qti-prosemirror-item/src/attributes-panel-plugin.ts).

What this plan refactors is the *other* (shared) panel used by `qti-prosekit-item`:

- The dedicated title/identifier form: [apps/qti-prosekit-item/src/components/blocks/composer-metadata-form/composer-metadata-form.ts](apps/qti-prosekit-item/src/components/blocks/composer-metadata-form/composer-metadata-form.ts)
- The shared base panel: [packages/prose-extensions/src/prosemirror/attributes-ui/attributes-ui.ts](packages/prose-extensions/src/prosemirror/attributes-ui/attributes-ui.ts)
- The QTI wrapper panel: [packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts)
- The `hiddenAttributes` flag in the descriptor interface: [packages/prose-qti/src/interfaces/attributes.ts:31](packages/prose-qti/src/interfaces/attributes.ts#L31)

### Target behaviour (verbatim from the user)

1. **Remove the dedicated title+identifier panel** — those are document attributes; the generic walker surfaces them when the cursor is in the `doc` node.
2. **Refactor the attribute panel** to work the same way as the `qti-prosemirror-item` plugin: walk ancestor chain → render one section per element → render descendants section below.
3. **Remove the `hidden`/`hiddenAttributes` flag** entirely from the descriptor/metadata.
4. **Custom shadcn panels replace, not supplement** the generic "attributes for this element" section. The descendants section is unaffected.

### Goal (leaner / more in the doc) — must be measured

- Hardcoded property special-cases (the `if (editor.kind === ...)` switch, the metadata form, the hidden-attr filter) must go down.
- More attributes should be sourced from descriptors/doc, fewer from hand-rolled UI.
- Verification phase compares BEFORE/AFTER counts captured here.

### BEFORE measurement (baseline — do not edit)

| Metric | Count | Source |
|---|---|---|
| `hiddenAttributes` declarations | 3 files | [choice/composer/metadata.ts:44](packages/prose-qti/src/components/choice/composer/metadata.ts#L44), [extended-text/composer/metadata.ts:24](packages/prose-qti/src/components/extended-text/composer/metadata.ts#L24), [text-entry/composer/metadata.ts:35](packages/prose-qti/src/components/text-entry/composer/metadata.ts#L35) |
| Distinct hidden attribute names | 3 | `class`, `caseSensitive`, `correctResponse` |
| `hiddenAttributes` consumer call-sites | 2 | [attributes-ui.ts:239-244](packages/prose-extensions/src/prosemirror/attributes-ui/attributes-ui.ts#L239-L244), [attributes-panel.ts:78](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts#L78) |
| Friendly-editor `editor.kind` switch branches | 3 | [attributes-panel.ts:148,157,161](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts#L142-L166) |
| Title/identifier hardcoded refs (panel/UI/glue) | 12 | mostly [qti-editor-app.ts](apps/qti-prosekit-app/src/components/qti-editor-app.ts) |
| Dedicated metadata-form component | 1 (91 lines) | [composer-metadata-form.ts](apps/qti-prosekit-item/src/components/blocks/composer-metadata-form/composer-metadata-form.ts) |
| `metadata-change` event glue in host | lines 35-46, 55-62, 200-205 | [qti-prosekit-item.ts](apps/qti-prosekit-item/src/qti-prosekit-item.ts) |
| Shared attributes panel size (LoC) | 461 + 260 | `attributes-ui.ts` + `attributes-panel.ts` |

---

## Phase 0 — Documentation Discovery (already completed)

The findings above are the Phase 0 output. Key allowed APIs / patterns to copy:

- **Ancestor walker:** [apps/qti-prosemirror-item/src/attributes-panel-plugin.ts:52-80](apps/qti-prosemirror-item/src/attributes-panel-plugin.ts#L52-L80) — `collectAncestorChain()`. Walk via `$from.depth` → `$from.node(d)`, terminate at the doc node, filter by `schema.spec.attrs` keyset.
- **Section rendering:** same file, [lines 144-218](apps/qti-prosemirror-item/src/attributes-panel-plugin.ts#L144-L218) — `#render` / `#buildSection` / `#buildField`.
- **Mutation:** [lines 220-226](apps/qti-prosemirror-item/src/attributes-panel-plugin.ts#L220-L226) — `tr.setNodeMarkup` for inner nodes, `tr.setDocAttribute(key, value)` for the doc.
- **Descriptor source of truth:** [packages/prose-qti/src/core/interactions/composer.ts:71-91](packages/prose-qti/src/core/interactions/composer.ts#L71-L91) — `panelMetadataByNodeTypeName` + `getNodeAttributePanelMetadataByNodeTypeName()`.
- **Doc schema attrs:** [apps/qti-prosemirror-item/src/schema.ts:58](apps/qti-prosemirror-item/src/schema.ts#L58); [apps/qti-prosekit-app/src/extensions/basic-extension.ts:55-56](apps/qti-prosekit-app/src/extensions/basic-extension.ts#L55-L56).
- **Export already reads from doc attrs:** [packages/prose-qti/src/item-roundtrip/export.ts:26-32](packages/prose-qti/src/item-roundtrip/export.ts#L26-L32) — no sidecar to delete.

**Anti-patterns to avoid:**
- Do NOT invent a new "panel registry" abstraction. The friendly-editor list already exists on each descriptor's metadata; use it.
- Do NOT keep the `hiddenAttributes` filter as a "just in case" — remove it; with the replace-not-supplement contract for custom panels, it becomes dead weight.
- Do NOT delete `composer-metadata-form` before the generic panel surfaces doc-level attrs (Phase 2 enables, Phase 3 deletes).
- Do NOT special-case `title`/`identifier` anywhere new. They are just doc attrs.

---

## Phase 1 — Make the descriptor declare doc-level attributes

**Goal:** the generic ancestor walker, when sitting at the doc node, must render `title` and `identifier` from the descriptor — not from a separate form.

**Tasks:**
1. Add a descriptor metadata entry for the doc node in the prosekit-app descriptor pipeline (parallel to how `qtiChoiceInteraction` etc. are declared). The entry lists `title` and `identifier` as editable attributes with appropriate field types (text input).
   - Reference shape: any existing `metadata.ts` under [packages/prose-qti/src/components/*/composer/metadata.ts](packages/prose-qti/src/components/).
   - Registration shape: see [packages/prose-qti/src/core/interactions/composer.ts:71-75](packages/prose-qti/src/core/interactions/composer.ts#L71-L75) — append to `panelMetadataByNodeTypeName` keyed under the doc node type name.
2. Verify `getNodeAttributePanelMetadataByNodeTypeName('doc')` (or whatever the doc node type name is in this schema — confirm before writing) returns the new entry.

**Verification:**
- `pnpm typecheck` clean.
- Console-log the lookup result inside the panel for the doc node — must include `title` and `identifier`.
- Do NOT touch the metadata form yet.

**Anti-pattern guards:**
- Do not add a second source of truth ("isDocAttribute" flag). Reuse the standard attribute descriptor shape.

---

## Phase 2 — Replace the shared attribute panel with an ancestor-walker

**Goal:** make `packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts` behave like the prosemirror-item plugin — one section per ancestor up to and including the doc node, plus the descendants section.

**Tasks:**
1. Copy the ancestor-collection logic from [apps/qti-prosemirror-item/src/attributes-panel-plugin.ts:52-80](apps/qti-prosemirror-item/src/attributes-panel-plugin.ts#L52-L80) into the shared panel. Keep it as a pure function so both panels can share it (move it into `packages/prose-extensions/.../attributes-ui.ts` and re-export).
2. Replace the current `renderPanel()` of `ProsekitAttributesPanel` ([packages/prose-extensions/.../attributes-ui.ts:413-449](packages/prose-extensions/src/prosemirror/attributes-ui/attributes-ui.ts#L413-L449)) so it loops over the ancestor chain and emits one section per node (deepest first, doc last, or whichever order matches the prosemirror-item reference — verify before coding).
3. Implement the **replace-not-supplement** contract for custom panels:
   - For each ancestor node, look up `metadata.friendlyEditors` for that node type.
   - If a friendly editor exists for that node type, render ONLY that custom panel (no generic field list, no header chrome that duplicates it).
   - Else render the generic section with one field per attribute (using the existing field renderer).
4. Keep the descendants section as it is — it is orthogonal.
5. Update the mutation path: per-node attrs via `tr.setNodeMarkup($from.before(d), null, newAttrs)`; doc attrs via `tr.setDocAttribute(k, v)`. Both patterns are in the prosemirror-item plugin at [lines 220-226](apps/qti-prosemirror-item/src/attributes-panel-plugin.ts#L220-L226).

**Verification:**
- Place cursor inside a `qtiSimpleChoice` deep in a `qtiChoiceInteraction` → panel shows: section for `qtiSimpleChoice` (generic fields), section for `qtiChoiceInteraction` (custom choice panel ONLY, replacing what was there), section for doc (`title` + `identifier` fields).
- Edit `title` in the panel → ProseMirror transaction `setDocAttribute('title', …)` fires → re-render reflects new value.
- Edit `maxChoices` on the choice interaction via the custom panel → still works.
- No console errors.

**Anti-pattern guards:**
- Custom friendly editor MUST NOT be rendered alongside generic fields. If both appear, the contract is broken.
- Do not bypass the descriptor — the panel must not know element names directly except via `friendlyEditors` lookups.

---

## Phase 3 — Delete the dedicated title/identifier form & glue

**Goal:** physically remove what is now obsolete.

**Tasks:**
1. Delete [apps/qti-prosekit-item/src/components/blocks/composer-metadata-form/composer-metadata-form.ts](apps/qti-prosekit-item/src/components/blocks/composer-metadata-form/composer-metadata-form.ts) and its directory.
2. Remove its mount in [apps/qti-prosekit-item/src/qti-prosekit-item.ts:200-205](apps/qti-prosekit-item/src/qti-prosekit-item.ts#L200-L205).
3. Remove the `metadata-change` event handler in the same file at lines 35-46 and 55-62.
4. Audit [apps/qti-prosekit-app/src/components/qti-editor-app.ts](apps/qti-prosekit-app/src/components/qti-editor-app.ts) for the 12 title/identifier references identified in Phase 0. Keep only the ones that are real data-flow needs (e.g. lines 137-138, 169-170 — reading current values for app-level state). Delete any that were there to feed the dedicated form.
5. Remove any CSS / wrapper card around the deleted component.

**Verification:**
- `grep -r "composer-metadata-form\|metadata-change" apps packages` returns nothing.
- App still loads. Title and identifier are still editable — now via the attribute panel when the cursor is anywhere (the doc section is always present in the chain).
- Round-trip export still works (export already reads `doc.attrs.title` / `doc.attrs.identifier`).

**Anti-pattern guards:**
- Do not leave the file as `_unused.ts` or with a "removed" comment. Delete it.

---

## Phase 4 — Remove the `hidden`/`hiddenAttributes` flag

**Goal:** eliminate the hidden-attribute concept now that custom panels replace (not supplement) the generic section.

**Tasks:**
1. Remove the `hiddenAttributes` field from the interface at [packages/prose-qti/src/interfaces/attributes.ts:31](packages/prose-qti/src/interfaces/attributes.ts#L31).
2. Remove the consumer in [packages/prose-extensions/src/prosemirror/attributes-ui/attributes-ui.ts:239-244](packages/prose-extensions/src/prosemirror/attributes-ui/attributes-ui.ts#L239-L244).
3. Remove the consumer in [packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts:78](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts#L78).
4. Remove `hiddenAttributes: [...]` declarations from all three metadata files:
   - [packages/prose-qti/src/components/choice/composer/metadata.ts](packages/prose-qti/src/components/choice/composer/metadata.ts)
   - [packages/prose-qti/src/components/extended-text/composer/metadata.ts](packages/prose-qti/src/components/extended-text/composer/metadata.ts)
   - [packages/prose-qti/src/components/text-entry/composer/metadata.ts](packages/prose-qti/src/components/text-entry/composer/metadata.ts)
5. Confirm none of the formerly-hidden attributes (`class`, `caseSensitive`, `correctResponse`) leak into the UI as a duplicate field — they should NOT, because the custom panel REPLACES the generic section for these three element types (Phase 2 contract).

**Verification:**
- `grep -rn "hiddenAttributes\|hidden:" packages apps | grep -v test` returns nothing meaningful.
- `pnpm typecheck` clean.
- Open a `qti-choice-interaction` in the editor: the choice section shows ONLY the custom panel — no generic `class` field appears.
- Same check for `qti-text-entry-interaction` (no `class`, no `caseSensitive`, no `correctResponse` duplicated by the generic renderer).
- Same for `qti-extended-text-interaction`.

**Anti-pattern guards:**
- Do not leave the `hiddenAttributes` field optional-and-ignored. Delete it from the type.

---

## Phase 5 — Verify the leaner-logic goal

**Goal:** prove the refactor met the "less hardcoding, more in the doc" target.

**AFTER measurement — collect and compare to the table at the top:**

| Metric | Before | After (target) | How to measure |
|---|---|---|---|
| `hiddenAttributes` declarations | 3 | **0** | `grep -rn "hiddenAttributes" packages apps` |
| `hiddenAttributes` consumer sites | 2 | **0** | same grep |
| Friendly-editor `editor.kind` switch branches | 3 | **0** (replaced by descriptor lookup) | grep `editor.kind` in [attributes-panel.ts](packages/prose-qti-ui/src/components/attributes-panel/attributes-panel.ts) |
| Dedicated metadata-form components | 1 (91 LoC) | **0** | file existence |
| `metadata-change` event glue | 3 sites | **0** | `grep -rn "metadata-change" apps packages` |
| Title/identifier references in app glue | 12 | ≤ 4 (read-only access for app state) | grep |
| Shared attributes panel LoC (`attributes-ui.ts` + `attributes-panel.ts`) | 461 + 260 = 721 | meaningfully lower (target: < 600 combined; if not, justify) | `wc -l` |

**Tasks:**
1. Run each grep / `wc -l` command above. Record exact numbers in a "Results" subsection at the bottom of this file.
2. If any AFTER number is not strictly lower than BEFORE, write a one-paragraph justification in the same Results subsection (e.g. "ancestor-walk added 40 LoC because the shared helper now lives here") — the user wants the truth, not an artificially trimmed number.
3. Run the full test suite (`pnpm test`) and the editor app manually with three sample items: one with choice, one with text-entry, one with extended-text. For each: confirm cursor inside the interaction shows ONLY the custom panel for that element's section, and confirm cursor anywhere shows the doc section with editable title/identifier.

**Done when:** Results subsection is filled in, all greps return the expected zero counts (or a justification exists), and manual verification on all three custom-panel interactions passes.

---

## Results (after execution)

| Metric | Before | After | Notes |
|---|---|---|---|
| `hiddenAttributes` declarations | 3 | **0** | Removed from choice / extended-text / text-entry metadata. |
| `hiddenAttributes` consumer sites | 2 | **0** | Removed from `attributes-ui.ts` filter and `attributes-panel.ts` resolver. Interface field deleted. |
| Friendly-editor `editor.kind` switch branches | 3 | **3** | **Did not eliminate.** The QTI panel still switches on `editor.kind` to mount the right shadcn component. Replacing the switch with a kind→tag registry would add a layer of indirection, not subtract one — kept honest. |
| Dedicated metadata-form components | 1 (91 LoC) | **0** in `qti-prosekit-item` | Removed in the explicit target. `apps/qti-prosekit-app` and `apps/site` still have their own copies (slug auto-generation, validation warnings); flagged as follow-up. |
| `metadata-change` event glue (qti-prosekit-item) | 3 sites | **0** | `onMetadataChange` handler removed; `saveQti` now reads doc attrs. |
| `composer-metadata-form` import in qti-prosekit-item | 1 | **0** | Side-effect import gone; directory deleted. |
| Shared attributes panel LoC (`attributes-ui.ts` + `attributes-panel.ts`) | 461 + 260 = 721 | 444 + 234 = **678** | Net −43 LoC. Switcher + active-node bookkeeping removed; stacked render replaced single-active render. |
| Node-switcher tab UI | yes | **no** | Stacked sections (doc outermost → innermost) per reference plugin. |
| Custom panel integration mode | supplement | **replace** | Friendly editors now fully replace the generic section for their node type. Generic readonly fold-out no longer competes with the custom UI. |

**Goal:** "leaner logic, fewer hardcoded properties, more attributes in the document." Verdict:
- The single hardcoded title/identifier form is gone in the target app, replaced by the same generic walker that handles every other ancestor — title/identifier now flow through the document attribute path, no special-case glue.
- `hiddenAttributes` is gone entirely (concept removed, not just unused).
- The base panel no longer juggles a "selected ancestor" — it just renders every ancestor section, and the per-section render is one branch (custom or generic).
- The `editor.kind` switch survived because the friendly-editor wiring is the user-defined replacement surface — removing it would just move the mapping elsewhere.

**Tests:** 134/134 unit tests pass. Type-check clean across `prose-extensions`, `prose-qti`, `prose-qti-ui`, and the `qti-prosekit-item` app.

**Manual verification:** not yet performed in this session — recommend opening qti-prosekit-item with sample items containing choice / extended-text / text-entry interactions, placing cursor inside each, and confirming the stacked sections render with the friendly editor replacing the generic block for those interactions, plus a doc section at the top with editable title + identifier fields.

**Follow-ups** (not in this plan's scope):
- `apps/qti-prosekit-app` and `apps/site` still embed their own `qti-composer-metadata-form` copies. They render the new attribute panel too, so title/identifier now appear in two places. Consider removing the forms — but their slug-auto-generation and identifier-empty validation warnings would need to migrate to the attribute panel (e.g. via richer field metadata or a hook on the doc section) before deletion.

---

## Out of scope

- Touching `apps/qti-prosemirror-item` — it is already the reference, not the target.
- The AI integration ([feedback_quickstart_shape](.../memory/feedback_quickstart_shape.md)) is unrelated to this work.
- Reworking the descendants section visual design — only the "attributes-for-current-element" section changes.
