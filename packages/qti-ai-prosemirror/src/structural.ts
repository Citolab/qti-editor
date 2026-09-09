import { Fragment, type Node as PmNode } from 'prosemirror-model';

/*
 * Structural transformations: what the code guarantees when the model adds, removes or converts.
 *
 * The model writes the content; the code owns the invariants that make the result a valid item.
 * Two of those invariants are not schema facts and cannot be left to `doc.check()`: a response
 * declaration must agree with the choices that exist, and a converted interaction must keep the
 * response identifier its predecessor had, or the item's scoring silently forgets it.
 */

/** Interactions whose correct response names child identifiers, and how those references are shaped. */
const RESPONSE_SHAPE: Record<string, 'identifiers' | 'ordered' | 'pairs' | 'text' | 'points'> = {
  qtiChoiceInteraction: 'identifiers',
  qtiHottextInteraction: 'identifiers',
  qtiInlineChoiceInteraction: 'identifiers',
  qtiOrderInteraction: 'ordered',
  qtiMatchInteraction: 'pairs',
  qtiMatchInteractionTabular: 'pairs',
  qtiGapMatchInteraction: 'pairs',
  qtiTextEntryInteraction: 'text',
  qtiExtendedTextInteraction: 'text',
  qtiSelectPointInteraction: 'points'
};

export function isInteraction(node: PmNode): boolean {
  return node.type.name in RESPONSE_SHAPE;
}

/** The correct response as a list of entries: identifiers, or "source target" pairs. */
export function responseEntries(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function joinLike(original: unknown, entries: string[]): unknown {
  if (entries.length === 0) return null;
  return Array.isArray(original) ? entries : entries.join(',');
}

/**
 * The correct response of an interaction after some of its children were removed: entries that
 * name a removed identifier are dropped; pairs are dropped when either side is gone. `null` when
 * nothing scorable remains, so the author sees an interaction that needs a new answer rather than
 * one that scores a ghost.
 */
export function remapResponse(interaction: PmNode, removed: Set<string>): unknown {
  const shape = RESPONSE_SHAPE[interaction.type.name];
  const current = interaction.attrs.correctResponse;
  if (!shape || shape === 'text' || shape === 'points' || current == null) return current;
  const kept = responseEntries(current).filter(entry => !entry.split(/\s+/).some(id => removed.has(id)));
  return joinLike(current, kept);
}

/** Identifiers declared by a node and its descendants (choices, gaps, gap texts, hottexts). */
export function childIdentifiers(interaction: PmNode): Set<string> {
  const ids = new Set<string>();
  if (typeof interaction.attrs.identifier === 'string' && interaction.attrs.identifier)
    ids.add(interaction.attrs.identifier);
  interaction.descendants(child => {
    if (typeof child.attrs.identifier === 'string' && child.attrs.identifier) ids.add(child.attrs.identifier);
  });
  return ids;
}

/**
 * Item-wide response and scoring invariants. Throws the first violation.
 *
 * Structural facts (unique response identifiers, unique child identifiers) apply to every
 * interaction; the correct-response check follows the interaction's response shape. It is a
 * validity check, not a pedagogical one: a permutation of three steps in the wrong order is valid.
 */
export function validateResponses(doc: PmNode): void {
  const responses = new Set<string>();
  doc.descendants(node => {
    const attrs = node.attrs;
    if ('responseIdentifier' in attrs) {
      const id = attrs.responseIdentifier;
      if (typeof id !== 'string' || !/^[A-Za-z_][\w.-]*$/.test(id) || responses.has(id))
        throw new Error('Interactions need unique response identifiers.');
      responses.add(id);
    }
    if (typeof attrs.score === 'number' && (!Number.isFinite(attrs.score) || attrs.score < 0))
      throw new Error('Score must be nonnegative.');
    for (const name of ['maxChoices', 'minChoices', 'matchMax', 'matchMin', 'maxAssociations']) {
      if (name in attrs && attrs[name] != null && (!Number.isInteger(attrs[name]) || attrs[name] < 0))
        throw new Error(`${name} must be a nonnegative integer.`);
    }

    const shape = RESPONSE_SHAPE[node.type.name];
    if (!shape) return;

    const ids = new Set<string>();
    node.descendants(child => {
      if (child.attrs.identifier) {
        if (ids.has(child.attrs.identifier)) throw new Error('Duplicate answer identifier.');
        ids.add(child.attrs.identifier);
      }
    });
    if (shape === 'text' || shape === 'points') return;

    const correct = responseEntries(attrs.correctResponse);
    if (correct.some(entry => entry.split(/\s+/).some(id => !ids.has(id))))
      throw new Error('Correct answers reference missing choices.');

    switch (shape) {
      case 'identifiers':
        if (correct.some(entry => /\s/.test(entry))) throw new Error('Correct answers must be single identifiers.');
        if (attrs.maxChoices > 0 && correct.length > attrs.maxChoices)
          throw new Error('Correct answers exceed maxChoices.');
        if (node.type.name === 'qtiInlineChoiceInteraction' && correct.length > 1)
          throw new Error('An inline choice has one correct answer.');
        break;
      case 'ordered':
        // An order response is the whole sequence: every choice, once.
        if (correct.length && (correct.length !== ids.size || new Set(correct).size !== correct.length))
          throw new Error('An order response must list every choice exactly once.');
        break;
      case 'pairs':
        if (correct.some(entry => entry.split(/\s+/).length !== 2))
          throw new Error('Match and gap-match answers are "source target" pairs.');
        break;
    }
  });
}

/** Response identifiers declared anywhere in a node tree. */
export function responseIdentifiers(node: PmNode): Set<string> {
  const ids = new Set<string>();
  const visit = (n: PmNode) => {
    if (typeof n.attrs.responseIdentifier === 'string' && n.attrs.responseIdentifier)
      ids.add(n.attrs.responseIdentifier);
    n.forEach(visit);
  };
  visit(node);
  return ids;
}

/**
 * The same content with every interaction's response identifier made unique against `taken`.
 *
 * Minting identifiers is the code's job, not the model's: the model sees the item, but it also
 * reuses "RESPONSE" out of habit, and a proposal refused for that alone is a proposal the author
 * has to ask for twice. A missing identifier is minted too. Identifiers that are already unique
 * are left exactly as they are.
 */
export function withUniqueResponseIdentifiers(content: Fragment, taken: Set<string>): Fragment {
  const used = new Set(taken);
  const mint = (base: string) => {
    let n = 2;
    let candidate = base;
    while (used.has(candidate)) candidate = `${base}_${n++}`;
    return candidate;
  };
  const visit = (node: PmNode): PmNode => {
    const children = Fragment.from(node.content.content.map(visit));
    if (!('responseIdentifier' in node.attrs) || !isInteraction(node)) {
      return node.content === children ? node : node.copy(children);
    }
    const current =
      typeof node.attrs.responseIdentifier === 'string' && node.attrs.responseIdentifier
        ? node.attrs.responseIdentifier
        : null;
    const id = current && !used.has(current) ? current : mint(current ?? 'RESPONSE');
    used.add(id);
    return node.type.create({ ...node.attrs, responseIdentifier: id }, children, node.marks);
  };
  return Fragment.from(content.content.map(visit));
}
