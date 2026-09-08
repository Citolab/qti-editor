import { definePlugin } from 'prosekit/core';

import { createAuthoringPlugin } from './index.js';
export function defineQtiAi() {
  return definePlugin(createAuthoringPlugin());
}
