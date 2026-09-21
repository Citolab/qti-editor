/**
 * The inline-choice interaction in isolation: no ProseMirror, no import/export pipeline, just the
 * Lit component embedded mid-sentence — the shape it always has in real content.
 *
 * `item006-qti-inline-choice-interaction.regression.stories.ts` proves the whole roundtrip through
 * an editor; this proves the component's own contract as a piece of running text: it opens and
 * closes as a popover without pulling itself out of the sentence, and the `correct-response`
 * attribute drives what the trigger shows before any pointer ever touches it.
 *
 * `InlineChoiceInTable` below adds a real ProseMirror instance — the actual `tableNodes` +
 * `columnResizing` + `tableEditing` from `prosemirror-tables`, same config `createQtiSchema()`
 * uses, no custom wrapper — with the interaction pre-authored inside a table cell: the scenario
 * 3695525 ("fix: add state to inline choice dropdown to allow it to break out of prosemirror
 * table") exists for.
 *
 * KNOWN BUG, WORKED AROUND HERE, NOT FIXED: mounting this component anywhere other than directly
 * under `doc` (a table cell, a blockquote, anything nested) hangs the tab. Bisected to
 * `shouldAutoSizeMenu()` / `updateMenuWidth()` (`MenuAutoSizeMixin`, from
 * `@qti-components/interactions-core` — published, not this repo, so no local fix without a
 * release) — disabling auto-sizing makes the exact same nested mount, click included, run clean.
 * `InlineChoiceInTable` monkeypatches `shouldAutoSizeMenu()` to `false` on the registered class
 * for this reason ONLY: so the table/popover-escape behaviour this story is actually about stays
 * visually testable without also tripping the unrelated auto-size hang. Auto-sizing itself is not
 * under test here — see `InlineChoiceInSentence` for that. Remove the workaround once the mixin
 * bug is fixed upstream.
 */

