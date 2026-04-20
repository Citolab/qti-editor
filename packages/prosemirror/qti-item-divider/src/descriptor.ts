import { qtiItemDividerNodeSpec } from './qti-item-divider.schema.js';
import { insertItemDivider } from './qti-item-divider.commands.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

/**
 * Descriptor for the QTI item divider block element.
 * 
 * This follows the same pattern as interaction descriptors for consistency,
 * even though it's not technically an interaction. This allows it to be
 * registered and used through the same mechanisms as interactions.
 * 
 * **XML Composition Behavior:**
 * When composing to QTI XML, dividers act as boundary markers that split
 * the editor document into multiple separate `<qti-assessment-item>` elements.
 * The dividers themselves do not appear in the XML output - they are removed
 * during composition, with content before and after each divider becoming
 * separate assessment items.
 * 
 * Example:
 * - Editor: [content A] [divider] [content B] [divider] [content C]
 * - XML Output: Three separate <qti-assessment-item> elements with
 *   identifiers item-1, item-2, item-3
 * 
 * Note: Since this is a structural element and not a QTI interaction,
 * it doesn't have composer metadata or handler - it won't appear in
 * generated QTI XML and is purely an editor affordance.
 */
export const qtiItemDividerDescriptor = {
  tagName: 'qti-item-divider',
  nodeTypeName: 'qtiItemDivider',
  nodeSpecs: [
    { name: 'qtiItemDivider', spec: qtiItemDividerNodeSpec },
  ],
  insertCommand: insertItemDivider,
  keyboardShortcut: 'Mod-Shift-d', // Ctrl/Cmd + Shift + D to insert divider
  // No composer metadata - this doesn't map to a QTI interaction element
  composerMetadata: {
    tagName: 'qti-item-divider',
    nodeTypeName: 'qtiItemDivider',
    responseProcessing: {
      templateUri: '',
      internalSourceXml: '',
    },
    editorOnlyAttributes: [],
    userEditableAttributes: [],
  },
  // No composer handler - dividers don't generate QTI XML interactions
  composerHandler: undefined,
  // No attribute panel - dividers don't have editable attributes
  attributePanelMetadata: {},
} satisfies InteractionDescriptor;
