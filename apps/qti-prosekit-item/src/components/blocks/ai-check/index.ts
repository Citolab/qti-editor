import { registerLitAiCheckToolbar } from './robot-toolbar';
import { registerLitAiCheckAcceptToolbar } from './accept-toolbar';
import { registerLitAiCheckFragmentPopover } from './fragment-popover';

import './ai-check.css';
import 'prosekit/extensions/commit/style.css';

export function registerLitAiCheck() {
  registerLitAiCheckToolbar();
  registerLitAiCheckAcceptToolbar();
  registerLitAiCheckFragmentPopover();
}
