import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/choice-interaction/styles';

import { editorWhiteSpace } from '../../../shared/styles/white-space.js';

const styles: CSSResultGroup = [
  externalStyles,
  editorWhiteSpace,
  css`
    :host {
      word-wrap: break-word;
    }
  `,
];

export default styles;
