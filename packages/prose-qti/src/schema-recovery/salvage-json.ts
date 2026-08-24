import { collectExcerpt } from './excerpt.js';
import { withHostMessage } from './messages.js';

import type {
  NodeJson,
  RecoveryChange,
  RecoveryMessageOptions,
  RecoveryMessageResolver,
  RecoverySite,
  SalvageOutcome,
} from './types.js';
import type { PreservedFragment } from '@citolab/prose-qti/interfaces';
import type { AttributeSpec, Schema } from 'prosemirror-model';

/**
 * Recovers what is loadable from a document the schema rejects, instead of failing the whole load.
 *
 * This exists to give the JSON path the leniency the DOM path already has. ProseMirror's
 * `DOMParser` skips an element it does not recognise but still parses its children, so unknown
 * markup costs you the wrapper and nothing else. `Node.fromJSON` has no such behaviour — one
 * unknown node type or mark anywhere in the tree throws, and the entire document is lost:
 *
 *   DOM  : <unknown><p>text</p></unknown>  -> paragraph survives, wrapper dropped
 *   JSON : { type: 'unknown', content: [ … ] } -> throws "Unknown node type: unknown"
 *
 * So this walks the JSON first and applies the same rules by hand:
 *
 *   - unknown node type -> unwrapped, its children spliced into its place
 *   - unknown node type with no children -> dropped
 *   - unknown mark -> dropped, the text it covered kept
 *   - attribute the schema does not declare -> dropped
 *   - attribute whose stored value the schema rejects -> dropped, so the default applies
 *
 * Every one of those is recorded three ways: as a `CompatibilityChange` describing it, as a
 * `PreservedFragment` holding the removed content verbatim, and as a `RecoverySite` saying where in
 * the *result* it happened — so a host can quote what was lost and point at where it used to be.
 *
 * Salvage is a last resort: run it only once a document has already failed to load. A document that
 * loads cleanly must never be put through it, because "recovered" is strictly worse than "correct".
 *
 * Every change says what `kind` of removal it was, so a host can render it without parsing English —
 * see {@link RecoveryMessageOptions} to replace the wording outright.
 */
export function salvageJsonDocument(
  schema: Schema,
  doc: NodeJson,
  options: RecoveryMessageOptions = {},
): SalvageOutcome {
  const state: SalvageState = {
    schema,
    changes: [],
    preserved: [],
    sites: [],
    nextSiteNumber: 0,
    getMessage: options.getMessage,
  };

  const salvaged = salvageNodes([doc], {
    state,
    jsonPath: '$',
    outputPathFor: () => [],
  });

  // The top node is the doc itself; unwrapping it would be meaningless, so if salvage removed it
  // entirely fall back to an empty doc of the schema's top type.
  const document = salvaged[0] ?? { type: schema.topNodeType.name, content: [] };

  return {
    document,
    changes: state.changes,
    preservedFragments: state.preserved,
    sites: state.sites,
  };
}

interface SalvageState {
  schema: Schema;
  changes: RecoveryChange[];
  preserved: PreservedFragment[];
  sites: RecoverySite[];
  nextSiteNumber: number;
  getMessage?: RecoveryMessageResolver;
}

/** Records a change, giving the host the last word on how it reads — see `withHostMessage`. */
function pushChange(state: SalvageState, change: RecoveryChange): void {
  state.changes.push(withHostMessage(change, state.getMessage));
}

/**
 * Where a salvaged node sits, in both coordinate systems.
 *
 * `jsonPath` describes the ORIGINAL document — it is the audit trail, and it must keep naming the
 * place the content came from. `outputPathFor` describes the SALVAGED document, and it has to be a
 * function rather than a path because unwrapping makes the two diverge: one input node can produce
 * zero, one, or many output siblings, so an output index is only known once the preceding siblings
 * have been salvaged.
 */
