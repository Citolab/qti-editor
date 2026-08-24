# Replacing the compatibility messages

When a document or an imported item contains something the schema cannot hold, the editor says so.
This is how to change what it says — a translation, a house style, a name for your own node types —
without forking anything.

**The contract is the facts, not the sentence.** Every removal is reported as a
`CompatibilityChange`: a `kind`, a `code`, the type involved, and an excerpt of the content. The
English `message` on it is a *fallback* — for logs, and for cases a host has written no phrasing for.
Nothing in this repo parses it. Neither should you.

## The kinds

Six, and they are a closed set. `switch` on `change.kind` and the compiler will tell you what you
missed.

| kind | what happened | fields worth reading |
|---|---|---|
| `unwrapped-node` | a stored node's type is not in the schema; its children took its place | `nodeType`, `data.unwrappedChildren`, `data.excerpt` |
| `dropped-mark` | a mark type is not in the schema; the text it covered was kept | `nodeType` (the node it was on), `data.markType`, `data.excerpt` |
| `reset-attribute` | the stored value failed the spec's `validate`, so the default applies | `nodeType`, `attributeName`, `data.rejectedValue` |
| `dropped-attribute` | the schema does not declare that attribute at all | `nodeType`, `attributeName` |
| `dropped-entry` | an entry in the content array was not a node | `path` |
| `unrepresentable-element` | an element in imported markup that no `parseDOM` rule matches | `nodeType` (tag name), `data.unwrappedChildren`, `data.excerpt` |

`unrepresentable-element` is deliberately separate from `unwrapped-node` even though `DOMParser`
unwraps it the same way, because the two want different sentences: one is *"this element has no
equivalent in this editor"* about a file being imported, the other is *"this was removed from your
saved document"* about work already done.

Changes from the **migration ladder** carry no `kind` — they describe edits rather than removals.
`recoveryKindOf(change)` returns `undefined` for those.

Every removal also carries `data.siteId`, which correlates it with the `RecoverySite` the editor marks
in the document. Only sites the editor could resolve are offered for navigation; see
`recovery-channel.ts` in the full editor.

## Three seams, by where you sit

### Consuming `@citolab/prose-qti` in your own editor

Pass `getMessage` to whichever function produces the changes. It receives the whole change — `kind`
included — and returns a replacement, or `undefined` to keep the built-in English. The default is
already set when your resolver runs, so overriding two kinds and ignoring the rest is the normal case.

```ts
import { salvageJsonDocument, findUnrepresentableElements } from '@citolab/prose-qti/schema-recovery';

const messages: RecoveryMessageResolver = change => {
  switch (change.kind) {
    case 'unwrapped-node':
      return `«${change.nodeType}» is verwijderd`;
    case 'dropped-mark':
      return `opmaak ${String(change.data?.markType)} is verwijderd`;
    default:
      return undefined; // keep the built-in English
  }
};

salvageJsonDocument(schema, doc, { getMessage: messages });
findUnrepresentableElements(schema, itemBody, { getMessage: messages });
```

Marker tooltips are separate, because they are rendered rather than reported:

```ts
createRecoveryMarkerPlugin({ describeSite: site => myTooltip(site.site) });
```

Migration *steps* have had the same seam for longer, with an older signature —
`getMessage: (code, data) => string | null | undefined` on `composeJsonStep`. A
resolver written against it adapts in one line: `change => existing(change.code, change.data ?? {})`.
The recovery functions take the whole change because `code` alone cannot tell their cases apart:
three of the six share two codes, and `nodeType` / `attributeName` are fields on the change rather
than entries in `data`.

There is deliberately **no** global registry to call at startup. Two consumers on one page would
fight over one mutable table and a test would have to remember to reset it; a per-call option carries
the same information with none of that.

### Embedding the full editor (`apps/qti-prosekit-app`)

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

### Rendering the notice yourself (`@citolab/prose-qti/schema-recovery/notice`)

`renderSchemaGapNotice` is a plain-DOM renderer for a `SchemaGapOutcome` — no Lit, no React, no
template library — so a host without a framework does not have to write one to find out what its
import dropped. It has no i18n library to hook into and cannot pick one for its hosts, so it takes a
partial messages object; anything omitted keeps the English.

```ts
import { renderSchemaGapNotice } from '@citolab/prose-qti/schema-recovery/notice';
import '@citolab/prose-qti/schema-recovery/notice.css'; // optional; the markup reads unstyled

renderSchemaGapNotice(host, gaps, {
  messages: {
    heading: count => `${count} elementen passen niet in deze editor.`,
    occurrences: count => ` (${count}×)`,
    quote: excerpt => ` → „${excerpt}”`,
  },
});
```

The stylesheet is keyed on classes the function applies itself (`SCHEMA_GAP_NOTICE_CLASS` and
friends, exported for exactly this), never on an element id, so it carries no assumption about where
in a host's layout the notice sits. Positioning is the host's business.

Both editors in this repo use it, which is why it is here and not in either of them.

`heading` is a function of the count rather than a template with a placeholder, because languages
disagree about plurals and a template decides those rules on the translator's behalf.

## What is not overridable

- **Severity and grouping.** Which bucket a kind falls into is a judgement about the content, not
  about wording, and a host that wants a different arrangement should render the changes itself —
  they are data.
- **The excerpt.** It is the author's own text, quoted. The DOM scan takes an `excerptLimit` (60 by
  default); JSON salvage does not, and quotes 60 characters.
- **The English fallback.** By design: a resolver that returns nothing, or throws, must cost the
  reader a translation rather than the record of what happened.
