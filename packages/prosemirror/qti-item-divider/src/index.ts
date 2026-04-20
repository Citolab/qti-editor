/**
 * QTI Item Divider package
 * 
 * Provides a block element for marking boundaries between QTI assessment items
 * when editing multiple items in a single editor instance.
 */

export { qtiItemDividerNodeSpec } from './qti-item-divider.schema.js';
export { QtiItemDivider } from './qti-item-divider.js';
export { insertItemDivider, createInsertItemDividerCommand } from './qti-item-divider.commands.js';
export { qtiItemDividerDescriptor } from './descriptor.js';
