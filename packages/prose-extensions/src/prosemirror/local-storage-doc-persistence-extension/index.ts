/**
 * Local Storage Doc Persistence Plugin
 *
 * ProseMirror plugin that persists the document to localStorage on change.
 */

export {
  readPersistedDocFromLocalStorage,
  readPersistedStateFromLocalStorage,
  createLocalStorageDocPersistencePlugin,
  type LocalStorageDocPersistenceOptions,
} from './local-storage-doc-persistence-plugin.js';
