/**
 * Item Context
 *
 * Shared context and types for QTI assessment item state.
 * Used by components to access and share item data.
 */

import { createContext } from '@lit/context';
import type { VariableDeclaration } from '@qti-components/base';

/**
 * The shape of item context data shared across components.
 */
export interface ItemContext {
  identifier?: string;
  title?: string;
  variables?: ReadonlyArray<VariableDeclaration<string | string[] | null>>;
  itemBody?: XMLDocument;
}

/**
 * Lit context symbol for sharing ItemContext across components.
 * Use with @provide/@consume decorators from @lit/context.
 */
export const itemContext = createContext<ItemContext>(Symbol('item'));

/**
 * Default empty array for variable declarations.
 */
export const itemContextVariables = [] as VariableDeclaration<string | string[]>[];