import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { expect, userEvent, waitFor } from 'storybook/test';
import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { DOMParser as PMDOMParser, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { columnResizing, tableEditing, tableNodes } from 'prosemirror-tables';
import { EditorView } from 'prosemirror-view';
import { qtiBasicMarks, qtiBasicNodes } from '@citolab/prose-qti';
import { inlineChoiceInteractionDescriptor } from '@citolab/prose-qti/components/inline-choice';

import '@citolab/prose-qti/components/inline-choice/register.js';

// Without the item theme the interaction controls compute to 0x0, so they are invisible to real
// pointer events — see finding #10 in docs/testing-findings.md.
import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
import './kennisnet.css';

import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-tables/style/tables.css';

import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = {
  title: 'QTI Kennisnet/Interactions',
};
export default meta;

export const InlineChoiceInSentence: StoryObj = {
  render: () => html`
    <p style="font-size: 18px; line-height: 1.7; max-width: 640px; margin: 32px;">
      The migration layer should preserve
      <span id="marker-before">&nbsp;</span>
      <qti-inline-choice-interaction
        response-identifier="RESPONSE_INLINE"
        correct-response="choice-b"
      >
        <qti-inline-choice identifier="choice-a">only visible DOM</qti-inline-choice>
        <qti-inline-choice identifier="choice-b">authoring intent</qti-inline-choice>
        <qti-inline-choice identifier="choice-c">only XML output</qti-inline-choice>
      </qti-inline-choice-interaction>
      <span id="marker-after">&nbsp;</span>
      when legacy content is upgraded.
    </p>
  `,
  play: async ({ canvasElement }) => {
    const interaction = canvasElement.querySelector('qti-inline-choice-interaction');
    expect(interaction).not.toBeNull();

    const trigger = interaction!.shadowRoot?.querySelector<HTMLButtonElement>('button[part="trigger"]');
    const menu = interaction!.shadowRoot?.querySelector<HTMLElement>('[part="menu"]');
    const choices = interaction!.querySelectorAll<HTMLElement & { selected?: boolean }>('qti-inline-choice');

    expect(trigger?.textContent).toContain('authoring intent');
    expect(choices).toHaveLength(3);
    expect(choices[0].selected).toBe(false);
    expect(choices[1].selected).toBe(true);
    expect(choices[2].selected).toBe(false);

    // Regression guard: the interaction used to lay itself out as an in-flow grid item sized by its
    // own menu; it now defers to the popover/anchor-positioning model upstream ships. Either way the
    // HOST must stay an inline-level box, or it stops sitting in the sentence at all.
    expect(getComputedStyle(interaction!).display).toMatch(/^inline/);

    // And it must actually sit on the same line as the words either side of it, not just carry an
    // inline `display` value while something else (e.g. a stray block-level menu row) pushes it down.
    const interactionRect = interaction!.getBoundingClientRect();
    const beforeRect = canvasElement.querySelector('#marker-before')!.getBoundingClientRect();
    const afterRect = canvasElement.querySelector('#marker-after')!.getBoundingClientRect();
    expect(interactionRect.top).toBeLessThan(beforeRect.bottom);
    expect(interactionRect.bottom).toBeGreaterThan(beforeRect.top);
    expect(interactionRect.top).toBeLessThan(afterRect.bottom);
    expect(interactionRect.bottom).toBeGreaterThan(afterRect.top);

    // Closed: menu is in the DOM (it's what the mixin measures) but not the open popover.
    expect(menu).not.toBeNull();
    expect(menu?.matches(':popover-open')).toBe(false);
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    await userEvent.click(trigger!);

    await waitFor(() => {
      expect(interaction!.shadowRoot?.querySelector('[part="menu"]')?.matches(':popover-open')).toBe(true);
      expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    });

    await userEvent.click(trigger!);

    await waitFor(() => {
      expect(interaction!.shadowRoot?.querySelector('[part="menu"]')?.matches(':popover-open')).toBe(false);
      expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    });
  },
};

/**
 * A minimal schema: just enough to hold a table and this one interaction. Not
 * `createRegressionEditor` — that pulls in the full QTI item-body/roundtrip machinery for an XML
 * fixture, which this story has no use for. The doc here is pre-existing content, built once, not
 * imported. `tableGroup`/`cellContent` match `createQtiSchema()`'s own call (see the file header).
 */
function buildTableEditorSchema() {
  return new Schema({
    nodes: {
      ...qtiBasicNodes,
      paragraph: { ...qtiBasicNodes.paragraph, group: 'block richtext' },
      ...tableNodes({ tableGroup: 'block richtext', cellContent: 'richtext+', cellAttributes: {} }),
      qtiInlineChoiceInteraction: inlineChoiceInteractionDescriptor.nodeSpecs.find(
        n => n.name === 'qtiInlineChoiceInteraction',
      )!.spec,
      qtiInlineChoice: inlineChoiceInteractionDescriptor.nodeSpecs.find(n => n.name === 'qtiInlineChoice')!.spec,
    },
    marks: qtiBasicMarks,
  });
}

/** A table cell authored with an inline-choice mid-sentence — the pre-existing content itself. */
const TABLE_WITH_INLINE_CHOICE_HTML = `
  <p>A paragraph above the table, so the table is not the first thing on the page.</p>
  <table>
    <tbody>
      <tr>
        <td>
          <p>
            The reaction runs
            <qti-inline-choice-interaction response-identifier="RESPONSE_INLINE" correct-response="choice-b">
              <qti-inline-choice identifier="choice-a">slower</qti-inline-choice>
              <qti-inline-choice identifier="choice-b">faster</qti-inline-choice>
              <qti-inline-choice identifier="choice-c">the same</qti-inline-choice>
            </qti-inline-choice-interaction>
            at higher temperature.
          </p>
        </td>
        <td><p>A second cell, just so the table has more than one column.</p></td>
      </tr>
    </tbody>
  </table>
`;

function mountTableEditor(container: HTMLElement): EditorView {
  /*
   * WORKAROUND for the known MenuAutoSizeMixin hang (see file header) — not a fix, and not part of
   * what this story tests. Scoped to the class prototype rather than a per-instance override
   * because there's no seam to reach an instance before ProseMirror constructs it from the parsed
   * doc. Safe to do here only: this mutates the registered class for the lifetime of this
   * Storybook tab, which is exactly the throwaway scope a manual/visual check needs.
   */
  (customElements.get('qti-inline-choice-interaction') as unknown as { prototype: { shouldAutoSizeMenu(): boolean } })
    .prototype.shouldAutoSizeMenu = () => false;

  const schema = buildTableEditorSchema();

  const dom = new window.DOMParser()
    .parseFromString(`<div>${TABLE_WITH_INLINE_CHOICE_HTML}</div>`, 'text/html')
    .querySelector('div')!;
  const doc = PMDOMParser.fromSchema(schema).parse(dom);

  const plugins = [
    history(),
    keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo }),
    keymap(baseKeymap),
    columnResizing(),
    tableEditing(),
    ...(inlineChoiceInteractionDescriptor.pluginFactories ?? []).map(factory => factory()),
  ];

  const view = new EditorView(container, {
    state: EditorState.create({ doc, schema, plugins }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    },
  });
  return view;
}

