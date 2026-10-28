/**
 * Keyboard editing of a selected hotspot area: which keys do what, and the request the plugin in
 * `hotspot-choice-editing.ts` sends to the interaction's component to carry it out.
 *
 * The keys act on ProseMirror's selection. With an area selected (a `NodeSelection` on its
 * `qtiHotspotChoice`), ProseMirror already makes the arrow keys select the next or previous area and
 * Delete / Backspace remove it. Moving and resizing take the keys below. They are only taken while an
 * area is selected, and never stopped: a document-level listener still sees every key.
 *
 *   Alt + arrow keys     move the area 1 px (with Shift: 10 px)
 *   + / −                grow or shrink it 1 px on every side (with Shift: 10 px)
 *   Escape               select the interaction instead (handled by the plugin itself)
 *
 * Plain arrow keys stay ProseMirror's, so the keyboard can reach every area, and leave the
 * interaction, as it does any other node. Ctrl/Cmd are not used: Ctrl/Cmd + / − are the browser's
 * zoom, and Ctrl + arrow keys are taken by macOS (Mission Control, Spaces). Alt + ← / → are Back
 * and Forward in browsers on Windows and Linux; they are taken only while an area is selected.
 *
 * `=` counts as `+` and `_` as `−`: on a US layout they are one key each, with and without Shift,
 * so there `=` is the 1 px step and `+` the 10 px one. The numeric keypad's keys count too.
 */

/** How far a key moves or resizes an area, in image pixels: one step, or with Shift the larger one. */
export const KEY_MOVE_STEP = 1;
export const KEY_SHIFT_STEP = 10;

/** What a key press does to the selected area. */
export type AreaKeyCommand = { kind: 'move'; dx: number; dy: number } | { kind: 'grow'; delta: number };

/** The parts of a `KeyboardEvent` {@link hotspotAreaKeyCommand} reads, so it can be tested without one. */
export interface AreaKeyInput {
  key: string;
  code?: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

/** The command for a key press on a selected area, or `null` for a key that is not one. */
export function hotspotAreaKeyCommand(input: AreaKeyInput): AreaKeyCommand | null {
  if (input.ctrlKey || input.metaKey) return null;
  const step = input.shiftKey ? KEY_SHIFT_STEP : KEY_MOVE_STEP;

  if (input.altKey) {
    switch (input.key) {
      case 'ArrowLeft':
        return { kind: 'move', dx: -step, dy: 0 };
      case 'ArrowRight':
        return { kind: 'move', dx: step, dy: 0 };
      case 'ArrowUp':
        return { kind: 'move', dx: 0, dy: -step };
      case 'ArrowDown':
        return { kind: 'move', dx: 0, dy: step };
      default:
        return null;
    }
  }

  if (input.key === '+' || input.key === '=' || input.code === 'NumpadAdd') return { kind: 'grow', delta: step };
  if (input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract') return { kind: 'grow', delta: -step };
  return null;
}

/**
 * Sent by the plugin to the `qti-hotspot-interaction` element whose area is selected; the component,
 * which knows the picture's coordinate space, applies the command and cancels the event to say it
 * did. Not bubbling: it is for that element only.
 */
export const QTI_HOTSPOT_AREA_KEY_EVENT = 'qti-hotspot-area-key';

export interface QtiHotspotAreaKeyDetail {
  identifier: string;
  command: AreaKeyCommand;
}
