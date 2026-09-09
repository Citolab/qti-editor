import { withHostMessage } from './messages.js';

import type {
  SchemaGapChange,
  SchemaGapFragment,
  SchemaGapMessageOptions,
  SchemaGapOutcome,
} from './types.js';
import type { MarkSpec, NodeSpec, Schema } from 'prosemirror-model';

/**
 * Wrappers whose children *are* the content, so unwrapping them loses nothing a reader would miss.
 *
 * Extend rather than replace when you have wrappers of your own:
 * `ignoreTags: [...TRANSPARENT_WRAPPER_TAGS, 'my-content-body']`.
 */
export const TRANSPARENT_WRAPPER_TAGS: readonly string[] = [
  'qti-content-body',
  'thead',
  'tbody',
  'tfoot',
  'colgroup',
];

export interface FindUnrepresentableOptions extends SchemaGapMessageOptions {
  /** Tag names to pass over — content the host knows is consumed elsewhere rather than lost. */
  ignoreTags?: readonly string[];
  /** Maximum characters of quoted text per finding. */
  excerptLimit?: number;
}

/**
 * Names the elements a schema cannot represent, *before* it parses them.
 *
 * ProseMirror's `DOMParser` is silently lenient: an element no `parseDOM` rule matches is skipped
 * and its children are parsed in its place. That is the right behaviour — losing a wrapper beats
 * losing a document — but it is invisible. Importing markup into an editor whose schema models a
 * subset of it therefore drops content with no error, no warning, and no trace, and the narrower the
 * editor's schema the more it drops.
 *
 * This is the missing half: ask the schema what it can match before handing it the tree, and report
 * what it cannot. Every finding is preserved as the element's own `outerHTML`, so the content exists
 * somewhere even though the document could not hold it.
 *
 * ## Why it does not produce false alarms
 *
 * A finding is raised only when *no* rule's tag selector matches the element — the same test
 * `DOMParser` itself applies, run with the same `matches()` call. Rules narrow further with
 * `getAttrs`, which can reject an element this scan accepted, so the scan can miss a drop; it cannot
 * invent one. Silence is therefore not proof that nothing was lost, but a finding is proof that
 * something was.
 *
 * Style-based mark rules are not considered: they match inline CSS, not elements, and an element
 * carrying only a `style` rule's property still needs a tag rule to be reached at all.
 */
export function findUnrepresentableElements(
  schema: Schema,
  root: Element,
  options: FindUnrepresentableOptions = {},
): SchemaGapOutcome {
  const selectors = tagSelectorsOf(schema);
  const ignored = new Set((options.ignoreTags ?? []).map(tag => tag.toLowerCase()));
  const excerptLimit = options.excerptLimit ?? 60;

  const changes: SchemaGapChange[] = [];
  const preserved: SchemaGapFragment[] = [];

  for (const element of Array.from(root.querySelectorAll('*'))) {
    const tagName = element.localName.toLowerCase();
    if (ignored.has(tagName)) continue;
    if (selectors.some(selector => safeMatches(element, selector))) continue;

    const path = domPath(element, root);
    const excerpt = excerptOfElement(element, excerptLimit);
    const keptChildren = element.children.length;

    preserved.push({
      path,
      reason: `No node or mark in the schema can represent <${tagName}>.`,
      payload: element.outerHTML,
      nodeType: tagName,
    });
    const change: SchemaGapChange = {
      kind: 'unrepresentable-element',
      code: 'UNKNOWN_NODE_PRESERVED',
      severity: 'warning',
      message: keptChildren
        ? `Removed <${tagName}>, which the schema cannot represent, and kept its ${keptChildren} child element(s).`
        : `Removed <${tagName}>, which the schema cannot represent.`,
      path,
      nodeType: tagName,
      data: {
        unwrappedChildren: keptChildren,
        ...(excerpt ? { excerpt } : {}),
      },
    };
    // The built-in English first, the host's wording over the top of it — see
    // `SchemaGapMessageResolver` for why the order matters, and `withHostMessage` for why a resolver
    // that throws costs a translation rather than the scan.
    changes.push(withHostMessage(change, options.getMessage));
  }

  return { changes, preservedFragments: preserved };
}

/** Every tag selector any node or mark in the schema can be parsed from. */
function tagSelectorsOf(schema: Schema): string[] {
  const selectors = new Set<string>();

  const collect = (spec: NodeSpec | MarkSpec) => {
    for (const rule of spec.parseDOM ?? []) {
      if (typeof rule.tag === 'string' && rule.tag.length > 0) selectors.add(rule.tag);
    }
  };

  for (const type of Object.values(schema.nodes)) collect(type.spec);
  for (const type of Object.values(schema.marks)) collect(type.spec);

  return [...selectors];
}

/**
 * `matches` with a guard, because a `parseDOM` rule's tag is not required to be a valid selector —
 * an invalid one throws `SyntaxError` and would abort the whole scan over one bad rule.
 */
function safeMatches(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

/** A readable trail from the scanned root down to the element, for the audit record. */
function domPath(element: Element, root: Element): string {
  const steps: string[] = [];
  let current: Element | null = element;

  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    const index = parent ? Array.from(parent.children).indexOf(current) : -1;
    steps.unshift(index >= 0 ? `${current.localName}[${index}]` : current.localName);
    current = parent;
  }

  return [root.localName, ...steps].join(' > ');
}

function excerptOfElement(element: Element, limit: number): string | undefined {
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}
