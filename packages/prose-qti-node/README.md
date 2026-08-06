# @citolab/prose-qti-node

QTI 3.0 ↔ ProseMirror conversion for plain Node. No browser, no web components.

This is the Node-targeted build of [`@citolab/prose-qti`](https://www.npmjs.com/package/@citolab/prose-qti):
the same conversion pipeline and the same schema, bundled so that `node` can import it
directly. `linkedom` is reached only through this package, so a browser consumer importing
`@citolab/prose-qti` never pulls a DOM shim into their bundle.

## Installation

```bash
pnpm add @citolab/prose-qti-node
```

`prosemirror-model`, `prosemirror-state` and `prosemirror-commands` are peer dependencies —
install them alongside if you do not already have them.

## Usage

```js
import { qti3ToPm, pmToQti3, createQtiSchema } from '@citolab/prose-qti-node';

const schema = createQtiSchema();
const doc = qti3ToPm(schema, qtiXml);
const xml = pmToQti3(doc);
```

The DOM is installed as an **import side effect** — importing the package is enough, and there
is no setup call to forget. `installNodeDom` is exported for the rare case where a host needs to
install it explicitly.

### Exports

| Export | Purpose |
|---|---|
| `createQtiSchema` | Build the ProseMirror schema for QTI documents |
| `qti3ToPm` / `pmToQti3` | Convert between QTI 3.0 XML and a ProseMirror document |
| `htmlToPm` / `pmToHtml` | Convert between HTML and a ProseMirror document |
| `validateHtml` | Check HTML against the schema |
| `schemaToJson` | Serialise the schema — node grammar, groups and attributes — as plain JSON |
| `installNodeDom` | Install the Node DOM explicitly; normally unnecessary |

## Verified

All 17 `ITEM` regression fixtures roundtrip through `qti3ToPm` → `pmToQti3` in plain Node and
reproduce the same snapshots the browser tests assert against.

## Known limitations

- **`@qti-components/*` dists use extensionless relative imports**, which Node's ESM resolver
  rejects. Consuming those packages from Node needs a resolve hook or a bundler; nothing here
  can paper over it.
- **linkedom drops the `xmlns:xsi` declaration** on serialize, so emitted QTI is
  namespace-incomplete. The document model itself is unaffected.
- **`htmlToPm` roundtrip identity does not hold** across the whole regression corpus. Treat
  `validateHtml` failures on match and associate as suspect — the result carries a `suspect`
  flag for exactly that reason.
