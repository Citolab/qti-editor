/**
 * What an author-set `score` does to the exported item.
 *
 * Pins the rule the composer already encodes: one interaction worth 1 point may
 * ride the standard response-processing template, anything else has to write the
 * condition out, because a template awards exactly 1 and cannot be told otherwise.
 *
 * Written to CHECK that rule end to end before changing which interactions may
 * set a score — the panel allowlist is what gates authoring, and enabling it is
 * only safe if the composer honours the number afterwards.
 */
import { describe, expect, test } from 'vitest';

import { buildAssessmentItemXml } from './index.js';

function itemBodyDoc(inner: string): Document {
  return new DOMParser().parseFromString(
    `<qti-item-body>${inner}</qti-item-body>`,
    'application/xml',
  );
}

function xmlFor(inner: string): string {
  return buildAssessmentItemXml({ identifier: 'ITEM', title: 'Item', itemBody: itemBodyDoc(inner) });
}

const choice = (score: number) => `
  <qti-choice-interaction response-identifier="RESPONSE" max-choices="1" correct-response="choice1" score="${score}">
    <qti-simple-choice identifier="choice1">A</qti-simple-choice>
    <qti-simple-choice identifier="choice2">B</qti-simple-choice>
  </qti-choice-interaction>`;

const extendedText = (score: number) =>
  `<qti-extended-text-interaction response-identifier="RESPONSE" score="${score}"/>`;

describe('single match_correct interaction', () => {
  test('score 1 rides the template', () => {
    const xml = xmlFor(choice(1));
    expect(xml).toContain('<qti-response-processing template=');
    expect(xml).not.toContain('qti-response-condition');
  });

  test('score 2 writes the condition out with the author’s number', () => {
    const xml = xmlFor(choice(2));
    expect(xml).not.toContain('<qti-response-processing template=');
    expect(xml).toContain('qti-response-condition');
    expect(xml).toContain('<qti-base-value base-type="float">2</qti-base-value>');
  });

  test('MAXSCORE follows the score attribute', () => {
    expect(xmlFor(choice(2))).toContain('identifier="MAXSCORE"');
    expect(xmlFor(choice(2)).replace(/\s+/g, '')).toContain('>2</qti-value>');
  });
});

describe('extended text, which has no automated award', () => {
  test('score 2 still declares MAXSCORE 2', () => {
    const xml = xmlFor(extendedText(2)).replace(/\s+/g, '');
    expect(xml).toContain('identifier="MAXSCORE"');
    expect(xml).toContain('>2</qti-value>');
  });

  test('emits no response processing at all — the points are a human’s to award', () => {
    expect(xmlFor(extendedText(2))).not.toContain('qti-response-processing');
  });
});

describe('mixed item', () => {
  test('the automated interaction is written out, the human-scored one is skipped', () => {
    const xml = xmlFor(`${choice(2)}${extendedText(3)}`);
    expect(xml).toContain('qti-response-condition');
    expect(xml).toContain('<qti-base-value base-type="float">2</qti-base-value>');
    expect(xml.replace(/\s+/g, '')).toContain('>5</qti-value>');
  });
});
