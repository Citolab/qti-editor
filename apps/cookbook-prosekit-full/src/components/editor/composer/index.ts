/**
 * QTI Composer Components
 * 
 * Local copies from registry - customize as needed.
 * Core functionality comes from @qti-editor/core.
 */

// Core types and functions
export {
  buildAssessmentItemXml,
  formatXml,
  extractResponseDeclarations,
  type ComposerItemContext,
  type ResponseDeclaration,
} from '@qti-editor/core/composer';

// UI components (local copies, customizable)
export { QtiComposer } from './qti-composer.js';
export { QtiComposerMetadataForm } from './qti-composer-metadata-form.js';
