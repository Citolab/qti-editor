import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/text-entry-interaction/styles';

const styles: CSSResultGroup = [
  externalStyles,
  css`
    :host {
      white-space: nowrap;
    }

    [part='input']::placeholder {
      color: hsl(var(--muted-foreground, 220 9% 56%));
      font-style: italic;
    }
  `,
];

export default styles;
