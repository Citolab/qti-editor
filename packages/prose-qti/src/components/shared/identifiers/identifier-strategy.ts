/**
 * How new QTI identifiers are minted.
 *
 * Every place in this package that invents an identifier — the insert commands, Enter on a choice,
 * the "add answer" decoration, hottext wrapping, the paste rescue, the copy action's re-mint and the
 * composer's duplicate guard — asks an `IdentifierStrategy` instead of calling
 * `crypto.randomUUID()` itself. The strategy is read from editor state (see
 * `createIdentifierStrategyPlugin`), so the commands keep their plain ProseMirror `Command` shape and
 * a host configures it once, where the editor is created.
 *
 * With no strategy installed, `uuidIdentifierStrategy` is used, which produces exactly what this
 * package always produced: `RESPONSE_<uuid>`, `SIMPLE_CHOICE_<uuid>`, `GAP_TEXT_<uuid>` and so on.
 * `readableIdentifierStrategy` is the alternative for hosts that want identifiers an author can
 * read: `RESPONSE`, `RESPONSE2`, `A`, `B`, `S1`, `T1`, `G1`.
 */
import { Plugin, PluginKey } from 'prosemirror-state';

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';

/**
 * What an option identifier is for, within its interaction.
 *
 * - `choice` — `qti-simple-choice` (choice, order), `qti-inline-choice`, `qti-hottext`
 * - `source` / `target` — the first and second `qti-simple-match-set` of a match interaction
 * - `gap` — a `qti-gap`
 * - `gapText` — a `qti-gap-text` (or `qti-gap-img`) in a gap-match pool
 * - `area` — a hotspot / graphic area (no built-in interaction mints these yet)
 * - `other` — anything not covered above, e.g. a node type registered by a host
 */
export type OptionIdentifierRole = 'choice' | 'source' | 'target' | 'gap' | 'gapText' | 'area' | 'other';

interface IdentifierContextBase {
  /** QTI tag of the interaction the identifier belongs to, e.g. `'qti-choice-interaction'`. */
  interactionType: string;
  /**
   * The prefix the built-in UUID scheme uses at this call site: `RESPONSE`, `SIMPLE_CHOICE`,
   * `CHOICE` (order), `HOTTEXT`, `INLINE_CHOICE`, `SOURCE`, `TARGET`, `GAP`, `GAP_TEXT`, … A strategy
   * is free to ignore it.
   */
  prefix: string;
  /**
   * The current document, when the identifier is minted inside an editor. `null` when there is no
   * ProseMirror document to give — the composer works on the serialised XML.
   */
  doc: ProseMirrorNode | null;
}

export interface ResponseIdentifierContext extends IdentifierContextBase {
  /**
   * Every response identifier already in use in the document (or item body), in document order,
   * including any minted earlier in the same operation. The strategy must not return one of these.
   */
  existing: readonly string[];
}

export interface OptionIdentifierContext extends IdentifierContextBase {
  role: OptionIdentifierRole;
  /**
   * Every `identifier` already in use inside the same interaction, including any minted earlier in
   * the same operation. A strategy that wants item-wide uniqueness can walk `doc` instead.
   */
  existing: readonly string[];
}

export interface IdentifierStrategy {
  /** A new `response-identifier` for an interaction. */
  responseIdentifier(context: ResponseIdentifierContext): string;
  /** A new `identifier` for a choice, gap, gap text, match-set choice, hottext or area. */
  optionIdentifier(context: OptionIdentifierContext): string;
}

/** The default: `${prefix}_${crypto.randomUUID()}` — what this package has always generated. */
export const uuidIdentifierStrategy: IdentifierStrategy = {
  responseIdentifier: ({ prefix }) => `${prefix}_${crypto.randomUUID()}`,
  optionIdentifier: ({ prefix }) => `${prefix}_${crypto.randomUUID()}`,
};

/** 1 -> `A`, 26 -> `Z`, 27 -> `AA`: bijective base 26, so the sequence never skips or repeats. */
function letters(n: number): string {
  let out = '';
  let rest = n;
  while (rest > 0) {
    const digit = (rest - 1) % 26;
    out = String.fromCharCode(65 + digit) + out;
    rest = Math.floor((rest - 1) / 26);
  }
  return out;
}

