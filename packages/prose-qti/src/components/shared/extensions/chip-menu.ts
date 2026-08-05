/**
 * Clicking a placed chip offers to take it back out.
 *
 * The chip announces that it was clicked and where it is ({@link DummyDragActivateDetail}); this
 * turns that into a menu. Two things had to be separated to make it work at all:
 *
 *   - **Where the menu goes.** A menu needs somewhere to be, and deriving that from
 *     `state.selection` limits it to things that ARE document nodes. A chip is not: order's slots
 *     are shadow `<drop-list>` divs addressed by index, and match's chips live inside the target
 *     choice's shadow root. The chip hands over its own rect instead, which it has for free — no
 *     anchor names, no part tokens, no document position.
 *   - **Whether a menu is wanted at all.** A click on a placed chip while another choice is pending
 *     means "put this one here instead", and that belongs to the host's pending-selection commit.
 *     Only the interaction knows a drag is pending, so the interaction cancels the activation and
 *     this never runs. Without that the two gestures fight over the same pixels, and the losing
 *     combination — remove fires, commit does not — leaves the drop empty, which is exactly what
 *     happened when the chip removed itself on click.
 *
 * The action re-dispatches `dummy-drag-remove` from the chip, which every host already listens for.
 * So the gesture changed and none of the handling did.
 *
 * ## One menu, however many times this is installed
 *
 * Plugins are contributed per interaction descriptor and flattened, so an editor with match, order
 * and gap-match installs three of these — and all three would open a menu for the same click, since
 * they all listen on `view.dom`. The first one to see an activation claims it; the rest skip it.
 * Deduping the event is what makes the plugin safe to contribute from every descriptor that wants
 * it, which beats picking one arbitrary descriptor to own it for everybody.
 */
import { Plugin, PluginKey } from 'prosemirror-state';

import { translateQti } from '../i18n/index.js';

import type { DummyDragActivateDetail } from '../components/dummy-drag/dummy-drag.js';
import type { EditorView } from 'prosemirror-view';

const claimed = new WeakSet<Event>();

/** The chip that raised the event — `event.target` is retargeted to the outermost host by then. */
function chipOf(event: Event): HTMLElement | null {
  const first = event.composedPath()[0];
  return first instanceof HTMLElement ? first.closest('dummy-drag') : null;
}

export function createChipMenuPlugin(name: string): Plugin {
  return new Plugin({
    key: new PluginKey(`chip-menu-${name}`),
    view(view: EditorView) {
      let menu: HTMLElement | null = null;

      const close = (): void => {
        menu?.remove();
        menu = null;
      };

      const onActivate = (event: Event) => {
        // Cancelled by an interaction that would rather commit a pending drag into this drop.
        if (event.defaultPrevented || claimed.has(event)) return;

        const detail = (event as CustomEvent<DummyDragActivateDetail>).detail;
        const chip = chipOf(event);
        if (!detail || !chip) return;
        claimed.add(event);

        close();
        menu = document.createElement('div');
        menu.className = 'qti-selection-menu';
        menu.setAttribute('role', 'toolbar');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'qti-selection-menu-action';
        button.textContent = translateQti('chip.remove', { target: view.dom });
        button.addEventListener('mousedown', pressed => {
          pressed.preventDefault();
          close();
          chip.dispatchEvent(
            new CustomEvent('dummy-drag-remove', {
              detail: { identifier: detail.identifier },
              bubbles: true,
              composed: true,
            }),
          );
        });
        menu.appendChild(button);

        document.body.appendChild(menu);
        menu.style.left = `${detail.rect.left}px`;
        menu.style.top = `${detail.rect.bottom + 6}px`;
      };

      const onPointerDown = (event: PointerEvent) => {
        if (menu && !event.composedPath().includes(menu)) close();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') close();
      };

      view.dom.addEventListener('dummy-drag-activate', onActivate);
      // Capture, so a press that lands anywhere — including inside another shadow root — dismisses
      // a menu that is no longer about what the author is doing.
      document.addEventListener('pointerdown', onPointerDown, true);
      document.addEventListener('keydown', onKeyDown);

      return {
        destroy() {
          view.dom.removeEventListener('dummy-drag-activate', onActivate);
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown);
          close();
        },
      };
    },
  });
}
