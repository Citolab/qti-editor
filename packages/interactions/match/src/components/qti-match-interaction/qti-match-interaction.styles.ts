import { css, type CSSResultGroup } from 'lit';
import { associationPanelStyles } from '@qti-editor/interaction-shared';

import externalStyles from '@qti-components/match-interaction/styles';

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
