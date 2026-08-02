/**
 * The hand-authored half of schema/: prose about the document model, and the one list the generator
 * cannot derive.
 *
 * schema/ reads authored → compute → write:
 *
 *   notes.ts            this file. What a human wrote and the schema cannot know.
 *   content-model.ts    builds the real editor schema and shapes it. Pure; no I/O.
 *   generate.ts         the CLI. Writes content-model.json and __interactions__/.
 *
 * ## What this file is now
 *
 * It was `content-model.mjs` and carried a full copy of the schema — NODES, MARKS and GROUPS —
 * diffed against the built schema to catch drift. That copy is gone. `content-model.json` and the
 * per-interaction fixtures under `__interactions__/` are generated from the real schema, so the data
 * no longer needs a hand-maintained twin; keeping one meant every schema change demanded a manual
 * edit here before the check would pass, which is the exact cost the fixtures remove.
 *
 * Renamed with it, because the old name had stopped being true: the content model lives in
 * content-model.json, and what is left here is notes. `.ts` rather than `.mjs` because nothing
 * outside schema/ ever imported it, so the extension bought no portability — only an exemption from
 * typechecking.
 *
 * What could not be generated is the prose: why the editor narrows the standard, what the XSD
 * permits that we do not, and which decisions are load-bearing. That is what remains.
 *
 * ## NOTES ends up in content-model.json
 *
 * Each entry is emitted as that node's `note` field, so a consumer reading only the JSON gets the
 * reasoning too. That is the point: these were JS comments in a `.mjs`, invisible to the C# and
 * Python parsers the JSON exists for, and invisible to LLM generation — which is precisely the
 * audience that benefits most from "the XSD makes qti-prompt optional; the editor requires it".
 *
 * A key naming a node that no longer exists fails `content-model.browser.test.ts`, so a note cannot
 * outlive what it describes.
 */
