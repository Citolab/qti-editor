/**
 * Make a multi-block paste fit an interaction slot that holds exactly one block.
 *
 * ## The failure
 *
 * `qtiSimpleChoice`, `qtiPrompt` and `qtiSimpleAssociableChoice` each hold exactly ONE child. A
 * paste of two or more blocks therefore has nowhere to go, and ProseMirror's fitter resolves that
 * by closing out of the choice AND the interaction and reopening the interaction for the
 * remainder — splitting one interaction into two, both keeping the same `responseIdentifier` until
 * the composer's duplicate guard renames one at save time. `isolating: true` does not prevent it:
 * in prosemirror-transform it is consulted for nodes inside the slice (`Fitter.findFittable`) and
 * for range expansion (`coveredDepths`), never for the frontier the fitter closes and reopens.
 *
 * Widening the `parseDOM` context guards to `//` (see the note in `qti-simple-choice.schema.ts`)
 * makes pasted `<qti-simple-choice>` elements parse as choices again, which is what lets this
 * plugin carry their identifiers across. It does not fix the fit: the fitter still needs somewhere
 * to put a second block, and still invents a `qtiSimpleChoice` with the schema default
 * `identifier: 'A'` when it needs a slot. That is this plugin's job.
 *
 * ## The approach: flatten, then rebuild
 *
 * `transformPasted` runs after the parse and before the fitter, so the slice can be replaced with
 * one that already fits. Rather than patching the incoming shape — which varies with how the
 * source markup happened to parse — the slice is reduced to a list of inline RUNS and rebuilt:
 *
 *   - Where the target's parent repeats the target (`qtiSimpleChoice+`), each run becomes its own
 *     sibling. The first run merges into the block the cursor is in, exactly as an ordinary paste
 *     does, so only runs 2..n become new siblings.
 *   - Where it does not repeat (`qtiPrompt?`), the runs are joined into the single slot with a
 *     space between them.
 *
 * Runs carry an identifier when the slice had one. A fresh one is minted when it did not, and also
 * when keeping it would duplicate an identifier already in the target — pasting a copy of a choice
 * back into its own interaction must not produce two choices a response declaration cannot tell
 * apart.
 *
 * ## What decides whether this plugin acts
 *
 * Nothing is keyed on node names. The question "does this container hold more than one of these?"
 * is asked of the schema itself:
 *
 *     container.type.contentMatch.matchType(slot)?.matchType(slot)
 *
 * If that matches, the container already accepts what is being pasted and the plugin keeps its
 * hands off — which is what makes a `qtiHottextInteraction` (`content: 'paragraph+'`) and an item
 * body behave normally without either being named here. An interaction added later gets the same
 * treatment for free, and one whose slot is widened to accept many blocks silently stops being
 * rescued, which is the correct response to that change rather than something to remember to undo.
 */
import { Fragment, Slice } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';

import type { Node as PmNode, NodeType, ResolvedPos } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

/** One rebuilt block: its inline content, and the identifier it arrived with, if any. */
type Run = {
  inline: readonly PmNode[];
  identifier: string | null;
};

/** A single-block slot the cursor is sitting in, and what the schema says about its surroundings. */
type Target = {
  /** Depth of the container (`qtiSimpleChoice`), one above the slot the cursor is in. */
  depth: number;
  container: PmNode;
  /** The container's only permitted child type (`qtiSimpleChoiceParagraph`). */
  slot: NodeType;
  /** Whether the container's own parent permits more than one container. */
  repeats: boolean;
  parent: PmNode;
  parentDepth: number;
};

/**
 * The innermost container around `$from` that holds exactly one block, or `null`.
 *
 * Walks outwards from the cursor rather than testing a known depth, because the depth differs per
 * interaction — a choice sits at depth 2 (`doc > interaction > choice`) and an associable choice at
 * depth 3 (`doc > interaction > matchSet > associableChoice`).
 */
function findSingleSlotTarget($from: ResolvedPos): Target | null {
  // Below depth 2 the container would be the doc itself, which always takes many blocks.
  for (let depth = $from.depth; depth >= 2; depth--) {
    const slotNode = $from.node(depth);
    if (!slotNode.isTextblock) continue;

    const container = $from.node(depth - 1);
    const slot = slotNode.type;

    // Room for a second one? Then the container is not a single-block slot and this is not ours.
    if (container.type.contentMatch.matchType(slot)?.matchType(slot)) return null;

    const parentDepth = depth - 2;
    const parent = $from.node(parentDepth);

    return {
      depth: depth - 1,
      container,
      slot,
      repeats: Boolean(parent.type.contentMatch.matchType(container.type)?.matchType(container.type)),
      parent,
      parentDepth,
    };
  }
  return null;
}

