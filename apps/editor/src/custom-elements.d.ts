// TypeScript declarations for Lit custom elements used in JSX

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'qti-editor-app': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      'lit-editor-toolbar': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
