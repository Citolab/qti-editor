/**
 * QTI interactions extension using the descriptor pattern.
 * 
 * This file demonstrates the correct way to assemble QTI interactions
 * using the descriptor registry from @citolab/prose-qti/core.
 */

import '@citolab/prose-qti/components/register';

import {
  listInteractionDescriptors,
  listSelectedInteractionPluginFactories,
  listInteractionSchemaNodeSpecs,
} from '@citolab/prose-qti/core/interactions/composer';
import { defineKeymap, defineNodeSpec, definePlugin, union, type Extension } from 'prosekit/core';

import type { Command } from 'prosekit/pm/state';

/**
 * Assembles selected QTI interactions into a ProseKit extension.
 * 
 * This uses the descriptor pattern to automatically:
 * - Collect node specs from selected interactions
 * - Build keymap from descriptor keyboard shortcuts
 * - Install plugins from interaction plugin factories
 * - Set up Enter commands for interactions that need them
 * 
 * @param options - Configuration options
 * @param options.include - Optional array of interaction tag names to include (e.g., ['qti-choice-interaction', 'qti-extended-text-interaction'])
 *                          If omitted, all registered interactions are included.
 */
export function defineQtiInteractionsExtension(options?: {
  include?: string[];
}): Extension {
  const allDescriptors = listInteractionDescriptors();
  
  // Filter to only included interaction types if specified
  const descriptors = options?.include
    ? allDescriptors.filter(d => options.include!.includes(d.tagName))
    : allDescriptors;

  const nodeSpecExtensions: Extension[] = listInteractionSchemaNodeSpecs(options).map(({ name, spec }) =>
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

  // Add keyboard shortcuts for insert commands
  for (const descriptor of descriptors) {
    if (descriptor.insertCommand && descriptor.keyboardShortcut) {
      keymap[descriptor.keyboardShortcut] = descriptor.insertCommand;
    }
  }

  const pluginExtensions = listSelectedInteractionPluginFactories(options).map(pluginFactory => 
    definePlugin(pluginFactory)
  );

  return union(...nodeSpecExtensions, defineKeymap(keymap), ...pluginExtensions);
}