/**
 * Prefix for a minted identifier, mirroring what the insert commands already produce.
 *
 * Not derivable from the node type: `qtiSimpleChoice` is `SIMPLE_CHOICE_` inside a choice
 * interaction and `CHOICE_` inside an order interaction, and `qtiSimpleAssociableChoice` is
 * `SOURCE_` or `TARGET_` depending on which of the two match sets it lands in. See
 * `insert-choice-interaction.commands.ts`, `qti-order-interaction.commands.ts` and
 * `qti-match-interaction.commands.ts`.
 */
function identifierPrefix($from: ResolvedPos, target: Target): string {
  switch (target.container.type.name) {
    case 'qtiSimpleChoice':
      return target.parent.type.name === 'qtiOrderInteraction' ? 'CHOICE' : 'SIMPLE_CHOICE';
    case 'qtiSimpleAssociableChoice':
      // `qtiSimpleMatchSet{2}`: the first set is the source, the second the target.
      return $from.index(target.parentDepth - 1) === 0 ? 'SOURCE' : 'TARGET';
    default:
      // Anything registered later: `qtiSomeThing` -> `SOME_THING`, which is the convention the
      // three cases above all follow.
      return target.container.type.name
        .replace(/^qti/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .toUpperCase();
  }
}

/** Identifiers already used by siblings of `container` under `parent`. */
function usedIdentifiers(parent: PmNode, containerType: NodeType): Set<string> {
  const used = new Set<string>();
  parent.forEach((child) => {
    if (child.type === containerType && typeof child.attrs.identifier === 'string') {
      used.add(child.attrs.identifier);
    }
  });
  return used;
}

/** True when `node` is a list wrapper — asked of its children, so no list type is named here. */
function isList(node: PmNode): boolean {
  return node.childCount > 0 && node.firstChild!.type.name === 'list_item';
}

/**
 * The inline content of `fragment`, reduced to what `slot` will accept.
 *
 * Text nodes keep their marks, so pasting a bold answer option stays bold. An inline node the slot
 * cannot hold degrades to its `alt` text if it has one — that is how an image survives into a
 * `text*` slot — and is dropped otherwise. Nested blocks are walked and separated by a space, which
 * is what turns a pasted table's cells into one readable run.
 */
function inlineFor(fragment: Fragment, slot: NodeType): PmNode[] {
  const schema = slot.schema;
  const out: PmNode[] = [];

  const endsWithSpace = () => {
    const last = out[out.length - 1];
    return !last || (last.isText && /\s$/.test(last.text ?? ''));
  };

  const walk = (content: Fragment) => {
    content.forEach((child) => {
      if (child.isText) {
        out.push(child);
        return;
      }
      if (child.isInline) {
        if (slot.contentMatch.matchType(child.type)) {
          out.push(child);
          return;
        }
        const alt = typeof child.attrs.alt === 'string' ? child.attrs.alt.trim() : '';
        if (alt) out.push(schema.text(alt));
        return;
      }
      // A block inside the run: its text joins on, separated from what came before.
      if (out.length && !endsWithSpace()) out.push(schema.text(' '));
      walk(child.content);
    });
  };

  walk(fragment);
  return out;
}

/** One run per list item, with any nested list contributing its own runs after its parent's text. */
function listRuns(list: PmNode, slot: NodeType): Run[] {
  const runs: Run[] = [];
  list.forEach((item) => {
    const own: PmNode[] = [];
    const nested: PmNode[] = [];
    item.forEach((child) => (isList(child) ? nested.push(child) : own.push(child)));

    const inline = inlineFor(Fragment.fromArray(own), slot);
    if (inline.length) runs.push({ inline, identifier: null });
    nested.forEach((sub) => runs.push(...listRuns(sub, slot)));
  });
  return runs;
}

/**
 * An identifier worth carrying across, or `null`.
 *
 * A top-level block in the slice is USUALLY the target container even for a paste of plain `<p>`s:
 * `qtiSimpleChoiceParagraph` cannot stand alone, so the parser's `findWrapping` builds a
 * `qtiSimpleChoice` around each one and stamps it with the schema default. Reading that back as
 * "the identifier this content arrived with" is how `identifier="A"` got into exported items in
 * the first place, so a value equal to the type's default is treated as no value at all.
 *
 * The cost is that pasting a legacy choice whose authored identifier genuinely IS the default —
 * `A`, in an old A/B/C/D item — gets a fresh one anyway. In-slice the two are indistinguishable,
 * and a duplicate identifier is the worse failure: a response declaration cannot address it.
 */
function authoredIdentifier(block: PmNode): string | null {
  const value = block.attrs.identifier;
  if (typeof value !== 'string' || !value) return null;
  return value === block.type.spec.attrs?.identifier?.default ? null : value;
}

/**
 * The pasted slice as a list of runs.
 *
 * A list contributes one run per item — an author pasting a bulleted list of answer options means
 * the options, and `<li>` is the closest thing the clipboard has to "one option". Everything else
 * is one run.
 */
function runsOf(content: Fragment, target: Target): Run[] {
  const runs: Run[] = [];
  content.forEach((block) => {
    if (block.type === target.container.type) {
      const inline = inlineFor(block.content, target.slot);
      if (inline.length) runs.push({ inline, identifier: authoredIdentifier(block) });
      return;
    }
    if (isList(block)) {
      runs.push(...listRuns(block, target.slot));
      return;
    }
    const inline = inlineFor(block.content, target.slot);
    if (inline.length) runs.push({ inline, identifier: null });
  });
  return runs;
}

/**
 * Each run as its own container.
 *
 * `openStart`/`openEnd` of 2 opens the slice through container and slot, so the first run's inline
 * content merges into the block the cursor is in — the first container node is never inserted, and
 * its attributes are therefore the existing container's rather than a wasted minted identifier.
 */
function fanOut(runs: Run[], target: Target, $from: ResolvedPos): Slice {
  const containerType = target.container.type;
  const hasIdentifier = Boolean(containerType.spec.attrs?.identifier);
  const used = usedIdentifiers(target.parent, containerType);
  const prefix = hasIdentifier ? identifierPrefix($from, target) : '';

  const nodes = runs.map((run, index) => {
    const slotNode = target.slot.create(null, Fragment.fromArray(run.inline.slice()));
    if (index === 0) return containerType.create(target.container.attrs, slotNode);
    if (!hasIdentifier) return containerType.create(null, slotNode);

    const identifier =
      run.identifier && !used.has(run.identifier) ? run.identifier : `${prefix}_${crypto.randomUUID()}`;
    used.add(identifier);
    return containerType.create({ identifier }, slotNode);
  });

  return new Slice(Fragment.fromArray(nodes), 2, 2);
}

/**
 * Every run joined into one slot, separated by a space.
 *
 * `openStart`/`openEnd` of 1 opens the slice through the slot only, so the whole thing merges into
 * the block the cursor is in rather than replacing it.
 */
function join(runs: Run[], target: Target): Slice {
  const schema = target.slot.schema;
  const inline: PmNode[] = [];
  runs.forEach((run) => {
    if (inline.length) inline.push(schema.text(' '));
    inline.push(...run.inline);
  });

  return new Slice(Fragment.from(target.slot.create(null, Fragment.fromArray(inline))), 1, 1);
}

/**
 * Add to the plugin list to opt in:
 *
 *     import { qtiPasteRescuePlugin } from '@citolab/prose-qti/schema';
 *     plugins: [...otherPlugins, qtiPasteRescuePlugin]
 *
 * Order against the semantic-paste plugin does not matter: that one works on the clipboard HTML in
 * `transformPastedHTML`, this one on the parsed slice in `transformPasted`, and ProseMirror runs
 * the two stages in that order regardless of plugin order.
 */
export const qtiPasteRescuePlugin = new Plugin({
  props: {
    transformPasted(slice: Slice, view: EditorView): Slice {
      const target = findSingleSlotTarget(view.state.selection.$from);
      if (!target) return slice;

      const runs = runsOf(slice.content, target);
      // Nothing in the paste survives the target — an alt-less image on its own, say. Dropping it
      // is right: left alone it would still split the interaction on its way to being discarded.
      if (runs.length === 0) return Slice.empty;

      return target.repeats ? fanOut(runs, target, view.state.selection.$from) : join(runs, target);
    },
  },
});
