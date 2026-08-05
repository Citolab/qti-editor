/**
 * The correction state of ONE interaction, published to the elements inside it.
 *
 * "Correction" is the answer key while it is being authored: which drag belongs in which drop. It
 * is deliberately scoped to an interaction rather than the item — two gap-matches on one page each
 * have their own, and an element finds its own by walking up to the nearest provider, which is its
 * own interaction.
 *
 * ## The state is the truth; `correct-response` is its serialization
 *
 * A link is a directed pair, and `correct-response` is nothing but those pairs comma-joined. Making
 * the pairs the state and the attribute the derived form means there is one place that decides what
 * is linked, and the attribute can never say something the state does not. It used to run the other
 * way — the attribute was parsed back into a private map on every change — which is why a link and
 * its rendering could disagree while the two were out of step.
 *
 * The ProseMirror document remains what is *persisted*: the derived value is written back to the
 * node's `correct-response` attribute, so undo, redo and export keep working on the document as
 * before. This context is the live model between those writes, not a second source of truth.
 *
 * ## Why a context rather than the parent reaching in
 *
 * The interaction used to sweep its children on every change — `querySelectorAll`, then set states
 * and labels on each one — which needs a MutationObserver to notice children that ProseMirror
 * added, a cache for their labels, and a re-entrancy guard so the sweep's own DOM writes don't
 * re-trigger it. A consumer subscribes when it connects, so an element ProseMirror creates picks up
 * the current state by existing. None of that machinery has anything to replace it.
 *
 * ## Shape
 *
 * A flat list of links rather than a map, because a drop holds one drag in gap-match but several in
 * match, and a list says both without either interaction having to reshape it.
 */
import { createContext } from '@lit/context';

/** One drag placed in one drop — the same thing a QTI directed pair records. */
export interface CorrectionLink {
  /** Identifier of the drag: a `qti-gap-text`, a source `qti-simple-associable-choice`, … */
  drag: string;
  /** Identifier of the drop: a `qti-gap`, a target choice, an order slot, … */
  drop: string;
}

/** Which side of an interaction an element is on. */
export type CorrectionRole = 'drag' | 'drop';

/**
 * How the interaction is showing its links, which is not the same question as what they are.
 *
 * `chips` — drags look like chips and a drop paints the ones linked into it. `matrix` — the links
 * are a grid of ticks and the choices are its row and column headings.
 *
 * Published because `:state(drag)` and `:state(droppable)` are *presentation* in this codebase, not
 * semantics: qti-theme keys a chip's whole look off them, down to the grip icon. A match interaction
 * in tabular mode has the same links and the same roles as in drag-drop mode, but its choices are
 * headings — painting them as chips there is wrong, and a choice cannot know which it is without
 * being told.
 */
export type CorrectionPresentation = 'chips' | 'matrix';

export interface CorrectionState {
  /** Every link in this interaction, in the order the answer key records them. */
  readonly links: readonly CorrectionLink[];
  /**
   * Which side `identifier` is on, or null when it is neither.
   *
   * Published because an element cannot always answer this about itself. In gap-match the role IS
   * the element type — a `qti-gap-text` is always a drag — but in match both sides are
   * `qti-simple-associable-choice` and the role is decided by which `qti-simple-match-set` it
   * happens to sit in. Only the interaction knows that partitioning, so only the interaction should
   * be reasoning about it.
   */
  roleOf(identifier: string): CorrectionRole | null;
  /** How this interaction is currently showing its links. See {@link CorrectionPresentation}. */
  readonly presentation: CorrectionPresentation;
  /** The drags currently in `drop`. One for gap-match; possibly several for match. */
  dragsIn(drop: string): readonly string[];
  /** The drops `drag` is currently in — empty when it is still only in the pool. */
  dropsOf(drag: string): readonly string[];
  /** The visible words of a drag, so a filled drop can paint its chip without looking it up. */
  labelOf(drag: string): string | undefined;
  /** How many drops a drag may occupy at once; `0` means unlimited. */
  limitOf(drag: string): number;
  /** The drag the author has picked up and not yet placed, if any. */
  readonly pending: string | null;
}

export const correctionContext = createContext<CorrectionState>(Symbol('qti-correction'));

/** `"drag drop,drag drop"` — the canonical `correct-response` form for a directed-pair response. */
export function serializeCorrection(links: readonly CorrectionLink[]): string | null {
  const entries = links
    .filter(link => link.drag && link.drop)
    .map(link => `${link.drag} ${link.drop}`);
  return entries.length > 0 ? entries.join(',') : null;
}

/**
 * Read links back out of a `correct-response` value.
 *
 * Tolerant of the shapes the codec can hand over — the comma-joined string, the array form it
 * returns for multiple entries, and the legacy JSON-array form — and of malformed entries, which
 * are dropped rather than thrown over: a half-authored answer key is a normal state for a document
 * being edited.
 */
export function parseCorrection(raw: string | readonly string[] | null | undefined): CorrectionLink[] {
  const entries: string[] = [];

  if (Array.isArray(raw)) {
    entries.push(...raw.map(entry => String(entry)));
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) entries.push(...parsed.map(entry => String(entry)));
      } catch {
        /* not JSON after all — fall through to the comma form */
      }
    }
    if (entries.length === 0 && trimmed) entries.push(...trimmed.split(','));
  }

  const links: CorrectionLink[] = [];
  for (const entry of entries) {
    const [drag, drop, ...rest] = entry.trim().split(/\s+/);
    if (!drag || !drop || rest.length > 0) continue;
    links.push({ drag, drop });
  }
  return links;
}
