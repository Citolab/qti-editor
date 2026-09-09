# Replacing the compatibility messages

When an imported item contains something the schema cannot hold, the editor says so. This is how to
change what it says — a translation, a house style, a name for your own node types — without forking
anything.

**The contract is the facts, not the sentence.** Every finding is reported as a `SchemaGapChange`: a
`kind`, a `code`, the type involved, and an excerpt of the content. The English `message` on it is a
*fallback* — for logs, and for cases a host has written no phrasing for. Nothing in this repo parses
it. Neither should you.

`SchemaGapChange` is declared by `schema-gaps` itself rather than imported, so the module stays
liftable. It remains structurally assignable to `CompatibilityChange`: `SchemaGapCode` is a subset of
`CompatibilityChangeCode`, so a host that models a migration ladder as well can keep both kinds of
change in one list with no adapter.

## The kinds

One, and it is declared as a closed set anyway. `switch` on `change.kind` and the compiler will tell
you what you missed when a second scan is added.

| kind | what happened | fields worth reading |
|---|---|---|
| `unrepresentable-element` | an element in imported markup that no `parseDOM` rule matches | `nodeType` (tag name), `data.unwrappedChildren`, `data.excerpt` |

Two scans produce it, and they are told apart by `code` rather than by `kind`, because the sentence
they want is the same: *"this has no equivalent in this editor"*, about a file being imported.
`findUnrepresentableElements` uses `UNKNOWN_NODE_PRESERVED` for an element the schema cannot match;
`findUnrepresentableResponseProcessing` uses `UNSUPPORTED_CONTENT_PRESERVED` for scoring the editor
cannot model.

The five kinds that described **JSON salvage** — `unwrapped-node`, `dropped-mark`,
`reset-attribute`, `dropped-attribute`, `dropped-entry` — were removed on 2026-09-08 along with
`salvageJsonDocument` and the recovery-marker plugin, and so were `recoveryKindOf`, `siteIdOf`,
`excerptOf` and `data.siteId`. Nothing in this repo produced or read them. The module was called
`schema-recovery` until the same date; the `Recovery*` type names went with it.

## Three seams, by where you sit

### Consuming `@citolab/prose-qti` in your own editor

Pass `getMessage` to whichever function produces the changes. It receives the whole change — `kind`
included — and returns a replacement, or `undefined` to keep the built-in English. The default is
already set when your resolver runs, so overriding the cases you care about and ignoring the rest is
the normal case.

```ts
import {
  findUnrepresentableElements,
  TRANSPARENT_WRAPPER_TAGS,
  type SchemaGapMessageResolver,
} from '@citolab/prose-extensions/schema-gaps';

const messages: SchemaGapMessageResolver = change => {
  switch (change.kind) {
    case 'unrepresentable-element':
      return `«${change.nodeType}» kan hier niet worden weergegeven`;
    default:
      return undefined; // keep the built-in English
  }
};

findUnrepresentableElements(schema, itemBody, {
  getMessage: messages,
  ignoreTags: TRANSPARENT_WRAPPER_TAGS,
});
```

A resolver can narrow further on the fields it is handed — `change.code` to tell an unmatched element
from unmodellable scoring, `change.nodeType` for a phrasing per tag.

The response-processing scan takes the same `getMessage`, passed through the entry point that reaches
it:

```ts
const { itemBody, scoringGaps } = itemBodyAndGapsFromString(xml, { getMessage: messages });
```

It is not a separate exported function on purpose — see `architecture.md`; the scan needs the whole
item, which is destroyed before any caller of `itemBodyFromString` gets a value back.

Migration *steps* have had the same seam for longer, with an older signature —
`getMessage: (code, data) => string | null | undefined` on `composeJsonStep`. A
resolver written against it adapts in one line: `change => existing(change.code, change.data ?? {})`.
The recovery functions take the whole change because `code` alone cannot tell their cases apart, and
`nodeType` is a field on the change rather than an entry in `data`.

