import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/order-interaction/styles';

import { editorWhiteSpace } from '../../../shared/styles/white-space.js';

/**
 * PK: this maybe removed:       display: flex;
 * [part~='drop'] {
 *  display: flex;
 *   }
 * when qti-components already changed it
 */
const styles: CSSResultGroup = [
  externalStyles,
  editorWhiteSpace,
  css`
    [part~='drop'] {
      display: flex;
    }
  `
];

export default styles;
