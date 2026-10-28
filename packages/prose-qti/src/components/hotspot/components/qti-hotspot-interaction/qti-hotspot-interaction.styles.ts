import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/hotspot-interaction/styles';

import { editorWhiteSpace } from '../../../shared/styles/white-space.js';

const styles: CSSResultGroup = [
  externalStyles,
  editorWhiteSpace,
  css`
    ::slotted(qti-prompt) {
      display: block;
      margin-bottom: 10px;
    }

    /* The editor draws the choices itself, on the SVG layer below; the elements carry only data. */
    ::slotted(qti-hotspot-choice) {
      display: none;
    }

    ::slotted(object) {
      display: block;
      max-width: 100%;
      height: auto;
      pointer-events: none;
    }

    ::slotted(img:not([src])),
    ::slotted(object:not([data])) {
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

    .toolbar button {
      font: inherit;
      font-size: 12px;
      border: 1px solid #9ca3af;
      background: #f9fafb;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
    }

    .toolbar button[aria-pressed='true'] {
      background: var(--qti-primary, #2563eb);
      border-color: var(--qti-primary, #2563eb);
      color: #ffffff;
    }

    .toolbar .danger {
      border-color: #b91c1c;
      color: #b91c1c;
    }

    .toolbar .separator {
      width: 1px;
      align-self: stretch;
      background: #d1d5db;
    }

    .surface {
      position: relative;
      display: inline-block;
      max-width: 100%;
      line-height: 0;
      touch-action: none;
    }

    .surface[data-mode='circle'],
    .surface[data-mode='rect'],
    .surface[data-mode='poly'] {
      cursor: crosshair;
    }

    /* Focused by a press while a polygon is drawn, for Enter and Escape; not a tab stop. */
    .surface:focus {
      outline: none;
    }

    svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .area {
      fill: color-mix(in srgb, var(--qti-primary, #2563eb) 15%, transparent);
      stroke: var(--qti-primary, #2563eb);
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
      cursor: move;
    }

    .area--correct {
      fill: color-mix(in srgb, var(--qti-correct, #16a34a) 30%, transparent);
      stroke: var(--qti-correct, #16a34a);
    }

    .area--selected {
      stroke-width: 3;
      stroke-dasharray: 6 3;
    }

    .area--draft {
      fill: none;
      stroke-dasharray: 4 4;
      pointer-events: none;
    }

    .handle {
      fill: #ffffff;
      stroke: var(--qti-primary, #2563eb);
      stroke-width: 2;
      vector-effect: non-scaling-stroke;
      cursor: nwse-resize;
    }

    .handle--start {
      cursor: pointer;
    }

    .meta {
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.4;
      color: #4b5563;
    }

    .meta--warning {
      color: #b91c1c;
    }

    input[type='file'] {
      display: none;
    }
  `,
];

export default styles;
