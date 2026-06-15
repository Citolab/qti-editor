/**
 * ProseKit adapter for the supported QTI editor-kit interaction surface.
 */

// Register all QTI interaction custom elements (and their shared sub-elements)
// via the explicit per-package register side-effect modules. Importing the
// barrel aggregate registers them all at once; the item divider lives in its
// own package and is registered via its `/define` side-effect module.
import '@qti-editor/interactions/register';
import '@qti-editor/qti-item-divider/define';
import {
  listInteractionDescriptors,
  listInteractionPluginFactories,
  listInteractionSchemaNodeSpecs,
} from '@qti-editor/core/interactions/composer';
import { defineBasicExtension } from 'prosekit/basic';
import { defineKeymap, defineNodeSpec, definePlugin, union, type Extension } from 'prosekit/core';

import type { Command } from 'prosekit/pm/state';

/**
 * @deprecated Custom elements are now registered via the explicit `register`
 * side-effect imports at the top of this module (and the per-package
 * `@qti-editor/interaction-<name>/register` modules). This function is retained
 * as a no-op for backwards compatibility and will be removed in a future
 * release.
 */
export function registerQtiInteractionElements() {
  // Intentionally empty: registration happens through side-effect imports.
}

export function defineQtiInteractionsExtension() {
  const descriptors = listInteractionDescriptors();

  const nodeSpecExtensions: Extension[] = listInteractionSchemaNodeSpecs().map(({ name, spec }) =>
    defineNodeSpec({ name, ...spec }),
  );

  // Build keymap from descriptors
  const keymap: Record<string, Command> = {};

  // Enter commands: tried in registration order, first match wins
  const enterCommands = descriptors
    .map(d => d.enterCommand)
    .filter((cmd): cmd is Command => cmd != null);

  if (enterCommands.length > 0) {
    keymap['Enter'] = (state, dispatch, view) =>
      enterCommands.some(cmd => cmd(state, dispatch, view));
  }

  // Backspace commands: tried in registration order, first match wins
  const backspaceCommands = descriptors
    .map(d => d.backspaceCommand)
    .filter((cmd): cmd is Command => cmd != null);

  if (backspaceCommands.length > 0) {
    keymap['Backspace'] = (state, dispatch, view) =>
      backspaceCommands.some(cmd => cmd(state, dispatch, view));
  }

  const pluginExtensions = listInteractionPluginFactories().map(pluginFactory => definePlugin(pluginFactory));

  return union(...nodeSpecExtensions, defineKeymap(keymap), ...pluginExtensions);
}

export function defineQtiExtension() {
  return union(defineBasicExtension(), defineQtiInteractionsExtension());
}

export type QtiExtension = ReturnType<typeof defineQtiExtension>;
export type QtiInteractionsExtension = ReturnType<typeof defineQtiInteractionsExtension>;
