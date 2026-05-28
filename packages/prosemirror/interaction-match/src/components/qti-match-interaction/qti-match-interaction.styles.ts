import { css, type CSSResultGroup } from 'lit';
import { associationPanelStyles } from '@qti-editor/interaction-shared';

import externalStyles from '@qti-components/match-interaction/styles';


/** Light DOM styles injected as a <style> element (applies to slotted content) */
export const LIGHT_DOM_STYLES = `
  /* Source items (first match set) - clickable */
  qti-simple-match-set:first-of-type qti-simple-associable-choice {
    cursor: pointer;
    border-radius: 4px;
    padding: 4px 8px;
  }

  qti-simple-match-set:first-of-type qti-simple-associable-choice:hover {
    background: var(--qti-bg-hover, #f1f5f9);
  }

  /* Target items (second match set) - styled as drop slots */
  qti-simple-match-set:last-of-type qti-simple-associable-choice {
    border: 1px dashed var(--qti-border, #cbd5e1);
    border-radius: 4px;
    padding: 4px 8px;
    background: white;
    cursor: pointer;
  }

  qti-simple-match-set:last-of-type qti-simple-associable-choice:hover {
    border-color: var(--qti-border-active, #3b82f6);
    background: var(--qti-bg-hover, #f8fafc);
  }
`;

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      white-space: nowrap;
      position: relative;
      overflow: visible;
    }
  `,
  associationPanelStyles,
];

export default styles;
