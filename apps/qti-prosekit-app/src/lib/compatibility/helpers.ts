import type { CompatibilityChangeCode, MigrationContext, MigrationStep } from '@citolab/prose-qti/interfaces';
import type { NodeJSON } from 'prosekit/core';

// ── Message hook ──────────────────────────────────────────────────────────────

/**
 * Optional i18n hook for step composition helpers.
 *
 * Receives the change `code` and the structured `data` payload; return a
 * localized string to replace the built-in English message, or return
 * `null`/`undefined` to use the built-in message instead.
 *
 * Wire this to `translateQti` (or any other i18n system) at migration-registry
 * construction time:
 *
 * ```ts
 * composeJsonStep({
 *   transforms: [jsonRenameAttr('old', 'new')],
 *   getMessage: (code, data) =>
 *     translateQti(`compatibility.${code}`, { target: hostElement, ...data }) ?? null,
 * })
 * ```
 */
export type CompatibilityMessageFn = (
  code: CompatibilityChangeCode,
  data: Record<string, unknown>,
) => string | null | undefined;

function wrapContextWithMessages(
  context: MigrationContext,
  getMessage: CompatibilityMessageFn,
): MigrationContext {
  return {
    sourceVersion: context.sourceVersion,
    targetVersion: context.targetVersion,
    metadata: context.metadata,
    preserve: context.preserve.bind(context),
    addChange(change) {
      const override = getMessage(change.code, change.data ?? {});
      context.addChange(override != null ? { ...change, message: override } : change);
    },
  };
}

// ── JSON helpers ──────────────────────────────────────────────────────────────

type JsonNode = NodeJSON & {
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
};

/**
 * A transform applied to a single node's `attrs` object during a JSON migration walk.
 * Returns the (possibly new) attrs object — reference equality signals no change.
 */
export type JsonAttrTransform = (
  attrs: Record<string, unknown>,
  nodeType: string,
  path: string,
  context: MigrationContext,
) => Record<string, unknown>;

/**
 * Renames `from` to `to` on every node that has it.
 * If `to` already exists, `from` is dropped and a warning is logged.
 */
export function jsonRenameAttr(from: string, to: string): JsonAttrTransform {
  return (attrs, nodeType, path, context) => {
    if (!(from in attrs)) return attrs;

    if (to in attrs) {
      context.addChange({
        code: 'ATTRIBUTE_REMOVED',
        severity: 'warning',
        message: `Dropped legacy attribute "${from}" because canonical attribute "${to}" already existed.`,
        path,
        nodeType,
        attributeName: from,
        data: { previousAttributeName: from, keptAttributeName: to },
      });
      const next = { ...attrs };
      delete next[from];
      return next;
    }

    const next = { ...attrs, [to]: attrs[from] };
    delete next[from];
    context.addChange({
      code: 'RENAME_ATTRIBUTE',
      severity: 'info',
      message: `Renamed attribute "${from}" to "${to}".`,
      path,
      nodeType,
      attributeName: to,
      data: { previousAttributeName: from, attributeName: to },
    });
    return next;
  };
}

/**
 * Injects `defaultValue` for `name` when the attr is absent.
 */
export function jsonApplyDefault(name: string, defaultValue: unknown): JsonAttrTransform {
  return (attrs, nodeType, path, context) => {
    if (name in attrs) return attrs;
    context.addChange({
      code: 'DEFAULT_APPLIED',
      severity: 'info',
      message: `Applied default value for missing attribute "${name}".`,
      path,
      nodeType,
      attributeName: name,
      data: { attributeName: name, defaultValue },
    });
    return { ...attrs, [name]: defaultValue };
  };
}

/**
 * Removes `name` from every node that has it, logging a warning.
 */
export function jsonRemoveAttr(name: string): JsonAttrTransform {
  return (attrs, nodeType, path, context) => {
    if (!(name in attrs)) return attrs;
    context.addChange({
      code: 'ATTRIBUTE_REMOVED',
      severity: 'warning',
      message: `Removed attribute "${name}".`,
      path,
      nodeType,
      attributeName: name,
      data: { attributeName: name, value: attrs[name] },
    });
    const next = { ...attrs };
    delete next[name];
    return next;
  };
}

