import { choiceComposerHandler } from './handlers/choice.js';
import { selectPointComposerHandler } from './handlers/select-point.js';
import { textEntryComposerHandler } from './handlers/text-entry.js';
import type { InteractionComposerHandler } from './types.js';

const handlersByTagName = new Map<string, InteractionComposerHandler>([
  [choiceComposerHandler.tagName, choiceComposerHandler],
  [selectPointComposerHandler.tagName, selectPointComposerHandler],
  [textEntryComposerHandler.tagName, textEntryComposerHandler],
]);

export function getInteractionComposerHandler(tagName: string): InteractionComposerHandler | undefined {
  return handlersByTagName.get(tagName.toLowerCase());
}

export function listInteractionComposerHandlers(): ReadonlyArray<InteractionComposerHandler> {
  return Array.from(handlersByTagName.values());
}
