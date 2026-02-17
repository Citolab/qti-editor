import type { VariableDeclaration } from '@qti-components/base';

export interface ItemContext {
  identifier?: string;
  href?: string;
  title?: string;
  variables?: ReadonlyArray<VariableDeclaration<string | string[] | null>>;
  itemBody?: XMLDocument; // XML document of the item body, if available
}

export const itemContextVariables = [] as VariableDeclaration<string | string[]>[];
