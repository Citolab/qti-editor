/**
 * This editor's notice for what its schema could not represent.
 *
 * The finding comes from `findUnrepresentableElements` (`@citolab/prose-extensions/schema-gaps`);
 * this says it in a page. **It is this app's, not the package's.** The package ships the API — a
 * `SchemaGapOutcome` whose changes carry a `kind`, a `code`, the tag name and an excerpt of the
 * author's own text — and deliberately ships no renderer, because the shape of the answer is the
 * consumer's call: a banner here, a log line elsewhere, a row in an existing panel somewhere else.
 * `qti-editor-full-assessment` makes the opposite choice and renders the same data through React and
 * i18next.
 *
 * Framework-free on purpose even so: `document.createElement`, no Lit, no template library, because
 * this app has none. It renders into a host element the caller owns.
 *
 * Styling is `./schema-gap-notice.css`, keyed on classes this function applies itself rather than on
 * an element id, so it carries no assumption about where in the layout the notice sits. Positioning
 * is the caller's business.
 */

import type { SchemaGapChange, SchemaGapOutcome } from '@citolab/prose-extensions/schema-gaps';

/** Class names this notice applies, exported so a host can target or restyle them. */
export const SCHEMA_GAP_NOTICE_CLASS = 'pm-schema-gap-notice';
export const SCHEMA_GAP_NOTICE_HEADING_CLASS = 'pm-schema-gap-notice-heading';
export const SCHEMA_GAP_NOTICE_QUOTE_CLASS = 'pm-schema-gap-notice-quote';

/**
 * Every word this notice can say, so none of them are welded into it.
 *
 * A plain object rather than an i18n library because a package cannot pick one for its hosts. Pass a
 * partial: anything left out keeps the built-in English.
 *
 * `heading` is a function of the count rather than a template with a placeholder, because languages
 * disagree about how a number changes a sentence and a placeholder settles that on the translator's
 * behalf.
 */
export interface SchemaGapNoticeMessages {
  heading?: (count: number) => string;
  /** Appended after the tag name when the same element type was dropped more than once. */
  occurrences?: (count: number) => string;
  /** Wraps the quoted text from the dropped element. */
  quote?: (excerpt: string) => string;
}

const DEFAULT_MESSAGES: Required<SchemaGapNoticeMessages> = {
  heading: count => (count === 1
    ? 'This editor cannot represent 1 element in this item. Its content was kept; the element itself was not.'
    : `This editor cannot represent ${count} elements in this item. Their content was kept; the elements themselves were not.`),
  occurrences: count => ` × ${count}`,
  quote: excerpt => ` — “${excerpt}”`,
};

export interface RenderSchemaGapNoticeOptions {
  messages?: SchemaGapNoticeMessages;
}

/**
 * Renders the notice into `host`, or empties and hides it when there is nothing to report.
 *
 * Sets `host.hidden` either way, so a caller can render unconditionally on every load and never has
 * to ask whether there is news.
 */
export function renderSchemaGapNotice(
  host: HTMLElement,
  outcome: SchemaGapOutcome,
  options: RenderSchemaGapNoticeOptions = {},
): void {
  const messages = { ...DEFAULT_MESSAGES, ...options.messages };
  host.textContent = '';
  host.classList.add(SCHEMA_GAP_NOTICE_CLASS);

  const findings = groupByTag(outcome);
  host.hidden = findings.length === 0;
  if (!findings.length) return;

  const heading = document.createElement('p');
  heading.className = SCHEMA_GAP_NOTICE_HEADING_CLASS;
  heading.textContent = messages.heading(outcome.changes.length);
  host.appendChild(heading);

  const list = document.createElement('ul');
  for (const finding of findings) {
    const item = document.createElement('li');

    const name = document.createElement('code');
    name.textContent = `<${finding.tagName}>`;
    item.appendChild(name);

    if (finding.count > 1) item.append(messages.occurrences(finding.count));
    if (finding.excerpt) {
      const quote = document.createElement('span');
      quote.className = SCHEMA_GAP_NOTICE_QUOTE_CLASS;
      quote.textContent = messages.quote(finding.excerpt);
      item.appendChild(quote);
    }

    list.appendChild(item);
  }
  host.appendChild(list);
}

interface TagFinding {
  tagName: string;
  count: number;
  /** The first quotable text under any element of this type — enough to locate it in the source. */
  excerpt?: string;
}

/**
 * One line per element type, not per element.
 *
 * An item body with thirty `<span>`s the schema cannot hold would otherwise produce thirty identical
 * lines, and a notice nobody finishes reading is a notice nobody reads.
 */
function groupByTag(outcome: SchemaGapOutcome): TagFinding[] {
  const byTag = new Map<string, TagFinding>();

  for (const change of outcome.changes) {
    const tagName = change.nodeType ?? 'unknown';
    const excerpt = excerptOf(change);
    const existing = byTag.get(tagName);
    if (existing) {
      existing.count += 1;
      existing.excerpt ??= excerpt;
      continue;
    }
    byTag.set(tagName, { tagName, count: 1, excerpt });
  }

  return [...byTag.values()];
}

function excerptOf(change: SchemaGapChange): string | undefined {
  return typeof change.data?.excerpt === 'string' && change.data.excerpt.length > 0
    ? change.data.excerpt
    : undefined;
}
