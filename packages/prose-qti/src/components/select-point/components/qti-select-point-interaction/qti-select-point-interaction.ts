import { html, nothing } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { property, state } from 'lit/decorators.js';

import { Interaction } from '@citolab/prose-qti/components/shared/components/interaction.js';
import {
  areaContainsPoint,
  clientToImagePoint,
  draftToArea,
  formatCoords,
  isValidArea,
  moveAreaCoords,
  parseCoords,
  type DrawableAreaShape,
} from '@citolab/prose-qti/components/shared/graphic/area-geometry.js';
import { renderAreaShape } from '@citolab/prose-qti/components/shared/graphic/area-shape.js';
import { isHttpUrl, loadImageSize, readFileAsDataUrl } from '@citolab/prose-qti/components/shared/graphic/image-source.js';

import styles from './qti-select-point-interaction.styles.js';

import type { TemplateResult } from 'lit';

type DrawMode = 'select' | DrawableAreaShape;

type AreaMappingEntry = {
  id: string;
  shape: DrawableAreaShape;
  coords: string;
  mappedValue: number;
  defaultValue: number;
};

type DraftShape = {
  shape: DrawableAreaShape;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

type ShapeDragState = {
  index: number;
  startX: number;
  startY: number;
  originCoords: number[];
  shape: DrawableAreaShape;
};

type WrapperAttrsChangeDetail = {
  nodeType: 'qtiSelectPointInteraction';
  tagName: 'qti-select-point-interaction';
  attrs: Record<string, unknown>;
};

type ImageAttrsChangeDetail = {
  nodeType: 'imgSelectPoint';
  tagName: 'img';
  attrs: Record<string, unknown>;
};

/**
 * Editor component for qti-select-point-interaction — a background image the candidate clicks
 * to place points, with author-drawn scoring areas on top.
 *
 * @customElement qti-select-point-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `point`.
 * @attr {string} area-mappings - Editor-specific. JSON array of the scoring areas drawn on the
 * image, each `{ id, shape, coords, mappedValue, defaultValue }` with `shape` one of `circle` or
 * `rect` and `coords` in the image's own pixel space. Serialised to a `qti-area-mapping` in the
 * response declaration on export; defaults to `[]`.
 * @attr {string} correct-response - Answer key held on the element while authoring. `x y`
 * integer coordinates in the image's own pixel space, space inside the point and comma between
 * points (`100 150,220 340`). Most point items score by area rather than exact pixel — prefer
 * `area-mappings`. Converted to and from `qti-correct-response` on import/export.
 */
export class QtiSelectPointInteractionEdit extends Interaction {
  static override styles = styles;

  @property({ type: String, attribute: 'area-mappings' })
  areaMappings = '[]';

  @state()
  private _cursorInside = false;

  @state()
  drawMode: DrawMode = 'select';

  @state()
  imageReady = false;

  @state()
  imageSrc: string | null = null;

  @state()
  imageAlt: string | null = null;

  @state()
  imageWidth: number | null = null;

  @state()
  imageHeight: number | null = null;

  @state()
  areaEntries: AreaMappingEntry[] = [];

  @state()
  draft: DraftShape | null = null;

  @state()
  sourceError: string | null = null;

  #imageElement: HTMLImageElement | null = null;
  #dragging = false;
  #activePointerId: number | null = null;
  #shapeDrag: ShapeDragState | null = null;
  #fileInputRef = createRef<HTMLInputElement>();

  private _onSelectionChange = () => {
    const sel = document.getSelection();
    const inside = sel ? this.contains(sel.anchorNode) : false;
    if (inside !== this._cursorInside) {
      this._cursorInside = inside;
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncAreaEntriesFromAttribute();
    document.addEventListener('selectionchange', this._onSelectionChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('selectionchange', this._onSelectionChange);
  }

  override firstUpdated(): void {
    this.#ensureChildSlots();
    this.#syncImageFromDom();
  }

  override updated(changedProperties: Map<string | number | symbol, unknown>): void {
    if (changedProperties.has('areaMappings')) {
      this.#syncAreaEntriesFromAttribute();
    }
  }

  #syncImageFromDom() {
    if (this.#imageElement) {
      this.#imageElement.removeEventListener('load', this.#onImageLoad);
    }

    const image = this.querySelector(':scope > img') as HTMLImageElement | null;

    this.#imageElement = image;

    if (!image) {
      this.imageSrc = null;
      this.imageAlt = null;
      this.imageWidth = null;
      this.imageHeight = null;
      this.imageReady = false;
      return;
    }

    image.addEventListener('load', this.#onImageLoad);

    this.imageSrc = image.getAttribute('src') || null;
    this.imageAlt = image.getAttribute('alt') || null;
    this.imageWidth = this.#parseDimension(image.getAttribute('width'));
    this.imageHeight = this.#parseDimension(image.getAttribute('height'));
    this.imageReady = image.complete && !!this.imageSrc;
  }

  #ensureChildSlots() {
    const prompt = this.querySelector(':scope > qti-prompt');
    if (prompt && prompt.getAttribute('slot') !== 'prompt') {
      prompt.setAttribute('slot', 'prompt');
    }

  }

  #parseDimension(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  #syncAreaEntriesFromAttribute() {
    try {
      const raw = JSON.parse(this.areaMappings || '[]');
      if (!Array.isArray(raw)) {
        this.areaEntries = [];
        return;
      }
      this.areaEntries = raw
        .filter(
          entry => entry && (entry.shape === 'circle' || entry.shape === 'rect') && typeof entry.coords === 'string',
        )
        .map((entry, index) => ({
          id: String(entry.id || `A${index + 1}`),
          shape: entry.shape,
          coords: String(entry.coords),
          mappedValue: Number(entry.mappedValue ?? 1),
          defaultValue: Number(entry.defaultValue ?? 0),
        }));
    } catch {
      this.areaEntries = [];
    }
  }

  #persistAreaEntries(entries: AreaMappingEntry[]) {
    this.areaEntries = entries;
    this.areaMappings = JSON.stringify(entries);
    this.#emitWrapperAttrsChange();
  }

  async #onFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const dataUrl = await readFileAsDataUrl(file);
    await this.#applyImageSource(dataUrl, file.name);

    input.value = '';
  }

  #openFilePicker(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.#fileInputRef.value?.click();
  }

  async #pasteImageFromClipboard(event: Event) {
    event.preventDefault();

    if (!navigator.clipboard?.readText) {
      this.sourceError = 'Clipboard API is unavailable in this context.';
      return;
    }

    const value = (await navigator.clipboard.readText()).trim();
    if (!value) {
      this.sourceError = 'Clipboard does not contain text.';
      return;
    }

    if (!isHttpUrl(value)) {
      this.sourceError = 'Clipboard text is not a valid URL.';
      return;
    }

    await this.#applyImageSource(value, null);
  }

  async #applyImageSource(source: string, fallbackAlt: string | null) {
    try {
      const dimensions = await loadImageSize(source);

      this.imageSrc = source;
      this.imageAlt = this.imageAlt || fallbackAlt || 'image';
      if (!this.imageWidth || !this.imageHeight) {
        this.imageWidth = dimensions.width;
        this.imageHeight = dimensions.height;
      }

      this.imageReady = false;
      this.sourceError = null;
      this.#emitImageAttrsChange();
    } catch {
      this.sourceError = 'Could not load image from that source.';
    }
  }

  #removeImage() {
    this.imageSrc = null;
    this.imageAlt = null;
    this.imageWidth = null;
    this.imageHeight = null;
    this.imageReady = false;
    this.draft = null;
    this.#persistAreaEntries([]);
    this.#emitImageAttrsChange();
  }

  #onImageLoad = (event: Event) => {
    const img = event.currentTarget as HTMLImageElement;
    this.#imageElement = img;
    if (!this.imageWidth || !this.imageHeight) {
      this.imageWidth = img.naturalWidth;
      this.imageHeight = img.naturalHeight;
      this.#emitImageAttrsChange();
    }
    this.imageReady = true;
  };

  #toOriginalCoords(clientX: number, clientY: number): { x: number; y: number } | null {
    const img = this.#imageElement;
    if (!img) return null;

    const rect = img.getBoundingClientRect();
    return clientToImagePoint(rect, clientX, clientY, {
      width: this.imageWidth || img.naturalWidth || rect.width,
      height: this.imageHeight || img.naturalHeight || rect.height,
    });
  }

  #onPointerDown(event: PointerEvent) {
    this._cursorInside = true;
    if (!this.imageReady || !this.imageSrc) return;
    const point = this.#toOriginalCoords(event.clientX, event.clientY);
    if (!point) return;

    if (this.drawMode === 'select') {
      const shapeIndex = this.#findHitShapeIndex(point.x, point.y);
      if (shapeIndex < 0) return;

      const entry = this.areaEntries[shapeIndex];
      const originCoords = parseCoords(entry.coords);
      if (!originCoords) return;

      event.preventDefault();
      event.stopPropagation();

      const surface = event.currentTarget as HTMLElement | null;
      surface?.setPointerCapture(event.pointerId);

      this.#dragging = true;
      this.#activePointerId = event.pointerId;
      this.#shapeDrag = {
        index: shapeIndex,
        startX: point.x,
        startY: point.y,
        originCoords,
        shape: entry.shape,
      };
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const surface = event.currentTarget as HTMLElement | null;
    surface?.setPointerCapture(event.pointerId);

    this.#dragging = true;
    this.#activePointerId = event.pointerId;
    this.draft = {
      shape: this.drawMode,
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    };
  }

  #onPointerMove(event: PointerEvent) {
    if (!this.#dragging || this.#activePointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const point = this.#toOriginalCoords(event.clientX, event.clientY);
    if (!point) return;

    if (this.#shapeDrag) {
      const moved = this.#moveShape(this.#shapeDrag, point.x, point.y);
      if (!moved) return;
      const nextEntries = [...this.areaEntries];
      nextEntries[this.#shapeDrag.index] = moved;
      this.areaEntries = nextEntries;
      return;
    }

    if (!this.draft) return;

    this.draft = {
      ...this.draft,
      currentX: point.x,
      currentY: point.y,
    };
  }

  #onPointerUp(event: PointerEvent) {
    if (!this.#dragging || this.#activePointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const point = this.#toOriginalCoords(event.clientX, event.clientY);

    const surface = event.currentTarget as HTMLElement | null;
    if (surface?.hasPointerCapture(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId);
    }

    this.#dragging = false;
    this.#activePointerId = null;
    if (this.#shapeDrag) {
      this.#shapeDrag = null;
      this.#persistAreaEntries([...this.areaEntries]);
      return;
    }

    if (!this.draft) return;

    if (!point) {
      this.draft = null;
      return;
    }

    const completedDraft: DraftShape = {
      ...this.draft,
      currentX: point.x,
      currentY: point.y,
    };

    const entry = this.#draftToEntry(completedDraft);
    this.draft = null;

    if (!entry) return;
    this.#persistAreaEntries([...this.areaEntries, entry]);
  }

  #onPointerCancel(event: PointerEvent) {
    if (this.#activePointerId !== event.pointerId) return;

    const surface = event.currentTarget as HTMLElement | null;
    if (surface?.hasPointerCapture(event.pointerId)) {
      surface.releasePointerCapture(event.pointerId);
    }

    this.#dragging = false;
    this.#activePointerId = null;
    this.#shapeDrag = null;
    this.draft = null;
  }

  #findHitShapeIndex(x: number, y: number): number {
    for (let i = this.areaEntries.length - 1; i >= 0; i -= 1) {
      const entry = this.areaEntries[i];
      const values = parseCoords(entry.coords);
      if (values && areaContainsPoint(entry.shape, values, { x, y })) return i;
    }
    return -1;
  }

  #moveShape(state: ShapeDragState, x: number, y: number): AreaMappingEntry | null {
    const source = this.areaEntries[state.index];
    if (!source || !isValidArea(state.shape, state.originCoords)) return null;
    return {
      ...source,
      coords: formatCoords(moveAreaCoords(state.shape, state.originCoords, x - state.startX, y - state.startY)),
    };
  }

  #draftToEntry(draft: DraftShape): AreaMappingEntry | null {
    const area = draftToArea(
      draft.shape,
      { x: draft.startX, y: draft.startY },
      { x: draft.currentX, y: draft.currentY },
    );
    if (!area) return null;

    return {
      id: `A${Date.now()}`,
      shape: area.shape,
      coords: formatCoords(area.coords),
      mappedValue: 1,
      defaultValue: 0,
    };
  }

  #renderAreaShape(entry: AreaMappingEntry): TemplateResult | typeof nothing {
    const values = parseCoords(entry.coords);
    return values ? renderAreaShape(entry.shape, values, 'area') : nothing;
  }

  #renderDraft(): TemplateResult | typeof nothing {
    if (!this.draft) return nothing;

    const draftEntry = this.#draftToEntry(this.draft);
    if (!draftEntry) return nothing;

    return this.#renderAreaShape(draftEntry);
  }

  #setDrawMode(mode: DrawMode) {
    this.drawMode = mode;
  }

  #clearMappings() {
    this.#persistAreaEntries([]);
  }

  #emitWrapperAttrsChange() {
    const detail: WrapperAttrsChangeDetail = {
      nodeType: 'qtiSelectPointInteraction',
      tagName: 'qti-select-point-interaction',
      attrs: {
        areaMappings: this.areaMappings ?? '[]',
      },
    };

    this.dispatchEvent(
      new CustomEvent<WrapperAttrsChangeDetail>('qti-prosemirror-node-attrs-change', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  #emitImageAttrsChange() {
    const image = this.querySelector(':scope > img');
    if (!image) return;

    const detail: ImageAttrsChangeDetail = {
      nodeType: 'imgSelectPoint',
      tagName: 'img',
      attrs: {
        imageSrc: this.imageSrc ?? null,
        imageAlt: this.imageAlt ?? null,
        imageWidth: this.imageWidth ?? null,
        imageHeight: this.imageHeight ?? null,
      },
    };

    image.dispatchEvent(
      new CustomEvent<ImageAttrsChangeDetail>('qti-prosemirror-node-attrs-change', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }

  override render() {
    const viewWidth = this.imageWidth || 100;
    const viewHeight = this.imageHeight || 100;

    return html`
      <slot name="prompt"></slot>

      ${this._cursorInside ? html`
        <div class="toolbar" @mousedown=${(e: MouseEvent) => e.preventDefault()}>
          ${this.imageSrc
            ? html`
                <button
                  type="button"
                  aria-pressed=${this.drawMode === 'select'}
                  @click=${() => this.#setDrawMode('select')}
                >
                  Select
                </button>
                <button
                  type="button"
                  aria-pressed=${this.drawMode === 'circle'}
                  @click=${() => this.#setDrawMode('circle')}
                >
                  Circle
                </button>
                <button
                  type="button"
                  aria-pressed=${this.drawMode === 'rect'}
                  @click=${() => this.#setDrawMode('rect')}
                >
                  Rect
                </button>
                <button type="button" class="danger" @click=${this.#clearMappings}>Clear mappings</button>
                <button type="button" class="danger" @click=${this.#removeImage}>Remove image</button>
              `
            : html`
                <button type="button" @click=${this.#pasteImageFromClipboard}>Paste URL</button>
                <button type="button" @click=${this.#openFilePicker}>Upload image</button>
              `}
        </div>
        ${this.sourceError ? html`<p class="meta" style="color:#b91c1c; margin-top:0;">${this.sourceError}</p>` : nothing}
        <div class="meta">Mappings: ${this.areaEntries.length} | mode: ${this.drawMode}</div>
      ` : nothing}

      <input ${ref(this.#fileInputRef)} type="file" accept="image/*" @change=${this.#onFileChange} />

      <div
        class="surface"
        @pointerdown=${this.#onPointerDown}
        @pointermove=${this.#onPointerMove}
        @pointerup=${this.#onPointerUp}
        @pointercancel=${this.#onPointerCancel}
      >
        <slot @slotchange=${this.#syncImageFromDom}></slot>
        ${this.imageSrc
          ? html`<svg viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="none">
              ${this.areaEntries.map(entry => this.#renderAreaShape(entry))} ${this.#renderDraft()}
              </svg>
            `
          : nothing}
      </div>
    `;
  }
}
