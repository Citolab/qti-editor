import { render } from 'lit';
import { expect, test } from 'vitest';

import {
  RoundtripItem001,
  type EditorContainer,
} from './qti-choice-interaction-item001.regression.stories';
import assertedXML from '../../../../public/qti/kennisnet/ITEM001-editor.xml?raw';

test('exported QTI matches the imported ITEM001-editor.xml', () => {
  // Reuse the story: render its template (load → import → mount → export).
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(RoundtripItem001.render!(undefined as never, {} as never), host);

  // The story exposes its exported QTI on the editor container.
  const container = host.querySelector<EditorContainer>('.editor-container');
  const exportedXml = container?.__exportedXml;

  // Exported XML must equal the imported asserted fixture.
  expect(exportedXml).toEqualXml(assertedXML);

  host.remove();
});
