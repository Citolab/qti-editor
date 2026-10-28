/**
 * A MathML formula through the whole item round trip, QTI 3 in and QTI 3 out, on the roundtrip
 * schema (`createQtiSchema`): in running text, in a choice and in a prompt.
 *
 * Before: `<math>` and everything in it was dropped on import. ProseMirror skips elements it has no
 * rule for and parses their text in their place, so `x = ½` came back as the text `x = 12`, and a
 * choice that was a fraction came back as two digits.
 */
import { defineBasicExtension } from '@citolab/prose-extensions/prosekit';
import { findUnrepresentableElements } from '@citolab/prose-extensions/schema-gaps';
import { createEditor, defineNodeSpec, union } from 'prosekit/core';
import { DOMParser as PmDOMParser, Schema as PmSchema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { nodes as basicNodes } from 'prosemirror-schema-basic';
import { describe, expect, test } from 'vitest';

import {
  listInteractionDescriptors,
  listInteractionPluginFactories,
  listInteractionSchemaNodeSpecs,
} from '../core/interactions/composer.js';
import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';
import { createQtiSchema } from './create-qti-schema.js';

import '../components/inline-choice/register.js';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';

const MATHML = 'http://www.w3.org/1998/Math/MathML';

const ITEM = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="MATH" title="Maths">
  <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" base-type="float" cardinality="single"/>
  <qti-item-body>
    <p>Solve <math xmlns="${MATHML}"><mi>x</mi><mo>=</mo><mrow><mfrac><mn>1</mn><mn>2</mn></mfrac></mrow></math> for x.</p>
    <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-prompt>Which is larger than <math xmlns="${MATHML}"><msup><mi>x</mi><mn>2</mn></msup></math> at x = 0.5?</qti-prompt>
      <qti-simple-choice identifier="A"><math xmlns="${MATHML}" display="inline"><mfrac><mn>1</mn><mn>2</mn></mfrac></math></qti-simple-choice>
      <qti-simple-choice identifier="B">
        <math xmlns="${MATHML}">
          <mfrac>
            <mn>1</mn>
            <mn>4</mn>
          </mfrac>
        </math>
      </qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
</qti-assessment-item>`;

const schema: Schema = createQtiSchema();

const formulasIn = (doc: ProseMirrorNode) => {
  const found: { source: string; parent: string }[] = [];
  doc.descendants((node, _pos, parent) => {
    if (node.type.name === 'mathml') found.push({ source: node.attrs.source as string, parent: parent!.type.name });
  });
  return found;
};

const exported = (doc: ProseMirrorNode) => new DOMParser().parseFromString(pmToQti3(doc), 'application/xml');

const mathElementsOf = (xml: XMLDocument) => Array.from(xml.getElementsByTagNameNS(MATHML, 'math'));

describe('MathML through qti3ToPm → pmToQti3', () => {
  test('the schema has a formula node, admitted wherever an interaction has its text', () => {
    expect(schema.nodes.mathml?.isAtom).toBe(true);
    for (const holder of [
      'paragraph',
      'qtiSimpleChoiceParagraph',
      'qtiPromptParagraph',
      'qtiSimpleAssociableChoiceParagraph',
      'qtiInlineChoice',
      'qtiHottext',
      'qtiGapText',
    ]) {
      expect(schema.nodes[holder].contentMatch.matchType(schema.nodes.mathml), holder).not.toBeNull();
    }
  });

  test('each formula is imported whole, in running text, a prompt and a choice', () => {
    const doc = qti3ToPm(ITEM);
    expect(() => doc.check()).not.toThrow();

    expect(formulasIn(doc)).toEqual([
      {
        parent: 'paragraph',
        source: `<math xmlns="${MATHML}"><mi>x</mi><mo>=</mo><mrow><mfrac><mn>1</mn><mn>2</mn></mfrac></mrow></math>`,
      },
      { parent: 'qtiPromptParagraph', source: `<math xmlns="${MATHML}"><msup><mi>x</mi><mn>2</mn></msup></math>` },
      {
        parent: 'qtiSimpleChoiceParagraph',
        source: `<math xmlns="${MATHML}" display="inline"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>`,
      },
      // The indentation is gone: whitespace between MathML elements means nothing.
      { parent: 'qtiSimpleChoiceParagraph', source: `<math xmlns="${MATHML}"><mfrac><mn>1</mn><mn>4</mn></mfrac></math>` },
    ]);
    // Not left behind as loose text either.
    expect(doc.textContent).not.toContain('12');
  });

  test('is exported in the MathML namespace, with xmlns on <math>, in place', () => {
    const xml = exported(qti3ToPm(ITEM));
    const formulas = mathElementsOf(xml);
    expect(formulas).toHaveLength(4);
    for (const math of formulas) {
      expect(math.namespaceURI).toBe(MATHML);
      expect(math.getAttribute('xmlns')).toBe(MATHML);
      // Children inherit the namespace rather than falling back to QTI's.
      for (const child of Array.from(math.getElementsByTagName('*'))) expect(child.namespaceURI).toBe(MATHML);
    }

    const [inText, inPrompt, choiceA, choiceB] = formulas;
    expect(inText.parentElement?.localName).toBe('p');
    expect(inPrompt.closest('qti-prompt')).not.toBeNull();
    expect(choiceA.closest('qti-simple-choice')?.getAttribute('identifier')).toBe('A');
    expect(choiceA.getAttribute('display')).toBe('inline');
    expect(choiceB.closest('qti-simple-choice')?.getAttribute('identifier')).toBe('B');
    expect(choiceB.textContent?.replace(/\s+/g, '')).toBe('14');

    // The written XML carries the declaration itself, not only the DOM's view of it.
    expect(pmToQti3(qti3ToPm(ITEM))).toContain(`<math xmlns="${MATHML}"`);
  });

  test('survives a second round trip unchanged', () => {
    const once = pmToQti3(qti3ToPm(ITEM));
    expect(pmToQti3(qti3ToPm(once))).toBe(once);
  });
});

describe('MathML in the ProseKit schema (defineQtiExtension)', () => {
  const prosekitSchema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

  test('a formula as a choice is held in the choice paragraph', () => {
    const host = document.createElement('div');
    host.innerHTML = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-simple-choice identifier="A"><math><mfrac><mn>1</mn><mn>2</mn></mfrac></math></qti-simple-choice>
    </qti-choice-interaction>`;
    const doc = PmDOMParser.fromSchema(prosekitSchema).parse(host);
    expect(() => doc.check()).not.toThrow();
    expect(formulasIn(doc)).toEqual([
      { parent: 'qtiSimpleChoiceParagraph', source: `<math xmlns="${MATHML}"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>` },
    ]);
  });
});