interface SalvageContext {
  state: SalvageState;
  jsonPath: string;
  /** Maps an offset within this node list to the full child-index path it will occupy. */
  outputPathFor: (offset: number) => number[];
}

/** Salvages a list of siblings, flattening the 0..n replacements each one produces. */
function salvageNodes(nodes: readonly NodeJson[], context: SalvageContext): NodeJson[] {
  const output: NodeJson[] = [];

  nodes.forEach((node, index) => {
    const start = output.length;
    output.push(...salvageNode(node, {
      state: context.state,
      jsonPath: `${context.jsonPath}.content[${index}]`,
      outputPath: context.outputPathFor(start),
      // An unwrapped node's children take its place in the PARENT's list, so they inherit the
      // parent's mapper offset by where this node's output began.
      outputPathFor: offset => context.outputPathFor(start + offset),
    }));
  });

  return output;
}

interface SalvageNodeContext extends SalvageContext {
  /** The child-index path this node's own output occupies, if it survives. */
  outputPath: number[];
}

function salvageNode(node: NodeJson, context: SalvageNodeContext): NodeJson[] {
  const { state, jsonPath, outputPath } = context;

  if (!node || typeof node.type !== 'string') {
    state.preserved.push({ path: jsonPath, reason: 'Entry was not a ProseMirror node.', payload: node });
    pushChange(state, {
      kind: 'dropped-entry',
      code: 'UNSUPPORTED_CONTENT_PRESERVED',
      severity: 'warning',
      message: 'Removed an entry that was not a document node.',
      path: jsonPath,
      data: recordSite(state, {
        kind: 'dropped-entry',
        path: outputPath,
        span: 0,
      }),
    });
    return [];
  }

  const known = Object.prototype.hasOwnProperty.call(state.schema.nodes, node.type);

  const children = Array.isArray(node.content)
    ? salvageNodes(node.content, {
      state,
      jsonPath,
      // A surviving node keeps its children; an unwrapped one hands them to its own parent.
      outputPathFor: known ? offset => [...outputPath, offset] : context.outputPathFor,
    })
    : undefined;

  if (!known) {
    // Unwrap: keep what was inside, lose only the node the schema cannot represent. This is the
    // DOMParser behaviour, and the reason a stray wrapper no longer costs the whole document.
    const excerpt = collectExcerpt(node);
    state.preserved.push({
      path: jsonPath,
      reason: `Node type "${node.type}" is not in the schema.`,
      payload: { type: node.type, attrs: node.attrs, content: node.content },
      nodeType: node.type,
    });
    pushChange(state, {
      kind: 'unwrapped-node',
      code: 'UNKNOWN_NODE_PRESERVED',
      severity: 'warning',
      message: children?.length
        ? `Removed unknown node "${node.type}" and kept its ${children.length} child node(s).`
        : `Removed unknown node "${node.type}".`,
      path: jsonPath,
      nodeType: node.type,
      data: {
        unwrappedChildren: children?.length ?? 0,
        ...recordSite(state, {
          kind: 'unwrapped-node',
          path: outputPath,
          span: children?.length ?? 0,
          expectedType: children?.[0]?.type,
          removedType: node.type,
          excerpt,
        }),
      },
    });
    return children ?? [];
  }

  const marks = node.marks ? salvageMarks(node, context) : undefined;
  const attrs = node.attrs ? salvageAttrs(node, context) : undefined;

  return [
    {
      ...node,
      ...(attrs !== undefined ? { attrs } : {}),
      ...(children !== undefined ? { content: children } : {}),
      ...(marks !== undefined ? { marks } : {}),
    },
  ];
}

