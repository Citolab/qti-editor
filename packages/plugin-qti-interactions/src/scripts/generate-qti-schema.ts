import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const PROSEMIRROR_OUTPUT_PATH = path.join(
  ROOT,
  'schema/generated/prosemirror-schema.ts',
);
const DEFINITIONS_OUTPUT_PATH = path.join(
  ROOT,
  'schema/generated/element-definitions.ts',
);
const MANIFEST_PATH = path.join(ROOT, 'custom-elements.json');

type CEM = {
  modules?: Array<{
    declarations?: Array<Record<string, any>>;
  }>;
};

type AttrSpecInfo = {
  default?: string | number | boolean;
  domAttr: string;
};

type NodeSpecInput = {
  nodeName: string;
  tagName: string;
  attrs: Record<string, AttrSpecInfo>;
  inline: boolean;
  group: string;
  content: string;
  marks?: string;
  atom: boolean;
  selectable?: boolean;
  defining?: boolean;
  isolating?: boolean;
  hasContent: boolean;
  toolbar: boolean;
  // New UI metadata
  label?: string;
  icon?: string;
  keywords: string[];
  category: 'interaction' | 'content' | 'structure';
  insertable: boolean;
  description?: string;
};

function tagNameToNodeName(tagName: string): string {
  return tagName.replace(/-/g, '_');
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

// Helper function to create single-quoted string literals
function singleQuote(value: string | number | boolean | null): string {
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "\\'")}'`;
  }
  return JSON.stringify(value);
}

function normalizeTagValue(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (typeof value.name === 'string') {
      if (typeof value.description === 'string' && value.description.trim()) {
        return `${value.name} ${value.description.trim()}`;
      }
      return value.name;
    }
    if (typeof value.value === 'string') return value.value;
  }
  return undefined;
}

function normalizeBoolean(value: any): boolean | undefined {
  const normalized = normalizeTagValue(value);
  if (normalized === undefined) return undefined;
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function parseDefaultValue(value: any): string | number | boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  const text = String(value).trim();
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function collectAttrs(
  declaration: Record<string, any>,
): Record<string, AttrSpecInfo> {
  const attrs = new Map<string, AttrSpecInfo>();

  for (const attr of declaration.attributes || []) {
    const name = attr?.name;
    if (!name) continue;
    const attrName = toCamelCase(name);
    const existing = attrs.get(attrName) || { domAttr: name };
    const defaultValue = parseDefaultValue(attr?.default);
    attrs.set(
      attrName,
      defaultValue !== undefined
        ? { ...existing, default: defaultValue }
        : existing,
    );
  }

  return Object.fromEntries(attrs.entries());
}

function buildNodeSpec(declaration: Record<string, any>): NodeSpecInput | null {
  const tagName = declaration.tagName;
  if (!tagName || !declaration.customElement) return null;

  const nodeName = tagNameToNodeName(tagName);
  const nodeKind = normalizeTagValue(declaration.proseMirrorNode) || 'block';
  const groupOverride = normalizeTagValue(declaration.proseMirrorGroup);
  const contentOverride = normalizeTagValue(declaration.proseMirrorContent);
  const marksOverride = normalizeTagValue(declaration.proseMirrorMarks);
  const atomOverride = normalizeBoolean(declaration.proseMirrorAtom);
  const selectableOverride = normalizeBoolean(
    declaration.proseMirrorSelectable,
  );
  const definingOverride = normalizeBoolean(declaration.proseMirrorDefining);
  const isolatingOverride = normalizeBoolean(declaration.proseMirrorIsolating);
  const toolbarOverride = normalizeBoolean(declaration.proseMirrorToolbar);

  // Extract UI metadata
  const label = normalizeTagValue(declaration.proseMirrorLabel);
  const icon = normalizeTagValue(declaration.proseMirrorIcon);
  const keywordsValue = normalizeTagValue(declaration.proseMirrorKeywords);
  const keywords = keywordsValue ? keywordsValue.split(',').map(k => k.trim()) : [];
  const category = normalizeTagValue(declaration.proseMirrorCategory) as 'interaction' | 'content' | 'structure' || 'content';
  const insertable = normalizeBoolean(declaration.proseMirrorInsertable) ?? false;
  const description = declaration.description || declaration.summary || '';

  const inline = nodeKind === 'inline';
  const group = groupOverride || (inline ? 'inline' : 'block');
  const content = contentOverride || 'inline*';
  const atom = atomOverride === true;
  const selectable = selectableOverride ?? (atom ? true : undefined);
  const marks = marksOverride || undefined;

  return {
    nodeName,
    tagName,
    attrs: collectAttrs(declaration),
    inline,
    group,
    content,
    marks,
    atom,
    selectable,
    defining: definingOverride,
    isolating: isolatingOverride,
    hasContent: !atom && Boolean(content),
    toolbar: toolbarOverride !== false,
    label,
    icon,
    keywords,
    category,
    insertable,
    description,
  };
}

function stringifyAttrDefaults(attrs: Record<string, AttrSpecInfo>): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return '{}';
  const lines = entries.map(([name, spec]) => {
    if (spec?.default !== undefined) {
      return `  ${singleQuote(name)}: { default: ${JSON.stringify(
        spec.default,
      )} }`;
    }
    return `  ${singleQuote(name)}: { default: null }`;
  });
  return `{
${lines.join(',\n')}
}`;
}

