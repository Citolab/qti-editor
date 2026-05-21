import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/hottext-interaction/styles';

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      display: block;
      white-space: normal;
      position: relative;
      overflow: visible;
    }

    qti-hottext {
      border-radius: var(--qti-border-radius);
      background: var(--qti-bg);
      border: var(--qti-border-thickness) var(--qti-border-style) var(--qti-border-color);
      outline: none;
    }

    qti-hottext[selected] {
      background: color-mix(in srgb, #16a34a 10%, var(--qti-bg));
      border-color: #16a34a;
    }

    [part='selection-menu'] {
      position: fixed;
      z-index: 50;
      padding: 6px 8px;
      background: var(--qti-bg, #f8fafc);
      border: 1px solid var(--qti-border, #e2e8f0);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      text-align: left;
    }

    [part='selection-action'] {
      border-radius: 4px;
      background: var(--qti-bg, #f8fafc);
      border: 1px solid var(--qti-border, #e2e8f0);
      cursor: pointer;
      font: inherit;
      text-align: center;
      transition: opacity 120ms ease;
    }

    [part='selection-action']:hover {
      opacity: 0.85;
    }
  `
];

export default styles;
