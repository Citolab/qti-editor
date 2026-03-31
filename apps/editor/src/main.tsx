import 'prosekit/basic/style.css';
import 'prosekit/basic/typography.css';
import './style.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/auth-context.js';
import Editor from './editor.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, gcTime: 0 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Editor />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
