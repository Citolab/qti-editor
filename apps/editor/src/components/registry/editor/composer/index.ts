/**
 * QTI Composer Components
 *
 * Source: registry/prosekit-ui/composer-panel
 * Status: synced
 * Core functionality comes from @qti-editor/qti-core.
 */

// Core types and functions
export {
  buildAssessmentItemXml,
  formatXml,
  extractResponseDeclarations,
  type ComposerItemContext,
  type ResponseDeclaration,
} from '@qti-editor/qti-core/composer';

// Installed registry copies
export { QtiComposer } from './qti-composer.js';
export { QtiComposerMetadataForm } from './qti-composer-metadata-form.js';
