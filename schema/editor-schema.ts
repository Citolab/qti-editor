/**
 * The editor's real composed schema: ProseKit's base extension plus every registered QTI descriptor.
 *
 * Nothing here is authored — it builds the same schema the app builds, so a test that asks it a
 * question is asking the editor, not a model of the editor.
 *
 * This is what survived `content-model.ts`. That file also serialised the grammar to JSON for
 * out-of-process consumers (a C# MCP server, Python, LLM generation) and gated it with committed
 * fixtures. The consumers never materialised — the conversion runs in Node now, where a caller
 * builds the schema by calling `createQtiSchema()` rather than reading a description of one — so
 * the serialiser, the fixtures and the version fingerprint went with them.
 */
import { createEditor, union } from 'prosekit/core';

import { defineBasicExtension } from '../apps/qti-prosekit-app/src/extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from '../apps/qti-prosekit-app/src/extensions/qti-interactions-extension.js';

import type { Schema } from 'prosemirror-model';

export function buildEditorSchema(): Schema {
  return createEditor({
    extension: union(defineBasicExtension(), defineQtiInteractionsExtension())
  }).schema;
}
