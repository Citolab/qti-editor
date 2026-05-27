/**
 * ProseKit adapter for the supported QTI editor-kit interaction surface.
 */

// @ts-expect-error Side-effect CSS import is resolved by the bundler.
import '@qti-components/theme/item.css';
import {
  listInteractionDescriptors,
  listInteractionPluginFactories,
  listInteractionSchemaNodeSpecs,
} from '@qti-editor/core/interactions/composer';
import { defineBasicExtension } from 'prosekit/basic';
import { defineKeymap, defineNodeSpec, definePlugin, union, type Extension } from 'prosekit/core';

import type { Command } from 'prosekit/pm/state';

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

  for (const descriptor of descriptors) {
    if (descriptor.insertCommand && descriptor.keyboardShortcut) {
      keymap[descriptor.keyboardShortcut] = descriptor.insertCommand;
    }
  }

  const pluginExtensions = listInteractionPluginFactories().map(pluginFactory => definePlugin(pluginFactory));

  return union(...nodeSpecExtensions, defineKeymap(keymap), ...pluginExtensions);
}

export function defineQtiExtension() {
  return union(defineBasicExtension(), defineQtiInteractionsExtension());
}

export type QtiExtension = ReturnType<typeof defineQtiExtension>;
export type QtiInteractionsExtension = ReturnType<typeof defineQtiInteractionsExtension>;
