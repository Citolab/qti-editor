import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/select-point-interaction/styles';

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      white-space: normal;
    }

    ::slotted(qti-prompt) {
      display: block;
      margin-bottom: 10px;
    }

    ::slotted(img:not([src])) {
      min-width: 240px;
      min-height: 160px;
      border: 1px dashed #d1d5db;
      background: #f9fafb;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }

    .toolbar button,
    .toolbar input {
      font: inherit;
      font-size: 12px;
    }

    .toolbar button {
      border: 1px solid #9ca3af;
      background: #f9fafb;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
    }

    .toolbar button[aria-pressed='true'] {
      background: #2563eb;
      border-color: #2563eb;
      color: #ffffff;
    }

    .toolbar .danger {
      border-color: #b91c1c;
      color: #b91c1c;
    }

    .surface {
      position: relative;
      display: inline-block;
      max-width: 100%;
      line-height: 0;
    }

    svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .meta {
      margin-top: 8px;
      font-size: 12px;
      color: #4b5563;
    }

    input[type='file'] {
      display: none;
    }
  `,
];

export default styles;
