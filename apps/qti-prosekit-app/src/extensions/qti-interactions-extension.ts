/**
 * QTI interactions extension using the descriptor pattern.
 * 
 * This uses the descriptor registry from @citolab/prose-qti/core to automatically
 * assemble all interaction node specs, commands, and plugins.
 */

import '@citolab/prose-qti/components/register';

import {
  listInteractionDescriptors,
  listSelectedInteractionPluginFactories,
  listInteractionSchemaNodeSpecs,
} from '@citolab/prose-qti/core/interactions/composer';
import { defineKeymap, defineNodeSpec, definePlugin, union, type Extension } from 'prosekit/core';
import { splitBlock } from 'prosekit/pm/commands';

import type { Command } from 'prosekit/pm/state';

/**
 * Define QTI interaction nodes using the descriptor pattern.
 * 
 * This automatically:
 * - Collects node specs from all registered interactions
 * - Builds keymap from descriptor keyboard shortcuts
 * - Installs plugins from interaction plugin factories
 * - Sets up Enter commands for interactions that need them
 * 
 * @param options - Configuration options
 * @param options.include - Optional array of interaction tag names to include.
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
    keymap['Enter'] = (state, dispatch, view) => {
      // Try each interaction-specific enter command
      for (let i = 0; i < enterCommands.length; i++) {
        const cmd = enterCommands[i];
        const result = cmd(state, dispatch, view);
        
        if (result) {
          return true;
        }
      }
      
      // Fallback to splitBlock if no interaction handled it
      return splitBlock(state, dispatch, view);
    };
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