function salvageMarks(node: NodeJson, context: SalvageNodeContext): NodeJson['marks'] {
  const { state, jsonPath, outputPath } = context;

  return (node.marks ?? []).filter(mark => {
    if (Object.prototype.hasOwnProperty.call(state.schema.marks, mark.type)) return true;
    state.preserved.push({
      path: jsonPath,
      reason: `Mark type "${mark.type}" is not in the schema.`,
      payload: mark,
      nodeType: node.type,
    });
    pushChange(state, {
      kind: 'dropped-mark',
      code: 'UNKNOWN_NODE_PRESERVED',
      severity: 'warning',
      message: `Removed unknown mark "${mark.type}"; the text it covered was kept.`,
      path: jsonPath,
      nodeType: node.type,
      data: {
        markType: mark.type,
        ...recordSite(state, {
          kind: 'dropped-mark',
          path: outputPath,
          span: 1,
          expectedType: node.type,
          removedType: mark.type,
          excerpt: collectExcerpt(node),
        }),
      },
    });
    return false;
  });
}

function salvageAttrs(node: NodeJson, context: SalvageNodeContext): Record<string, unknown> {
  const { state, jsonPath, outputPath } = context;
  const nodeType = node.type;
  const declared = state.schema.nodes[nodeType]?.spec.attrs ?? {};
  const next: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(node.attrs ?? {})) {
    const spec = declared[name];

    if (!spec) {
      state.preserved.push({
        path: jsonPath,
        reason: `Attribute "${name}" is not declared on node "${nodeType}".`,
        payload: { [name]: value },
        nodeType,
        attributeName: name,
      });
      pushChange(state, {
        kind: 'dropped-attribute',
        code: 'UNKNOWN_ATTRIBUTE_PRESERVED',
        severity: 'warning',
        message: `Removed unknown attribute "${name}" from "${nodeType}".`,
        path: jsonPath,
        nodeType,
        attributeName: name,
        data: recordSite(state, {
          kind: 'dropped-attribute',
          path: outputPath,
          span: 1,
          expectedType: nodeType,
          removedType: name,
          excerpt: collectExcerpt(node),
        }),
      });
      continue;
    }

    if (!attrValueIsValid(spec, value)) {
      // Dropping lets the schema's declared default apply, which is the closest legal stand-in.
      state.preserved.push({
        path: jsonPath,
        reason: `Attribute "${name}" on "${nodeType}" held a value the schema rejects.`,
        payload: { [name]: value },
        nodeType,
        attributeName: name,
      });
      pushChange(state, {
        kind: 'reset-attribute',
        code: 'UNKNOWN_ATTRIBUTE_PRESERVED',
        severity: 'warning',
        message: `Reset attribute "${name}" on "${nodeType}" to its default; the stored value was not valid.`,
        path: jsonPath,
        nodeType,
        attributeName: name,
        data: {
          rejectedValue: value,
          ...recordSite(state, {
            kind: 'reset-attribute',
            path: outputPath,
            span: 1,
            expectedType: nodeType,
            removedType: name,
            excerpt: collectExcerpt(node),
          }),
        },
      });
      continue;
    }

    next[name] = value;
  }

  return next;
}

/** Registers a recovery site and returns the change fields that point at it. */
function recordSite(
  state: SalvageState,
  site: Omit<RecoverySite, 'id'>,
): { siteId: string; excerpt?: string } {
  const id = `recovery-${state.nextSiteNumber++}`;
  state.sites.push({ id, ...site });
  return { siteId: id, ...(site.excerpt ? { excerpt: site.excerpt } : {}) };
}

/**
 * Mirrors ProseMirror's own attribute validation.
 *
 * `validate` is either a function that throws, or a `'|'`-separated list of `typeof` names with
 * `null`/`undefined` spelled out — the same grammar `prosemirror-model` parses.
 */
function attrValueIsValid(spec: AttributeSpec, value: unknown): boolean {
  const validate = spec.validate;
  if (!validate) return true;

  if (typeof validate === 'function') {
    try {
      validate(value);
      return true;
    } catch {
      return false;
    }
  }

  return validate.split('|').some(type => {
    if (type === 'null') return value === null;
    if (type === 'undefined') return value === undefined;
    return typeof value === type;
  });
}
