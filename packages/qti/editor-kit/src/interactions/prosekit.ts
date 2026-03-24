/**
 * ProseKit adapter for the supported QTI editor-kit interaction surface.
 */

import '@qti-components/theme/item.css';
import { listInteractionDescriptors } from '@qti-editor/core/interactions/composer';
import { defineBasicExtension } from 'prosekit/basic';
import { defineKeymap, defineNodeSpec, union, type Extension } from 'prosekit/core';
import type { Command } from 'prosekit/pm/state';

export function defineQtiInteractionsExtension() {
  const descriptors = listInteractionDescriptors();

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

  for (const descriptor of descriptors) {
    if (descriptor.insertCommand && descriptor.keyboardShortcut) {
      keymap[descriptor.keyboardShortcut] = descriptor.insertCommand;
    }
  }

  return union(...nodeSpecExtensions, defineKeymap(keymap));
}

export function defineQtiExtension() {
  return union(defineBasicExtension(), defineQtiInteractionsExtension());
}

export type QtiExtension = ReturnType<typeof defineQtiExtension>;
export type QtiInteractionsExtension = ReturnType<typeof defineQtiInteractionsExtension>;
