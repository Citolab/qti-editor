/**
 * InteractionDescriptor — the single registration unit for a QTI interaction.
 *
 * Each interaction package exports one descriptor that satisfies this interface.
 * The editor-kit and core registries consume it to avoid parallel hard-coded lists.
 *
 * Pure TypeScript — no runtime dependencies.
 */

import type { NodeSpec } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { InteractionComposerHandler, InteractionComposerMetadata } from './composer.js';
import type { NodeAttributePanelMetadata } from './attributes.js';

export interface InteractionNodeSpecEntry {
  name: string;
  spec: NodeSpec;
}

export interface InteractionDescriptor {
  /** HTML tag name, e.g. `'qti-choice-interaction'` */
  tagName: string;
  /** ProseMirror node type name, e.g. `'qtiChoiceInteraction'` */
  nodeTypeName: string;
  /**
   * All node specs this interaction contributes, including child nodes.
   * The consumer deduplicates by name, so shared specs (e.g. qtiPrompt) may
   * appear in multiple descriptors without error.
   */
  nodeSpecs: InteractionNodeSpecEntry[];
  /** Command to insert this interaction at the current selection. */
  insertCommand?: Command;
  /** Keyboard shortcut bound to `insertCommand`, e.g. `'Mod-Shift-q'`. */
  keyboardShortcut?: string;
  /**
   * Command run on Enter within this interaction, e.g. to append a new choice.
   * Multiple interactions may provide this; they are tried in registration order.
   */
  enterCommand?: Command;
  composerMetadata: InteractionComposerMetadata;
  /**
   * Handler that normalises the interaction element for QTI XML output.
   * Optional — interactions without a compose step may omit this.
   */
  composerHandler?: InteractionComposerHandler;
  /**
   * Attribute panel metadata, keyed by `nodeTypeName.toLowerCase()`.
   * Include entries for every node type in `nodeSpecs` that should appear in
   * the panel (typically just the root interaction node).
   */
  attributePanelMetadata?: Record<string, NodeAttributePanelMetadata>;
}
