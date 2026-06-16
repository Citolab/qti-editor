import { extractItemScore } from '../_shared';

/**
 * Hoist rubric content and score onto a single qti-extended-text-interaction.
 *
 * Source of rubric content: a <qti-rubric-block view="scorer" use="scoring">
 * element anywhere in the item body. Its <qti-content-body><div><p> lines are
 * joined with \n to produce the correct-response attribute value.
 *
 * (After plans/rubric-block-attribute.md ships, update this to write
 * `rubric-block` instead of `correct-response`.)
 *
 * Conditions:
 * - Exactly ONE qti-extended-text-interaction in the item.
 * - Rubric block exists with at least one non-empty <p> line.
 * - A score is extractable (default 1).
 *
 * Idempotent.
 */
export const roundtripExtendedText = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-extended-text-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const rubricBlock = xmlDoc.querySelector('qti-rubric-block[view="scorer"][use="scoring"]');
  if (!rubricBlock) return;

  const lines: string[] = [];
  rubricBlock.querySelectorAll('qti-content-body > div > p').forEach((p) => {
    const text = p.textContent ?? '';
    lines.push(text === ' ' ? '' : text);
  });
  if (lines.every((line) => line.length === 0)) return;

  const score = extractItemScore(xmlDoc);

  if (!interaction.getAttribute('correct-response')) {
    interaction.setAttribute('correct-response', lines.join('\n'));
  }
  if (!interaction.getAttribute('score')) {
    interaction.setAttribute('score', String(score));
  }
};
