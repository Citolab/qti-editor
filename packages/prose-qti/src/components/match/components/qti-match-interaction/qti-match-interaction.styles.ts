import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/match-interaction/styles';

import { associationPanelStyles } from '../../../shared';
import { editorWhiteSpace } from '../../../shared/styles/white-space.js';


const styles: CSSResultGroup = [
  externalStyles,
  editorWhiteSpace,
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
