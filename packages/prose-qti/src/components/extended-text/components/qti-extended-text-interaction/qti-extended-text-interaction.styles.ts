import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/extended-text-interaction/styles';

import { editorWhiteSpace } from '../../../shared/styles/white-space.js';

const styles: CSSResultGroup = [
  externalStyles,
  editorWhiteSpace,
  css`
    [part='textarea']::placeholder {
      color: hsl(var(--muted-foreground, 220 9% 56%));
      font-style: italic;
    }
  `,
];

export default styles;
