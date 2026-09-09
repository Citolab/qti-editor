import { describe, expect, it } from 'vitest';

import { createSseTransport, encodeSseEvent, parseConversationEvent, type ConversationEvent } from './index.js';

const reply = {
  version: 1,
  requestId: 'r1',
  capabilityId: 'c',
  summary: 'Columns',
  operations: [{ kind: 'setVocabulary', target: 'n1', group: 'columns', value: 'qti-choices-stacking-2' }],
  suggestions: []
};

/** A fake server: answers with the given SSE frames, optionally holding the stream open. */
function server(frames: string[], options: { status?: number; hold?: boolean } = {}) {
  const calls: { body: unknown; signal?: AbortSignal | null }[] = [];
  const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push({ body: JSON.parse(String(init?.body)), signal: init?.signal });
    if (options.status && options.status >= 400) return new Response('nope', { status: options.status });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) controller.enqueue(encoder.encode(frame));
        if (options.hold) {
          init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')));
          return;
        }
        controller.close();
      }
    });
    return new Response(stream, { status: 200 });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

async function collect(events: AsyncIterable<ConversationEvent>) {
  const out: ConversationEvent[] = [];
  for await (const e of events) out.push(e);
  return out;
}

const request = { requestId: 'r1', messages: [{ role: 'user' as const, content: 'Two columns' }], context: { x: 1 } };

describe('SSE conversation transport', () => {
  it('yields validated events in order and stops at the terminal event', async () => {
    const frames = [
      encodeSseEvent({ kind: 'status', requestId: 'r1', label: 'Checking' }),
      encodeSseEvent({ kind: 'text', requestId: 'r1', text: 'Two ' }),
      encodeSseEvent({ kind: 'text', requestId: 'r1', text: 'columns.' }),
      encodeSseEvent({ kind: 'reply', requestId: 'r1', reply: reply as never }),
      encodeSseEvent({ kind: 'complete', requestId: 'r1' }),
      encodeSseEvent({ kind: 'text', requestId: 'r1', text: 'never seen' })
    ];
    const { fetchImpl, calls } = server(frames);
    const events = await collect(
      createSseTransport({ url: '/x', fetch: fetchImpl }).stream(request, new AbortController().signal)
    );
    expect(events.map(e => e.kind)).toEqual(['status', 'text', 'text', 'reply', 'complete']);
    expect((events[3] as { reply: typeof reply }).reply).toEqual(reply);
    expect(calls[0].body).toEqual(request);
  });

  it('turns a foreign requestId, a malformed reply, and a truncated stream into error events', async () => {
    const foreign = server([encodeSseEvent({ kind: 'text', requestId: 'other', text: 'hi' })]);
    let events = await collect(
      createSseTransport({ url: '/x', fetch: foreign.fetchImpl }).stream(request, new AbortController().signal)
    );
    expect(events).toEqual([{ kind: 'error', requestId: 'r1', message: 'The server answered a different request.' }]);

    const bad = server([`data: ${JSON.stringify({ kind: 'reply', requestId: 'r1', reply: { version: 1 } })}\n\n`]);
    events = await collect(
      createSseTransport({ url: '/x', fetch: bad.fetchImpl }).stream(request, new AbortController().signal)
    );
    expect(events[0].kind).toBe('error');

    const truncated = server([encodeSseEvent({ kind: 'text', requestId: 'r1', text: 'half' })]);
    events = await collect(
      createSseTransport({ url: '/x', fetch: truncated.fetchImpl }).stream(request, new AbortController().signal)
    );
    expect(events.map(e => e.kind)).toEqual(['text', 'error']);

    const http = server([], { status: 503 });
    events = await collect(
      createSseTransport({ url: '/x', fetch: http.fetchImpl }).stream(request, new AbortController().signal)
    );
    expect(events[0]).toMatchObject({ kind: 'error', message: expect.stringContaining('503') });
  });

  it('aborting yields cancelled and nothing after it', async () => {
    const { fetchImpl } = server([encodeSseEvent({ kind: 'text', requestId: 'r1', text: 'Working' })], { hold: true });
    const controller = new AbortController();
    const out: ConversationEvent[] = [];
    for await (const e of createSseTransport({ url: '/x', fetch: fetchImpl }).stream(request, controller.signal)) {
      out.push(e);
      if (e.kind === 'text') controller.abort();
    }
    expect(out.map(e => e.kind)).toEqual(['text', 'cancelled']);
  });

  it('rejects events that are not part of the protocol', () => {
    expect(() => parseConversationEvent({ kind: 'execute', requestId: 'r1' })).toThrow();
    expect(() => parseConversationEvent({ kind: 'text', text: 'no id' })).toThrow();
    expect(() => parseConversationEvent({ kind: 'status', requestId: 'r1' })).toThrow();
    expect(parseConversationEvent({ kind: 'complete', requestId: 'r1', extra: true })).toEqual({
      kind: 'complete',
      requestId: 'r1'
    });
  });
});