describe('MathML in a formula-holding interaction', () => {
  // On qti-inline-choice, qti-hottext and qti-gap-text, which were `text*`: the parser lifted the
  // formula out of each, which emptied the choice and split the interaction around it. The 1EdTech
  // conformance items for the first and last are in apps/e2e/stories/mathml-conformance.browser.test.ts.
  const item = (body: string) => `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="M" title="M">
  <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single"/>
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;
  const formula = `<math xmlns="${MATHML}"><msqrt><mn>2</mn></msqrt></math>`;

  test.each([
    ['qti-inline-choice', `<p>x <qti-inline-choice-interaction response-identifier="RESPONSE"><qti-inline-choice identifier="A">${formula}</qti-inline-choice><qti-inline-choice identifier="B">two</qti-inline-choice></qti-inline-choice-interaction></p>`],
    ['qti-hottext', `<qti-hottext-interaction response-identifier="RESPONSE" max-choices="1"><p>Pick <qti-hottext identifier="A">${formula}</qti-hottext> or <qti-hottext identifier="B">two</qti-hottext>.</p></qti-hottext-interaction>`],
    ['qti-gap-text', `<qti-gap-match-interaction response-identifier="RESPONSE"><qti-gap-text identifier="A">${formula}</qti-gap-text><qti-gap-text identifier="B">two</qti-gap-text><p>Gap: <qti-gap identifier="G1"/></p></qti-gap-match-interaction>`],
  ])('%s keeps its formula, and the interaction stays whole', (tag, body) => {
    const xml = exported(qti3ToPm(item(body)));
    const holders = Array.from(xml.getElementsByTagName(tag));
    expect(holders.map(holder => holder.getAttribute('identifier'))).toEqual(['A', 'B']);
    expect(holders[0].getElementsByTagNameNS(MATHML, 'math')).toHaveLength(1);
    expect(holders[0].textContent?.trim()).toBe('2');
    const interaction = holders[0].closest('[response-identifier]')!;
    expect(xml.querySelectorAll('[response-identifier]')).toHaveLength(1);
    expect(interaction.getElementsByTagNameNS(MATHML, 'math')).toHaveLength(1);
  });
});

describe('the inline-choice edit component', () => {
  test('shows a formula that is the correct choice as MathML in its trigger, not as its digits', async () => {
    const doc = qti3ToPm(`<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="M" title="M">
  <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-item-body><p>x <qti-inline-choice-interaction response-identifier="RESPONSE"><qti-inline-choice identifier="A"><math xmlns="${MATHML}"><mfrac><mn>1</mn><mn>2</mn></mfrac></math></qti-inline-choice><qti-inline-choice identifier="B">two</qti-inline-choice></qti-inline-choice-interaction></p></qti-item-body>
</qti-assessment-item>`);
    const host = document.body.appendChild(document.createElement('div'));
    const view = new EditorView(host, { state: EditorState.create({ doc, plugins: listInteractionPluginFactories().map(factory => factory()) }) });
    try {
      const interaction = host.querySelector('qti-inline-choice-interaction') as HTMLElement & { updateComplete: Promise<unknown> };
      await interaction.updateComplete;
      await new Promise(resolve => requestAnimationFrame(resolve));
      await interaction.updateComplete;
      expect(interaction.shadowRoot?.querySelector('math mfrac')).not.toBeNull();
    } finally {
      view.destroy();
      host.remove();
    }
  });
});

describe('mathml through the interaction registry', () => {
  // The choice and prompt paragraphs, qti-inline-choice, qti-hottext and qti-gap-text name `mathml`
  // in their content, so a host schema without the node throws "No node type or group 'mathml'
  // found". The registry delivers it, so a host's own base does not have to.
  test('listInteractionSchemaNodeSpecs delivers it, whatever the selection', () => {
    expect(listInteractionSchemaNodeSpecs().map(entry => entry.name)).toContain('mathml');
    expect(listInteractionSchemaNodeSpecs({ include: ['qti-text-entry-interaction'] }).map(entry => entry.name)).toContain('mathml');
  });

  test.each(listInteractionDescriptors().map(descriptor => [descriptor.nodeTypeName, descriptor.tagName]))(
    'a hand-built base plus the %s specs builds',
    (_name, tagName) => {
      // A base with what `image` hosts were already told to bring, and no `mathml`.
      const build = () =>
        new PmSchema({
          nodes: {
            doc: { content: 'block+' },
            paragraph: { ...basicNodes.paragraph, group: 'block richtext' },
            text: basicNodes.text,
            image: basicNodes.image,
            ...Object.fromEntries(listInteractionSchemaNodeSpecs({ include: [tagName] }).map(({ name, spec }) => [name, spec])),
          },
        });
      expect(build).not.toThrow();
    },
  );

  test('a ProseKit host on defineBasicExtension() plus the registry specs gets it', () => {
    const extension = union(
      defineBasicExtension(),
      ...listInteractionSchemaNodeSpecs().map(({ name, spec }) => defineNodeSpec({ name, ...spec })),
    );
    expect(createEditor({ extension }).schema.nodes.mathml?.isAtom).toBe(true);
  });

  test('listInteractionPluginFactories includes the editor-only node view', () => {
    const keys = listInteractionPluginFactories().map(factory => (factory() as unknown as { key: string }).key);
    expect(keys.some(key => key.startsWith('mathml-node-view'))).toBe(true);
  });
});

describe('the schema-gap scan on MathML', () => {
  const body = (html: string) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host;
  };

  test('is quiet about a formula wherever the schema holds it', () => {
    const outcome = findUnrepresentableElements(
      schema,
      body(`<p>${'<math><mi>x</mi></math>'}</p><qti-inline-choice-interaction><qti-inline-choice identifier="A"><math><mi>x</mi></math></qti-inline-choice></qti-inline-choice-interaction>`),
    );
    expect(outcome.changes).toEqual([]);
  });

  test('reports a formula where the schema still cannot hold one', () => {
    // A code block is `text*` and stays so: the parser moves the formula out of it.
    const outcome = findUnrepresentableElements(schema, body('<pre>x = <math><mi>y</mi></math></pre>'));
    expect(outcome.changes).toHaveLength(1);
    expect(outcome.changes[0]).toMatchObject({ nodeType: 'math', data: { movedOutOf: 'pre' } });
  });
});
