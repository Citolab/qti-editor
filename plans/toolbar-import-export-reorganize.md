# Plan: Reorganize toolbar import/export

## Goal

Replace the current flat `Import QTI` / `Export QTI` / `Export Package` buttons with:
- **`Import ▾`** dropdown — Import QTI XML · Import JSON · (Import Roundtrip XML — dev only)
- **`Export ▾`** dropdown — Export QTI XML · Export JSON · (Export Roundtrip XML — dev only)
- **`Export Package`** stays as a standalone button (it's a distinct, heavier operation)

Roundtrip XML operations are hidden until a `?dev=true` query param (or `localStorage.setItem('qti-editor:dev', 'true')`) activates dev mode.

---

## Phase 0 — Facts established (do not re-discover)

### Backing functions: what exists today

| Operation | Backing function | Location |
|---|---|---|
| Export QTI XML | `exportXml(options)` | [apps/editor/src/lib/exportXml.ts:18](apps/editor/src/lib/exportXml.ts#L18) |
| Export JSON | `exportJson(node, fileName)` | [apps/editor/src/lib/exportXml.ts:57](apps/editor/src/lib/exportXml.ts#L57) |
| Export QTI Package | `exportPackage(options)` | [apps/editor/src/lib/exportXml.ts:92](apps/editor/src/lib/exportXml.ts#L92) |
| Export Roundtrip XML | `xmlFromNode(node)` | [packages/qti/prosekit-integration/src/save-xml/index.ts:14](packages/qti/prosekit-integration/src/save-xml/index.ts#L14) — returns `<qti-item-body>` string with `data-*` mirrors |
| Import QTI XML | `openXmlFilePicker(options)` | [apps/editor/src/lib/importXml.ts](apps/editor/src/lib/importXml.ts) |
| Import JSON | `importJson(schema)` | [apps/editor/src/lib/exportXml.ts:69](apps/editor/src/lib/exportXml.ts#L69) |
| Import Roundtrip XML | Does not exist yet — needs new function | see Phase 1 |

**Missing:** `exportRoundtripXml` (download `<qti-item-body>` as `.xml`) and `importRoundtripXml` (file picker → `xmlToHTML` → `jsonFromHTML` → set content).

### Integration layers (bottom-up)

1. **`QtiEditorApp`** (Lit, [qti-editor-app.ts](apps/editor/src/components/qti-editor-app.ts)) — public methods: `exportXml`, `exportPackage`, `exportJson`, `importJson`, `importXml`. These are the entry points from React.
2. **`EditorLayout`** ([layout-editor.tsx](apps/editor/src/components/layout/layout-editor.tsx)) — `useImperativeHandle` bridge. Currently exposes: `exportXml`, `exportPackage`, `importXml`. JSON methods not yet wired here.
3. **`editor.tsx`** — creates callbacks (`handleExportXml`, `handleExportPackage`, `handleImportXml`) and passes them to `AppHeader`.
4. **`AppHeader`** ([header.tsx](apps/editor/src/components/layout/header.tsx)) — passes callbacks to `FileActions`.
5. **`FileActions`** ([file-actions.tsx](apps/editor/src/components/file-management/file-actions.tsx)) — renders the toolbar buttons. Currently: New · Save · Import · Export · Export Package.

### i18n file

[apps/editor/src/i18n.ts](apps/editor/src/i18n.ts) — inline `en` and `nl` resource objects. All new keys go there.

### Icon set

[apps/editor/src/lib/icons.tsx](apps/editor/src/lib/icons.tsx) — available: `IconFile`, `IconSave`, `IconFolderOpen`, `IconChevronDown`, `IconPencil`, `IconDownload`, `IconUpload`, `IconTrash`. Use `IconChevronDown` for dropdown arrows; import arrow uses `IconUpload`; export uses `IconDownload`.

### ToolbarButton

[apps/editor/src/components/ui/toolbar-button.tsx](apps/editor/src/components/ui/toolbar-button.tsx) — props: `children`, `onClick`, `title?`, `highlight?`.

---

## Phase 1 — Add missing backing functions

### 1a. `exportRoundtripXml` in `exportXml.ts`

Add after `exportJson`:

```ts
import { xmlFromNode } from '@qti-editor/prosekit-integration/save-xml';

export function exportRoundtripXml(node: ProseMirrorNode, fileName: string = 'item'): void {
  const safeFileName = fileName.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '') || 'item';
  const xml = xmlFromNode(node);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileName}.roundtrip.xml`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 1b. `importRoundtripXml` in `importXml.ts`

Roundtrip XML is a `<qti-item-body>` fragment. Importing it is: file picker → read as text → `xmlToHTML` → `jsonFromHTML` → return node.

Check how `importXmlFromText` works in [importXml.ts](apps/editor/src/lib/importXml.ts) — specifically how it calls `xmlToHTML` and `jsonFromHTML`. Copy that sub-pipeline into a new function:

```ts
import { xmlToHTML } from '@qti-editor/prosekit-integration/save-xml';

export function importRoundtripXml(schema: Schema): Promise<ProseMirrorNode> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,application/xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const html = xmlToHTML(reader.result as string);
          const json = jsonFromHTML(html, schema);  // same helper used by importXmlFromText
          resolve(schema.nodeFromJSON(json));
        } catch {
          reject(new Error('Invalid roundtrip XML'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
```

Read [importXml.ts](apps/editor/src/lib/importXml.ts) fully to find `jsonFromHTML` — it may be an internal helper or from a package. Use whatever pattern `importXmlFromText` uses for the XML → PM doc path. Do not invent a new pipeline.

### 1c. Wire up new methods on `QtiEditorApp`

Add to [qti-editor-app.ts](apps/editor/src/components/qti-editor-app.ts) after the existing `exportJson` / `importJson`:

```ts
exportRoundtripXml(fileName: string = 'item'): void {
  exportRoundtripXml(this.editor.view.state.doc, fileName);
}

async importRoundtripXml(): Promise<void> {
  try {
    const pmDoc = await importRoundtripXml(this.editor.schema);
    this.editor.setContent(pmDoc.toJSON());
    localStorage.setItem(getAutoSaveKey(), JSON.stringify(writePersistedDocStateEnvelope(pmDoc.toJSON())));
    document.dispatchEvent(new CustomEvent('qti:content:change', { bubbles: true }));
  } catch (error) {
    console.error('Failed to import roundtrip XML:', error);
    alert('Failed to import roundtrip XML file.');
  }
}
```

Update imports in qti-editor-app.ts: add `exportRoundtripXml` to import from `../lib/exportXml.js` and `importRoundtripXml` from `../lib/importXml.js`.

### Phase 1 verification

- `pnpm --filter @qti-editor/app typecheck` passes.
- `grep -n "exportRoundtripXml\|importRoundtripXml" apps/editor/src/lib/exportXml.ts apps/editor/src/lib/importXml.ts apps/editor/src/components/qti-editor-app.ts` — 2 hits each (definition + import/call).

---

## Phase 2 — Wire the bridge (`EditorLayout` + `editor.tsx` callbacks)

### 2a. Expand `EditorLayoutHandle`

[layout-editor.tsx](apps/editor/src/components/layout/layout-editor.tsx) — add all new operations to the handle interface and `useImperativeHandle`:

```ts
export interface EditorLayoutHandle {
  exportXml: (fileName?: string) => void;
  exportJson: (fileName?: string) => void;
  exportRoundtripXml: (fileName?: string) => void;
  exportPackage: (fileName?: string) => Promise<void> | undefined;
  importXml: () => void;
  importJson: () => void;
  importRoundtripXml: () => void;
}
```

`useImperativeHandle` body — add:
```ts
exportJson: (fileName) => elRef.current?.exportJson(fileName),
exportRoundtripXml: (fileName) => elRef.current?.exportRoundtripXml(fileName),
importJson: () => elRef.current?.importJson(),
importRoundtripXml: () => elRef.current?.importRoundtripXml(),
```

### 2b. Add callbacks in `editor.tsx`

Following the pattern of `handleExportXml` at [editor.tsx:128](apps/editor/src/editor.tsx#L128), add:

```ts
const handleExportJson = useCallback(() => {
  editorLayoutRef.current?.exportJson(fileName || 'item');
}, [fileName]);

const handleExportRoundtripXml = useCallback(() => {
  editorLayoutRef.current?.exportRoundtripXml(fileName || 'item');
}, [fileName]);

const handleImportJson = useCallback(() => {
  editorLayoutRef.current?.importJson();
}, []);

const handleImportRoundtripXml = useCallback(() => {
  editorLayoutRef.current?.importRoundtripXml();
}, []);
```

Pass all four to `AppHeader` as new props.

### 2c. Thread props through `AppHeader`

[header.tsx](apps/editor/src/components/layout/header.tsx) — add to `AppHeaderProps` interface and destructure:

```ts
onExportJson: () => void;
onExportRoundtripXml: () => void;
onImportJson: () => void;
onImportRoundtripXml: () => void;
isDev: boolean;  // controls roundtrip visibility
```

Pass them down to `FileActions`.

### Phase 2 verification

- `pnpm --filter @qti-editor/app typecheck` passes.
- No new runtime behaviour yet (FileActions not yet changed) — just the bridge.

---

## Phase 3 — New `FileActions` with dropdowns

### 3a. Create `DropdownMenu` component

New file: `apps/editor/src/components/ui/dropdown-menu.tsx`

Simple uncontrolled dropdown — button + absolutely positioned list, closes on outside click.

```tsx
import { useState, useRef, useEffect, type ReactNode } from 'react';

interface DropdownItem {
  label: string;
  title?: string;
  onClick: () => void;
  devOnly?: boolean;
}

interface DropdownMenuProps {
  label: ReactNode;       // button content
  items: DropdownItem[];
  isDev?: boolean;
}

export function DropdownMenu({ label, items, isDev = false }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visible = items.filter(item => !item.devOnly || isDev);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ /* same style as ToolbarButton */ }}
      >
        {label}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,.08)',
          minWidth: '200px', padding: '4px 0',
        }}>
          {visible.map(item => (
            <button
              key={item.label}
              onClick={() => { item.onClick(); setOpen(false); }}
              title={item.title}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 14px', fontSize: '13px',
                border: 'none', background: 'transparent', cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

Style the trigger button to match `ToolbarButton` exactly — copy its inline style object from [toolbar-button.tsx](apps/editor/src/components/ui/toolbar-button.tsx#L26-L47).

### 3b. Rewrite `FileActions`

Replace the existing 5-button layout with:

```tsx
interface FileActionsProps {
  onNew: () => void;
  onSave: () => void;
  onExport: () => void;
  onExportJson: () => void;
  onExportRoundtripXml: () => void;
  onExportPackage: () => void;
  onImport: () => void;
  onImportJson: () => void;
  onImportRoundtripXml: () => void;
  isDirty: boolean;
  isDev: boolean;
}
```

Render:
```tsx
<ToolbarButton onClick={onNew} title={t('fileNewTitle')}><IconFile /> {t('fileNew')}</ToolbarButton>
<ToolbarButton onClick={onSave} title={t('fileSaveTitle')} highlight={isDirty}>
  <IconSave /> {isDirty ? t('fileSaveDirty') : t('fileSave')}
</ToolbarButton>

<DropdownMenu
  isDev={isDev}
  label={<><IconUpload /> {t('fileImport')} <IconChevronDown /></>}
  items={[
    { label: t('fileImportQti'),         title: t('fileImportQtiTitle'),         onClick: onImport },
    { label: t('fileImportJson'),        title: t('fileImportJsonTitle'),        onClick: onImportJson },
    { label: t('fileImportRoundtrip'),   title: t('fileImportRoundtripTitle'),   onClick: onImportRoundtripXml, devOnly: true },
  ]}
/>

<DropdownMenu
  isDev={isDev}
  label={<><IconDownload /> {t('fileExport')} <IconChevronDown /></>}
  items={[
    { label: t('fileExportQti'),         title: t('fileExportQtiTitle'),         onClick: onExport },
    { label: t('fileExportJson'),        title: t('fileExportJsonTitle'),        onClick: onExportJson },
    { label: t('fileExportRoundtrip'),   title: t('fileExportRoundtripTitle'),   onClick: onExportRoundtripXml, devOnly: true },
  ]}
/>

<ToolbarButton onClick={onExportPackage} title={t('fileExportPackageTitle')}>
  <IconDownload /> {t('fileExportPackage')}
</ToolbarButton>
```

### 3c. Thread `isDev` and new callbacks through `AppHeader` → `FileActions`

`AppHeader` already receives all new props from Phase 2. Add `isDev` — compute it in `editor.tsx` once:

```ts
const isDev = new URLSearchParams(window.location.search).get('dev') === 'true'
  || localStorage.getItem('qti-editor:dev') === 'true';
```

Pass to `AppHeader` → `FileActions`.

### Phase 3 verification

- `pnpm --filter @qti-editor/app typecheck` passes.
- Open the editor in browser. `Import ▾` dropdown shows `Import QTI XML` and `Import JSON`. `Export ▾` shows `Export QTI XML` and `Export JSON`.
- With `?dev=true`, both dropdowns show the roundtrip XML option additionally.
- `Export Package` still appears as standalone button.
- Clicking each item triggers the correct action (test one import and one export end-to-end).

---

## Phase 4 — i18n keys

Add to both `en` and `nl` in [i18n.ts](apps/editor/src/i18n.ts):

| Key | English | Dutch |
|---|---|---|
| `fileImport` | `Import` | `Importeren` |
| `fileImportQti` | `Import QTI XML` | `QTI XML importeren` |
| `fileImportQtiTitle` | `Import QTI XML file` | `QTI XML-bestand importeren` |
| `fileImportJson` | `Import JSON` | `JSON importeren` |
| `fileImportJsonTitle` | `Import ProseMirror JSON document` | `ProseMirror JSON-document importeren` |
| `fileImportRoundtrip` | `Import Roundtrip XML` | `Roundtrip XML importeren` |
| `fileImportRoundtripTitle` | `Import item-body XML (dev)` | `Item-body XML importeren (dev)` |
| `fileExport` | `Export` | `Exporteren` |
| `fileExportQti` | `Export QTI XML` | `QTI XML exporteren` |
| `fileExportQtiTitle` | `Export as QTI XML` | `Exporteren als QTI XML` |
| `fileExportJson` | `Export JSON` | `JSON exporteren` |
| `fileExportJsonTitle` | `Export ProseMirror JSON document` | `ProseMirror JSON-document exporteren` |
| `fileExportRoundtrip` | `Export Roundtrip XML` | `Roundtrip XML exporteren` |
| `fileExportRoundtripTitle` | `Export item-body XML with data-* mirrors (dev)` | `Item-body XML met data-* spiegels exporteren (dev)` |
| `fileExportPackage` | `Export Package` | `Pakket exporteren` |
| `fileExportPackageTitle` | `Export as QTI 3 package ZIP` | `Exporteren als QTI 3 pakket-ZIP` |

**Note:** The existing keys `fileImport`, `fileImportTitle`, `fileExport`, `fileExportTitle` are replaced/renamed. Remove the old ones once the new ones are in place to avoid dead keys.

### Phase 4 verification

- `grep -n "fileImportTitle\|fileExportTitle" apps/editor/src/i18n.ts` → 0 hits (old keys removed).
- All new keys present in both `en` and `nl` blocks.
- Switch language in the editor — all dropdown labels translate correctly.

---

## Anti-pattern guards

1. **Don't invent a new XML→PM import pipeline** for roundtrip XML. `importXmlFromText` in [importXml.ts](apps/editor/src/lib/importXml.ts) already does `xmlToHTML → jsonFromHTML`. Read the file and reuse exactly those calls.
2. **Don't use Tailwind `@apply`** in the new `DropdownMenu` — it renders in the React app, use inline styles matching the existing `ToolbarButton` pattern.
3. **Don't add a dev-mode toggle button to the toolbar** — dev mode is URL param or localStorage only. No UI toggle.
4. **Don't change `lit-editor-toolbar`** — this plan only changes the React header toolbar (`FileActions`).
5. **Don't skip the `EditorLayoutHandle` expansion** — if the bridge doesn't expose the new methods, the callbacks silently do nothing.
