import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/match-interaction/styles';

import { associationPanelStyles } from '../../../shared';


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