/**
 * Moves any attr not in `knownAttrs` into the preservation sidecar and removes
 * it from the node — preventing ProseMirror from silently dropping it.
 */
export function jsonPreserveUnknownAttrs(knownAttrs: ReadonlyArray<string>): JsonAttrTransform {
  const knownSet = new Set(knownAttrs);
  return (attrs, nodeType, path, context) => {
    const unknownKeys = Object.keys(attrs).filter(k => !knownSet.has(k));
    if (unknownKeys.length === 0) return attrs;

    const next = { ...attrs };
    for (const key of unknownKeys) {
      context.preserve({
        path,
        reason: `Preserved unknown attribute "${key}" on node "${nodeType}".`,
        payload: { [key]: attrs[key] },
        nodeType,
        attributeName: key,
        sourceVersion: context.sourceVersion,
      });
      context.addChange({
        code: 'UNKNOWN_ATTRIBUTE_PRESERVED',
        severity: 'warning',
        message: `Preserved unknown attribute "${key}" in compatibility sidecar.`,
        path,
        nodeType,
        attributeName: key,
        data: { attributeName: key },
      });
      delete next[key];
    }
    return next;
  };
}

export interface ComposeJsonStepOptions {
  id: string;
  fromVersion: number;
  toVersion: number;
  description?: string;
  transforms: ReadonlyArray<JsonAttrTransform>;
  /**
   * Optional i18n hook — see {@link CompatibilityMessageFn}.
   * Provide to replace built-in English messages with localized strings.
   */
  getMessage?: CompatibilityMessageFn;
}

/**
 * Composes multiple `JsonAttrTransform`s into a single `MigrationStep<NodeJSON>`.
 * Transforms are applied left-to-right on every node's `attrs` in a recursive walk.
 */
export function composeJsonStep(options: ComposeJsonStepOptions): MigrationStep<NodeJSON> {
  return {
    id: options.id,
    fromVersion: options.fromVersion,
    toVersion: options.toVersion,
    description: options.description,
    migrate(document, context) {
      const ctx = options.getMessage
        ? wrapContextWithMessages(context, options.getMessage)
        : context;
      return applyJsonTransforms(document as JsonNode, '$', ctx, options.transforms) as NodeJSON;
    },
  };
}

