import { expect } from 'storybook/test';

import { toEqualXml } from './../tools/testing/setup/toEqualXml';

import type { Preview } from '@storybook/web-components-vite';

/*
 * Shared CSS reset, matching qti-components' own Storybook preview so stories
 * render on the same substrate here as they do upstream. modern-normalize =
 * normalize + the universal `box-sizing: border-box` rule. Imported from the
 * local dependency, not a CDN.
 *
 * It resets browser inconsistencies only. The *opinions* — paragraph/heading/
 * list margins, body typography — belong to the theme, imported after it.
 */
import 'modern-normalize/modern-normalize.css';

// Then the same order the apps use (see apps/*/src/app.css): the canonical
// theme palette, then the editor's core-css layered on top.
import '@qti-components/theme/item.css';
import './../packages/prose-qti/src/core-css/core-css.css';

// Make the `toEqualXml` matcher available to story `play` functions.
expect.extend({ toEqualXml });

declare global {
  interface Window {
    __qtiInspectStyles?: (target: string | Element) => unknown;
  }
}

if (typeof window !== 'undefined' && !window.__qtiInspectStyles) {
  window.__qtiInspectStyles = (target: string | Element) => {
    const host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) {
      console.warn('[qti styles] target not found', target);
      return null;
    }

    const roots: Array<{ label: string; root: Document | ShadowRoot }> = [{ label: 'document', root: document }];
    if ((host as Element).shadowRoot) {
      roots.push({ label: `${(host as Element).tagName.toLowerCase()}#shadowRoot`, root: (host as Element).shadowRoot! });
    }

    const report = roots.map(({ label, root }) => {
      const linksOrStyles = Array.from(root.querySelectorAll('link[rel="stylesheet"], style')).map((node, idx) => {
        if (node instanceof HTMLLinkElement) {
          return { index: idx, kind: 'link', href: node.href };
        }
        return {
          index: idx,
          kind: 'style',
          preview: (node.textContent || '').trim().slice(0, 120)
        };
      });

      const adopted = (root as ShadowRoot).adoptedStyleSheets
        ? Array.from((root as ShadowRoot).adoptedStyleSheets).map((sheet, idx) => ({
            index: idx,
            kind: 'adoptedStyleSheet',
            href: (sheet as CSSStyleSheet & { href?: string }).href ?? null,
            rules: sheet.cssRules.length
          }))
        : [];

      return { label, linksOrStyles, adopted };
    });

    console.log('[qti styles] report for', host);
    for (const section of report) {
      console.group(section.label);
      if (section.linksOrStyles.length > 0) console.table(section.linksOrStyles);
      if (section.adopted.length > 0) console.table(section.adopted);
      if (section.linksOrStyles.length === 0 && section.adopted.length === 0) console.log('No styles found');
      console.groupEnd();
    }

    return report;
  };
}

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: ['Docs', ['1. Introduction', '2. Extensions', '3. Editor Setup', '4. UI Components']],
      },
    },
  },
};

export default preview;
