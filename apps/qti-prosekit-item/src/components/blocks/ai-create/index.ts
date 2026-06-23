import { registerLitAiCreateToolbar } from './wand-toolbar';
import { registerLitAiCreateResult } from './create-popover';

import './ai-create.css';

export function registerLitAiCreate() {
  registerLitAiCreateToolbar();
  registerLitAiCreateResult();
}
