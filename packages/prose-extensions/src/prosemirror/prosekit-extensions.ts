/**
 * ProseKit extension wrappers for the plugins in this package.
 *
 * Importing from here (rather than `./index.js`) requires the `prosekit`
 * peer dependency to be installed. Raw ProseMirror consumers that don't use
 * ProseKit should import the plugins directly from their feature subpath
 * (e.g. `@citolab/prose-extensions/prosemirror/block-select`) instead.
 */

export { blockSelectExtension } from './block-select/extension.js';
export { nodeAttrsSyncExtension } from './node-attrs-sync/extension.js';
export { defineSemanticPasteExtension } from './paste-semantic-html/extension.js';
export { defineLocalStorageDocPersistenceExtension } from './local-storage-doc-persistence-extension/extension.js';
