import { type NodeJSON } from 'prosekit/core';
import { Plugin, PluginKey } from 'prosemirror-state';

import {
  readPersistedDoc,
  stampSchemaVersion,
  type ReadPersistedDocStateResult,
} from '../../lib/compatibility/json.js';

export interface LocalStorageDocPersistenceOptions {
  storageKey: string;
  debounceMs?: number;
}

const localStorageDocPersistencePluginKey = new PluginKey('local-storage-doc-persistence');

function writePersistedState(storageKey: string, doc: NodeJSON): void {
  localStorage.setItem(storageKey, JSON.stringify(stampSchemaVersion(doc)));
}

export function readPersistedDocFromLocalStorage(storageKey: string): NodeJSON | undefined {
  return readPersistedStateFromLocalStorage(storageKey).doc;
}

export function readPersistedStateFromLocalStorage(storageKey: string): ReadPersistedDocStateResult {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    return readPersistedDoc(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function createLocalStorageDocPersistencePlugin(
  options: LocalStorageDocPersistenceOptions,
): Plugin {
  const { storageKey, debounceMs = 250 } = options;
  return new Plugin({
    key: localStorageDocPersistencePluginKey,
    view(view) {
      let saveTimer: number | null = null;
      const flushSave = () => {
        saveTimer = null;
        try {
          writePersistedState(storageKey, view.state.doc.toJSON());
        } catch {
          // ignore storage write errors
        }
      };
      return {
        update(updatedView, prevState) {
          if (prevState.doc.eq(updatedView.state.doc)) return;
          if (saveTimer != null) window.clearTimeout(saveTimer);
          saveTimer = window.setTimeout(flushSave, debounceMs);
        },
        destroy() {
          if (saveTimer != null) {
            window.clearTimeout(saveTimer);
            flushSave();
          }
        },
      };
    },
  });
}
