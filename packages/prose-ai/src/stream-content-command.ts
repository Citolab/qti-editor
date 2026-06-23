import { DOMParser } from 'prosekit/pm/model';
import type { Command, EditorState, Transaction } from 'prosekit/pm/state';
import { Plugin, PluginKey, Selection } from 'prosekit/pm/state';
import type { EditorView } from 'prosekit/pm/view';
import { Decoration, DecorationSet } from 'prosekit/pm/view';

interface StreamRange {
  from: number;
  to: number;
}

interface StreamingState {
  ranges: Map<string, StreamRange>;
}

interface StreamingMeta {
  id: string;
  type: 'start' | 'update' | 'end';
  from?: number;
  to?: number;
}

export const streamingPluginKey: PluginKey<StreamingState> =
  new PluginKey<StreamingState>('streaming');

export function createStreamingPlugin(): Plugin<StreamingState> {
  return new Plugin<StreamingState>({
    key: streamingPluginKey,

    state: {
      init(): StreamingState {
        return { ranges: new Map() };
      },
      apply(tr: Transaction, oldState: StreamingState): StreamingState {
        const meta = tr.getMeta(streamingPluginKey) as StreamingMeta | undefined;

        const next = new Map<string, StreamRange>();
        for (const [id, range] of oldState.ranges) {
          next.set(id, {
            from: tr.mapping.map(range.from),
            to: tr.mapping.map(range.to),
          });
        }

        if (meta) {
          if (meta.type === 'end') {
            next.delete(meta.id);
          } else if (meta.from !== undefined && meta.to !== undefined) {
            next.set(meta.id, { from: meta.from, to: meta.to });
          }
        }

        return { ranges: next };
      },
    },

    props: {
      decorations(state: EditorState): DecorationSet {
        const streaming = streamingPluginKey.getState(state);
        if (!streaming || streaming.ranges.size === 0) {
          return DecorationSet.empty;
        }
        const decorations: Decoration[] = [];
        for (const range of streaming.ranges.values()) {
          if (range.to > range.from) {
            decorations.push(
              Decoration.inline(range.from, range.to, { class: 'is-streaming' })
            );
          }
        }
        return DecorationSet.create(state.doc, decorations);
      },

      editable(state: EditorState): boolean {
        const streaming = streamingPluginKey.getState(state);
        if (!streaming || streaming.ranges.size === 0) return true;
        const cursor = state.selection.from;
        for (const range of streaming.ranges.values()) {
          if (cursor >= range.from && cursor <= range.to) return false;
        }
        return true;
      },
    },
  });
}

export interface StreamContentOptions {
  from: number;
  to: number;
  id?: string;
  signal?: AbortSignal;
  onStream: (write: (chunk: string) => void) => Promise<void> | void;
  extraFlushTags?: readonly string[];
}

export const DEFAULT_FLUSH_TAGS: readonly string[] = [
  'p', 'li', 'tr', 'td', 'th',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'pre', 'blockquote',
  'ul', 'ol',
  'table', 'thead', 'tbody', 'tfoot',
];

const TAG_NAME_RE = /^[A-Za-z][\dA-Za-z-]*$/;

function buildFlushRe(extra: readonly string[] | undefined): RegExp {
  const tags =
    extra && extra.length > 0
      ? [...DEFAULT_FLUSH_TAGS, ...extra.filter(t => TAG_NAME_RE.test(t))]
      : DEFAULT_FLUSH_TAGS;
  return new RegExp(String.raw`</(?:${tags.join('|')})\s*>`, 'gi');
}

function findFlushBoundary(buffer: string, from: number, flushRe: RegExp): number {
  flushRe.lastIndex = from;
  let end = from;
  while (flushRe.exec(buffer) !== null) {
    end = flushRe.lastIndex;
  }
  return end;
}

function trimTrailingPartialTag(buffer: string): string {
  const lastOpen = buffer.lastIndexOf('<');
  const lastClose = buffer.lastIndexOf('>');
  return lastOpen > lastClose ? buffer.slice(0, lastOpen) : buffer;
}

let streamCounter = 0;

export async function streamContent(
  view: EditorView,
  options: StreamContentOptions
): Promise<void> {
  const { from, to, onStream, signal } = options;
  const id = options.id ?? `stream-${++streamCounter}`;

  if (signal?.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  }

  const schema = view.state.schema;
  const domParser = DOMParser.fromSchema(schema);
  const tempDiv = document.createElement('div');
  const flushRe = buildFlushRe(options.extraFlushTags);

  let htmlBuffer = '';
  let lastFlushedLength = 0;

  {
    const tr = view.state.tr;
    if (to > from) tr.delete(from, to);
    const meta: StreamingMeta = { id, type: 'start', from, to: from };
    tr.setMeta(streamingPluginKey, meta);
    tr.setMeta('addToHistory', false);
    view.dispatch(tr);
  }

  const tailSize = view.state.doc.content.size - from;
  let currentEnd = from;

  const flush = (final: boolean): void => {
    const targetLength = final
      ? trimTrailingPartialTag(htmlBuffer).length
      : findFlushBoundary(htmlBuffer, lastFlushedLength, flushRe);
    if (targetLength <= lastFlushedLength) return;
    lastFlushedLength = targetLength;

    tempDiv.innerHTML = htmlBuffer.slice(0, targetLength);
    const slice = domParser.parseSlice(tempDiv);

    const tr = view.state.tr;
    tr.replace(from, currentEnd, slice);
    currentEnd = tr.doc.content.size - tailSize;

    tr.setSelection(Selection.near(tr.doc.resolve(currentEnd)));
    tr.scrollIntoView();

    const meta: StreamingMeta = {
      id,
      type: 'update',
      from,
      to: currentEnd,
    };
    tr.setMeta(streamingPluginKey, meta);
    tr.setMeta('addToHistory', false);
    view.dispatch(tr);
  };

  const finalize = (): void => {
    const tr = view.state.tr;
    const meta: StreamingMeta = { id, type: 'end' };
    tr.setMeta(streamingPluginKey, meta);
    tr.setMeta('addToHistory', false);
    view.dispatch(tr);
  };

  const onAbort = (): void => {
    finalize();
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  const write = (chunk: string): void => {
    if (signal?.aborted) return;
    htmlBuffer += chunk;
    flush(false);
  };

  try {
    await onStream(write);
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }
    flush(true);
    finalize();
  } catch (error) {
    finalize();
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

export function streamContentCommand(options: StreamContentOptions): Command {
  return (
    _state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined,
    view: EditorView | undefined
  ): boolean => {
    if (!view) return false;
    if (!dispatch) return true;

    void Promise.resolve().then(() =>
      streamContent(view, options).catch((error: unknown) => {
        if ((error as { name?: string })?.name === 'AbortError') return;
        console.error('streamContent failed:', error);
      })
    );
    return true;
  };
}