There is deliberately **no** global registry to call at startup. Two consumers on one page would
fight over one mutable table and a test would have to remember to reset it; a per-call option carries
the same information with none of that.

### Embedding the full editor

The editor application lives in its own repository (`qti-editor-full-assessment`); the code below is
from there, not from this checkout.

Everything the notice says is an i18next key, and i18next is already runtime-mutable. The instance is
exported, so an embedder can restyle every sentence after load, with no rebuild:

```ts
import { i18n } from './i18n.js';

i18n.addResourceBundle(i18n.language, 'translation', {
  compatibilityRemoved_other: '{{count}} onderdelen zijn verwijderd bij het openen.',
  compatibilityTypeLabel: { qtiGapMatchInteraction: 'gap-match question' },
}, true, true);
```

The keys, all prefixed `compatibility`:

| key | shown |
|---|---|
| `compatibilityRemoved_one` / `_other` | the banner headline, with `count` |
| `compatibilityKeptRest` | the reassurance after it |
| `compatibilityGroupContent` / `Formatting` / `Settings` / `Other` | the four detail headings |
| `compatibilityContentRemoved` | a removed node or element, with `name` |
| `compatibilityFormattingRemoved` | a dropped mark, with `name` |
| `compatibilitySettingReset` / `SettingRemoved` | an attribute, with `attribute` and `name` |
| `compatibilitySettingRejectedValue` | the value that was rejected, with `value` |
| `compatibilityKeptChildren` (`count`) / `compatibilityKeptNothing` | what survived at the site |
| `compatibilitySettingChangedHere` | a marker tooltip for an attribute change |
| `compatibilityUnnamedContent` | stand-in when the type is unknown |
| `compatibilityCouldNotOpen`, `FileUntouched`, `FileUnreadable`, `FileUnreadableAtVersion` | the refusal banner |
| `compatibilityShowDetails`, `HideDetails`, `Dismiss`, `DownloadOriginal`, `GoTo` | the buttons |
| `compatibilityTypeLabel.<type>` | a name for one node or mark type |

`compatibilityTypeLabel` ships empty on purpose. Without an entry, a name is derived from the type
itself — `qtiGapMatchInteraction` becomes "gap match interaction" — which is the only approach that
works for the long tail, since the types that show up here are by definition the ones the schema no
longer has. Add entries for the ones worth saying differently.

### Rendering the notice yourself

**No package ships a notice.** `@citolab/prose-extensions/schema-gaps` reports the findings and
stops there, because the shape of the answer is the consumer's: a banner above the editor, a line in
a log, a row in a panel that is already on screen, a dialog that blocks the save. A renderer in the
package would be one of those choices imposed on all of them.

What you get instead is the data, and the fields are the contract: each change carries a `kind`, a
`code`, `nodeType` (the tag name) and `data.excerpt` (the author's own text, quoted). Group them,
count them, phrase them however suits.

Two implementations to read, deliberately unlike each other:

| where | shape |
|---|---|
| `apps/qti-example-editor/src/components/schema-gap-notice.ts` | plain DOM, no framework, one line per element type, its own stylesheet beside it |
| `qti-editor-full-assessment`'s `compatibility-notice.tsx` | React + i18next, grouped, dismissable, with a download-the-original button |

The first is about 100 lines and is the one to copy if you have no framework. Note what it does *not*
read: `change.message`. It renders from the facts and leaves the English to logs — which is why
`getMessage` above and a notice's own wording are separate seams.

`heading` in that implementation is a function of the count rather than a template with a
placeholder, because languages disagree about plurals and a template decides those rules on the
translator's behalf. Worth keeping if you copy it.

## What is not overridable

- **Severity and grouping.** Which bucket a kind falls into is a judgement about the content, not
  about wording, and a host that wants a different arrangement should render the changes itself —
  they are data.
- **The excerpt.** It is the author's own text, quoted. Both scans take an `excerptLimit` — 60
  characters by default for the DOM scan, 80 for the response-processing scan.
- **The English fallback.** By design: a resolver that returns nothing, or throws, must cost the
  reader a translation rather than the record of what happened.
