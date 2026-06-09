/**
 * Item Context
 *
 * Shared context and types for QTI assessment item state.
 */

import { createContext } from '@lit/context';

import type { VariableDeclaration } from '@qti-components/base';

export interface PerItemMetadata {
  identifier?: string;
  title?: string;
}

export interface ItemContext {
  identifier?: string;
  lang?: string;
  title?: string;
  variables?: ReadonlyArray<VariableDeclaration<string | string[] | null>>;
  itemBody?: XMLDocument;
  items?: PerItemMetadata[];
}

export const itemContext = createContext<ItemContext>(Symbol('item'));

export const itemContextVariables = [] as VariableDeclaration<string | string[]>[];
