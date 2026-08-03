import { html, type TemplateResult } from 'lit';

import '../components/dummy-drag/register.js';

/**
 * Canonical fake-drag rendered *inside* the drop slot for all four drag-drop
 * interactions (match, gap-match, order, associate). Returns a
 * `<dummy-drag part="drag">` custom element; visual styling comes from
 * qti-theme via `<host>::part(drag)` selectors (see qti-theme's per-interaction
 * CSS), so the editor preview matches the runtime drag look.
 *
 * Structurally mirrors what qti-components does at runtime: the drag node is
 * a child of the drop slot, not a wrapper around it. The remove × is exposed
 * via `part="chip-remove"`; `<dummy-drag>`'s own shadow CSS handles the
 * hover/focus reveal.
 *
 * `exportparts` forwards the chip's *inner* parts up one shadow level. `::part()` only reaches one
 * level, and this chip lives inside the drop host's shadow, so without forwarding the theme's
 * `qti-match-interaction ::part(drag-control)::before` rule — the one that draws the grip icon —
 * cannot see it. That is why placed chips were painted but had no grip.
 *
 * `onRemove` is invoked when the × is clicked; the wrapper calls
 * `stopPropagation()` so the host's drop-target click handler doesn't fire.
 */
export function renderEditChip(
  label: string,
  identifier: string,
  onRemove: (event: Event) => void,
): TemplateResult {
  return html`
    <dummy-drag
      part="drag"
      exportparts="drag-control, chip-label, chip-remove"
      .identifier=${identifier}
      .label=${label}
      @dummy-drag-remove=${(event: Event) => {
        event.stopPropagation();
        onRemove(event);
      }}
    ></dummy-drag>
  `;
}
