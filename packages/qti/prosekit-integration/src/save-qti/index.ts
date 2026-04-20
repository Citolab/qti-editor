/**
 * Save QTI
 *
 * Builds a complete QTI 3.0 assessment item XML from a ProseMirror document.
 * Uses save-xml for item-body serialization and the composer for full QTI assembly.
 * 
 * Automatically detects and splits multiple items at qti-item-divider boundaries.
 */

import { buildMultipleAssessmentItemsXml, formatXml, type ComposerItemContext } from '@qti-editor/core/composer';

import { xmlFromNode } from '../save-xml/index.js';

import type { ProseMirrorNode } from 'prosekit/pm/model';

/** 
 * Build QTI 3.0 assessment item(s) XML from a ProseMirror doc.
 * 
 * If the document contains qti-item-divider elements, multiple assessment items
 * will be generated, one for each segment between dividers.
 */
export function qtiFromNode(
  node: ProseMirrorNode,
  context?: { identifier?: string; lang?: string; title?: string },
): string {
  const xml = xmlFromNode(node);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  const composerContext: ComposerItemContext = {
    identifier: context?.identifier,
    lang: context?.lang,
    title: context?.title,
    itemBody,
  };
  return formatXml(buildMultipleAssessmentItemsXml(composerContext));
}
