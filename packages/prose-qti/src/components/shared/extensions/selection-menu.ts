/**
 * The shell behind every "click something in an interaction, get offered what to do with it" menu.
 *
 * Owns only the mechanics that are the same wherever such a menu appears: a popover element, where
 * to put it, when to show it, and turning i18n keys plus ProseMirror commands into buttons. It
 * knows nothing about what any interaction offers — callers pass a resolver that reads the state
 * and returns actions, and mutually exclusive cases fall out of that resolver rather than out of
 * anything here.
 *
 * ## Why a ProseMirror tooltip rather than a popover inside the interaction element
 *
 * The condition for showing one of these is always some shape of `state.selection` — words
 * selected, a node clicked, a caret inside something. ProseMirror knows that exactly and refreshes
 * it on every transaction. A popover living in a custom element's shadow root has to rebuild it
 * from `document.getSelection()` on mouseup/keyup, then send a CustomEvent back out of the shadow
 * root for a plugin to map the DOM element to a document position. The button handler here IS the
 * plugin and has the positions already. A menu is editor chrome besides, so it has no business in
 * the shadow root of an element whose job is to render what the candidate will see.
 *
 * ## Why this is shared when the two menus that came first were not
 *
 * Hottext's and gap-match's menus were written as deliberate twins, on the reasoning that ~55 lines
 * of tooltip each was cheaper than an abstraction with one parameter per difference. That held at
 * two. At three — chips inside drop targets want one too — the duplication is no longer the cheaper
 * side, and what is common has stopped moving: everything that differs between the menus lives in
 * the resolver, which is exactly what stayed behind.
 */
import { Plugin, PluginKey } from 'prosemirror-state';

import { translateQti } from '../i18n/index.js';

import type { Command, EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export interface SelectionMenuAction {
  /** i18n key for the button label, resolved against the editor's language. */
  key: string;
  command: Command;
}

/** Reads the state and says what to offer, or nothing at all. Called on every transaction. */
export type SelectionMenuActions = (state: EditorState) => SelectionMenuAction[];

/**
 * A selection menu for one interaction.
 *
 * `name` only has to be unique among the menus installed in one editor — it names the plugin key.
 *
 * The popover is fixed-positioned against the viewport and parented to `<body>`, so neither an
 * unpositioned editor container nor a scroll container can clip it, and it is created lazily on
 * first use: an interaction the author never touches contributes no DOM at all. Buttons are rebuilt
 * only when the set of actions changes, so typing does not churn them.
 */
export function createSelectionMenuPlugin(name: string, resolveActions: SelectionMenuActions): Plugin {
  return new Plugin({
    key: new PluginKey(`selection-menu-${name}`),
    view(view: EditorView) {
      let menu: HTMLElement | null = null;
      let signature = '';
      /** Set while the menu was opened by a component rather than by the selection. See `openAt`. */
      let pinned = false;

      const ensureMenu = (): HTMLElement => {
        if (!menu) {
          menu = document.createElement('div');
          menu.className = 'qti-selection-menu';
          menu.setAttribute('role', 'toolbar');
          document.body.appendChild(menu);
        }
        return menu;
      };

      const build = (actions: SelectionMenuAction[]): void => {
        const next = actions.map(action => action.key).join('|');
        if (next === signature) return;
        signature = next;
        ensureMenu().replaceChildren(
          ...actions.map(action => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'qti-selection-menu-action';
            button.textContent = translateQti(action.key, { target: view.dom });
            button.addEventListener('mousedown', event => {
              // Focusing the button would collapse the very selection the command is about to act
              // on, so the press must not be allowed to move focus.
              event.preventDefault();
              close();
              action.command(view.state, view.dispatch, view);
              view.focus();
            });
            return button;
          }),
        );
      };

      const close = (): void => {
        pinned = false;
        signature = '';
        if (menu) menu.style.display = 'none';
      };

      const render = () => {
        // A pinned menu is about something the selection cannot see — leave it alone until it is
        // dismissed or its action runs, or the next transaction would close it out from under the
        // pointer on its way to the button.
        if (pinned) return;

        const actions = view.hasFocus() ? resolveActions(view.state) : [];
        if (actions.length === 0) {
          close();
          return;
        }

        build(actions);
        const start = view.coordsAtPos(view.state.selection.from);
        const end = view.coordsAtPos(view.state.selection.to);
        const el = ensureMenu();
        el.style.display = '';
        el.style.left = `${Math.min(start.left, end.left)}px`;
        el.style.top = `${Math.max(start.bottom, end.bottom) + 6}px`;
      };

      /**
       * Open the menu against a rect instead of the selection.
       *
       * The second way in, and the reason the whole thing works for chips. A menu needs somewhere to
       * be and something to offer; deriving both from `state.selection` limited it to things that
       * ARE document nodes, which a chip inside a drop's shadow root is not — order's slots are
       * shadow divs addressed by index, and match's chips live inside the target choice. A component
       * holding the chip already has the element, so it hands over `getBoundingClientRect()` and the
       * menu has everything it needs. No anchor names, no part tokens, no document position.
       *
       * Stays open until something dismisses it — a press elsewhere, Escape, or one of its own
       * buttons running.
       */
      const openAt = (rect: DOMRect, actions: SelectionMenuAction[]): void => {
        if (actions.length === 0) return;
        // Rebuild unconditionally: two chips offer the same action under the same key, and the
        // signature check alone would leave the previous chip's buttons in place.
        signature = '';
        build(actions);
        pinned = true;
        const el = ensureMenu();
        el.style.display = '';
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.bottom + 6}px`;
      };

      const onDocumentPointerDown = (event: PointerEvent): void => {
        if (!pinned) return;
        if (menu && event.composedPath().includes(menu)) return;
        close();
      };
      const onKeyDown = (event: KeyboardEvent): void => {
        if (pinned && event.key === 'Escape') close();
      };
      document.addEventListener('pointerdown', onDocumentPointerDown, true);
      document.addEventListener('keydown', onKeyDown);

      selectionMenus.set(view, { openAt, close });
      render();

      return {
        update: render,
        destroy() {
          document.removeEventListener('pointerdown', onDocumentPointerDown, true);
          document.removeEventListener('keydown', onKeyDown);
          selectionMenus.delete(view);
          menu?.remove();
          menu = null;
        },
      };
    },
  });
}

/** Handle onto a live menu, so a component can open one without reaching into the plugin. */
export interface SelectionMenuHandle {
  openAt(rect: DOMRect, actions: SelectionMenuAction[]): void;
  close(): void;
}

const selectionMenus = new WeakMap<EditorView, SelectionMenuHandle>();

/** The menu belonging to `view`, if one is installed. */
export function selectionMenuFor(view: EditorView): SelectionMenuHandle | undefined {
  return selectionMenus.get(view);
}
