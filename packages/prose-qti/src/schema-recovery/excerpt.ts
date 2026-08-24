import type { NodeJson } from './types.js';

const EXCERPT_LIMIT = 60;

/**
 * A short, single-line quote of a JSON subtree's text, or `undefined` when it holds none.
 *
 * The point is to let a person recognise what was removed. "Removed an unknown node of type
 * qtiGapMatchInteraction" names it for a developer; `Drag each city to its province` names it for
 * whoever wrote the question — and they are the only one who knows whether it mattered.
 */
export function collectExcerpt(node: NodeJson | undefined): string | undefined {
  if (!node) return undefined;
  const text = collectText(node, EXCERPT_LIMIT + 1).replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > EXCERPT_LIMIT ? `${text.slice(0, EXCERPT_LIMIT).trimEnd()}…` : text;
}

/** Depth-first text accumulation, stopping once `budget` characters are in hand. */
function collectText(node: NodeJson, budget: number): string {
  if (budget <= 0) return '';
  if (typeof node.text === 'string') return node.text.slice(0, budget);
  if (!Array.isArray(node.content)) return '';

  let text = '';
  for (const child of node.content) {
    if (text.length >= budget) break;
    const childText = collectText(child, budget - text.length);
    if (!childText) continue;
    // Separate block siblings so two paragraphs do not read as one run-on word.
    text += text && !text.endsWith(' ') && !childText.startsWith(' ') ? ` ${childText}` : childText;
  }
  return text;
}