export const InlineChoiceInTable: StoryObj = {
  render: () => html`
    <div
      class="editor-container"
      style="max-width: 640px; margin: 32px; font-size: 16px; line-height: 1.6;"
      ${ref(el => {
        if (el) mountTableEditor(el as HTMLElement);
      })}
    ></div>
  `,
  play: async ({ canvasElement }) => {
    const table = canvasElement.querySelector('table');
    expect(table).not.toBeNull();

    const interaction = canvasElement.querySelector('qti-inline-choice-interaction');
    expect(interaction).not.toBeNull();
    // Still inline content in the ProseMirror doc sense, sitting inside the cell's paragraph, not
    // hoisted next to the table by the schema.
    expect(interaction!.closest('td')).not.toBeNull();

    const trigger = interaction!.shadowRoot?.querySelector<HTMLButtonElement>('button[part="trigger"]');
    expect(trigger?.textContent).toContain('faster');

    const tableRectBeforeOpen = table!.getBoundingClientRect();

    await userEvent.click(trigger!);

    await waitFor(() => {
      const menu = interaction!.shadowRoot?.querySelector<HTMLElement>('[part="menu"]');
      expect(menu?.matches(':popover-open')).toBe(true);
    });

    const menu = interaction!.shadowRoot!.querySelector<HTMLElement>('[part="menu"]')!;
    const menuRect = menu.getBoundingClientRect();

    // The table itself must not have grown to make room — a menu that resized its own table cell
    // would just move the clipping problem rather than solve it.
    expect(table!.getBoundingClientRect().height).toBeCloseTo(tableRectBeforeOpen.height, 0);

    expect(menuRect.height).toBeGreaterThan(0);
    expect(menuRect.width).toBeGreaterThan(0);

    // The actual clipping bug: `.ProseMirror table { overflow: hidden }` (prosemirror-tables/style/
    // tables.css) clips at the table's box, not the cell's — a menu confined to that box lays out
    // normally (getBoundingClientRect wouldn't show it) but paints nothing past the table's edge. The
    // menu's own extent has to reach past the (unchanged) table bottom for this to be a meaningful
    // check at all — three options plus padding comfortably clears one text row.
    expect(menuRect.bottom).toBeGreaterThan(tableRectBeforeOpen.bottom);

    // And the last option specifically — the one an in-flow, table-confined menu would clip first —
    // must sit inside the OPEN POPOVER's own box, i.e. actually painted, not merely present in the
    // DOM. `:popover-open` puts the whole menu in the top layer, which by spec cannot be clipped by
    // an ancestor's `overflow`, so this is the structural guarantee rather than a geometry heuristic.
    expect(menu.matches(':popover-open')).toBe(true);
    const lastOption = interaction!.querySelector('qti-inline-choice[identifier="choice-c"]')!;
    const lastOptionRect = lastOption.getBoundingClientRect();
    expect(lastOptionRect.height).toBeGreaterThan(0);
    expect(lastOptionRect.bottom).toBeGreaterThan(tableRectBeforeOpen.bottom);
  },
};
