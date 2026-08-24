/**
 * `extraItems` — how a node this package does not own reaches the insert menu.
 *
 * `getInteractionInsertItems` is a hand-written list of the interactions in `@citolab/prose-qti`.
 * `qtiItemDivider` is not one of them; it lives in the prosekit app, so listing it there would mean
 * this package importing from an app. It was in that app's slash menu (also app-local) and missing
 * from the toolbar for exactly that reason.
 *
 * The contract worth pinning is that a contributed entry behaves like a built-in one: appended after
 * them, re-evaluated against the live view rather than captured once, and rendered disabled rather
 * than dropped when it cannot be inserted.
 */
import { createEditor } from 'prosekit/core'
import { describe, expect, test } from 'vitest'
import { defineQtiExtension } from '@citolab/prose-qti/integration/interactions/prosekit'

import './interaction-insert-menu.js'

import type { InteractionInsertItem, QtiInteractionInsertMenu } from './interaction-insert-menu.js'

function mount(extraItems?: QtiInteractionInsertMenu['extraItems']) {
  // `defineQtiExtension` and not `union(defineBasicExtension(), ...)`: it already includes the base,
  // and unioning both adds a second history plugin, which ProseKit rejects outright.
  //
  // The QTI interactions have to be in the schema at all, because `getInteractionInsertItems` gates
  // every entry on its node types existing — against a bare basic schema it contributes nothing and
  // the assertions about ordering against the built-ins would pass vacuously.
  const editor = createEditor({ extension: defineQtiExtension() })
  const host = document.createElement('div')
  document.body.appendChild(host)
  editor.mount(host)

  const menu = document.createElement('qti-interaction-insert-menu') as QtiInteractionInsertMenu
  menu.editor = editor
  if (extraItems) menu.extraItems = extraItems
  document.body.appendChild(menu)

  return {
    menu,
    editor,
    settle: () => menu.updateComplete,
    labels: () =>
      [...menu.querySelectorAll('prosekit-menu-item, prosekit-menu-popup div')]
        .filter(el => el.textContent?.trim() && el.children.length === 0)
        .map(el => el.textContent!.trim()),
    destroy: () => {
      ;(editor as unknown as { view?: { destroy(): void } }).view?.destroy()
      menu.remove()
      host.remove()
    },
  }
}

describe('extraItems', () => {
  test('appends host entries after the built-in ones', async () => {
    const item: InteractionInsertItem = { label: 'Item Separator', canInsert: true, command: () => {} }
    const { settle, labels, destroy } = mount(() => [item])
    try {
      await settle()
      const rendered = labels()

      expect(rendered).toContain('Item Separator')
      expect(rendered.at(-1)).toBe('Item Separator')
      // The built-ins are still there and still first. Asserting presence separately, because
      // `indexOf` returns -1 for a missing label and would satisfy the comparison on its own.
      expect(rendered).toContain('Choice Interaction')
      expect(rendered.indexOf('Choice Interaction')).toBeLessThan(rendered.indexOf('Item Separator'))
    } finally {
      destroy()
    }
  })

  test('is a factory of the view, so a contributed entry is not captured once', async () => {
    let calls = 0
    const { menu, settle, destroy } = mount(view => {
      calls += 1
      // Handed the live view, which is what lets a host compute `canInsert` for the current selection.
      expect(view.state).toBeDefined()
      return []
    })
    try {
      await settle()
      expect(calls).toBeGreaterThan(0)

      const before = calls
      menu.requestUpdate()
      await settle()
      // Re-run on the next render rather than reusing the first answer.
      expect(calls).toBeGreaterThan(before)
    } finally {
      destroy()
    }
  })

  test('renders a contributed entry that cannot be inserted as disabled, not missing', async () => {
    const { settle, labels, menu, destroy } = mount(() => [
      { label: 'Item Separator', canInsert: false, command: () => {} },
    ])
    try {
      await settle()

      // Still listed — the menu greys unavailable entries rather than hiding them, so the set of
      // entries does not shift under the pointer as the selection moves.
      expect(labels()).toContain('Item Separator')
      const asMenuItem = [...menu.querySelectorAll('prosekit-menu-item')].map(el => el.textContent?.trim())
      expect(asMenuItem).not.toContain('Item Separator')
    } finally {
      destroy()
    }
  })

  test('is optional — the menu renders the built-ins with no host entries', async () => {
    const { settle, labels, destroy } = mount()
    try {
      await settle()

      expect(labels()).toContain('Choice Interaction')
      expect(labels()).not.toContain('Item Separator')
    } finally {
      destroy()
    }
  })
})
