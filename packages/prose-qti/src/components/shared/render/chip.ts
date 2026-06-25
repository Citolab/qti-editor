import { html, type TemplateResult } from 'lit';

import '../components/qti-fake-drag/register.js';

/**
 * Canonical fake-drag rendered *inside* the drop slot for all four drag-drop
 * interactions (match, gap-match, order, associate). Returns a
 * `<qti-fake-drag part="drag">` custom element; visual styling comes from
 * qti-theme via `<host>::part(drag)` selectors (see qti-theme's per-interaction
 * CSS), so the editor preview matches the runtime drag look.
 *
 * Structurally mirrors what qti-components does at runtime: the drag node is
 * a child of the drop slot, not a wrapper around it. The remove × is exposed
 * via `part="chip-remove"`; `<qti-fake-drag>`'s own shadow CSS handles the
 * hover/focus reveal.
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
    <qti-fake-drag
      part="drag"
      .identifier=${identifier}
      .label=${label}
      @fake-drag-remove=${(event: Event) => {
        event.stopPropagation();
        onRemove(event);
      }}
    ></qti-fake-drag>
  `;
}
