/**
 * The export-side twin of `removeEmptyPrompts`. It keyed emptiness on `textContent` alone, so a
 * prompt holding only a picture or a sound was deleted on every roundtrip export.
 */
import { describe, expect, test } from 'vitest';

import { defaultRoundtripExportTransforms, stripEmptyPrompts } from './strip-empty-prompts.js';

/** An item body with one choice interaction whose prompt is `promptInner`. */
function itemBodyWith(promptInner: string): XMLDocument {
  return new DOMParser().parseFromString(
    `<qti-item-body xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0">
      <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
        <qti-prompt>${promptInner}</qti-prompt>
        <qti-simple-choice identifier="A">Ja</qti-simple-choice>
        <qti-simple-choice identifier="B">Nee</qti-simple-choice>
      </qti-choice-interaction>
    </qti-item-body>`,
    'application/xml',
  );
}

function applyDefaults(doc: XMLDocument): XMLDocument {
  for (const transform of defaultRoundtripExportTransforms) transform(doc);
  return doc;
}

function prompts(doc: XMLDocument): Element[] {
  return Array.from(doc.querySelectorAll('qti-prompt'));
}

describe('stripEmptyPrompts', () => {
  test('is one of the default export transforms', () => {
    expect(defaultRoundtripExportTransforms).toContain(stripEmptyPrompts);
  });

  test('drops a prompt with no content', () => {
    expect(prompts(applyDefaults(itemBodyWith('')))).toHaveLength(0);
  });

  test('drops a prompt holding only an empty or whitespace paragraph', () => {
    expect(prompts(applyDefaults(itemBodyWith('<p/>')))).toHaveLength(0);
    expect(prompts(applyDefaults(itemBodyWith('<p>   </p>')))).toHaveLength(0);
  });

  test('keeps a prompt with text', () => {
    expect(prompts(applyDefaults(itemBodyWith('<p>Welke kleur heeft de lucht?</p>')))).toHaveLength(1);
  });

  test('keeps a prompt whose only content is an image', () => {
    const doc = applyDefaults(itemBodyWith('<p><img src="picture.png" alt="a tree"/></p>'));

    expect(prompts(doc)).toHaveLength(1);
    expect(doc.querySelector('qti-prompt img')?.getAttribute('src')).toBe('picture.png');
  });

  test('keeps a prompt whose only content is audio', () => {
    const doc = applyDefaults(
      itemBodyWith('<audio controls="true"><source src="a.mp3" type="audio/mpeg"/></audio>'),
    );

    expect(prompts(doc)).toHaveLength(1);
    expect(doc.querySelector('qti-prompt audio source')?.getAttribute('src')).toBe('a.mp3');
  });

  test('keeps a prompt whose only content is a video', () => {
    const doc = applyDefaults(
      itemBodyWith('<video controls="true"><source src="v.mp4" type="video/mp4"/></video>'),
    );

    expect(prompts(doc)).toHaveLength(1);
  });
});
