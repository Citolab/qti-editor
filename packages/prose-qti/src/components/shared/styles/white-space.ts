import { css } from 'lit';

/**
 * The white-space reset, for editor shadow trees.
 *
 * ProseMirror sets `white-space: break-spaces` on `.ProseMirror` so the spaces an author types
 * survive. That property is INHERITED, and inheritance crosses a shadow boundary — so it also lands
 * on the newlines and indentation lit leaves between elements in a component's shadow root. Under
 * `normal` those text nodes collapse to nothing; under `break-spaces` each one becomes a line box.
 *
 * Measured on `qti-hottext-interaction`: three stray text nodes, and a host 181px tall wrapping 60px
 * of content. Emptying them by hand gave 61px. The same cause produced the 302x106 selection-menu
 * popover around a 228x57 button, which `qti-hottext-interaction.styles.ts` solved locally with
 * `display: flex`; this is the general form, and it changes paint rather than layout.
 *
 * Both rules are load-bearing:
 *
 *   - `:host` takes `normal`, which the shadow tree inherits, collapsing the stray nodes.
 *   - `::slotted(*)` puts `break-spaces` back. Slotted content inherits from the host in the LIGHT
 *     tree, so without this the author's typed double spaces silently collapse — measured at 25px
 *     to 21px for "a␣␣b". Descendants of the slotted element inherit from it, so naming the top
 *     level is enough.
 *
 * Naming `break-spaces` outright is safe precisely because these are prose-qti's components: they
 * are the editing variants and only ever render inside a ProseMirror document. The runtime elements
 * in `@qti-components/*` are untouched, and a player — where nothing sets `break-spaces` and forcing
 * it on would start rendering the XML's own indentation — never loads these styles.
 *
 * Applied like {@link boxSizing} in `@qti-components/base`: a reset every shadow tree has to opt
 * into, because a universal rule in the document cannot reach across the boundary.
 */
export const editorWhiteSpace = css`
  :host {
    white-space: normal;
  }

  ::slotted(*) {
    white-space: break-spaces;
  }
`;
