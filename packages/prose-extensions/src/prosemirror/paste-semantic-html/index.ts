/**
 * Semantic Paste Plugin
 *
 * ProseMirror plugin that normalizes pasted HTML (Word lists, clipboard images, etc.).
 */

export {
  makeHtmlSemantic,
  hydrateSemanticPasteImages,
  createSemanticPastePlugin,
  type SemanticPasteOptions,
} from './semantic-paste-plugin.js';
