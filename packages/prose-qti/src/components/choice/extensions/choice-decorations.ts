/**
 * QTI Choice Interaction — editor decorations
 *
 * Widget decorations that give the choice interaction its mouse affordances:
 *
 *   ×   per `qtiSimpleChoice`, pinned to the right of the row, revealed on hover
 *   +   below the last choice but inside the interaction, appends a new choice
 *   pill  select / settings / duplicate / delete, floating above the interaction and emitted only while
 *         the selection sits inside it
 *
 * All of them are view-only: they never enter the document, so exported XML is unaffected.
 *
 * `qtiSimpleChoice` is shared with the order interaction, so decorations are produced by walking
 * `qtiChoiceInteraction` nodes and iterating their own children — never by matching
 * `qtiSimpleChoice` globally.
 *
 * ## Reference implementation for the rest of the family
 *
 * This is the first of a decorator per interaction, and it is deliberately short: everything
 * generic lives in `components/shared/extensions/node-decorations.ts` — the icons, the button
 * factory, the action pill and its select/settings/duplicate/delete defaults, and the
 * `qti:node-settings:open` contract. What is left here is the only part that is actually about
 * choices: what "one of these" is, and when another may be added or removed.
 *
 * So a decorator for order, match, gap-match or associate is this file with a different
 * add/remove pair. Follow it, and add to the shared module rather than here if the next one needs
 * something this one does not.
 *
 * Installed opt-in via the descriptor's `decoratorPluginFactories` — never through
 * `pluginFactories`, which every host installs unconditionally.
 */

import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

import { translateQti } from '../../shared/i18n/index.js';
import {
  createDecorationButton,
  nodeActionsWidget,
  nodeBeforeWidget,
} from '../../shared/extensions/node-decorations.js';
import { createSimpleChoiceNode } from '../components/qti-choice-interaction/commands/insert-choice-interaction.commands.js';

import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

const choiceDecoratorPluginKey = new PluginKey('qti-choice-interaction-decorations');

const INTERACTION_NODE_NAME = 'qtiChoiceInteraction';
const INTERACTION_TAG_NAME = 'qti-choice-interaction';
const CHOICE_NODE_NAME = 'qtiSimpleChoice';

/** Drops `identifier` from a comma-joined `correctResponse`; null when empty. */
function withoutIdentifier(correctResponse: unknown, identifier: string): string | null {
  const identifiers = Array.isArray(correctResponse)
    ? correctResponse.map(String)
    : typeof correctResponse === 'string' && correctResponse
      ? correctResponse.split(',')
      : [];

  const remaining = identifiers.filter(entry => entry && entry !== identifier);
  return remaining.length > 0 ? remaining.join(',') : null;
}

function removeChoiceAt(view: EditorView, widgetPos: number | undefined): void {
  if (widgetPos == null) return;
  const { state } = view;
  const choice = nodeBeforeWidget(state, widgetPos, CHOICE_NODE_NAME);
  if (!choice) return;

  const $choice = state.doc.resolve(choice.from);
  const interactionPos = $choice.before($choice.depth);
  const interactionNode = state.doc.nodeAt(interactionPos);
  if (!interactionNode || interactionNode.type.name !== INTERACTION_NODE_NAME) return;

  // The schema requires `qtiSimpleChoice+`; never delete the last one.
  if (interactionNode.childCount <= 2) return;

  const tr = state.tr;
  const correctResponse = withoutIdentifier(interactionNode.attrs.correctResponse, choice.node.attrs.identifier);
  if (correctResponse !== interactionNode.attrs.correctResponse) {
    tr.setNodeMarkup(interactionPos, undefined, { ...interactionNode.attrs, correctResponse });
  }
  tr.delete(tr.mapping.map(choice.from), tr.mapping.map(choice.to));

  view.dispatch(tr);
  view.focus();
}

function appendChoiceAt(view: EditorView, widgetPos: number | undefined): void {
  if (widgetPos == null) return;
  const { state } = view;
  const choice = createSimpleChoiceNode(state.schema);
  if (!choice) return;

  // The widget sits at the end of the interaction's content, which is exactly where the new choice
  // belongs.
  const tr = state.tr.insert(widgetPos, choice);
  // Offset 2 = into the choice, into its paragraph — same as `insertSimpleChoiceOnEnter`.
  tr.setSelection(TextSelection.create(tr.doc, widgetPos + 2)).scrollIntoView();

  view.dispatch(tr);
  view.focus();
}

