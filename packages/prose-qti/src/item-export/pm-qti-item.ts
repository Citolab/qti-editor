import {
  buildSingleAssessmentItemXml,
  formatXml,
  type ComposerItemContext,
} from "@citolab/prose-qti/core/composer";

import { xmlFromNode } from './pm-xml.js';

import type { DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';
import type { IdentifierStrategy } from '@citolab/prose-qti/components/shared/identifiers/identifier-strategy.js';

export interface QtiComposeContext {
  identifier?: string;
  lang?: string;
  title?: string;
  items?: Array<{ identifier?: string; title?: string }>;
  /** See `ComposerItemContext.identifierStrategy`. */
  identifierStrategy?: IdentifierStrategy;
}

/**
 * Internal — shared between item and test export.
 * Parses the PM node to an itemBody XML document and assembles ComposerItemContext.
 * Exported so @qti-editor/qti-test-export can reuse it.
 */
export function buildItemBodyContext(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): ComposerItemContext {
  const xml = xmlFromNode(node, serializer);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  return {
    identifier: context?.identifier,
    lang: context?.lang,
    title: context?.title,
    items: context?.items,
    itemBody,
    identifierStrategy: context?.identifierStrategy,
  };
}

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): string {
  return formatXml(buildSingleAssessmentItemXml(buildItemBodyContext(node, context, serializer)));
}
