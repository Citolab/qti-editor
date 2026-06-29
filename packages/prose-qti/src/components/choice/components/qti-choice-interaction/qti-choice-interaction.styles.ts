import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/choice-interaction/styles';

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      word-wrap: break-word;
      white-space: normal;
    }
  `,
];

export default styles;
