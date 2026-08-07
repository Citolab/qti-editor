import { css, type CSSResultGroup } from 'lit';

import externalStyles from '@qti-components/hottext-interaction/styles';

import { editorWhiteSpace } from '../../../shared/styles/white-space.js';

/*
 * The selection menu is editor-only: a small popover offering "make hot text option" over a text
 * selection. It has no runtime counterpart, so there is no upstream rule to inherit — but it is
 * still painted through qti-components' contract rather than with literals, so a brand reaches it
 * for free.
 *
 * qti-theme paints every box with a paint mixin per role, which expands to a per-role override slot
 * falling back to a global token:
 *
 *     background-color: var(--<role>-background-color, var(--qti-component-background-color));
 *     border-width:     var(--<role>-border-width,     var(--qti-component-border-width));
 *     ...
 *
 * PostCSS mixins do not run inside a lit css template, so the two roles used here — "menu" for the
 * popover and "button" for the action — are written out longhand. Same slots, same tokens, same
 * result as the runtime's own menus and buttons.
 *
 * Two bugs this replaces:
 *   - "border: 1px solid var(--qti-border, #e2e8f0)". --qti-border is a SHORTHAND
 *     (thickness + style + colour), so that expanded to "border: 1px solid 1px solid #581d70",
 *     which is invalid and dropped whole — the popover had no border at all. The theme's own usage
 *     is "border: var(--qti-border)".
 *   - the popover was a block box, so the whitespace text nodes lit emits around the button became
 *     line boxes and inflated it to 302x106 for a 228x57 button.
 */
const styles: CSSResultGroup = [
  externalStyles,
  editorWhiteSpace,
  css`
    [part='selection-menu'] {
      position: fixed;
      z-index: 50;

      /* Flex collapses the template whitespace that was inflating the box. */
      display: flex;
      align-items: center;
      gap: var(--qti-spacing, 0.5rem);
      padding: var(--qti-padding-inline);

      /* paint: menu */
      background-color: var(--menu-background-color, var(--qti-component-background-color));
      background-image: var(--menu-background-image, var(--qti-component-background-image));
      border-width: var(--menu-border-width, var(--qti-component-border-width));
      border-style: var(--menu-border-style, var(--qti-component-border-style));
      border-color: var(--menu-border-color, var(--qti-component-border-color));
      border-radius: var(--menu-border-radius, var(--qti-component-border-radius));
      box-shadow: var(--menu-box-shadow, 0 4px 12px rgb(0 0 0 / 15%));
      color: var(--menu-color, var(--qti-component-color));
    }

    [part='selection-action'] {
      padding: var(--qti-padding-box);
      cursor: pointer;
      font: inherit;
      /* A single phrase; without this it wrapped mid-label inside the popover. */
      white-space: nowrap;

      /* paint: button */
      background-color: var(--button-background-color, var(--qti-component-background-color));
      background-image: var(--button-background-image, var(--qti-component-background-image));
      border-width: var(--button-border-width, var(--qti-component-border-width));
      border-style: var(--button-border-style, var(--qti-component-border-style));
      border-color: var(--button-border-color, var(--qti-component-border-color));
      border-radius: var(--button-border-radius, var(--qti-component-border-radius));
      box-shadow: var(--button-box-shadow, var(--qti-component-box-shadow));
      color: var(--button-color, var(--qti-component-color));

      transition: background-color 120ms ease;
    }

    [part='selection-action']:hover {
      background-color: var(--qti-bg-active);
    }

    [part='selection-action']:focus-visible {
      box-shadow: 0 0 0 var(--qti-focus-border-width) var(--qti-focus-color);
      outline: none;
    }
  `,
];

export default styles;
