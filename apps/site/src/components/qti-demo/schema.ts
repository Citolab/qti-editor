/**
 * Landing-page demo schema — the shape the TypeScript Integration guide (`/docs/frameworks/vanilla`)
 * recommends: `createQtiSchema()`, restricted to the two interactions the live demo shows (choice and
 * text entry).
 *
 * Derived rather than restated by hand. The demo used to list the choice and prompt node specs itself
 * on a base of its own, and when #67 made their paragraphs `(text | image)*` that base had no `image`:
 * `new Schema(...)` threw "No node type or group 'image' found" and the demo stopped mounting. The
 * package's own schema carries whatever its node specs name, so the demo follows it.
 */

import { createQtiSchema } from '@citolab/prose-qti/schema';

export const demoSchema = createQtiSchema({
  include: ['qti-choice-interaction', 'qti-text-entry-interaction'],
});