export const NOTES: Record<string, string> = {
  doc: "apps/qti-prosekit-app narrows this to `heading paragraph qtiItemDivider block*` to pin a locked title/intro header. That is an app decision, not part of the portable core.",
  paragraph: "The `richtext` membership cannot be patched on from an extension: ProseKit's `defineParagraph()` wraps its spec in `withPriority(spec, 4)` — the highest — so paragraph's payload reduces last and `mergeSpecs` lets its own `group: 'block'` overwrite any later patch. A `defineNodeSpec({name:'paragraph', group:'block richtext'})` from an extension is silently discarded, with no error and no warning. So the group is declared on the spec itself. `defineBasicExtension` in prose-extensions/src/prosekit/basic.ts composes paragraph from ProseKit's exported commands and keymap plus a spec of its own, never admitting the priority-4 spec to the union. qtiRubricBlock's `richtext+` depends on this.",
  image: "Block, not inline. Worth stating plainly: a bare `<img>` in running text does not survive as inline content — it is lifted out of the paragraph. XSD: no `alt`. The standard requires a text alternative and the editor does not model one here. (imgSelectPoint does, as `imageAlt`.)",
  ordered_list: "XSD: `start` and `type`. ProseMirror's list package models only the start number, as `order`; list-marker style is left to CSS.",
  table: "No `caption` node exists. `thead` / `tbody` / `colgroup` are likewise absent, as prosemirror-tables omits them — `th` carries the accessibility weight. `richtext` is patched on by `defineBasicExtension`, not declared by prosekit's `defineTable()`. Unlike paragraph, table's spec carries no priority override, so an ordinary `defineNodeSpec` patch reaches it.",
  tableCell: "XSD: `th` also carries `scope`. Not modelled — screen-reader table navigation currently relies on the th/td distinction alone.",
  qtiMatchInteraction: "Exactly two match sets: sources first, then targets. The direction is what makes a `correct-response` pair mean anything. XSD: permits an empty match set (`minOccurs=\"0\"`) — see qtiSimpleMatchSet.",
  qtiMatchInteractionTabular: "Same tag as qtiMatchInteraction. The only discriminator is `class~=\"qti-match-tabular\"`: the tabular parse rule requires it at priority 80, and the non-tabular rule returns false when it is present. Two PM nodes, one markup element.",
  qtiGapMatchInteraction: "The draggable sources come first as a flat list, then the prose holding the gaps. XSD: `qti-gap-text` is `+`. The editor requires two — a single-source gap match is a degenerate interaction with only one possible answer.",
  qtiHottextInteraction: "The exception to the prompt rule: no prompt at all. Hottext choices are embedded in running text, so the instruction and the answerable content are the same paragraphs — a separate prompt would have nothing to say. XSD: nests hottexts inside the full block model. Collapsed to `paragraph+`.",
  qtiExtendedTextInteraction: "Prompt only — the response is a textarea the runtime supplies, with no authored content.",
  qtiSelectPointInteraction: "XSD: allows `object | img | picture`. The editor uses a dedicated `imgSelectPoint` node rather than the generic `image`, because the image here is the response surface — its coordinates are the answer key — and it must not be draggable, liftable or replaceable the way a decorative image is. Note this one is `isolating` but not `defining`.",
  qtiInlineChoiceInteraction: "XSD: has a leading `qti-label?`. The editor uses the `data-prompt` attribute instead, so the element has no child prompt.",
  qtiTextEntryInteraction: "Leaf: the input is the interaction. It sits inside a paragraph, between text. `marks: '_'` so it survives inside emphasised or bold runs.",
  qtiSimpleMatchSet: "XSD: permits an empty match set (`minOccurs=\"0\"`). Valid, and never what anyone means.",
  qtiSimpleAssociableChoiceParagraph: "The one choice body that is `inline*` rather than `text*`, so marks and hard breaks survive here. It belongs to no group — reachable only through its parent.",
  qtiGap: "Leaf: a drop target. Its content is whatever the candidate puts there.",
  qtiPrompt: "XSD: a prompt is static content — inline and block, no interactions. The editor is stricter still: exactly one paragraph of text. The static/non-static split the standard needs to keep interactions out of prompts is therefore unnecessary here; `text*` already admits nothing to nest. Belongs to no group — reachable only as a named child of an interaction.",
  imgSelectPoint: "The response surface of a select-point interaction. A leaf: its coordinates are the answer key, so it is selected and replaced whole, never edited in place.",
  qtiMediaStub: "Not declared by any descriptor. Injected by the composer from `baseSchemaDependencyNodeSpecs.qtiMedia` when a descriptor declares `baseSchemaDependencies.nodeGroups: ['qtiMedia']` — associate, match and matchTabular do. It exists so `qtiSimpleAssociableChoice`'s `| qtiMedia` branch resolves in schemas that include those interactions but not select-point.",
  qtiRubricBlock: "Author-facing instructions / scoring / navigation guidance. `richtext+` deliberately excludes interactions: a rubric is prose about the item, never part of it. On the wire the body is wrapped in a `qti-content-body` element. That wrapper is pure serialization framing and has no PM node. A group, not the four node types spelled out. Spelling them out looks like it removes a coordination requirement and in fact tightens one: a group reference resolves as long as *some* node carries the group, whereas a name reference obliges every host schema to define that exact node. The pure-ProseMirror hosts — the e2e story harnesses among them, built on `prosemirror-schema-basic` — have no table or list nodes, and naming those makes `new Schema()` throw outright. What was genuinely broken before was paragraph's membership, patched on from an extension and silently dropped (see the note on `paragraph`), leaving the group as tables and lists only. A rubric block came out holding a table, and qti-rubric-block.commands.ts — which builds one around a paragraph — produced a document that failed `.check()`. Paragraph now declares `richtext` on its own spec, so the group is whole."
};

/**
 * Nodes whose `identifier` attribute a `correct-response` may reference.
 *
 * Authored input, not documentation: the generator emits it into content-model.json as `identified`,
 * and the test asserts every name here really has an `identifier` attribute in the built schema.
 */
export const IDENTIFIED: readonly string[] = [
  'qtiSimpleChoice',
  'qtiSimpleAssociableChoice',
  'qtiGap',
  'qtiGapText',
  'qtiHottext',
  'qtiInlineChoice'
];
