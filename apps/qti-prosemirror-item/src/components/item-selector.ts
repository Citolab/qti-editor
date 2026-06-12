/**
 * Item selector — the left-hand list of sample items.
 *
 * A framework-free component: it renders into its host element and notifies the
 * caller via `onSelect` when an item is chosen, keeping the active item marked.
 */

import type { SampleItem } from '../data/items.js';

export interface ItemSelectorOptions {
  items: SampleItem[];
  onSelect: (item: SampleItem) => void;
}

export class ItemSelector {
  readonly #host: HTMLElement;
  readonly #options: ItemSelectorOptions;
  readonly #buttons = new Map<string, HTMLButtonElement>();

  constructor(host: HTMLElement, options: ItemSelectorOptions) {
    this.#host = host;
    this.#options = options;
    this.#render();
  }

  /** Mark `item` as the active selection (or clear it when undefined). */
  setActive(item: SampleItem | undefined): void {
    for (const [id, button] of this.#buttons) {
      button.setAttribute('aria-current', String(id === item?.id));
    }
  }

  destroy(): void {
    this.#buttons.clear();
    this.#host.innerHTML = '';
  }

  #render(): void {
    this.#host.innerHTML = '';
    this.#buttons.clear();

    for (const item of this.#options.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-current', 'false');
      button.innerHTML = `<strong>${item.id}</strong><span>${item.title}</span><em>${item.kind}</em>`;
      button.addEventListener('click', () => this.#options.onSelect(item));
      this.#host.appendChild(button);
      this.#buttons.set(item.id, button);
    }
  }
}
