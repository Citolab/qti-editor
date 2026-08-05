/**
 * The chip / drop vocabulary qti-theme and the brand overlays style against.
 *
 * In the runtime these states are a side effect of running the drag machinery: `DragDropCoreMixin`
 * adds `drag` to every element in the drag role set and `droppable` to every drop target. The editor
 * does its own drag handling inside a ProseMirror document and never runs that mixin, so nothing set
 * them — and every rule keyed on them missed. That is the whole reason an editor chip looked
 * different from a runtime one:
 *
 *   - qti-theme hangs the grip off `<interaction> :state(drag)::part(control)::before`, so an
 *     unmarked chip had no drag handle at all.
 *   - a brand overlay sets its `--drag-*` on `:state(drag)` (see kennisnet.css), so an unmarked chip
 *     fell back to the neutral `@mixin drag` box — no brand colour, and for associate no border.
 *
 * States rather than attributes, and that is required rather than stylistic: these elements are
 * ProseMirror-managed nodes, PM's DOMObserver runs with `attributes: true`, and it reverts any
 * attribute outside its schema — the revert then re-triggers whatever wrote it. An
 * `ElementInternals` custom state is invisible to a mutation observer, so it is the only marker this
 * side can carry. It is also exactly what the runtime settled on for the same reason.
 *
 * Add-only and idempotent: in the editor a chip is a chip for its whole life, so there is no state
 * to take away, and calling this again on every sync costs a set membership check.
 */

const statesOf = (el: Element): CustomStateSet | undefined =>
  (el as Element & { internals?: ElementInternals }).internals?.states;

/** Mark the draggable chips — the bank items an author picks up. */
export function markChips(chips: Iterable<Element>): void {
  for (const chip of chips) statesOf(chip)?.add('drag');
}

/**
 * Mark the drop targets.
 *
 * Only custom elements can carry this: `attachInternals()` throws on a plain `<div>`, which is what
 * order's `<drop-list>` and associate's `<div part="drop">` are. Those two are reached as
 * `::part(drop)` from their own interaction instead, which is the hook they already use — so this is
 * a no-op for them by construction, not an oversight.
 */
export function markDroppables(droppables: Iterable<Element>): void {
  for (const droppable of droppables) statesOf(droppable)?.add('droppable');
}

/**
 * Add or remove one custom state.
 *
 * Unlike {@link markChips} and {@link markDroppables} — which classify an element for its whole
 * life — the states an element derives from the interaction's correction state come and go, so
 * these need taking away as well as putting on. `CustomStateSet` has no `toggle` in the DOM lib
 * this project builds against, hence the pair of calls.
 */
export function toggleState(states: CustomStateSet | undefined, name: string, on: boolean): void {
  if (!states) return;
  if (on) states.add(name);
  else states.delete(name);
}
