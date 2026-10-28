import { html, nothing, svg } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { property, state } from 'lit/decorators.js';

import { Interaction } from '@citolab/prose-qti/components/shared/components/interaction.js';
import { QtiI18nController } from '@citolab/prose-qti/components/shared/i18n/index.js';
import { iterResponseValues, parseResponseAttribute } from '@citolab/prose-qti/components/shared/response/codec.js';
import {
  areaContainsPoint,
  areaHandles,
  clientToImagePoint,
  draftToArea,
  formatCoords,
  isAreaShape,
  moveAreaCoords,
  parseCoords,
  resizeAreaCoords,
  type AreaPoint,
  type AreaShape,
  type AreaSize,
  type DrawableAreaShape,
} from '@citolab/prose-qti/components/shared/graphic/area-geometry.js';
import { renderAreaShape } from '@citolab/prose-qti/components/shared/graphic/area-shape.js';
import { isHttpUrl, loadImageSize, readFileAsDataUrl } from '@citolab/prose-qti/components/shared/graphic/image-source.js';

import {
  QTI_HOTSPOT_CHOICES_EDIT_EVENT,
  type QtiHotspotChoicesEditDetail,
} from '../../extensions/hotspot-choice-editing.js';
import { readObjectFallback, type ImageFallbackPart } from './img-hotspot.schema.js';
import styles from './qti-hotspot-interaction.styles.js';

import type { TemplateResult } from 'lit';

type DrawMode = 'select' | DrawableAreaShape;

/** A `qti-hotspot-choice` as the editor draws it, read from the light-DOM element. */
interface HotspotArea {
  identifier: string;
  shape: AreaShape;
  values: number[];
  element: Element;
}

type Gesture =
  | { kind: 'draw'; shape: DrawableAreaShape; start: AreaPoint; current: AreaPoint }
  | { kind: 'move'; identifier: string; shape: AreaShape; start: AreaPoint; origin: number[] }
  | { kind: 'resize'; identifier: string; shape: AreaShape; handle: string; origin: number[] };

/** Handle size and hit tolerance, in screen pixels. */
const HANDLE_SCREEN_PX = 10;

/** The class ProseMirror puts on the DOM of a node a `NodeSelection` selects. */
const SELECTED_NODE_CLASS = 'ProseMirror-selectednode';

/** The light-DOM children the drawing is made from; mutations anywhere else are not its business. */
const GRAPHIC_CHILDREN = new Set(['qti-hotspot-choice', 'img', 'object']);

/**
 * Editor component for qti-hotspot-interaction — an image with choice regions on it; the candidate
 * selects one or more of them.
 *
 * The regions are the `qti-hotspot-choice` children. The editor hides them and draws them on an SVG
 * layer instead, where the author draws new rects and circles, moves and resizes them, marks them as
 * correct and deletes them. Poly and ellipse regions from an imported item are drawn and can be
 * moved, but not reshaped.
 *
 * Selecting an area selects its choice in ProseMirror (a `NodeSelection`, made by
 * `hotspot-choice-editing.ts`), and a press on the picture elsewhere selects the interaction. Which
 * area is selected is read back from the choice's `ProseMirror-selectednode` class, so it follows
 * the editor's selection wherever that comes from — arrow keys, undo — and ProseMirror's own keys
 * act on it: Delete and Backspace remove it.
 *
 * Marking areas correct works as it does for choice: one marked area makes `max-choices` 1, more
 * make it 0 (unlimited), so a multi-answer hotspot needs no trip to the attributes panel.
 *
 * @customElement qti-hotspot-interaction
 * @attr {string} response-identifier - Required. Identifier of the response variable this
 * interaction is bound to; the response variable has base-type `identifier`.
 * @attr {number} max-choices - Maximum number of hotspots the candidate may select. `1` (the
 * default) is a single-response item, `0` means unlimited.
 * @attr {number} min-choices - Minimum number of hotspots the candidate must select before the
 * interaction counts as answered.
 * @attr {string} correct-response - Answer key held on the element while authoring. The
 * `identifier` of each correct `qti-hotspot-choice`, comma-separated (`A,C`); order is not
 * significant. Converted to and from `qti-correct-response` on import/export.
 */
