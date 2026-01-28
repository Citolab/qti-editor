/**
 * QTI Prompt Module
 *
 * Module for the qti-prompt element including:
 * - Schema (ProseMirror NodeSpec)
 * - Component (Lit web component)
 */

// Schema
export { promptSchema } from './schema.generated';

// Generated metadata
export { qtiPromptDefinition } from './element-definition.generated';

// Component
export { QtiPrompt } from './qti-prompt';
