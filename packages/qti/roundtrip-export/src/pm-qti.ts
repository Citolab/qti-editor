/**
 * Save QTI — pure ProseMirror
 *
 * Builds a complete QTI 3.0 assessment item XML from a ProseMirror document
 * with no prosekit dependency. The prosekit-integration package wraps this
 * and injects a list-aware DOMSerializer for the editor app.
 */

import {
  buildMultipleAssessmentItemsXml,
  buildSingleAssessmentItemXml,
  countItemFragments,
  getItemFragmentXmls,
  formatXml,
  type ComposerItemContext,
} from '@qti-editor/core/composer';
import type { DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';

import { xmlFromNode } from './pm-xml.js';

export type QtiComposeMode = 'single' | 'multiple';

export interface QtiComposeContext {
  identifier?: string;
  lang?: string;
  title?: string;
  items?: Array<{ identifier?: string; title?: string }>;
}

export interface QtiItemFragment {
  identifier: string;
  title: string;
  xml: string;
  formattedXml: string;
}

export function qtiFromNode(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  mode: QtiComposeMode = 'multiple',
  serializer?: DOMSerializer,
): string {
  const xml = xmlFromNode(node, serializer);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  const composerContext: ComposerItemContext = {
    identifier: context?.identifier,
    lang: context?.lang,
    title: context?.title,
    items: context?.items,
    itemBody,
  };

  if (mode === 'single') {
    return formatXml(buildSingleAssessmentItemXml(composerContext));
  }

  return formatXml(buildMultipleAssessmentItemsXml(composerContext));
}

export function countQtiItems(node: ProseMirrorNode, serializer?: DOMSerializer): number {
  const xml = xmlFromNode(node, serializer);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  return countItemFragments({ itemBody });
}

export function getQtiItems(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): QtiItemFragment[] {
  const xml = xmlFromNode(node, serializer);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  const composerContext: ComposerItemContext = {
    identifier: context?.identifier,
    lang: context?.lang,
    title: context?.title,
    items: context?.items,
    itemBody,
  };

  return getItemFragmentXmls(composerContext).map(fragment => ({
    ...fragment,
    formattedXml: formatXml(fragment.xml),
  }));
}
