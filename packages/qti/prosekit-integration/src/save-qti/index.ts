/**
 * Save QTI
 *
 * Builds a complete QTI 3.0 assessment item XML from a ProseMirror document.
 * Uses save-xml for item-body serialization and the composer for full QTI assembly.
 * 
 * Supports both single-item mode (dividers become <hr />) and multi-item mode
 * (splits at dividers to create separate assessment items).
 */

import { 
  buildMultipleAssessmentItemsXml, 
  buildSingleAssessmentItemXml,
  countItemFragments,
  getItemFragmentXmls,
  formatXml, 
  type ComposerItemContext 
} from '@qti-editor/core/composer';

import { xmlFromNode } from '../save-xml/index.js';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export type QtiComposeMode = 'single' | 'multiple';

export interface QtiComposeContext {
  identifier?: string;
  lang?: string;
  title?: string;
}

export interface QtiItemFragment {
  identifier: string;
  title: string;
  xml: string;
  formattedXml: string;
}

/** 
 * Build QTI 3.0 assessment item(s) XML from a ProseMirror doc.
 * 
 * @param mode - 'single' converts dividers to <hr />, 'multiple' splits into separate items
 */
export function qtiFromNode(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  mode: QtiComposeMode = 'multiple',
): string {
  const xml = xmlFromNode(node);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  const composerContext: ComposerItemContext = {
    identifier: context?.identifier,
    lang: context?.lang,
    title: context?.title,
    itemBody,
  };
  
  if (mode === 'single') {
    return formatXml(buildSingleAssessmentItemXml(composerContext));
  }
  
  return formatXml(buildMultipleAssessmentItemsXml(composerContext));
}

/**
 * Count how many items would be generated from a ProseMirror document.
 * Returns 1 if no dividers, or the number of segments between dividers.
 */
export function countQtiItems(node: ProseMirrorNode): number {
  const xml = xmlFromNode(node);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  return countItemFragments({ itemBody });
}

/**
 * Get all items as an array of fragments.
 * Each fragment includes identifier, title, and formatted XML.
 */
export function getQtiItems(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
): QtiItemFragment[] {
  const xml = xmlFromNode(node);
  const itemBody = new DOMParser().parseFromString(xml, 'application/xml');
  const composerContext: ComposerItemContext = {
    identifier: context?.identifier,
    lang: context?.lang,
    title: context?.title,
    itemBody,
  };
  
  return getItemFragmentXmls(composerContext).map(fragment => ({
    ...fragment,
    formattedXml: formatXml(fragment.xml),
  }));
}
