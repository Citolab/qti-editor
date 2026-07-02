/**
 * Local re-exports of the QTI item/test/XML export surfaces this app uses.
 *
 * Relocated from packages/prose-qti/src/integration/save-qti-item,
 * save-qti-test, save-xml — those thin wrappers re-exported the deeper
 * pm-qti-item / pm-qti-test / pm-xml modules from prose-qti. The app now
 * owns the indirection so future tweaks to the editor's export surface
 * stay local. The actual export logic still lives in the prose-qti
 * package; this file is a stable seam.
 */

import {
  qtiItemFromProsemirror as qtiItemFromProsemirrorPure,
  type QtiComposeContext,
} from '@citolab/prose-qti/item-export/pm-qti-item';

import {
  qtiTestFromProsemirror as qtiTestFromProsemirrorPure,
  countQtiItems as countQtiItemsPure,
  getQtiItems as getQtiItemsPure,
  type QtiItemFragment,
} from '../components/test-export/pm-qti-test.js';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export type { QtiComposeContext, QtiItemFragment };

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
): string {
  return qtiItemFromProsemirrorPure(node, context);
}

export function qtiTestFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
): string {
  return qtiTestFromProsemirrorPure(node, context);
}

export function countQtiItems(node: ProseMirrorNode): number {
  return countQtiItemsPure(node);
}

export function getQtiItems(node: ProseMirrorNode, context?: QtiComposeContext): QtiItemFragment[] {
  return getQtiItemsPure(node, context);
}

export { xmlFromNode, xmlToHTML } from '@citolab/prose-qti/item-export/pm-xml';
