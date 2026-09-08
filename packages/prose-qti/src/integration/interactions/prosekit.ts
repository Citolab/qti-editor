/**
 * ProseKit adapter for the supported QTI editor-kit interaction surface.
 */

// Register all QTI interaction custom elements (and their shared sub-elements)
// via the package aggregate register side-effect module. The aggregate also
// registers the item divider.
import '@citolab/prose-qti/components/register';
import { defineBasicExtension } from '@citolab/prose-extensions/prosekit';
import { defineKeymap, defineNodeSpec, definePlugin, union, type Extension } from 'prosekit/core';

import {
  listInteractionDecoratorPluginFactories,
  listInteractionDescriptors,
  listInteractionPluginFactories,
  listInteractionSchemaNodeSpecs,
} from '@citolab/prose-qti/core/interactions/composer';
import {
  constrainedHome,
  constrainedShiftHome,
  constrainedEnd,
  constrainedShiftEnd,
} from '@citolab/prose-qti/components/shared';

import type { Command } from 'prosekit/pm/state';

/**
 * @deprecated Custom elements are now registered via the explicit `register`
 * side-effect import at the top of this module (and the per-component
 * `@citolab/prose-qti/components/<name>/register` modules). This function is
 * retained as a no-op for backwards compatibility and will be removed in a
 * future release.
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

  // Home/End: constrain cursor within isolating ancestors (shadow-DOM custom
  // elements confuse the browser's native Home/End handling).
  keymap['Home'] = constrainedHome;
  keymap['Shift-Home'] = constrainedShiftHome;
  keymap['End'] = constrainedEnd;
  keymap['Shift-End'] = constrainedShiftEnd;

  for (const descriptor of descriptors) {
    if (descriptor.insertCommand && descriptor.keyboardShortcut) {
      keymap[descriptor.keyboardShortcut] = descriptor.insertCommand;
    }
  }

  const pluginExtensions = listInteractionPluginFactories().map(pluginFactory => definePlugin(pluginFactory));

  return union(...nodeSpecExtensions, defineKeymap(keymap), ...pluginExtensions);
}

/**
 * Editor-only affordance decorations for every interaction that ships one
 * (currently choice): the hover boundary, the per-choice ×, the trailing + and
 * the settings pill.
 *
 * Deliberately NOT folded into `defineQtiExtension()`. These are an opinion
 * about how authoring should feel, so a read-only or player host must not get
 * them by default — hosts compose this extension themselves, and pair it with
 * the opt-in `@citolab/prose-qti/decorations.css` stylesheet.
 */
export function defineQtiDecorationsExtension() {
  const decoratorExtensions = listInteractionDecoratorPluginFactories().map(pluginFactory =>
    definePlugin(pluginFactory),
  );

  return union(...decoratorExtensions);
}

export function defineQtiExtension() {
  return union(defineBasicExtension(), defineQtiInteractionsExtension());
}

export type QtiExtension = ReturnType<typeof defineQtiExtension>;
export type QtiInteractionsExtension = ReturnType<typeof defineQtiInteractionsExtension>;
export type QtiDecorationsExtension = ReturnType<typeof defineQtiDecorationsExtension>;
