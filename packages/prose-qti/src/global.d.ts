declare module '@citolab/prose-qti/core-css' {
  import type { CSSResultGroup } from 'lit';

  const styles: CSSResultGroup;
  export default styles;
}

declare module '*.css' {
  import type { CSSResultGroup } from 'lit';

  const styles: CSSResultGroup;
  export default styles;
}

declare module '*.css?raw' {
  const content: string;
  export default content;
}
