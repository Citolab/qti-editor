/**
 * QTI Rubric Block package
 *
 * Provides a block element for QTI 3 rubric blocks (instructions, scoring, or
 * navigation rubrics targeted at specific actors).
 */

export {
  qtiRubricBlockNodeSpec,
  QTI_RUBRIC_BLOCK_USE_VALUES,
  QTI_RUBRIC_BLOCK_VIEW_VALUES,
} from './qti-rubric-block.schema.js';
export { insertRubricBlock, createInsertRubricBlockCommand } from './qti-rubric-block.commands.js';
export { qtiRubricBlockDescriptor } from './descriptor.js';
