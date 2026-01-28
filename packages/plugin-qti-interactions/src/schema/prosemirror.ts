/**
 * Pure ProseMirror Schema for QTI Elements
 *
 * This module provides a framework-agnostic ProseMirror schema that can be used
 * with any ProseMirror-based editor (vanilla ProseMirror, Tiptap, Remirror, etc.)
 *
 * Usage:
 * ```typescript
 * import { createQtiSchema, qtiNodes } from '@qti-editor/plugin-qti-interactions/schema';
 * import { EditorState } from 'prosemirror-state';
 * import { EditorView } from 'prosemirror-view';
 *
 * const schema = createQtiSchema();
 * const state = EditorState.create({ schema });
 * const view = new EditorView(document.body, { state });
 * ```
 */

import { Schema, type NodeSpec, type MarkSpec } from 'prosemirror-model';
import { nodes as qtiNodeSpecs, marks as qtiMarkSpecs } from './prosemirror-schema';

/**
 * Base nodes required for any ProseMirror document
 */
export const baseNodes: Record<string, NodeSpec> = {
  doc: {
    content: 'block+',
  },
  text: {
    group: 'inline',
  },
  paragraph: {
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p' }],
    toDOM() {
      return ['p', 0];
    },
  },
};

/**
 * QTI-specific nodes (re-exported from generated schema)
 */
export const qtiNodes = qtiNodeSpecs;

/**
 * QTI-specific marks (re-exported from generated schema)
 */
export const qtiMarks = qtiMarkSpecs;

/**
 * All nodes combined (base + QTI)
 */
export const allNodes: Record<string, NodeSpec> = {
  ...baseNodes,
  ...qtiNodes,
};

/**
 * Options for creating the QTI schema
 */
export interface CreateQtiSchemaOptions {
  /**
   * Additional nodes to include in the schema
   */
  nodes?: Record<string, NodeSpec>;
  /**
   * Additional marks to include in the schema
   */
  marks?: Record<string, MarkSpec>;
  /**
   * Whether to include base nodes (doc, text, paragraph).
   * Set to false if you're merging with another schema that provides these.
   * @default true
   */
  includeBaseNodes?: boolean;
}

/**
 * Create a ProseMirror Schema with QTI support
 *
 * @param options - Configuration options
 * @returns A ProseMirror Schema instance
 *
 * @example
 * ```typescript
 * // Basic usage
 * const schema = createQtiSchema();
 *
 * // With additional nodes
 * const schema = createQtiSchema({
 *   nodes: {
 *     heading: { content: 'inline*', group: 'block', ... }
 *   }
 * });
 *
 * // Without base nodes (for merging with existing schema)
 * const schema = createQtiSchema({ includeBaseNodes: false });
 * ```
 */
export function createQtiSchema(options: CreateQtiSchemaOptions = {}): Schema {
  const { nodes = {}, marks = {}, includeBaseNodes = true } = options;

  const schemaNodes = {
    ...(includeBaseNodes ? baseNodes : {}),
    ...qtiNodes,
    ...nodes,
  };

  const schemaMarks = {
    ...qtiMarks,
    ...marks,
  };

  return new Schema({ nodes: schemaNodes, marks: schemaMarks });
}

// Re-export utilities from generated schema
export { tagNameToNodeName, toolbarNodeNames } from './prosemirror-schema';
