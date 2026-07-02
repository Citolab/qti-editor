import {
  buildMultipleAssessmentItemsXml,
  countItemFragments,
  getItemFragmentXmls,
  formatXml,
} from "@citolab/prose-qti/core/composer";
import {
  buildItemBodyContext,
  type QtiComposeContext,
} from '@citolab/prose-qti/item-export/pm-qti-item';
import { xmlFromNode } from '@citolab/prose-qti/item-export/pm-xml';

import type { DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model';

export interface QtiItemFragment {
  identifier: string;
  title: string;
  xml: string;
  formattedXml: string;
}

export function qtiTestFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): string {
  return formatXml(buildMultipleAssessmentItemsXml(buildItemBodyContext(node, context, serializer)));
}

export function countQtiItems(node: ProseMirrorNode, serializer?: DOMSerializer): number {
  const xml = xmlFromNode(node, serializer);
  const itemBody = new globalThis.DOMParser().parseFromString(xml, 'application/xml');
  return countItemFragments({ itemBody });
}

export function getQtiItems(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  serializer?: DOMSerializer,
): QtiItemFragment[] {
  const composerContext = buildItemBodyContext(node, context, serializer);
  return getItemFragmentXmls(composerContext).map(fragment => ({
    ...fragment,
    formattedXml: formatXml(fragment.xml),
  }));
}
