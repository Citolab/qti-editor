import {
  parseAuthoringReply,
  record,
  type ConversationEvent,
  type ConversationRequest,
  type ConversationTransport
} from './index.js';

/*
 * The wire form of the conversation protocol: one JSON `ConversationEvent` per Server-Sent Event.
 *
 * Provider adapters run on a server and translate whatever their provider streams into these
 * events; a browser host consumes them through `createSseTransport`. Both ends validate: the
 * server so it never forwards a malformed envelope as a `reply`, the client because the server is
 * still a network peer. No DOM is involved on either side — `fetch`, `ReadableStream` and
 * `TextDecoder` are web standards that Node provides too.
 */

const KINDS = new Set(['text', 'reply', 'status', 'complete', 'cancelled', 'error']);

/** Validate an untrusted value as a `ConversationEvent`. Throws with a reason when it is not one. */
export function parseConversationEvent(value: unknown): ConversationEvent {
  if (!record(value) || typeof value.kind !== 'string' || !KINDS.has(value.kind))
    throw new Error('Unknown conversation event.');
  if (typeof value.requestId !== 'string' || !value.requestId) throw new Error('Conversation event without requestId.');
  const requestId = value.requestId;
  switch (value.kind) {
    case 'text':
      if (typeof value.text !== 'string') throw new Error('Text event without text.');
      return { kind: 'text', requestId, text: value.text };
    case 'status':
      if (typeof value.label !== 'string') throw new Error('Status event without label.');
      return { kind: 'status', requestId, label: value.label };
    case 'reply':
      return { kind: 'reply', requestId, reply: parseAuthoringReply(value.reply) };
    case 'error':
      if (typeof value.message !== 'string') throw new Error('Error event without message.');
      return { kind: 'error', requestId, message: value.message };
    default:
      return { kind: value.kind as 'complete' | 'cancelled', requestId };
  }
}

/** One event in Server-Sent Events framing. */
export function encodeSseEvent(event: ConversationEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * The `data:` payloads of an SSE body, JSON-decoded, in order.
 *
 * Only `data:` lines matter; `event:`, `id:` and comments are ignored. A payload that is not JSON
 * is yielded as an error the caller can decide about, rather than silently skipped, because a
 * silently skipped `complete` would leave a turn spinning forever.
 */
export async function* readSseEvents(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<{ value?: unknown; error?: string }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const onAbort = () => void reader.cancel().catch(() => undefined);
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = block
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trimStart())
          .join('\n');
        if (!data) continue;
        try {
          yield { value: JSON.parse(data) };
        } catch {
          yield { error: 'Malformed event from the server.' };
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
}

export interface SseTransportOptions {
  /** Endpoint that accepts a JSON `ConversationRequest` and answers with SSE `ConversationEvent`s. */
  url: string;
  headers?: Record<string, string>;
  /** Injectable for tests and for hosts that wrap fetch (auth, retries). */
  fetch?: typeof fetch;
}

/**
 * A `ConversationTransport` over POST + Server-Sent Events.
 *
 * Guarantees to the consumer: every yielded event is validated and carries the request's own
 * `requestId`; the stream ends with exactly one terminal event (`complete`, `cancelled` or
 * `error`), synthesized when the server did not send one; aborting the signal yields `cancelled`
 * and nothing after it.
 */
export function createSseTransport(options: SseTransportOptions): ConversationTransport {
  const doFetch = options.fetch ?? fetch;
  return {
    async *stream(request: ConversationRequest, signal: AbortSignal): AsyncIterable<ConversationEvent> {
      const { requestId } = request;
      const terminal = (event: ConversationEvent) => event;
      try {
        const response = await doFetch(options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...options.headers },
          body: JSON.stringify(request),
          signal
        });
        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => '');
          yield terminal({
            kind: 'error',
            requestId,
            message: `Request failed (${response.status}). ${detail}`.trim()
          });
          return;
        }
        for await (const item of readSseEvents(response.body, signal)) {
          if (signal.aborted) break;
          if (item.error) {
            yield terminal({ kind: 'error', requestId, message: item.error });
            return;
          }
          let event: ConversationEvent;
          try {
            event = parseConversationEvent(item.value);
          } catch (error) {
            yield terminal({
              kind: 'error',
              requestId,
              message: error instanceof Error ? error.message : String(error)
            });
            return;
          }
          if (event.requestId !== requestId) {
            yield terminal({ kind: 'error', requestId, message: 'The server answered a different request.' });
            return;
          }
          yield event;
          if (event.kind === 'complete' || event.kind === 'cancelled' || event.kind === 'error') return;
        }
        if (signal.aborted) {
          yield terminal({ kind: 'cancelled', requestId });
          return;
        }
        yield terminal({ kind: 'error', requestId, message: 'The server ended the reply without completing it.' });
      } catch (error) {
        if (signal.aborted || (error as { name?: string })?.name === 'AbortError') {
          yield terminal({ kind: 'cancelled', requestId });
          return;
        }
        yield terminal({ kind: 'error', requestId, message: error instanceof Error ? error.message : String(error) });
      }
    }
  };
}
