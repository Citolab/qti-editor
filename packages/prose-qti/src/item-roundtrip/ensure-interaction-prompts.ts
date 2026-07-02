/**
 * QTI 3.0 lets authors omit `<qti-prompt>` on most interactions, but editors
 * frequently tighten the schema to require one (so authors always see the
 * prompt slot in the UI). ProseMirror's `DOMParser` does NOT auto-insert
 * required leading siblings: it only uses `ContentMatch.findWrapping(type)`,
 * which wraps the offending child in a parent — it never inserts a missing
 * preceding sibling. The first mismatched child therefore closes the
 * interaction (auto-filling empty placeholder content on the way out) and the
 * real children leak out to the parent context.
 *
 * This transform bridges that gap before parsing: walk the item XML and inject
 * an empty `<qti-prompt><p/></qti-prompt>` into any interaction whose schema
 * requires a prompt at the start of its content expression but whose XML lacks
 * one. The set of interactions is derived from the supplied schema — every
 * node whose `content` expression begins-or-contains a non-optional `qtiPrompt`
 * is matched back to its `parseDOM` tag.
 */
import type { NodeSpec, Schema } from 'prosemirror-model';
import type { RoundtripTransform } from './import.js';

function requiresPromptAtStart(spec: NodeSpec): boolean {
  const content = typeof spec.content === 'string' ? spec.content : '';
  // matches a `qtiPrompt` token NOT followed by `?`, `*`, or `+` — i.e. exactly
  // one prompt is required at this position.
  return /\bqtiPrompt\b(?![?*+])/.test(content);
}

function firstParseTag(spec: NodeSpec): string | null {
  const rule = spec.parseDOM?.find((r): r is { tag: string } => typeof r.tag === 'string');
  return rule?.tag ?? null;
}

/**
 * Build a roundtrip transform that injects an empty `<qti-prompt>` into every
 * interaction whose schema requires one but whose source XML omits it.
 *
 * The transform is opt-in: callers append it to their `transforms` array. If
 * the schema does not require any leading prompts, the returned transform is a
 * no-op.
 */
export function ensureInteractionPrompts(schema: Schema): RoundtripTransform {
  const tagsRequiringPrompt = new Set<string>();
  for (const type of Object.values(schema.nodes)) {
    if (type.name === 'qtiPrompt') continue;
    if (!requiresPromptAtStart(type.spec)) continue;
    const tag = firstParseTag(type.spec);
    if (tag) tagsRequiringPrompt.add(tag);
  }

  if (tagsRequiringPrompt.size === 0) {
    return () => {};
  }

  const selector = Array.from(tagsRequiringPrompt).join(',');

  return (xmlDoc: XMLDocument): void => {
    for (const interaction of Array.from(xmlDoc.querySelectorAll(selector))) {
      const hasPrompt = Array.from(interaction.children).some(child => child.localName === 'qti-prompt');
      if (hasPrompt) continue;
      const prompt = xmlDoc.createElementNS(interaction.namespaceURI, 'qti-prompt');
      prompt.appendChild(xmlDoc.createElementNS(interaction.namespaceURI, 'p'));
      interaction.insertBefore(prompt, interaction.firstChild);
    }
  };
}
