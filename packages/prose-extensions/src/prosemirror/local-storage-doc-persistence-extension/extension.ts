/**
 * ProseKit extension that wraps the local storage doc persistence ProseMirror plugin.
 * Use this when integrating with ProseKit. Requires the `prosekit` peer dependency.
 */

import { definePlugin } from 'prosekit/core';

import {
  createLocalStorageDocPersistencePlugin,
  type LocalStorageDocPersistenceOptions,
} from './local-storage-doc-persistence-plugin.js';

export function defineLocalStorageDocPersistenceExtension(
  options: LocalStorageDocPersistenceOptions,
) {
  return definePlugin(() => createLocalStorageDocPersistencePlugin(options));
}
