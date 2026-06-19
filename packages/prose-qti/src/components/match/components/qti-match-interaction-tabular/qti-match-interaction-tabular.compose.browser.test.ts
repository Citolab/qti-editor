import { describe, expect, it } from 'vitest';

import { composeMatchInteractionTabularElement } from './qti-match-interaction-tabular.compose.js';

function parseElement(xml: string): Element {
  return new DOMParser().parseFromString(xml, 'application/xml').documentElement;
}

describe('composeMatchInteractionTabularElement', () => {
  it('exports the editor-only tabular element as standard qti-match-interaction', () => {
    const xmlDoc = document.implementation.createDocument(null, null, null);
    const source = parseElement(`
      <qti-match-interaction-tabular class="qti-header-hidden" response-identifier="RESPONSE" max-associations="4" data-first-column-header="Character" correct-response='["C R"]' score="2">
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="C" match-max="1">Capulet</qti-simple-associable-choice>
        </qti-simple-match-set>
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="R" match-max="1">Romeo and Juliet</qti-simple-associable-choice>
        </qti-simple-match-set>
      </qti-match-interaction-tabular>
    `);

    const result = composeMatchInteractionTabularElement(source, xmlDoc);
    const normalized = result.normalizedElement;

    expect(normalized.tagName).toBe('qti-match-interaction');
    expect(normalized.getAttribute('class')).toBe('qti-match-tabular qti-header-hidden');
    expect(normalized.getAttribute('data-first-column-header')).toBe('Character');
    expect(normalized.hasAttribute('correct-response')).toBe(false);
    expect(normalized.hasAttribute('score')).toBe(false);
    expect(normalized.querySelectorAll('qti-simple-match-set')).toHaveLength(2);
    expect(result.responseDeclaration?.identifier).toBe('RESPONSE');
  });

  it('does not duplicate qti-match-tabular when the editor class still contains it', () => {
    const xmlDoc = document.implementation.createDocument(null, null, null);
    const source = parseElement(`
      <qti-match-interaction-tabular class="foo qti-match-tabular qti-header-hidden" response-identifier="RESPONSE">
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="C" match-max="1">Capulet</qti-simple-associable-choice>
        </qti-simple-match-set>
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="R" match-max="1">Romeo and Juliet</qti-simple-associable-choice>
        </qti-simple-match-set>
      </qti-match-interaction-tabular>
    `);

    const normalized = composeMatchInteractionTabularElement(source, xmlDoc).normalizedElement;

    expect(normalized.getAttribute('class')).toBe('qti-match-tabular foo qti-header-hidden');
  });
});
