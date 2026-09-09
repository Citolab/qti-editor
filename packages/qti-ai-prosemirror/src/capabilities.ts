import { fingerprint } from '@citolab/qti-ai-core';

import {
  BASELINE_VERSION,
  attributeAnnotations,
  vocabularyBaseline,
  type AttributeAnnotation,
  type AttributeType,
  type VocabularyGroup
} from './baseline.js';

import type { NodeType, Schema } from 'prosemirror-model';

export type {
  AttributeAnnotation,
  AttributeType,
  VocabularyGroup,
  VocabularyOption,
  VocabularySupport
} from './baseline.js';

export interface AttributeCapability {
  type: AttributeType;
  nullable: boolean;
  default: unknown;
  /** HTML attribute name, when the node serializes this attribute at all. */
  htmlName?: string;
  /** Whether `setAttributes` may change it. Identity and class are never edited directly. */
  editable: boolean;
  min?: number;
  values?: readonly string[];
  description?: { en: string; nl: string };
  examples?: readonly string[];
}

export interface NodeCapability {
  tag: string;
  content: string;
  group: string;
  attributes: Record<string, AttributeCapability>;
  vocabulary: VocabularyGroup[];
}

/**
 * The effective manifest of one host: its schema, annotated with the baseline, filtered by its
 * options. `id` is a fingerprint of everything below it, so two hosts with the same schema and the
 * same options agree, and any difference in nodes, attributes or vocabulary produces a different id.
 */
export interface Capabilities {
  /** Manifest shape version. */
  version: 2;
  /** Version of the baseline the annotations came from. */
  baseline: typeof BASELINE_VERSION;
  id: string;
  nodes: Record<string, NodeCapability>;
  marks: string[];
}

export interface CapabilityOptions {
  /** Replace or extend the vocabulary for a node type. `[]` disables vocabulary for that node. */
  vocabulary?: Record<string, VocabularyGroup[]>;
  /** Override or add attribute annotations, keyed by attribute name. */
  annotations?: Record<string, AttributeAnnotation>;
  /** Exclude attributes from the manifest entirely. */
  allowAttribute?: (nodeType: string, attribute: string) => boolean;
}

/** The DOM tag a node type renders to, read off its `toDOM`. Empty when it has none or throws. */
export function tagOf(schema: Schema, name: string): string {
  const type = schema.nodes[name];
  try {
    const out = type.spec.toDOM?.(type.create());
    return Array.isArray(out) ? String(out[0]) : '';
  } catch {
    return '';
  }
}

function domAttributes(type: NodeType, attrs: Record<string, unknown>): Record<string, string> | undefined {
  try {
    const out = type.spec.toDOM?.(type.create(attrs));
    if (!Array.isArray(out) || out.length < 2) return {};
    const second = out[1];
    return second && typeof second === 'object' && !Array.isArray(second) ? (second as Record<string, string>) : {};
  } catch {
    return undefined;
  }
}

/**
 * Which HTML attribute carries a ProseMirror attribute, found by serializing a probe value.
 *
 * Not a naming convention: `imageSrc` becomes `src`, `dataPrompt` becomes `data-prompt`, and an
 * attribute the node never serializes has no HTML name at all. Probing `toDOM` answers all three
 * from the same source the editor uses. A string probe is tried first; numbers and booleans get a
 * probe of their own kind because `toDOM` may arithmetic on them. When `toDOM` throws or the probe
 * does not surface, the baseline's `htmlName` is the fallback.
 */
function probeHtmlName(type: NodeType, attr: string, spec: { default?: unknown }): string | undefined {
  const base = { ...type.spec.attrs };
  const defaults: Record<string, unknown> = {};
  for (const [name, s] of Object.entries(base)) defaults[name] = (s as { default?: unknown }).default ?? null;

  const probes: unknown[] =
    typeof spec.default === 'number'
      ? [7919]
      : typeof spec.default === 'boolean'
        ? [true]
        : [`qti-ai-probe-${attr.toLowerCase()}`, 7919];
  const baseline = domAttributes(type, defaults) ?? {};
  for (const probe of probes) {
    const withProbe = domAttributes(type, { ...defaults, [attr]: probe });
    if (!withProbe) continue;
    for (const [name, value] of Object.entries(withProbe)) {
      if (String(value).includes(String(probe)) && baseline[name] !== value) return name;
    }
    if (probe === true) {
      // A boolean rarely serializes as "true"; the attribute that appears is the one.
      const added = Object.keys(withProbe).find(name => !(name in baseline));
      if (added) return added;
    }
  }
  return undefined;
}