function stringifyAttrMap(attrs: Record<string, AttrSpecInfo>): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return '{}';
  return `{
    ${entries
    .map(
      ([name, spec]) =>
        `${singleQuote(name)}: ${singleQuote(spec.domAttr)}`,
    )
    .join(',\n    ')}
  }`;
}

async function generateProseKitSchema(nodes: NodeSpecInput[]): Promise<void> {
  const nodeLines: string[] = [];

  for (const node of nodes) {
    const attrsObject = stringifyAttrDefaults(node.attrs);
    const attrsMap = stringifyAttrMap(node.attrs);
    const extraFlags: string[] = [];

    if (node.inline) extraFlags.push('inline: true');
    if (node.group) extraFlags.push(`group: ${singleQuote(node.group)}`);
    if (node.content && !node.atom)
      extraFlags.push(`content: ${singleQuote(node.content)}`);
    if (node.marks) extraFlags.push(`marks: ${singleQuote(node.marks)}`);
    if (node.atom) extraFlags.push('atom: true');
    if (node.selectable !== undefined)
      extraFlags.push(`selectable: ${node.selectable}`);
    if (node.defining !== undefined)
      extraFlags.push(`defining: ${node.defining}`);
    if (node.isolating !== undefined)
      extraFlags.push(`isolating: ${node.isolating}`);

    const flags = extraFlags.length > 0 ? `${extraFlags.join(',\n    ')},` : '';

    nodeLines.push(
      `  ${singleQuote(node.nodeName)}: {\n` +
        `    attrs: ${attrsObject},\n` +
        `    parseDOM: [{ tag: ${singleQuote(
          node.tagName,
        )}, getAttrs: (dom) => parseDomAttrs(dom, ${attrsMap}) }],\n` +
        `    toDOM: createToDOM(${singleQuote(node.tagName)}, ${
          node.hasContent
        }, ${node.atom}, ${attrsMap}),\n` +
        (flags ? `    ${flags}\n` : '') +
        '  },',
    );
  }

  const mappingLines = nodes
    .slice()
    .sort((a, b) => a.tagName.localeCompare(b.tagName))
    .map(
      (node) =>
        `  '${node.tagName}': '${node.nodeName}'`,
    );

  const toolbarLines = nodes
    .filter((node) => node.toolbar)
    .map((node) => `  '${node.nodeName}'`);

  const output = `/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 *
 * This file is automatically generated by the schema generator script.
 * Any manual changes will be lost when the schema is regenerated.
 *
 * To modify this schema:
 * 1. Update the custom elements in the custom-elements/ directory
 * 2. Run 'npm run cem' to update the custom elements manifest
 * 3. Run 'npm run schema' to regenerate this file
 *
 * Generated from: scripts/generate-qti-schema.ts
 * Generated at: ${new Date().toISOString()}
 */

import { Schema, type MarkSpec, type NodeSpec } from 'prosemirror-model';
import { defineParagraph } from 'prosekit/extensions/paragraph';
import { defineImage } from 'prosekit/extensions/image';

const parseAttrValue = (value: string | null) => {
  if (value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\\d+(\\.\\d+)?$/.test(value)) return Number(value);
  return value;
};

const parseDomAttrs = (dom: Element, attrMap: Record<string, string>) => {
  const attrs: Record<string, string | number | boolean | undefined> = {};
  for (const [name, domAttr] of Object.entries(attrMap)) {
    const raw = dom.getAttribute(domAttr);
    const parsed = parseAttrValue(raw);
    if (parsed !== undefined) {
      attrs[name] = parsed;
    }
  }
  return attrs;
};

const toDomAttrs = (attrs: Record<string, unknown>, attrMap: Record<string, string>) => {
  const domAttrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    const domAttr = attrMap[key] || key;
    domAttrs[domAttr] = String(value);
  }
  return domAttrs;
};

const createToDOM = (
  tagName: string,
  hasContent: boolean,
  isAtom: boolean,
  attrMap: Record<string, string>
) => {
  return (node: { attrs: Record<string, unknown> }) => {
    const attrs = toDomAttrs(node.attrs || {}, attrMap);
    if (isAtom || !hasContent) {
      return [tagName, attrs];
    }
    return [tagName, attrs, 0];
  };
};

export const nodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: defineParagraph(),
${nodeLines.join('\n')}
};

export const marks: Record<string, MarkSpec> = {};

export const schema = new Schema({ nodes, marks });

export const tagNameToNodeName = {
${mappingLines.join(',\n')}
};

export const toolbarNodeNames = [
${toolbarLines.join(',\n')}
];
`;

  await fs.mkdir(path.dirname(PROSEMIRROR_OUTPUT_PATH), { recursive: true });
  await fs.writeFile(PROSEMIRROR_OUTPUT_PATH, output);

  console.log(
    `Generated ProseMirror schema: ${path.relative(ROOT, PROSEMIRROR_OUTPUT_PATH)}`,
  );
}

