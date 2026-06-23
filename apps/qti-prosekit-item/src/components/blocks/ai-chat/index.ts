import { registerLitAiChatSidebar } from './chat-sidebar';
import { registerLitAiChatToolbar } from './chat-toolbar';

import './ai-chat.css';

export function registerLitAiChat() {
  registerLitAiChatToolbar();
  registerLitAiChatSidebar();
}
