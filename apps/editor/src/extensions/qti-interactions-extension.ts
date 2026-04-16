/**
 * QTI interactions extension using the descriptor pattern.
 * 
 * This uses the descriptor registry from @qti-editor/core to automatically
 * assemble all interaction node specs, commands, and plugins.
 */

import { listInteractionDescriptors, listInteractionPluginFactories } from '@qti-editor/core/interactions/composer';
import { defineKeymap, defineNodeSpec, definePlugin, union, type Extension } from 'prosekit/core';

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

  // Collect node specs, deduplicating by name (shared specs appear in multiple descriptors)
  const seenSpecs = new Set<string>();
  const nodeSpecExtensions: Extension[] = [];
  
  for (const descriptor of descriptors) {
    for (const { name, spec } of descriptor.nodeSpecs) {
      if (seenSpecs.has(name)) continue;
      seenSpecs.add(name);
      nodeSpecExtensions.push(defineNodeSpec({ name, ...spec }));
    }
  }

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

  // Get plugins from interaction packages, filtered to match included descriptors
  const includedNodeTypeNames = new Set(descriptors.map(d => d.nodeTypeName));
  const allPluginFactories = listInteractionPluginFactories();
  
  // Filter plugin factories to only those from included interactions
  // Plugin factories are returned in same order as descriptors, so we can match by index
  const allDescriptorsList = listInteractionDescriptors();
  const pluginFactories = allPluginFactories.filter((_, index) => {
    const descriptor = allDescriptorsList[index];
    return descriptor && includedNodeTypeNames.has(descriptor.nodeTypeName);
  });
  
  const pluginExtensions = pluginFactories.map(pluginFactory => 
    definePlugin(pluginFactory)
  );

  return union(...nodeSpecExtensions, defineKeymap(keymap), ...pluginExtensions);
}
