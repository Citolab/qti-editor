// TypeScript declarations for Lit custom elements used in JSX

import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type ToolbarLabels = Partial<Record<string, string>>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'qti-editor-app': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        lang?: string;
      };
      'lit-editor-toolbar': DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        editor?: unknown;
        uploader?: unknown;
        labels?: ToolbarLabels;
      };
    }
  }
}
