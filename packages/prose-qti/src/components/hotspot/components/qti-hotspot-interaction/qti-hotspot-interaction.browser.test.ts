/**
 * The hotspot interaction through the whole conversion: a QTI 3.0 item in, the editor's document in
 * between, a QTI 3.0 item out — `roundtripQtiItem` → schema → `qtiItemFromProsemirror`.
 *
 * The first case is qti-components' conformance item Q10 multiple; it must come out with nothing
 * lost. The rest pin what the editor has no UI for but must still carry: the shapes it cannot
 * reshape, the choice attributes it never edits, and an `<object>` picture with fallback content.
 */
import { createEditor } from 'prosekit/core';
import { EditorState, NodeSelection } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../../../integration/interactions/prosekit.js';
import { qtiItemFromProsemirror } from '../../../../item-export/pm-qti-item.js';
import { roundtripQtiItem } from '../../../../qti3-item-import/roundtrip-qti-item.js';
import { roundtripXmlToPm } from '../../../shared/roundtrip-xml-to-pm.js';
import { applyHotspotChoicesEdit, createHotspotChoiceEditingPlugin } from '../../extensions/hotspot-choice-editing.js';
import { composeHotspotInteractionElement } from './qti-hotspot-interaction.compose.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

function item(body: string, declaration: string, processing = 'match_correct.xml'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Item" adaptive="false" time-dependent="false">
  ${declaration}
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value><qti-value>0</qti-value></qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>${body}</qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/${processing}"/>
</qti-assessment-item>`;
}

/**
 * qti-components' `public/assets/qti-conformance/Advanced/Q10-hotspot/hotspot-interaction-multiple.xml`
 * (conformance story Q10-L2-D2), verbatim.
 */
const Q10_MULTIPLE = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<qti-assessment-item 
  xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" 
  identifier="hotspot-example-2" title="Q10 Hotspot Interaction - Multiple Cardinality" adaptive="false" time-dependent="false">
<qti-response-declaration base-type="identifier" cardinality="multiple" identifier="RESPONSE">
  <qti-correct-response>
    <qti-value>A</qti-value>
    <qti-value>B</qti-value>
    <qti-value>D</qti-value>
  </qti-correct-response>
</qti-response-declaration>	
<qti-outcome-declaration base-type="float" cardinality="single" identifier="SCORE"/>
<qti-item-body>
  <p>
    The picture below illustrates four of the most popular destinations for air travelers arriving
    in the United Kingdom: London, Manchester, Edinburgh and Glasgow. 
    Please <strong>choose all cities North of London</strong>.
  </p>

  <qti-hotspot-interaction max-choices="0" response-identifier="RESPONSE">
    <img src="images/ukair.png" alt="Map of the United Kingdom" height="280" width="206" />
    <qti-hotspot-choice coords="77,115,10" identifier="A" shape="circle"/>
    <qti-hotspot-choice coords="118,184,10" identifier="B" shape="circle"/>
    <qti-hotspot-choice coords="150,235,10" identifier="C" shape="circle"/>
    <qti-hotspot-choice coords="96,114,10" identifier="D" shape="circle"/>
  </qti-hotspot-interaction>
</qti-item-body>
<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml"/>
</qti-assessment-item>`;

function importItem(xml: string): PmNode {
  const itemBody = new DOMParser().parseFromString(roundtripQtiItem(xml), 'application/xml');
  return roundtripXmlToPm(itemBody, schema);
}

function roundtrip(xml: string): Document {
  return new DOMParser().parseFromString(qtiItemFromProsemirror(importItem(xml)), 'application/xml');
}

const attributesOf = (element: Element | null) =>
  Object.fromEntries(Array.from(element?.attributes ?? []).map(attr => [attr.name, attr.value]));

const choicesOf = (doc: Document) =>
  Array.from(doc.querySelectorAll('qti-hotspot-interaction > qti-hotspot-choice')).map(attributesOf);

const correctValuesOf = (doc: Document) =>
  Array.from(doc.querySelectorAll('qti-response-declaration qti-correct-response qti-value')).map(v => v.textContent);

const templateOf = (doc: Document) =>
  doc.querySelector('qti-response-processing')?.getAttribute('template')?.replace(/\.xml$/, '');

describe('the Q10 multiple conformance item', () => {
  const source = new DOMParser().parseFromString(Q10_MULTIPLE, 'application/xml');
  const exported = roundtrip(Q10_MULTIPLE);

  test('keeps every choice, in order, with its coords', () => {
    expect(choicesOf(exported)).toEqual(choicesOf(source));
    expect(choicesOf(exported)).toHaveLength(4);
  });

  test('keeps the picture and the interaction attributes', () => {
    const selector = 'qti-hotspot-interaction > img';
    expect(attributesOf(exported.querySelector(selector))).toEqual(attributesOf(source.querySelector(selector)));
    expect(attributesOf(exported.querySelector('qti-hotspot-interaction'))).toEqual({
      'response-identifier': 'RESPONSE',
      'max-choices': '0',
    });
  });

  test('keeps the answer key and the scoring template', () => {
    const declaration = exported.querySelector('qti-response-declaration');
    expect(declaration?.getAttribute('cardinality')).toBe('multiple');
    expect(declaration?.getAttribute('base-type')).toBe('identifier');
    expect(correctValuesOf(exported)).toEqual(['A', 'B', 'D']);
    expect(templateOf(exported)).toBe(templateOf(source));
  });
});

describe('what the editor carries but does not edit', () => {
  const xml = item(
    `<qti-hotspot-interaction response-identifier="RESPONSE" max-choices="0" min-choices="1" class="qti-selections-dark">
      <qti-prompt><p>Pick the <strong>parts</strong><img src="legend.png" alt="Legend"/></p></qti-prompt>
      <img src="plants.svg" width="680" height="680" alt="A plant" class="qti-margin-2"/>
      <qti-hotspot-choice identifier="i1" shape="poly" coords="337,493,194,591,360,531,337,493" hotspot-label="Rhizome"/>
      <qti-hotspot-choice identifier="i2" shape="ellipse" coords="300,200,40,20" fixed="true"/>
      <qti-hotspot-choice identifier="i3" shape="rect" coords="10,10,60,40" template-identifier="SHOW_I3" show-hide="hide"/>
      <qti-hotspot-choice identifier="i4" shape="default" class="qti-hidden" aria-label="The whole plant"/>
    </qti-hotspot-interaction>`,
    `<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
      <qti-correct-response><qti-value>i1</qti-value><qti-value>i3</qti-value></qti-correct-response>
    </qti-response-declaration>`,
  );
  const source = new DOMParser().parseFromString(xml, 'application/xml');
  const exported = roundtrip(xml);

  test('poly, ellipse and default shapes, and every choice attribute, survive unchanged', () => {
    expect(choicesOf(exported)).toEqual(choicesOf(source));
  });

  test("the picture's class survives", () => {
    expect(exported.querySelector('qti-hotspot-interaction > img')?.getAttribute('class')).toBe('qti-margin-2');
  });

  test('multiple cardinality, min-choices and class survive', () => {
    expect(exported.querySelector('qti-response-declaration')?.getAttribute('cardinality')).toBe('multiple');
    expect(correctValuesOf(exported)).toEqual(['i1', 'i3']);
    expect(attributesOf(exported.querySelector('qti-hotspot-interaction'))).toMatchObject({
      'max-choices': '0',
      'min-choices': '1',
      class: 'qti-selections-dark',
    });
  });

  test('a picture in the prompt stays in the prompt, formatting and all', () => {
    const prompt = exported.querySelector('qti-hotspot-interaction > qti-prompt');
    expect(prompt?.querySelector('strong')?.textContent?.trim()).toBe('parts');
    expect(prompt?.querySelector('img')?.getAttribute('src')).toBe('legend.png');
    expect(exported.querySelector('qti-hotspot-interaction > img')?.getAttribute('src')).toBe('plants.svg');
  });
});

describe('choices without an identifier', () => {
  const xml = item(
    `<qti-hotspot-interaction response-identifier="RESPONSE" max-choices="1">
      <img src="ukair.png" width="206" height="280" alt="Map"/>
      <qti-hotspot-choice shape="circle" coords="1,1,1"/>
      <qti-hotspot-choice identifier="HOTSPOT_1" shape="circle" coords="2,2,2"/>
      <qti-hotspot-choice shape="circle" coords="3,3,3"/>
    </qti-hotspot-interaction>`,
    `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"/>`,
  );

  test('get one each, unique within the interaction and the same on every import', () => {
    const identifiers = choicesOf(roundtrip(xml)).map(choice => choice.identifier);
    expect(identifiers).toEqual(['HOTSPOT_2', 'HOTSPOT_1', 'HOTSPOT_3']);
    expect(choicesOf(roundtrip(xml)).map(choice => choice.identifier)).toEqual(identifiers);
  });
});

describe('an <object> picture', () => {
  const xml = item(
    `<qti-hotspot-interaction response-identifier="RESPONSE" max-choices="1">
      <object type="image/png" data="ukair.png" width="206" height="280">Map of the United Kingdom</object>
      <qti-hotspot-choice identifier="A" shape="circle" coords="77,115,10"/>
    </qti-hotspot-interaction>`,
    `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
      <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
    </qti-response-declaration>`,
  );

  test('stays an <object>, with its type, size and fallback text', () => {
    const object = roundtrip(xml).querySelector('qti-hotspot-interaction > object');
    expect(attributesOf(object)).toEqual({ type: 'image/png', data: 'ukair.png', width: '206', height: '280' });
    expect(object?.textContent?.trim()).toBe('Map of the United Kingdom');
  });

  test('keeps a fallback <img> and its class', () => {
    const withFallbackImage = item(
      `<qti-hotspot-interaction response-identifier="RESPONSE" max-choices="1">
        <object type="image/svg+xml" data="map.svg" width="206" height="280" class="qti-margin-2"><img src="map.png" alt="Map of the United Kingdom" width="206" height="280"/></object>
        <qti-hotspot-choice identifier="A" shape="circle" coords="77,115,10"/>
      </qti-hotspot-interaction>`,
      `<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier"/>`,
    );
    const object = roundtrip(withFallbackImage).querySelector('qti-hotspot-interaction > object');
    expect(object?.getAttribute('class')).toBe('qti-margin-2');
    expect(attributesOf(object?.querySelector(':scope > img') ?? null)).toEqual({
      src: 'map.png',
      alt: 'Map of the United Kingdom',
      width: '206',
      height: '280',
    });
  });
});

describe('import scores each hotspot interaction by its own response', () => {
  // Two interactions with their own weight; the generic hoist used to give both the first one found.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Item" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="R1" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-response-declaration identifier="R2" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>B</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>
    <qti-hotspot-interaction response-identifier="R1" max-choices="1"><img src="a.png" width="10" height="10"/><qti-hotspot-choice identifier="A" shape="circle" coords="1,1,1"/></qti-hotspot-interaction>
    <qti-hotspot-interaction response-identifier="R2" max-choices="1"><img src="b.png" width="10" height="10"/><qti-hotspot-choice identifier="B" shape="circle" coords="2,2,1"/></qti-hotspot-interaction>
  </qti-item-body>
  <qti-response-processing>
    ${['R1:2', 'R2:3']
      .map(pair => {
        const [identifier, weight] = pair.split(':');
        return `<qti-response-condition><qti-response-if>
          <qti-match><qti-variable identifier="${identifier}"/><qti-correct identifier="${identifier}"/></qti-match>
          <qti-set-outcome-value identifier="SCORE"><qti-sum><qti-variable identifier="SCORE"/><qti-base-value base-type="float">${weight}</qti-base-value></qti-sum></qti-set-outcome-value>
        </qti-response-if></qti-response-condition>`;
      })
      .join('')}
  </qti-response-processing>
</qti-assessment-item>`;

  test('a weight of 2 and one of 3 come back as 2 and 3', () => {
    const scores: Record<string, unknown> = {};
    importItem(xml).descendants(node => {
      if (node.type.name === 'qtiHotspotInteraction') scores[node.attrs.responseIdentifier] = node.attrs.score;
    });
    expect(scores).toEqual({ R1: 2, R2: 3 });
  });
});

describe('compose', () => {
  function compose(attrs: string) {
    const source = new DOMParser().parseFromString(
      `<qti-hotspot-interaction response-identifier="RESPONSE" ${attrs}><img src="a.png"/></qti-hotspot-interaction>`,
      'application/xml',
    ).documentElement;
    return composeHotspotInteractionElement(source, document.implementation.createDocument(null, null, null));
  }

  test('max-choices 1 declares a single response, anything else multiple', () => {
    expect(compose('max-choices="1" correct-response="A"').responseDeclaration?.cardinality).toBe('single');
    expect(compose('max-choices="0" correct-response="A,B"').responseDeclaration).toMatchObject({
      cardinality: 'multiple',
      baseType: 'identifier',
      correctResponse: ['A', 'B'],
    });
  });

  test('strips the authoring attributes from the exported element', () => {
    const { normalizedElement } = compose('max-choices="1" correct-response="A" score="2"');
    expect(normalizedElement.hasAttribute('correct-response')).toBe(false);
    expect(normalizedElement.hasAttribute('score')).toBe(false);
  });

  test('never exports more correct values than max-choices allows, and warns when it cuts', () => {
    const single = compose('max-choices="1" correct-response="A,B"');
    expect(single.responseDeclaration).toMatchObject({ cardinality: 'single', correctResponse: 'A' });
    expect(single.warnings.map(warning => warning.code)).toEqual(['CORRECT_RESPONSE_EXCEEDS_MAX_CHOICES']);

    expect(compose('max-choices="2" correct-response="A,B,C"').responseDeclaration?.correctResponse).toEqual(['A', 'B']);
    expect(compose('max-choices="0" correct-response="A,B,C"').warnings).toEqual([]);
  });
});

describe('selecting, adding and removing a choice', () => {
  const doc = importItem(Q10_MULTIPLE);
  const state = EditorState.create({ doc, schema, plugins: [createHotspotChoiceEditingPlugin()] });
  let interactionPos = -1;
  doc.descendants((node, pos) => {
    if (node.type.name === 'qtiHotspotInteraction') interactionPos = pos;
  });
  const interactionAfter = (next: EditorState) => {
    let found: PmNode | null = null;
    next.doc.descendants(node => {
      if (node.type.name === 'qtiHotspotInteraction') found = node;
      return !found;
    });
    return found!;
  };
  const identifiers = (node: PmNode) =>
    node.children.filter(child => child.type.name === 'qtiHotspotChoice').map(child => child.attrs.identifier);
  const selected = (next: EditorState) =>
    next.selection instanceof NodeSelection ? next.selection.node : null;

  test('select puts a NodeSelection on the choice, or with null on the interaction', () => {
    const onChoice = state.apply(applyHotspotChoicesEdit(state, interactionPos, { op: 'select', identifier: 'B' })!);
    expect(selected(onChoice)?.attrs.identifier).toBe('B');
    const onInteraction = state.apply(applyHotspotChoicesEdit(state, interactionPos, { op: 'select', identifier: null })!);
    expect(selected(onInteraction)?.type.name).toBe('qtiHotspotInteraction');
  });

  test('add appends a choice with a fresh identifier, and selects it', () => {
    const next = state.apply(applyHotspotChoicesEdit(state, interactionPos, { op: 'add', shape: 'rect', coords: '600,20,640,60' })!);
    const added = interactionAfter(next).lastChild!;
    expect(added.attrs).toMatchObject({ shape: 'rect', coords: '600,20,640,60' });
    expect(added.attrs.identifier).toMatch(/^HOTSPOT_/);
    expect(selected(next)).toBe(added);
  });

  test('remove deletes the choice and drops it from the correct response', () => {
    const next = state.apply(applyHotspotChoicesEdit(state, interactionPos, { op: 'remove', identifier: 'B' })!);
    expect(identifiers(interactionAfter(next))).toEqual(['A', 'C', 'D']);
    expect(interactionAfter(next).attrs.correctResponse).toEqual(['A', 'D']);
  });

  test('removing a choice that is not correct leaves the correct response alone', () => {
    const next = state.apply(applyHotspotChoicesEdit(state, interactionPos, { op: 'remove', identifier: 'C' })!);
    expect(interactionAfter(next).attrs.correctResponse).toEqual(['A', 'B', 'D']);
  });

  test('deleting a selected choice the ProseMirror way prunes the answer key too', () => {
    const onChoice = state.apply(applyHotspotChoicesEdit(state, interactionPos, { op: 'select', identifier: 'D' })!);
    const next = onChoice.apply(onChoice.tr.deleteSelection());
    expect(identifiers(interactionAfter(next))).toEqual(['A', 'B', 'C']);
    expect(interactionAfter(next).attrs.correctResponse).toEqual(['A', 'B']);
  });

  test('an answer key naming a choice that was never there is left alone', () => {
    const withGhost = state.apply(
      state.tr.setNodeMarkup(interactionPos, undefined, { ...doc.nodeAt(interactionPos)!.attrs, correctResponse: ['A', 'GHOST'] }),
    );
    const next = withGhost.apply(withGhost.tr.insertText('x', 1));
    expect(interactionAfter(next).attrs.correctResponse).toEqual(['A', 'GHOST']);
  });
});