/**
 * Decorations are derived fresh from state on every doc *and* selection change, which is what makes
 * the "pill only while the selection is inside" rule free.
 *
 * Placement rule: the × and the pill are emitted *after* the node they belong to — the × between
 * its choice and the next, the pill just after the whole interaction. That keeps them out of the
 * custom elements' slotted content and, more importantly, makes the decorated node a *preceding
 * sibling*: CSS anchor positioning refuses to anchor an element to its own ancestor, so a widget
 * nested inside the choice could never anchor to it. Only the `+` stays inside, because it is laid
 * out in flow rather than anchored.
 */
function buildDecorations(state: EditorState): DecorationSet {
  const interactionType = state.schema.nodes[INTERACTION_NODE_NAME];
  if (!interactionType) return DecorationSet.empty;

  const decorations: Decoration[] = [];

  state.doc.descendants((node, pos) => {
    if (node.type !== interactionType) return true;

    const interactionEnd = pos + node.nodeSize;
    const selectionInside = state.selection.from >= pos && state.selection.to <= interactionEnd;
    const choiceCount = node.childCount - 1; // minus the prompt

    // Anchor names have to be unique per decorated node: when several elements share one name the
    // browser binds every anchored box to the LAST of them, which would stack all the ×'s on the
    // final choice. Names are derived from the node's position, so they stay stable for as long as
    // the node does.
    const interactionAnchor = `--qti-choice-interaction-${pos}`;
    decorations.push(
      Decoration.node(pos, interactionEnd, { style: `anchor-name: ${interactionAnchor}` }),
    );

    if (selectionInside) {
      decorations.push(
        nodeActionsWidget({
          pos: interactionEnd,
          nodeTypeName: INTERACTION_NODE_NAME,
          tagName: INTERACTION_TAG_NAME,
          anchorName: interactionAnchor,
        }),
      );
    }

    node.forEach((child, offset) => {
      if (child.type.name !== CHOICE_NODE_NAME) return;

      const choicePos = pos + 1 + offset;
      const afterChoice = choicePos + child.nodeSize;
      const choiceAnchor = `--qti-simple-choice-${choicePos}`;

      decorations.push(
        Decoration.node(choicePos, afterChoice, { style: `anchor-name: ${choiceAnchor}` }),
      );

      // The schema requires `qtiSimpleChoice+`: with one choice left there is nothing to remove, so
      // the affordance isn't offered.
      if (choiceCount <= 1) return;

      decorations.push(
        Decoration.widget(
          afterChoice,
          (view, getPos) =>
            createDecorationButton({
              className: 'qti-decoration qti-decoration--remove',
              icon: 'x',
              iconSize: 14,
              label: translateQti('choice.removeOption', { target: view.dom }),
              anchorName: choiceAnchor,
              onClick: () => removeChoiceAt(view, getPos()),
            }),
          {
            // side 0 keeps the × ahead of the trailing `+` widget where the last choice's boundary
            // and the interaction's end coincide, so the CSS adjacency (`choice:hover + .remove`)
            // always holds.
            side: 0,
            /*
             * The position is in the key, and has to be.
             *
             * `toDOM` writes `position-anchor` as an inline style, once, from the position it was
             * rendered at — but ProseMirror reuses a widget's DOM whenever its key is unchanged.
             * With an identifier-only key the element survived every edit while the `anchor-name`
             * on the choice was re-minted from the new position, so the two drifted apart on the
             * first keystroke: the × referenced an anchor that no longer existed and fell back to
             * its containing block, landing in the top-left corner of the editor.
             *
             * Both names come from `choicePos` in this one pass, so keying on it is what guarantees
             * they agree. The identifier stays in the key as well, so that removing a choice
             * renders a new button rather than adopting its neighbour's.
             */
            key: `qti-choice-remove-${child.attrs.identifier}-${choicePos}`,
            ignoreSelection: true,
            stopEvent: () => true,
          },
        ),
      );
    });

    decorations.push(
      Decoration.widget(
        interactionEnd - 1,
        (view, getPos) =>
          createDecorationButton({
            className: 'qti-decoration qti-decoration--add',
            icon: 'plus',
            iconSize: 16,
            label: translateQti('choice.addOption', { target: view.dom }),
            onClick: () => appendChoiceAt(view, getPos()),
          }),
        { side: 1, key: `qti-choice-add-${pos}`, ignoreSelection: true, stopEvent: () => true },
      ),
    );

    // Choice interactions don't nest.
    return false;
  });

  return DecorationSet.create(state.doc, decorations);
}

export function createChoiceInteractionDecoratorPlugin(): Plugin {
  return new Plugin({
    key: choiceDecoratorPluginKey,
    props: {
      decorations: buildDecorations,
    },
  });
}
