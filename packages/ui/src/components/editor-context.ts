import { createContext } from '@lit/context'

// Use 'unknown' to avoid version conflicts between prosekit versions
// Components should cast to their local Editor type when consuming
export const editorContext = createContext<unknown>('prosekit-editor')