export class QtiHotspotInteractionEdit extends Interaction {
  static override styles = styles;

  @property({ type: Number, attribute: 'max-choices' })
  maxChoices = 1;

  @property({ type: Number, attribute: 'min-choices' })
  minChoices = 0;

  @state() private _cursorInside = false;
  @state() private _drawMode: DrawMode = 'select';
  @state() private _areas: HotspotArea[] = [];
  @state() private _selected: string | null = null;
  @state() private _gesture: Gesture | null = null;
  /** Coords of the area being moved or resized, until the gesture ends and the document has them. */
  @state() private _preview: { identifier: string; values: number[] } | null = null;
  @state() private _imageSrc: string | null = null;
  @state() private _imageSize: AreaSize | null = null;
  @state() private _notice: string | null = null;

  readonly #i18n = new QtiI18nController(this);
  #image: HTMLImageElement | HTMLObjectElement | null = null;
  #pointerId: number | null = null;
  #childObserver: MutationObserver | null = null;
  #attributeObserver: MutationObserver | null = null;
  #fileInput = createRef<HTMLInputElement>();

  /**
   * The toolbar shows while the author works in this interaction: the caret is in it (its prompt),
   * one of its areas is selected, or the interaction itself is (a `NodeSelection` puts the DOM
   * selection beside the node, not in it, so only the class says so).
   */
  #onSelectionChange = () => {
    const selection = document.getSelection();
    const inside =
      (selection ? this.contains(selection.anchorNode) : false) || this.closest(`.${SELECTED_NODE_CLASS}`) != null;
    if (inside !== this._cursorInside) this._cursorInside = inside;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('selectionchange', this.#onSelectionChange);
    // ProseMirror adds and removes choice elements as choices come and go, and replaces one whenever
    // its attributes change; it toggles the selected class in place. The drawing follows the
    // picture and the choices only, so a keystroke in the prompt does not rebuild it.
    const sync = () => {
      this.#syncAreas();
      this.#syncImage();
    };
    this.#childObserver = new MutationObserver(sync);
    this.#childObserver.observe(this, { childList: true });
    this.#attributeObserver = new MutationObserver(records => {
      if (records.some(record => this.#isGraphicChild(record.target))) sync();
    });
    this.#attributeObserver.observe(this, {
      subtree: true,
      attributes: true,
      attributeFilter: ['identifier', 'shape', 'coords', 'src', 'data', 'width', 'height', 'class'],
    });
    this.#syncAreas();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('selectionchange', this.#onSelectionChange);
    this.#childObserver?.disconnect();
    this.#childObserver = null;
    this.#attributeObserver?.disconnect();
    this.#attributeObserver = null;
    this.#image?.removeEventListener('load', this.#onImageLoad);
    this.#image = null;
  }

  #isGraphicChild(node: Node): boolean {
    return node instanceof Element && node.parentElement === this && GRAPHIC_CHILDREN.has(node.localName);
  }

  override firstUpdated(): void {
    const prompt = this.querySelector(':scope > qti-prompt');
    if (prompt && prompt.getAttribute('slot') !== 'prompt') prompt.setAttribute('slot', 'prompt');
    this.#syncImage();
  }

  get #correct(): string[] {
    return Array.from(iterResponseValues(this.correctResponse));
  }

  #syncAreas() {
    this._areas = Array.from(this.querySelectorAll(':scope > qti-hotspot-choice')).flatMap(element => {
      const shape = element.getAttribute('shape');
      const values = parseCoords(element.getAttribute('coords'));
      const identifier = element.getAttribute('identifier');
      if (!identifier || !isAreaShape(shape) || !values) return [];
      return [{ identifier, shape, values, element }];
    });
    this._selected = this._areas.find(area => area.element.classList.contains(SELECTED_NODE_CLASS))?.identifier ?? null;
  }

  #syncImage() {
    const image = this.querySelector<HTMLImageElement | HTMLObjectElement>(':scope > img, :scope > object');
    if (image !== this.#image) {
      this.#image?.removeEventListener('load', this.#onImageLoad);
      image?.addEventListener('load', this.#onImageLoad);
      this.#image = image;
    }

    const src = image ? image.getAttribute(image.localName === 'object' ? 'data' : 'src') : null;
    if (src !== this._imageSrc) {
      this._imageSrc = src;
      this._imageSize = null;
    }
    void this.#resolveImageSize();
  }

  #onImageLoad = () => {
    void this.#resolveImageSize();
  };

  /**
   * The coordinate space `coords` are measured in: the picture's `width` / `height` attributes when
   * they give pixels, otherwise its intrinsic size. The same rule the runtime positions hotspots by.
   */
  async #resolveImageSize() {
    const image = this.#image;
    const src = this._imageSrc;
    if (!image || !src) return;

    const width = pixelLength(image.getAttribute('width'));
    const height = pixelLength(image.getAttribute('height'));
    if (width && height) {
      this.#setImageSize({ width, height });
      return;
    }

    if (image instanceof HTMLImageElement) {
      if (image.naturalWidth > 0) this.#setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      return;
    }

    try {
      const size = await loadImageSize(src);
      if (this._imageSrc === src) this.#setImageSize(size);
    } catch {
      // No size, no drawing; the image itself still shows.
    }
  }

  #setImageSize(size: AreaSize) {
    if (this._imageSize?.width !== size.width || this._imageSize?.height !== size.height) this._imageSize = size;
  }

  #toImagePoint(event: PointerEvent): AreaPoint | null {
    if (!this.#image || !this._imageSize) return null;
    return clientToImagePoint(this.#image.getBoundingClientRect(), event.clientX, event.clientY, this._imageSize);
  }

  /** Image pixels per screen pixel, for sizing handles and their hit area. */
  #imageScale(): number {
    const box = this.#image?.getBoundingClientRect();
    if (!box?.width || !this._imageSize) return 1;
    return this._imageSize.width / box.width;
  }

  #valuesOf(area: HotspotArea): number[] {
    return this._preview?.identifier === area.identifier ? this._preview.values : area.values;
  }

  #areaAt(point: AreaPoint): HotspotArea | null {
    // Topmost first; `default` covers the whole picture, so it only wins where nothing else is.
    const hits = [...this._areas].reverse().filter(area => areaContainsPoint(area.shape, area.values, point));
    return hits.find(area => area.shape !== 'default') ?? hits[0] ?? null;
  }

  #handleAt(point: AreaPoint): { area: HotspotArea; handle: string } | null {
    const area = this._areas.find(candidate => candidate.identifier === this._selected);
    if (!area) return null;
    const tolerance = HANDLE_SCREEN_PX * this.#imageScale();
    const handle = areaHandles(area.shape, area.values).find(
      candidate => Math.abs(candidate.x - point.x) <= tolerance && Math.abs(candidate.y - point.y) <= tolerance,
    );
    return handle ? { area, handle: handle.id } : null;
  }

  #onPointerDown(event: PointerEvent) {
    this._cursorInside = true;
    const point = this.#toImagePoint(event);
    if (!point) return;

    // The picture is the drawing surface, not text: ProseMirror would turn a press on it into a
    // selection somewhere nearby. The selection is made here instead, on what was pressed — the area,
    // or the interaction when that is none — so the keys and the attributes panel act on it.
    event.preventDefault();
    event.stopPropagation();

    let gesture: Gesture | null = null;
    if (this._drawMode !== 'select') {
      this.#select(null);
      gesture = { kind: 'draw', shape: this._drawMode, start: point, current: point };
    } else {
      const handle = this.#handleAt(point);
      const area = handle?.area ?? this.#areaAt(point);
      this.#select(area?.identifier ?? null);
      this._notice = null;
      if (handle) {
        gesture = { kind: 'resize', identifier: handle.area.identifier, shape: handle.area.shape, handle: handle.handle, origin: handle.area.values };
      } else if (area) {
        gesture = { kind: 'move', identifier: area.identifier, shape: area.shape, start: point, origin: area.values };
      }
    }
    if (!gesture) return;

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.#pointerId = event.pointerId;
    this._gesture = gesture;
  }

  #onPointerMove(event: PointerEvent) {
    const gesture = this._gesture;
    if (!gesture || event.pointerId !== this.#pointerId) return;
    event.preventDefault();
    const point = this.#toImagePoint(event);
    if (!point) return;

    if (gesture.kind === 'draw') {
      this._gesture = { ...gesture, current: point };
    } else if (gesture.kind === 'move') {
      const values = moveAreaCoords(gesture.shape, gesture.origin, point.x - gesture.start.x, point.y - gesture.start.y, this._imageSize ?? undefined);
      this._preview = { identifier: gesture.identifier, values };
    } else {
      this._preview = { identifier: gesture.identifier, values: resizeAreaCoords(gesture.shape, gesture.origin, gesture.handle, point) };
    }
  }

  #onPointerUp(event: PointerEvent) {
    const gesture = this._gesture;
    if (!gesture || event.pointerId !== this.#pointerId) return;
    event.preventDefault();
    this.#endGesture(event);

    if (gesture.kind === 'draw') {
      const area = draftToArea(gesture.shape, gesture.start, this.#toImagePoint(event) ?? gesture.current);
      if (!area) return;
      this.#requestEdit({ op: 'add', shape: area.shape, coords: formatCoords(area.coords) });
      return;
    }

    const preview = this._preview;
    this._preview = null;
    const area = this._areas.find(candidate => candidate.identifier === gesture.identifier);
    if (!preview || !area || formatCoords(preview.values) === formatCoords(area.values)) return;
    this.#emitAttrs(area.element, 'qtiHotspotChoice', 'qti-hotspot-choice', { coords: formatCoords(preview.values) });
  }

  #onPointerCancel(event: PointerEvent) {
    if (event.pointerId !== this.#pointerId) return;
    this.#endGesture(event);
    this._preview = null;
  }

  #endGesture(event: PointerEvent) {
    const surface = event.currentTarget as HTMLElement;
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    this.#pointerId = null;
    this._gesture = null;
  }

  /**
   * Mark or unmark an area as correct. As for choice, `max-choices` follows the number of correct
   * areas — 1 for one, 0 (unlimited) for more — so marking a second area adds it to the answer key.
   */
  #toggleCorrect(identifier: string) {
    const correct = this.#correct;
    const next = correct.includes(identifier)
      ? correct.filter(candidate => candidate !== identifier)
      : [...correct, identifier];
    this._notice = null;
    this.#emitAttrs(this, 'qtiHotspotInteraction', 'qti-hotspot-interaction', {
      correctResponse: parseResponseAttribute(next.join(',')),
      maxChoices: next.length <= 1 ? 1 : 0,
    });
  }

  #deleteSelected() {
    if (!this._selected) return;
    this.#requestEdit({ op: 'remove', identifier: this._selected });
  }

  /** Select an area in ProseMirror, or with `null` the interaction; shown at once, confirmed by the class. */
  #select(identifier: string | null) {
    this._selected = identifier;
    this.#requestEdit({ op: 'select', identifier });
  }

  /**
   * Ask `hotspot-choice-editing.ts` for an edit. It applies it synchronously, so the area selected
   * afterwards — a newly added one, for `add` — can be read straight back; that is what is returned.
   */
  #requestEdit(detail: QtiHotspotChoicesEditDetail): string | null {
    this.dispatchEvent(
      new CustomEvent<QtiHotspotChoicesEditDetail>(QTI_HOTSPOT_CHOICES_EDIT_EVENT, { detail, bubbles: true, composed: true }),
    );
    return this.querySelector(`:scope > qti-hotspot-choice.${SELECTED_NODE_CLASS}`)?.getAttribute('identifier') ?? null;
  }

  #emitAttrs(target: Element, nodeType: string, tagName: string, attrs: Record<string, unknown>) {
    target.dispatchEvent(
      new CustomEvent('qti-prosemirror-node-attrs-change', {
        detail: { nodeType, tagName, attrs },
        bubbles: true,
        composed: true,
      }),
    );
  }

  async #onFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await this.#applyImageSource(await readFileAsDataUrl(file), file.name);
    input.value = '';
  }

  async #pasteImageUrl() {
    if (!navigator.clipboard?.readText) {
      this._notice = this.#i18n.t('hotspot.error.clipboardUnavailable');
      return;
    }
    const value = (await navigator.clipboard.readText()).trim();
    if (!isHttpUrl(value)) {
      this._notice = this.#i18n.t('hotspot.error.invalidUrl');
      return;
    }
    await this.#applyImageSource(value, null);
  }

  /**
   * Point the picture at a new source. An existing `width` / `height` is kept, so the choices stay
   * where they are relative to the picture; only a picture without them takes the new one's size.
   */
  async #applyImageSource(source: string, fallbackAlt: string | null) {
    const image = this.#image;
    if (!image) return;
    try {
      const size = await loadImageSize(source);
      const hasSize = pixelLength(image.getAttribute('width')) && pixelLength(image.getAttribute('height'));
      this._notice = null;
      this.#emitAttrs(image, 'imgHotspot', image.localName, {
        imageSrc: source,
        ...(image.localName === 'object'
          ? { imageFallback: fallbackForNewSource(image, fallbackAlt) }
          : { imageAlt: image.getAttribute('alt') || fallbackAlt }),
        // An `<object>` keeps its tag; its old `type` may no longer describe the new picture.
        imageType: null,
        ...(hasSize ? {} : { imageWidth: String(size.width), imageHeight: String(size.height) }),
      });
    } catch {
      this._notice = this.#i18n.t('hotspot.error.loadFailed');
    }
  }

  #renderShape(shape: AreaShape, values: number[], className: string, size: AreaSize): TemplateResult | typeof nothing {
    return renderAreaShape(shape, values, className, size);
  }

  #renderAreas(size: AreaSize) {
    const correct = new Set(this.#correct);
    const handleSize = HANDLE_SCREEN_PX * this.#imageScale();
    const gesture = this._gesture;
    const draft = gesture?.kind === 'draw' ? draftToArea(gesture.shape, gesture.start, gesture.current) : null;

    return svg`
      ${this._areas.map((area, index) => {
        const classes = ['area'];
        if (correct.has(area.identifier)) classes.push('area--correct');
        if (area.identifier === this._selected) classes.push('area--selected');
        return svg`<g data-identifier=${area.identifier}>
          <title>${this.#i18n.t('hotspot.areaLabel', { number: index + 1 })}</title>
          ${this.#renderShape(area.shape, this.#valuesOf(area), classes.join(' '), size)}
        </g>`;
      })}
      ${this.#selectedHandles().map(
        handle => svg`<rect class="handle" x=${handle.x - handleSize / 2} y=${handle.y - handleSize / 2} width=${handleSize} height=${handleSize}></rect>`,
      )}
      ${draft ? this.#renderShape(draft.shape, draft.coords, 'area area--draft', size) : nothing}
    `;
  }

  #selectedHandles() {
    const area = this._areas.find(candidate => candidate.identifier === this._selected);
    return area ? areaHandles(area.shape, this.#valuesOf(area)) : [];
  }

  #renderToolbar() {
    const t = (key: string, params?: Record<string, string | number>) => this.#i18n.t(key, params);
    const selected = this._areas.find(area => area.identifier === this._selected);
    const isCorrect = selected ? this.#correct.includes(selected.identifier) : false;
    const mode = (value: DrawMode, label: string) => html`
      <button type="button" aria-pressed=${this._drawMode === value} @click=${() => (this._drawMode = value)}>${label}</button>
    `;

    return html`
      <div class="toolbar" @mousedown=${(event: MouseEvent) => event.preventDefault()}>
        ${this._imageSrc
          ? html`
              ${mode('select', t('hotspot.mode.select'))} ${mode('circle', t('hotspot.mode.circle'))}
              ${mode('rect', t('hotspot.mode.rect'))}
              ${selected
                ? html`
                    <span class="separator"></span>
                    <button type="button" aria-pressed=${isCorrect} @click=${() => this.#toggleCorrect(selected.identifier)}>
                      ${t(isCorrect ? 'hotspot.unmarkCorrect' : 'hotspot.markCorrect')}
                    </button>
                    <button type="button" class="danger" @click=${() => this.#deleteSelected()}>${t('hotspot.deleteArea')}</button>
                  `
                : nothing}
              <span class="separator"></span>
            `
          : nothing}
        <button type="button" @click=${() => this.#pasteImageUrl()}>${t('hotspot.pasteUrl')}</button>
        <button type="button" @click=${() => this.#fileInput.value?.click()}>
          ${t(this._imageSrc ? 'hotspot.replaceImage' : 'hotspot.uploadImage')}
        </button>
      </div>
      ${this._notice ? html`<div class="meta meta--warning" role="alert">${this._notice}</div>` : nothing}
      ${this.maxChoices > 0 && this.#correct.length > this.maxChoices
        ? html`<div class="meta meta--warning" role="alert">
            ${t('hotspot.overMaxChoices', { max: this.maxChoices, count: this.#correct.length })}
          </div>`
        : nothing}
      <div class="meta">
        ${this._imageSrc
          ? t('hotspot.summary', { count: this._areas.length, correct: this.#correct.length })
          : t('hotspot.noImage')}
      </div>
    `;
  }

  override render() {
    const size = this._imageSize;
    return html`
      <slot name="prompt"></slot>
      ${this._cursorInside ? this.#renderToolbar() : nothing}
      <input ${ref(this.#fileInput)} type="file" accept="image/*" @change=${this.#onFileChange} />
      <div
        class="surface"
        data-mode=${this._drawMode}
        @pointerdown=${this.#onPointerDown}
        @pointermove=${this.#onPointerMove}
        @pointerup=${this.#onPointerUp}
        @pointercancel=${this.#onPointerCancel}
      >
        <slot @slotchange=${() => this.#syncImage()}></slot>
        ${this._imageSrc && size
          ? html`<svg viewBox="0 0 ${size.width} ${size.height}" preserveAspectRatio="none">${this.#renderAreas(size)}</svg>`
          : nothing}
      </div>
    `;
  }
}

/**
 * An `<object>`'s fallback once it shows a different picture: its text stays, a fallback `<img>` of
 * the old picture goes. With no text left, the old fallback image's `alt` — else `fallbackAlt` — is
 * the text.
 */
function fallbackForNewSource(object: Element, fallbackAlt: string | null): ImageFallbackPart[] | null {
  const text = readObjectFallback(object).filter((part): part is string => typeof part === 'string');
  if (text.length > 0) return text;
  const description = object.querySelector(':scope > img')?.getAttribute('alt') || fallbackAlt;
  return description ? [description] : null;
}

/** A `width` / `height` attribute as pixels; a percentage says nothing about the coordinate space. */
function pixelLength(raw: string | null): number | null {
  const value = raw?.trim();
  if (!value || value.endsWith('%')) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
