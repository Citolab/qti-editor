import { describe, it, expect } from 'vitest';
import { createEditor, jsonFromHTML, union } from 'prosekit/core';
import { defineBasicExtension } from '../../../../apps/editor/src/extensions/basic-extension';
import { defineQtiInteractionsExtension } from '../../../../apps/editor/src/extensions/qti-interactions-extension';

import { itemXmlToImportHtml } from './index';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i1" title="i1">
  <qti-item-body>
    <qti-extended-text-interaction xmlns="" response-identifier="RESPONSE" expected-lines="6" data-correct-response="Zodat er licht bij de plantjes kan komen." data-score="1">
      <qti-prompt>
        <p>
          Waarom moet er vooral flink geschoffeld worden tussen de plantjes als die plantjes net boven de grond uitkomen? Bedenkt hierbij wat er nodig is voor fotosynthese.
        </p>
      </qti-prompt>
    </qti-extended-text-interaction>
  </qti-item-body>
</qti-assessment-item>`;

describe('roundtrip-import qti-prompt parsing', () => {
  it('keeps the prompt paragraph inside qti-prompt', () => {
    const html = itemXmlToImportHtml(SAMPLE_XML);
    console.log('IMPORT HTML:', html);

    const editor = createEditor({
      extension: union(defineBasicExtension(), defineQtiInteractionsExtension()),
    });
    const schema = editor.schema;
    const json = jsonFromHTML(html, { schema });
    console.log('IMPORT JSON:', JSON.stringify(json, null, 2));

    const mount = document.createElement('div');
    document.body.appendChild(mount);
    editor.mount(mount);
    editor.setContent(json);

    const stateDoc = editor.view!.state.doc;
    console.log('STATE DOC JSON:', JSON.stringify(stateDoc.toJSON(), null, 2));
    console.log('RENDERED HTML:', editor.view!.dom.innerHTML);

    const doc = stateDoc;

    // Find any qtiExtendedTextInteraction in the parsed doc
    let interactionNode: any = null;
    doc.descendants(node => {
      if (node.type.name === 'qtiExtendedTextInteraction') interactionNode = node;
      return interactionNode == null;
    });
    expect(interactionNode).toBeTruthy();
    expect(interactionNode.textContent).toContain('Waarom moet er vooral');
  });

  it('collapses indentation whitespace inside paragraphs', () => {
    const html = itemXmlToImportHtml(SAMPLE_XML);
    // The exporter pretty-prints with newlines + spaces inside <p>; importer
    // must collapse those so ProseMirror does not render leading whitespace.
    expect(html).not.toMatch(/<p>\s*\n\s+Waarom/);
    expect(html).toMatch(/<p>Waarom moet er vooral/);
  });
});
