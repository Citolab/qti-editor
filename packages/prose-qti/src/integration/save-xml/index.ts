/**
 * Save XML — prosekit wrapper
 *
 * Thin re-export of @qti-editor/qti-item-export/pm-xml. With the schema using
 * standard `bullet_list / ordered_list / list_item` nodes, the default
 * DOMSerializer produces valid `<ul><li>…</li></ul>` / `<ol><li>…</li></ol>`
 * directly — no list-aware serializer needed.
 */

export { xmlFromNode, xmlToHTML } from '@citolab/prose-qti/item-export/pm-xml';
