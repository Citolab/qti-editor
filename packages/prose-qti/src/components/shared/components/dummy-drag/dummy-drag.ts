import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import styles from './dummy-drag.styles.js';

/** Raised when a placed chip is clicked. `rect` is where it is, so a host can put a menu on it. */
export interface DummyDragActivateDetail {
  identifier: string;
  rect: DOMRect;
  /** The originating click, so a host can stop it reaching its own drop-target handler. */
  source: MouseEvent;
}

/**
 * Editor stand-in chip rendered *inside* a drop slot for all four drag-drop
 * interactions (match, gap-match, order, associate). Mirrors the runtime
 * qti-components placement: in qti-components the dropped clone is appended
 * inside the drop target (light or shadow). Here the host interaction renders
 * a `<dummy-drag>` in the same nesting position so the structural shape
 * matches what students see at runtime.
 *
 * `:host` styles inline the resolved `.drag` declarations from qti-theme
 * (`packages/qti-theme/src/styles/qti-theme/qti-base.css:227`) so the editor
 * doesn't depend on the theme's `@apply drag` resolver — the same visual
 * applies regardless of where this element is placed (light DOM gap-match,
 * shadow drop-list in order/associate, shadow dropslot in match).
 *
 * The whole chip is the control. It used to carry a × revealed on hover, which was wrong three
 * ways: a 14px target inside an already small chip, an icon that had to be guessed at, and — being
 * `opacity: 0` rather than absent — width reserved in every placed chip whether or not anyone was
 * hovering, so every drop in the editor was wider than the drop the candidate will see.
 *
 * Clicking dispatches `dummy-drag-activate` carrying the chip's rect. What that opens is the host's
 * business: the interaction knows whether a drag is pending (in which case the click means "put
 * this one here instead" and belongs to the pending-selection commit, not to us) and what a chip
 * can be asked to do. Hosts that want the old behaviour can treat it as a plain remove.
 *
 * Editor-only, and deliberately NOT `qti-`-prefixed: this element has no QTI counterpart and
 * never reaches exported item XML. The prefix is what separates real QTI elements from the
 * editor's own — the generated custom-elements.json keeps only `qti-*` tags, so anything named
 * like this one stays out of the published element contract by construction.
 *
 * @customElement dummy-drag
 * @attr {string} identifier - Identifier of the choice this chip stands in for. The parent
 * interaction uses it to clear the right association when the chip is activated.
 * @attr {string} label - Text rendered on the chip — the label of the choice it stands in for.
 */
export class DummyDrag extends LitElement {
  static override styles = styles;

  @property({ type: String })
  identifier: string = '';

  @property({ type: String })
  label: string = '';

  /**
   * Whether clicking this chip does anything.
   *
   * On everywhere a chip stands in a drop, which is everywhere it is currently rendered. The flag
   * exists so a host that shows a chip purely as a preview can say so, rather than every such host
   * having to swallow the event.
   */
  @property({ type: Boolean, reflect: true })
  interactive = true;

  /**
   * Set by the host interaction. The editor doesn't dispatch a default remove
   * event because the action varies per interaction (clear a slot vs. delete
   * a pair). Hosts wire this directly in their lit template via `@click`.
   */
  override render() {
    return html`
      <span part="drag-control"></span>
      <span class="label" part="chip-label"><slot>${this.label}</slot></span>
    `;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this._onClick);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('click', this._onClick);
    super.disconnectedCallback();
  }

  /**
   * The click keeps bubbling on purpose.
   *
   * A click on a placed chip while another choice is pending means "put this one here instead", and
   * that is the host's pending-selection commit, which runs on the host and needs to see the click.
   * Announcing and deciding are kept apart: this element says a chip was activated and where it is;
   * whether that opens a menu, removes outright, or is ignored in favour of the commit is the
   * host's call, because only the host knows there is a pending drag.
   */
  private _onClick = (event: MouseEvent): void => {
    if (!this.interactive) return;
    this.dispatchEvent(
      new CustomEvent<DummyDragActivateDetail>('dummy-drag-activate', {
        detail: { identifier: this.identifier, rect: this.getBoundingClientRect(), source: event },
        bubbles: true,
        composed: true,
        // Cancelable so a host with a pending drag can decline the menu and let the click commit.
        cancelable: true,
      }),
    );
  };

}

declare global {
  interface HTMLElementTagNameMap {
    'dummy-drag': DummyDrag;
  }
  interface HTMLElementEventMap {
    'dummy-drag-activate': CustomEvent<DummyDragActivateDetail>;
    'dummy-drag-remove': CustomEvent<{ identifier: string }>;
  }
}