function applyJsonTransforms(
  node: JsonNode,
  path: string,
  context: MigrationContext,
  transforms: ReadonlyArray<JsonAttrTransform>,
): JsonNode {
  let nextAttrs = node.attrs;
  if (nextAttrs) {
    for (const transform of transforms) {
      nextAttrs = transform(nextAttrs, node.type, path, context);
    }
  }

  let nextContent = node.content;
  if (Array.isArray(node.content)) {
    const mapped = node.content.map((child, index) =>
      applyJsonTransforms(child, `${path}.content[${index}]`, context, transforms),
    );
    if (mapped.some((child, index) => child !== node.content![index])) {
      nextContent = mapped;
    }
  }

  if (nextAttrs === node.attrs && nextContent === node.content) return node;

  return {
    ...node,
    ...(nextAttrs !== undefined ? { attrs: nextAttrs } : {}),
    ...(nextContent !== undefined ? { content: nextContent } : {}),
  };
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

/**
 * A transform applied in-place to a single DOM `Element` during an HTML migration walk.
 */
export type HtmlElementTransform = (
  element: Element,
  path: string,
  context: MigrationContext,
) => void;

/**
 * Renames HTML attribute `from` to `to` on every matching element.
 * If `to` already exists, `from` is dropped and a warning is logged.
 */
export function htmlRenameAttr(from: string, to: string): HtmlElementTransform {
  return (element, path, context) => {
    if (!element.hasAttribute(from)) return;
    const value = element.getAttribute(from)!;

    if (element.hasAttribute(to)) {
      context.addChange({
        code: 'ATTRIBUTE_REMOVED',
        severity: 'warning',
        message: `Dropped legacy HTML attribute "${from}" because canonical attribute "${to}" already existed.`,
        path,
        nodeType: element.tagName.toLowerCase(),
        attributeName: from,
        data: { previousAttributeName: from, keptAttributeName: to },
      });
    } else {
      element.setAttribute(to, value);
      context.addChange({
        code: 'RENAME_ATTRIBUTE',
        severity: 'info',
        message: `Renamed HTML attribute "${from}" to "${to}".`,
        path,
        nodeType: element.tagName.toLowerCase(),
        attributeName: to,
        data: { previousAttributeName: from, attributeName: to },
      });
    }
    element.removeAttribute(from);
  };
}

/**
 * Sets `name` to `defaultValue` on every element that is missing the attribute.
 */
export function htmlApplyDefault(name: string, defaultValue: string): HtmlElementTransform {
  return (element, path, context) => {
    if (element.hasAttribute(name)) return;
    element.setAttribute(name, defaultValue);
    context.addChange({
      code: 'DEFAULT_APPLIED',
      severity: 'info',
      message: `Applied default value for missing HTML attribute "${name}".`,
      path,
      nodeType: element.tagName.toLowerCase(),
      attributeName: name,
      data: { attributeName: name, defaultValue },
    });
  };
}

/**
 * Removes `name` from every element that has it, logging a warning.
 */
export function htmlRemoveAttr(name: string): HtmlElementTransform {
  return (element, path, context) => {
    if (!element.hasAttribute(name)) return;
    const value = element.getAttribute(name);
    context.addChange({
      code: 'ATTRIBUTE_REMOVED',
      severity: 'warning',
      message: `Removed HTML attribute "${name}".`,
      path,
      nodeType: element.tagName.toLowerCase(),
      attributeName: name,
      data: { attributeName: name, value },
    });
    element.removeAttribute(name);
  };
}

/**
 * Moves any attribute not in `knownAttrs` into the preservation sidecar and
 * removes it from the element — preventing ProseMirror from silently dropping it.
 */
export function htmlPreserveUnknownAttrs(knownAttrs: ReadonlyArray<string>): HtmlElementTransform {
  const knownSet = new Set(knownAttrs.map(a => a.toLowerCase()));
  return (element, path, context) => {
    const tagName = element.tagName.toLowerCase();
    for (const name of Array.from(element.getAttributeNames())) {
      if (knownSet.has(name.toLowerCase())) continue;
      const value = element.getAttribute(name);
      context.preserve({
        path,
        reason: `Preserved unknown HTML attribute "${name}" on element <${tagName}>.`,
        payload: { tagName, attributeName: name, value },
        nodeType: tagName,
        attributeName: name,
        sourceVersion: context.sourceVersion,
      });
      context.addChange({
        code: 'UNKNOWN_ATTRIBUTE_PRESERVED',
        severity: 'warning',
        message: `Preserved unknown HTML attribute "${name}" in compatibility sidecar.`,
        path,
        nodeType: tagName,
        attributeName: name,
        data: { attributeName: name },
      });
      element.removeAttribute(name);
    }
  };
}

export interface ComposeHtmlStepOptions {
  id: string;
  fromVersion: number;
  toVersion: number;
  description?: string;
  /** CSS selector for elements to visit. Defaults to `*` (all elements). */
  selector?: string;
  transforms: ReadonlyArray<HtmlElementTransform>;
  /**
   * Optional i18n hook — see {@link CompatibilityMessageFn}.
   * Provide to replace built-in English messages with localized strings.
   */
  getMessage?: CompatibilityMessageFn;
}

/**
 * Composes multiple `HtmlElementTransform`s into a single `MigrationStep<string>`.
 * Parses the HTML string, visits every element matching `selector`, applies transforms
 * in order, then serializes back to HTML.
 */
export function composeHtmlStep(options: ComposeHtmlStepOptions): MigrationStep<string> {
  const selector = options.selector ?? '*';
  return {
    id: options.id,
    fromVersion: options.fromVersion,
    toVersion: options.toVersion,
    description: options.description,
    migrate(html, context) {
      const ctx = options.getMessage
        ? wrapContextWithMessages(context, options.getMessage)
        : context;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      Array.from(doc.querySelectorAll(selector)).forEach((element, index) => {
        const path = `${element.tagName.toLowerCase()}[${index}]`;
        for (const transform of options.transforms) {
          transform(element, path, ctx);
        }
      });
      return doc.body.innerHTML;
    },
  };
}
