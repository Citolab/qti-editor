import { selectPointComposerHandler } from './handlers/select-point.js';
import type { InteractionComposerHandler } from './types.js';

const handlersByTagName = new Map<string, InteractionComposerHandler>([
  [selectPointComposerHandler.tagName, selectPointComposerHandler],
]);

export function getInteractionComposerHandler(tagName: string): InteractionComposerHandler | undefined {
  return handlersByTagName.get(tagName.toLowerCase());
}

export function listInteractionComposerHandlers(): ReadonlyArray<InteractionComposerHandler> {
  return Array.from(handlersByTagName.values());
}
