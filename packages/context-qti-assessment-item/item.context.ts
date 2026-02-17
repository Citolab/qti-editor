import type { VariableDeclaration } from '@qti-components/base';

export interface ItemContext {
  identifier?: string;
  href?: string;
  variables?: ReadonlyArray<VariableDeclaration<string | string[] | null>>;
  /**
   * Optional per-interaction opaque state, keyed by responseIdentifier.
   * Used for interactions that support state save/restore (e.g. PCI).
   */
  state?: Record<string, string | null>;
}

export const itemContextVariables = [] as VariableDeclaration<string | string[]>[];
