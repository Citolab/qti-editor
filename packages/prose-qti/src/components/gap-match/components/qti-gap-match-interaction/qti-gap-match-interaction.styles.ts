import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/gap-match-interaction/styles';

import { associationPanelStyles } from '../../../shared';
import { editorWhiteSpace } from '../../../shared/styles/white-space.js';

const styles: CSSResultGroup = [
  externalStyles,
  editorWhiteSpace,
  css`
    :host {
      word-wrap: break-word;
    }
  `,
  associationPanelStyles,
];

export default styles;