/** A conservative annotation for an attribute the baseline does not know. */
function derive(spec: { default?: unknown }): Pick<AttributeCapability, 'type' | 'nullable' | 'editable'> {
  const d = spec.default;
  if (d === null || d === undefined) return { type: 'string', nullable: true, editable: true };
  if (typeof d === 'number')
    return { type: Number.isInteger(d) ? 'integer' : 'number', nullable: false, editable: true };
  if (typeof d === 'boolean') return { type: 'boolean', nullable: false, editable: true };
  return { type: 'string', nullable: false, editable: true };
}

export function createCapabilities(schema: Schema, options: CapabilityOptions = {}): Capabilities {
  const annotations = { ...attributeAnnotations, ...options.annotations };
  const vocabulary = { ...vocabularyBaseline, ...options.vocabulary };
  const nodes: Capabilities['nodes'] = {};

  for (const [name, type] of Object.entries(schema.nodes)) {
    const attributes: NodeCapability['attributes'] = {};
    for (const [attr, spec] of Object.entries(type.spec.attrs ?? {})) {
      if (options.allowAttribute && !options.allowAttribute(name, attr)) continue;
      const annotation = annotations[attr];
      const shape = annotation ?? derive(spec);
      attributes[attr] = {
        type: shape.type,
        nullable: shape.nullable,
        default: spec.default ?? null,
        htmlName: probeHtmlName(type, attr, spec) ?? annotation?.htmlName,
        editable: shape.editable,
        ...(annotation?.min !== undefined ? { min: annotation.min } : {}),
        ...(annotation?.values ? { values: annotation.values } : {}),
        ...(annotation?.description ? { description: annotation.description } : {}),
        ...(annotation?.examples ? { examples: annotation.examples } : {})
      };
    }
    nodes[name] = {
      tag: tagOf(schema, name),
      content: type.spec.content ?? '',
      group: type.spec.group ?? '',
      attributes,
      // Vocabulary is class tokens; a node without a class attribute cannot carry any.
      vocabulary: 'class' in attributes ? [...(vocabulary[name] ?? [])] : []
    };
  }

  const data = { version: 2 as const, baseline: BASELINE_VERSION, nodes, marks: Object.keys(schema.marks) };
  return { ...data, id: fingerprint(data) };
}

/**
 * Why a value is not acceptable for an attribute, or `undefined` when it is.
 *
 * Types are checked against the manifest's explicit type, never against `typeof default`.
 */
export function attributeValueError(attr: string, cap: AttributeCapability, value: unknown): string | undefined {
  if (!cap.editable) return `Attribute cannot be changed directly: ${attr}`;
  if (value === null) return cap.nullable ? undefined : `${attr} cannot be null`;
  switch (cap.type) {
    case 'string':
      return typeof value === 'string' ? undefined : `${attr} must be a string`;
    case 'boolean':
      return typeof value === 'boolean' ? undefined : `${attr} must be true or false`;
    case 'integer':
      if (!Number.isInteger(value)) return `${attr} must be an integer`;
      return cap.min !== undefined && (value as number) < cap.min ? `${attr} must be at least ${cap.min}` : undefined;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) return `${attr} must be a number`;
      return cap.min !== undefined && value < cap.min ? `${attr} must be at least ${cap.min}` : undefined;
    case 'enum':
      return typeof value === 'string' && cap.values?.includes(value)
        ? undefined
        : `${attr} must be one of ${(cap.values ?? []).join(', ')}`;
    case 'response':
      return typeof value === 'string' || (Array.isArray(value) && value.every(v => typeof v === 'string'))
        ? undefined
        : `${attr} must be a string or a list of strings`;
  }
}

/**
 * Apply one vocabulary choice to a class value: drop every token of the group, add the chosen one.
 * Tokens outside the group are kept in place, duplicates are removed.
 */
export function applyVocabulary(classValue: unknown, group: VocabularyGroup, value: string | null): string | null {
  if (value !== null && !group.options.some(o => o.value === value)) throw new Error('Unsupported vocabulary option.');
  const managed = new Set(group.options.map(o => o.value));
  const tokens = String(classValue ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !managed.has(t));
  if (value) tokens.push(value);
  return [...new Set(tokens)].join(' ') || null;
}
