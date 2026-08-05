import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/order-interaction/styles';

/**
 * PK: this maybe removed:       display: flex;
 * [part~='drop'] {
 *  display: flex;
 *   }
 * when qti-components already changed it
 */
const styles: CSSResultGroup = [
  externalStyles,
  css`
    [part~='drop'] {
      display: flex;
    }
  `
];

export default styles;
