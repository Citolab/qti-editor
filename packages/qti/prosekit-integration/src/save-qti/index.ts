/**
 * Save QTI
 *
 * Builds a complete QTI 3.0 assessment item XML from a ProseMirror document.
 * Uses save-xml for item-body serialization and the composer for full QTI assembly.
 */

import { buildAssessmentItemXml, formatXml, type ComposerItemContext } from '@qti-editor/core/composer';

import { xmlFromNode } from '../save-xml/index.js';

import type { ProseMirrorNode } from 'prosekit/pm/model';

/** Build a complete QTI 3.0 assessment item XML from a ProseMirror doc. */
export function qtiFromNode(
  node: ProseMirrorNode,
  context?: { identifier?: string; title?: string },
): string {
  const xml = xmlFromNode(node);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  const composerContext: ComposerItemContext = {
    identifier: context?.identifier,
    title: context?.title,
    itemBody,
  };
  return formatXml(buildAssessmentItemXml(composerContext));
}
