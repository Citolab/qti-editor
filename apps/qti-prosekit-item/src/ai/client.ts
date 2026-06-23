import { SYSTEM_CHAT, SYSTEM_WRITE } from './system-prompts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatCompletionChunk {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
  error?: { message?: string };
}

interface BaseOptions {
  endpoint: string;
  apiKey: string;
  model: string;
  write: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface StreamWriteOptions extends BaseOptions {
  prompt: string;
}

export interface StreamChatOptions extends BaseOptions {
  messages: ChatMessage[];
  documentHtml: string;
  selectionHtml?: string;
}

async function postStreaming(
  endpoint: string,
  apiKey: string,
  body: unknown,
  write: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new Error(`AI request failed (${response.status}): ${detail}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      handleEvent(block, write);
    }
  }
}

function handleEvent(block: string, write: (chunk: string) => void): void {
  for (const line of block.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice('data:'.length).trim();
    if (!payload || payload === '[DONE]') continue;
    let chunk: ChatCompletionChunk;
    try {
      chunk = JSON.parse(payload) as ChatCompletionChunk;
    } catch {
      continue;
    }
    if (chunk.error?.message) {
      throw new Error(chunk.error.message);
    }
    const content = chunk.choices?.[0]?.delta?.content;
    if (typeof content === 'string') {
      write(content);
    }
  }
}

export async function streamFromOpenAI(options: StreamWriteOptions): Promise<void> {
  await postStreaming(
    options.endpoint,
    options.apiKey,
    {
      model: options.model,
      messages: [
        { role: 'system', content: SYSTEM_WRITE },
        { role: 'user', content: options.prompt },
      ],
      stream: true,
    },
    options.write,
    options.signal
  );
}

export async function streamChatFromOpenAI(options: StreamChatOptions): Promise<void> {
  const contextBlock =
    `<document>\n${options.documentHtml}\n</document>` +
    (options.selectionHtml ? `\n\n<selection>\n${options.selectionHtml}\n</selection>` : '');
  const systemContent = `${SYSTEM_CHAT}\n\n${contextBlock}`;

  await postStreaming(
    options.endpoint,
    options.apiKey,
    {
      model: options.model,
      messages: [{ role: 'system', content: systemContent }, ...options.messages],
      stream: true,
    },
    options.write,
    options.signal
  );
}
