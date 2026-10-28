import type { DOMOutputSpec, NodeSpec, Node as ProseMirrorNode, TagParseRule } from 'prosemirror-model';

/**
 * A table's `<caption>`, kept as an attribute of the table node.
 *
 * ## Why an attribute, not a child node
 *
 * prosemirror-tables reads every child of a `tableRole: 'table'` node as a row: `TableMap` walks
 * `table.child(i)` and treats each one as a `tr`. A caption child node would break every table
 * command. So the caption is the table's own data, and the `<caption>` element is written back from
 * it on serialisation.
 *
 * ## Why the `caption` element is ignored when parsing
 *
 * Without a rule for it, ProseMirror's `DOMParser` does what it does with any element it has no rule
 * for: it skips the tag and parses its content in place. Inside a table, that content is text where
 * a row is expected, so the caption came back as a stray first row. The `ignore` rule skips the
 * element *and* its content; the table rule has already read it into the attribute.
 *
 * ## Plain text only
 *
 * The caption is stored as its text content, whitespace collapsed. Markup inside a caption (an
 * `<em>`, say) is not kept — QTI allows it, but it is rare, and holding it would need a content
 * hole the table node cannot have (see above). `findUnrepresentableElements` (`schema-gaps`)
 * reports each element inside a caption, because the `ignore` rule skips it.
 *
 * ## Not shown while editing
 *
 * `columnResizing`'s `TableView` (ProseKit's `defineTable()` installs it) builds its own table DOM
 * and does not call `toDOM`, so an editor that uses it carries and exports the caption without
 * displaying it. See `docs/testing-findings.md`.
 *
 * ## Use
 *
 * Spread over a table spec. Plain ProseMirror:
 *
 *     table: { ...tableNodes(options).table, ...tableCaptionSpec }
 *
 * ProseKit, as a patch of the table node (its `parseDOM` is concatenated with the original, and
 * the `priority` makes this rule win over the original's attribute-less `table` rule):
 *
 *     defineNodeSpec({ name: 'table', ...tableCaptionSpec })
 *
 * The `toDOM` writes an explicit (empty) attrs object, so ProseKit's `defineNodeAttr` wrapper has
 * somewhere to put attributes of the table's own. prosemirror-tables' `['table', ['tbody', 0]]`
 * has none, and the wrapper then mistakes the `tbody` array for the attrs object.
 */
export const tableCaptionSpec = {
  attrs: {
    caption: { default: null, validate: 'string|null' },
  },
  parseDOM: [
    {
      tag: 'table',
      // Ahead of the default 50, so a host that merges this into an existing table spec (ProseKit
      // concatenates `parseDOM` arrays) reaches this rule before the original attribute-less one.
      priority: 60,
      getAttrs: (element: HTMLElement) => ({ caption: readCaption(element) }),
    },
    { tag: 'caption', ignore: true },
  ] satisfies TagParseRule[],
  toDOM: (node: ProseMirrorNode): DOMOutputSpec => {
    const caption = node.attrs.caption as string | null;
    return caption ? ['table', {}, ['caption', caption], ['tbody', 0]] : ['table', {}, ['tbody', 0]];
  },
} satisfies Pick<NodeSpec, 'attrs' | 'parseDOM' | 'toDOM'>;

/** The text of the table's own `<caption>` (a direct child), or `null` when it has none. */
function readCaption(table: Element): string | null {
  const caption = Array.from(table.children).find(child => child.localName === 'caption');
  const text = caption?.textContent?.replace(/\s+/g, ' ').trim();
  return text || null;
}
