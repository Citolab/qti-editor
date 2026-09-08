/**
 * The editor schema — the package's, not a local restatement of it.
 *
 * This file used to spell out the whole topology: every interaction's NodeSpec imported one by one,
 * every `content` and `group` restated inline, 139 lines of it. The comment at the top said that
 * was the point — "the entire document topology is visible in this file" — and that reasoning was
 * sound while the package shipped only the pieces. It no longer does. `createQtiSchema()` composes
 * exactly this: the QTI basics, lists, tables with `richtext` cell content, and every registered
 * interaction, with `doc` carrying `identifier` and `title`.
 *
 * What the readability actually cost, since it was not free:
 *
 *   - A restated `content` silently WINS over the package's. `qtiGapMatchInteraction` was relaxed
 *     from `qtiGapText{2,}` to `qtiGapText+` in the package and this app kept the old rule, so
 *     deleting a chip from a two-chip pool left content the schema refused — and ProseMirror
 *     filled it back with a default `qti-gap-text`, identifier and all missing. The editor looked
 *     broken and the package was right the whole time.
 *   - The image node's `width`/`height` parse rule was rebuilt here on top of the plugin's spec.
 *     The package's image node has carried both since it was extended; the local copy was two
 *     answers to one question, and the one that could rot.
 *
 * Reading the topology is still possible, and now has one answer rather than two that can disagree:
 * `createQtiSchema` in @citolab/prose-qti/schema.
 *
 * ## Nothing is composed on top, and that is the point
 *
 * `prosemirror-image-plugin` used to be applied here through `updateImageNode()`, to add its node
 * view and upload placeholder handling. That was filed as an editing-experience concern belonging
 * to this app rather than to the document format, which is sound — but the function is not what its
 * name suggests. `updateImageNode` does not extend the `image` spec, it REPLACES it, `parseDOM` and
 * `toDOM` included, with rules for its own `div.imagePluginRoot` wrapper.
 *
 * So the app's schema had no rule matching an `<img>` at all. ProseMirror's `DOMParser` handles an
 * element it has no rule for by skipping it and parsing its children in its place, and an `<img>`
 * has no children — every authored image was dropped on import. Export broke in the same move:
 * `exportItemXml` serializes with `DOMSerializer.fromSchema`, so an inserted image came back out as
 * `<div class="imagePluginRoot" imageplugin-src="…">` inside a `<p>`, which is not valid QTI.
 *
 * Neither failure could reach the schema-gap notice, which is why it went unnoticed for so long:
 * `findUnrepresentableElements` asks whether a node TYPE exists, not whether a parse rule reaches
 * it, and `image` existed the whole time. Silently unparseable is the one class of loss that notice
 * is blind to.
 *
 * The trade was a file picker and drag/paste upload against losing the author's images, so the
 * plugin was removed rather than patched. The package's `image` node already models
 * `src`/`alt`/`title`/`width`/`height` and roundtrips `<img>` faithfully, which is all this app
 * needs. A host that does want uploads must re-add the plugin AND restore the QTI `parseDOM`/`toDOM`
 * over its rewrite — never take `updateImageNode`'s output as-is.
 */

import { createQtiSchema } from '@citolab/prose-qti/schema';

export const appSchema = createQtiSchema();
