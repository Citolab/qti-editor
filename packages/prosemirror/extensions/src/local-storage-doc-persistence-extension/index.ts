import { definePlugin, type NodeJSON } from 'prosekit/core';
import { Plugin, PluginKey } from 'prosemirror-state';

interface PersistedDocPayload {
  version: 1;
  doc: NodeJSON;
}

export interface LocalStorageDocPersistenceOptions {
  storageKey: string;
  debounceMs?: number;
}

const localStorageDocPersistencePluginKey = new PluginKey('local-storage-doc-persistence');

function isNodeJson(value: unknown): value is NodeJSON {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { type?: unknown };
  return typeof candidate.type === 'string';
}

function writePersistedState(storageKey: string, doc: NodeJSON) {
  const payload: PersistedDocPayload = {
    version: 1,
    doc,
  };
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

export function readPersistedDocFromLocalStorage(storageKey: string): NodeJSON | undefined {
  return readPersistedStateFromLocalStorage(storageKey).doc;
}

export function readPersistedStateFromLocalStorage(storageKey: string): {
  doc?: NodeJSON;
} {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (isNodeJson(parsed)) {
      return { doc: parsed };
    }
    if (!parsed || typeof parsed !== 'object') return {};

    const payload = parsed as Partial<PersistedDocPayload>;
    if (!isNodeJson(payload.doc)) {
      return {};
    }

    return {
      doc: payload.doc,
    };
  } catch {
    return {};
  }
}

export function defineLocalStorageDocPersistenceExtension(
  options: LocalStorageDocPersistenceOptions,
) {
  const { storageKey, debounceMs = 250 } = options;

  return definePlugin(() => new Plugin({
    key: localStorageDocPersistencePluginKey,
    view(view) {
      let saveTimer: number | null = null;

      const flushSave = () => {
        saveTimer = null;
        try {
          writePersistedState(storageKey, view.state.doc.toJSON() as NodeJSON);
        } catch {
          // ignore storage write errors
        }
      };

      return {
        update(updatedView, prevState) {
          if (prevState.doc.eq(updatedView.state.doc)) return;

          if (saveTimer != null) {
            window.clearTimeout(saveTimer);
          }

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
  }));
}
