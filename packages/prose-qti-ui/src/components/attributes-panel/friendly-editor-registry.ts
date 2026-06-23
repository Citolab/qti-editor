import type { TemplateResult } from 'lit';
import type { AttributesNodeDetail } from './attributes-helpers.js';

/**
 * Friendly editors are per-node-type UIs that REPLACE the generic field list
 * for a node — e.g. the choice-interaction class editor or the text-entry
 * width/synonyms editor. Each editor registers itself under a `kind` string
 * matching the {@link AttributeFriendlyEditorDefinition.kind} declared in the
 * node's panel metadata.
 *
 * Host context is the element rendering the panel — registry entries may read
 * panel-level config from it (e.g. `choiceInteractionPresentation`).
 */
export type FriendlyEditorRenderer = (
  node: AttributesNodeDetail,
  host: HTMLElement,
) => TemplateResult;

const registry = new Map<string, FriendlyEditorRenderer>();

export function registerFriendlyEditor(kind: string, render: FriendlyEditorRenderer): void {
  registry.set(kind, render);
}

export function getFriendlyEditor(kind: string): FriendlyEditorRenderer | undefined {
  return registry.get(kind);
}
