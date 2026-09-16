/** A picture-only prompt has no text, so keying emptiness on `textContent` dropped it on compose. */
import { describe, expect, test } from 'vitest';

import { removeEmptyPrompts } from './qti-prompt.compose.js';

function interactionWith(promptInner: string): Element {
  const host = document.createElement('qti-choice-interaction');
  host.innerHTML = `<qti-prompt>${promptInner}</qti-prompt><qti-simple-choice>Ja</qti-simple-choice>`;
  return host;
}

function promptCount(host: Element): number {
  return host.getElementsByTagName('qti-prompt').length;
}

describe('removeEmptyPrompts', () => {
  test('drops a prompt with no content', () => {
    const host = interactionWith('');
    removeEmptyPrompts(host);

    expect(promptCount(host)).toBe(0);
  });

  test('drops a prompt holding only whitespace', () => {
    const host = interactionWith('<p>   </p>');
    removeEmptyPrompts(host);

    expect(promptCount(host)).toBe(0);
  });

  test('keeps a prompt with text', () => {
    const host = interactionWith('<p>Vervoeren rode bloedcellen zuurstof?</p>');
    removeEmptyPrompts(host);

    expect(promptCount(host)).toBe(1);
  });

  test('keeps a prompt whose only content is an image', () => {
    const host = interactionWith('<p><img src="https://example.test/x.png" alt="microscoopfoto"></p>');
    removeEmptyPrompts(host);

    expect(promptCount(host)).toBe(1);
  });
});
