/**
 * Ancestor Attributes Panel Plugin
 *
 * A pure-ProseMirror side panel that edits the selected node's attributes and
 * those of every ancestor (including the doc node), stacked outermost → innermost.
 */

export {
  attributesPanelPlugin,
  collectAncestorChain,
  type AttributesPanelOptions,
  type ChainEntry,
} from './attributes-panel-plugin.js';
