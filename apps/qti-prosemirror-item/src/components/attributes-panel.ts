/**
 * Attributes panel — the right-hand column.
 *
 * The actual fields are rendered by the editor's `attributesPanelPlugin`, which
 * needs a stable host element to draw into. This component owns that element
 * and clears it between items.
 */

export class AttributesPanel {
  readonly #host: HTMLElement;

  constructor(host: HTMLElement) {
    this.#host = host;
  }

  /** The element the `attributesPanelPlugin` renders into. */
  get host(): HTMLElement {
    return this.#host;
  }

  clear(): void {
    this.#host.innerHTML = '';
  }
}
