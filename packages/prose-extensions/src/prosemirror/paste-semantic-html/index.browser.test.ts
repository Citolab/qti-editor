import { describe, expect, it } from 'vitest';

import { hydrateSemanticPasteImages, makeHtmlSemantic } from './index.js';

describe('semantic paste html', () => {
  it('converts Word VML image data into img elements', () => {
    const html = makeHtmlSemantic(`
      <p class="MsoNormal">
        <v:shape style="width:120pt;height:60pt">
          <v:imagedata src="file:///private/var/folders/clip_image001.png" o:title="Diagram" />
        </v:shape>
      </p>
    `);

    expect(html).toContain('<img');
    expect(html).toContain('src="file:///private/var/folders/clip_image001.png"');
    expect(html).toContain('alt="Diagram"');
    expect(html).not.toContain('v:imagedata');
    expect(html).not.toContain('v:shape');
  });

  it('hydrates local Word image references with clipboard image data', () => {
    const html = hydrateSemanticPasteImages(
      `
        <p>Before</p>
        <p><img src="file:///private/var/folders/clip_image001.png" alt="Diagram"></p>
        <p>After</p>
      `,
      [{ src: 'data:image/png;base64,abc123', alt: 'clipboard.png' }],
    );

    expect(html).toContain('<p>Before</p>');
    expect(html).toContain('<img src="data:image/png;base64,abc123" alt="Diagram">');
    expect(html).toContain('<p>After</p>');
    expect(html).not.toContain('file:///private/var/folders/clip_image001.png');
  });

  it('appends clipboard images when Word provides files without HTML placeholders', () => {
    const html = hydrateSemanticPasteImages(
      '<p>Only text</p>',
      [{ src: 'data:image/png;base64,abc123', alt: 'clipboard.png' }],
    );

    expect(html).toContain('<p>Only text</p>');
    expect(html).toContain('<img src="data:image/png;base64,abc123" alt="clipboard.png">');
  });
});