/** The first `format(n)`, counting from `start`, that is not in `existing`. */
function firstFree(existing: readonly string[], format: (n: number) => string, start = 1): string {
  const taken = new Set(existing);
  for (let n = start; ; n += 1) {
    const candidate = format(n);
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Short, author-readable identifiers, always the lowest free one:
 *
 * - responses: `RESPONSE`, then `RESPONSE2`, `RESPONSE3`, …
 * - choices (choice, inline choice, hottext, order), gap texts and areas: `A`, `B`, `C`, … `Z`, `AA`
 * - match sources `S1`, `S2`, …; match targets `T1`, `T2`, …
 * - gaps `G1`, `G2`, …
 *
 * Option identifiers are unique within their interaction (two choice interactions both have an `A`),
 * which is what `existing` is scoped to.
 */
export const readableIdentifierStrategy: IdentifierStrategy = {
  responseIdentifier: ({ existing }) =>
    firstFree(existing, n => (n === 1 ? 'RESPONSE' : `RESPONSE${n}`)),
  optionIdentifier: ({ role, existing }) => {
    switch (role) {
      case 'source':
        return firstFree(existing, n => `S${n}`);
      case 'target':
        return firstFree(existing, n => `T${n}`);
      case 'gap':
        return firstFree(existing, n => `G${n}`);
      default:
        return firstFree(existing, letters);
    }
  },
};

/* ── Configuration through editor state ─────────────────────────────────────────────────────── */

export const identifierStrategyPluginKey = new PluginKey<IdentifierStrategy>('qti-identifier-strategy');

/**
 * Install `strategy` for every identifier the editor mints.
 *
 * Plain ProseMirror: add it to the plugin list. ProseKit: pass `{ identifierStrategy }` to
 * `defineQtiExtension()` / `defineQtiInteractionsExtension()` instead, which installs this plugin.
 * Install it once — ProseMirror rejects two plugins with the same key.
 */
export function createIdentifierStrategyPlugin(strategy: IdentifierStrategy): Plugin<IdentifierStrategy> {
  return new Plugin<IdentifierStrategy>({
    key: identifierStrategyPluginKey,
    state: {
      init: () => strategy,
      apply: (_tr, value) => value,
    },
  });
}

/** The strategy installed in `state`, or `uuidIdentifierStrategy` when there is none. */
export function getIdentifierStrategy(state?: EditorState | null): IdentifierStrategy {
  return (state ? identifierStrategyPluginKey.getState(state) : undefined) ?? uuidIdentifierStrategy;
}

/* ── Helpers for call sites ─────────────────────────────────────────────────────────────────── */

/** True for an interaction node: `qtiChoiceInteraction`, `qtiMatchInteractionTabular`, … */
export function isInteractionNode(node: ProseMirrorNode): boolean {
  return /Interaction(Tabular)?$/.test(node.type.name);
}

/**
 * The QTI tag for an interaction node type: `qtiGapMatchInteraction` -> `qti-gap-match-interaction`.
 * The tabular match variant is a separate node type that serialises to `qti-match-interaction`.
 */
export function interactionTagName(nodeTypeName: string): string {
  return nodeTypeName
    .replace(/Tabular$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/** Every `responseIdentifier` in `node`'s subtree, in document order. */
export function collectResponseIdentifiers(node: ProseMirrorNode | null | undefined): string[] {
  const found: string[] = [];
  const visit = (current: ProseMirrorNode) => {
    const value = current.attrs.responseIdentifier;
    if (typeof value === 'string' && value) found.push(value);
    current.forEach(visit);
  };
  if (node) visit(node);
  return found;
}

/** Every `identifier` in `node`'s subtree (the node itself included), in document order. */
export function collectIdentifiers(node: ProseMirrorNode | null | undefined): string[] {
  const found: string[] = [];
  const visit = (current: ProseMirrorNode) => {
    const value = current.attrs.identifier;
    if (typeof value === 'string' && value) found.push(value);
    current.forEach(visit);
  };
  if (node) visit(node);
  return found;
}

/** The nearest interaction around the selection head, or `null`. */
export function findSelectionInteraction(state: EditorState): ProseMirrorNode | null {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (isInteractionNode(node)) return node;
  }
  return null;
}

/** Mints option identifiers for one interaction, remembering what it has already handed out. */
export type OptionIdentifierMinter = (role: OptionIdentifierRole, prefix: string) => string;

export interface IdentifierMinter {
  readonly strategy: IdentifierStrategy;
  /** A response identifier not yet used in the document, nor by this minter. */
  responseIdentifier(interactionType: string, prefix?: string): string;
  /**
   * An option minter for one interaction. `scope` is the interaction node when it already exists
   * (Enter, add-answer, wrap), or a list of identifiers to treat as taken; omit it for a new one.
   */
  forInteraction(interactionType: string, scope?: ProseMirrorNode | readonly string[] | null): OptionIdentifierMinter;
}

/**
 * Mint identifiers against `state`'s document using the strategy installed in it (or `strategy`).
 * Keeps track of what it minted, so a command that creates several nodes in one go — an interaction
 * with three choices — never hands out the same identifier twice.
 */
export function createIdentifierMinter(
  state: EditorState | null | undefined,
  strategy: IdentifierStrategy = getIdentifierStrategy(state),
): IdentifierMinter {
  const doc = state?.doc ?? null;
  let responses: string[] | null = null;

  return {
    strategy,
    responseIdentifier(interactionType, prefix = 'RESPONSE') {
      responses ??= collectResponseIdentifiers(doc);
      const identifier = strategy.responseIdentifier({ interactionType, prefix, doc, existing: responses.slice() });
      responses.push(identifier);
      return identifier;
    },
    forInteraction(interactionType, scope) {
      const existing = Array.isArray(scope) ? [...scope] : collectIdentifiers(scope as ProseMirrorNode | null | undefined);
      return (role, prefix) => {
        const identifier = strategy.optionIdentifier({ interactionType, role, prefix, doc, existing: existing.slice() });
        existing.push(identifier);
        return identifier;
      };
    },
  };
}