async function generateElementDefinitions(nodes: NodeSpecInput[]): Promise<void> {
  const elementDefinitions = nodes.map(node => {
    const defaultAttrs = Object.fromEntries(
      Object.entries(node.attrs).map(([key, attr]) => [key, attr.default]),
    );

    return `  {
    id: '${node.tagName.replace('qti-', '')}',
    nodeType: '${node.nodeName}',
    tagName: '${node.tagName}',
    label: ${JSON.stringify(node.label || node.tagName)},
    description: ${JSON.stringify(node.description || '')},
    icon: ${JSON.stringify(node.icon || '')},
    keywords: ${JSON.stringify(node.keywords)},
    category: '${node.category}',
    insertable: ${node.insertable},
    defaultAttrs: ${JSON.stringify(defaultAttrs, null, 2).replace(/\\n/g, '\\n    ')},
    createInsertCommand: (editor) => () => {
      // Generated command - users can override this
      return editor.commands.insertNode?.('${node.nodeName}', ${JSON.stringify(defaultAttrs)}) ?? false;
    },
  }`;
  });

  const output = `/*
 * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 *
 * This file is automatically generated by the schema generator script.
 * Any manual changes will be lost when the schema is regenerated.
 *
 * Generated from: scripts/generate-qti-schema.ts
 * Generated at: ${new Date().toISOString()}
 */

export interface QtiElementDefinition {
  // Identity
  id: string;                    // 'choice-interaction'
  nodeType: string;              // 'qti_choice_interaction' (ProseMirror node name)
  tagName: string;               // 'qti-choice-interaction' (DOM tag name)
  
  // Display
  label: string;                 // 'Multiple Choice'
  description: string;           // 'A question with selectable options'
  icon: string;                  // '☑️' or icon name
  
  // Discovery (for search/filtering)
  keywords: string[];            // ['choice', 'quiz', 'mcq', 'select']
  category: 'interaction' | 'content' | 'structure';
  
  // Behavior
  insertable: boolean;           // Can this be inserted via UI?
  defaultAttrs: Record<string, unknown>;
  
  // Command - generic factory
  createInsertCommand: (editor: any) => () => boolean;
}

export const qtiElements: QtiElementDefinition[] = [
${elementDefinitions.join(',\n')}
];

// Convenience filters
export const insertableElements = qtiElements.filter(el => el.insertable);
export const interactionElements = qtiElements.filter(el => el.category === 'interaction');
export const contentElements = qtiElements.filter(el => el.category === 'content');
export const structureElements = qtiElements.filter(el => el.category === 'structure');

// Helper functions for common UI integrations
export function toSlashMenuFormat(elements: QtiElementDefinition[], editor: any) {
  return elements.map(el => ({
    id: el.id,
    label: el.label,
    keywords: el.keywords,
    onSelect: () => el.createInsertCommand(editor)(),
  }));
}

export function toToolbarFormat(elements: QtiElementDefinition[], editor: any) {
  return elements.map(el => ({
    icon: el.icon,
    title: el.label,
    onClick: () => el.createInsertCommand(editor)(),
  }));
}
`;

  await fs.mkdir(path.dirname(DEFINITIONS_OUTPUT_PATH), { recursive: true });
  await fs.writeFile(DEFINITIONS_OUTPUT_PATH, output);

  console.log(
    `Generated element definitions: ${path.relative(ROOT, DEFINITIONS_OUTPUT_PATH)}`,
  );
}

