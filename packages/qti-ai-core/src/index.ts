/** Provider-independent authoring protocol. All model output is untrusted. */
export const PROTOCOL_VERSION = 1 as const;
export interface Suggestion {
  id: string;
  label: string;
  prompt: string;
}
export interface Clarification {
  id: string;
  question: string;
  options: string[];
  allowOther: boolean;
}
export type Operation =
  | { kind: 'setAttributes'; target: string; attributes: Record<string, unknown> }
  | { kind: 'setVocabulary'; target: string; group: string; value: string | null }
  | { kind: 'replace'; target: string; html: string }
  | { kind: 'insert'; target: string; html: string };
export interface AuthoringReply {
  version: 1;
  requestId: string;
  capabilityId: string;
  summary: string;
  operations: Operation[];
  suggestions: Suggestion[];
  clarification?: Clarification;
}
export interface ConversationRequest {
  requestId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  context: unknown;
}
export type ConversationEvent =
  | { kind: 'text'; requestId: string; text: string }
  | { kind: 'reply'; requestId: string; reply: AuthoringReply }
  | { kind: 'status'; requestId: string; label: string }
  | { kind: 'complete' | 'cancelled'; requestId: string }
  | { kind: 'error'; requestId: string; message: string };
export interface ConversationTransport {
  stream(request: ConversationRequest, signal: AbortSignal): AsyncIterable<ConversationEvent>;
}
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown, max = 2000): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}
export function parseAuthoringReply(value: unknown): AuthoringReply {
  if (
    !record(value) ||
    value.version !== 1 ||
    !text(value.requestId, 100) ||
    !text(value.capabilityId, 100) ||
    typeof value.summary !== 'string' ||
    value.summary.length > 4000 ||
    !Array.isArray(value.operations) ||
    value.operations.length > 32 ||
    !Array.isArray(value.suggestions) ||
    value.suggestions.length > 4
  )
    throw new Error('Invalid authoring reply.');
  for (const op of value.operations) {
    if (!record(op) || !text(op.target, 100)) throw new Error('Invalid operation target.');
    if (op.kind === 'setAttributes') {
      if (
        !record(op.attributes) ||
        !Object.keys(op.attributes).length ||
        Object.keys(op.attributes).some(k => ['__proto__', 'constructor', 'prototype'].includes(k))
      )
        throw new Error('Invalid attributes.');
    } else if (op.kind === 'setVocabulary') {
      if (!text(op.group, 100) || !(op.value === null || text(op.value, 150)))
        throw new Error('Invalid vocabulary operation.');
    } else if (op.kind === 'insert' || op.kind === 'replace') {
      if (!text(op.html, 100000)) throw new Error('Invalid HTML operation.');
    } else throw new Error('Unsupported operation.');
  }
  const ids = new Set<string>();
  for (const s of value.suggestions) {
    if (!record(s) || !text(s.id, 100) || !text(s.label, 100) || !text(s.prompt) || ids.has(s.id))
      throw new Error('Invalid suggestion.');
    ids.add(s.id);
  }
  if (value.clarification !== undefined) {
    const q = value.clarification;
    if (
      !record(q) ||
      !text(q.id, 100) ||
      !text(q.question, 500) ||
      !Array.isArray(q.options) ||
      q.options.length > 8 ||
      !q.options.every(v => text(v, 150)) ||
      typeof q.allowOther !== 'boolean' ||
      value.operations.length
    )
      throw new Error('Invalid clarification.');
  }
  return value as unknown as AuthoringReply;
}
/** Non-cryptographic identity for serialized capability data; never an authorization token. */
export function fingerprint(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
/** Compatibility adapter for text-only agent transports. Hide even partial fence openers. */
export function readAuthoringStream(raw: string, complete = false): { prose: string; reply?: AuthoringReply } {
  const start = raw.search(/^\s*`/m);
  const prose = (start < 0 ? raw : raw.slice(0, start)).trimEnd();
  if (!complete || start < 0) return { prose };
  const match = raw.slice(start).match(/^\s*```qti-authoring\s*\n([\s\S]*?)\n```\s*$/);
  if (!match) throw new Error('The authoring reply was incomplete or used an unsupported format.');
  return { prose, reply: parseAuthoringReply(JSON.parse(match[1])) };
}
