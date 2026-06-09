/**
 * ProseKit adapter for the supported QTI editor-kit interaction surface.
 */

import { QtiAssociateInteractionEdit } from '@qti-editor/interactions/associate';
import { QtiChoiceInteractionEdit } from '@qti-editor/interactions/choice';
import { QtiExtendedTextInteractionEdit } from '@qti-editor/interactions/extended-text';
import { QtiGapMatchInteractionEdit } from '@qti-editor/interactions/gap-match';
import { QtiGapEdit, QtiGapTextEdit, QtiPromptEdit, QtiSimpleAssociableChoiceEdit, QtiSimpleChoiceEdit, QtiSimpleMatchSetEdit } from '@qti-editor/interactions/shared';
import { QtiHottextEdit, QtiHottextInteractionEdit } from '@qti-editor/interactions/hottext';
import { QtiInlineChoice, QtiInlineChoiceInteraction } from '@qti-editor/interactions/inline-choice';
import { QtiMatchInteractionEdit } from '@qti-editor/interactions/match';
import { QtiOrderInteractionEdit } from '@qti-editor/interactions/order';
import { QtiSelectPointInteractionEdit } from '@qti-editor/interactions/select-point';
import { QtiTextEntryInteractionEdit } from '@qti-editor/interactions/text-entry';
import { QtiItemDivider } from '@qti-editor/qti-item-divider';
import {
  listInteractionDescriptors,
  listInteractionPluginFactories,
  listInteractionSchemaNodeSpecs,
} from '@qti-editor/core/interactions/composer';
import { defineBasicExtension } from 'prosekit/basic';
import { defineKeymap, defineNodeSpec, definePlugin, union, type Extension } from 'prosekit/core';

import type { Command } from 'prosekit/pm/state';

function registerElement(tagName: string, elementClass: CustomElementConstructor) {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, elementClass);
  }
}

export function registerQtiInteractionElements() {
  registerElement('qti-simple-choice', QtiSimpleChoiceEdit);
  registerElement('qti-simple-associable-choice', QtiSimpleAssociableChoiceEdit);
  registerElement('qti-simple-match-set', QtiSimpleMatchSetEdit);
  registerElement('qti-gap', QtiGapEdit);
  registerElement('qti-gap-text', QtiGapTextEdit);
  registerElement('qti-prompt', QtiPromptEdit);
  registerElement('qti-associate-interaction', QtiAssociateInteractionEdit);
  registerElement('qti-choice-interaction', QtiChoiceInteractionEdit);
  registerElement('qti-extended-text-interaction', QtiExtendedTextInteractionEdit);
  registerElement('qti-gap-match-interaction', QtiGapMatchInteractionEdit);
  registerElement('qti-hottext-interaction', QtiHottextInteractionEdit);
  registerElement('qti-hottext', QtiHottextEdit);
  registerElement('qti-inline-choice-interaction', QtiInlineChoiceInteraction);
  registerElement('qti-inline-choice', QtiInlineChoice);
  registerElement('qti-match-interaction', QtiMatchInteractionEdit);
  registerElement('qti-order-interaction', QtiOrderInteractionEdit);
  registerElement('qti-select-point-interaction', QtiSelectPointInteractionEdit);
  registerElement('qti-text-entry-interaction', QtiTextEntryInteractionEdit);
  registerElement('qti-item-divider', QtiItemDivider);
}

export function defineQtiInteractionsExtension() {
  registerQtiInteractionElements();
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