async function loadManifest(): Promise<CEM | null> {
  if (!fsSync.existsSync(MANIFEST_PATH)) {
    return null;
  }
  const data = await fs.readFile(MANIFEST_PATH, 'utf8');
  return JSON.parse(data) as CEM;
}

async function buildOnce() {
  const manifest = await loadManifest();
  const declarations: Record<string, any>[] = [];

  if (manifest) {
    for (const module of manifest.modules || []) {
      for (const declaration of module.declarations || []) {
        if (declaration?.kind === 'class' && declaration?.customElement) {
          declarations.push(declaration);
        }
      }
    }
  }

  const nodes = declarations
    .map(buildNodeSpec)
    .filter((node): node is NodeSpecInput => Boolean(node));

  const uniqueNodes = new Map<string, NodeSpecInput>();
  for (const node of nodes) {
    if (!uniqueNodes.has(node.nodeName)) {
      uniqueNodes.set(node.nodeName, node);
    }
  }

  const sortedNodes = Array.from(uniqueNodes.values()).sort((a, b) =>
    a.nodeName.localeCompare(b.nodeName),
  );

  if (nodes.length === 0) {
    console.warn('No custom elements found in generated manifests.');
  }

  // Generate both files
  await Promise.all([
    generateProseKitSchema(sortedNodes),
    generateElementDefinitions(sortedNodes),
  ]);
}

async function watch() {
  let timer: NodeJS.Timeout | undefined;
  const run = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void buildOnce();
    }, 100);
  };

  if (!fsSync.existsSync(MANIFEST_PATH)) {
    console.warn(`Waiting for ${path.relative(ROOT, MANIFEST_PATH)}...`);
  }

  fsSync.watch(path.dirname(MANIFEST_PATH), (_event, filename) => {
    if (filename === path.basename(MANIFEST_PATH)) {
      run();
    }
  });

  await buildOnce();
}

async function main() {
  const watchMode = process.argv.includes('--watch');
  if (watchMode) {
    await watch();
    return;
  }
  await buildOnce();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
