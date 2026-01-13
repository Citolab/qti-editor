import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(
  ROOT,
  'packages/plugin-qti-components/src/shared/generated-prosemirror-schema.ts'
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
};

function tagNameToNodeName(tagName: string): string {
  return tagName.replace(/-/g, '_');
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
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

function collectAttrs(declaration: Record<string, any>): Record<string, AttrSpecInfo> {
  const attrs = new Map<string, AttrSpecInfo>();

  for (const attr of declaration.attributes || []) {
    const name = attr?.name;
    if (!name) continue;
    const attrName = toCamelCase(name);
    const existing = attrs.get(attrName) || { domAttr: name };
    const defaultValue = parseDefaultValue(attr?.default);
    attrs.set(
      attrName,
      defaultValue !== undefined ? { ...existing, default: defaultValue } : existing
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
  const selectableOverride = normalizeBoolean(declaration.proseMirrorSelectable);
  const definingOverride = normalizeBoolean(declaration.proseMirrorDefining);
  const isolatingOverride = normalizeBoolean(declaration.proseMirrorIsolating);
  const toolbarOverride = normalizeBoolean(declaration.proseMirrorToolbar);

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
    toolbar: toolbarOverride !== false
  };
}

function stringifyAttrDefaults(attrs: Record<string, AttrSpecInfo>): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return '{}';
  const lines = entries.map(([name, spec]) => {
    if (spec?.default !== undefined) {
      return `  ${JSON.stringify(name)}: { default: ${JSON.stringify(spec.default)} }`;
    }
    return `  ${JSON.stringify(name)}: { default: null }`;
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
      .map(([name, spec]) => `${JSON.stringify(name)}: ${JSON.stringify(spec.domAttr)}`)
      .join(',\n    ')}
  }`;
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
    a.nodeName.localeCompare(b.nodeName)
  );

  if (nodes.length === 0) {
    console.warn('No custom elements found in generated manifests.');
  }

  const nodeLines: string[] = [];
  nodeLines.push(`  doc: { content: 'block+' },`);
  nodeLines.push(`  text: { group: 'inline' },`);

  for (const node of sortedNodes) {
    const attrsObject = stringifyAttrDefaults(node.attrs);
    const attrsMap = stringifyAttrMap(node.attrs);
    const extraFlags: string[] = [];

    if (node.inline) extraFlags.push('inline: true');
    if (node.group) extraFlags.push(`group: ${JSON.stringify(node.group)}`);
    if (node.content && !node.atom) extraFlags.push(`content: ${JSON.stringify(node.content)}`);
    if (node.marks) extraFlags.push(`marks: ${JSON.stringify(node.marks)}`);
    if (node.atom) extraFlags.push('atom: true');
    if (node.selectable !== undefined) extraFlags.push(`selectable: ${node.selectable}`);
    if (node.defining !== undefined) extraFlags.push(`defining: ${node.defining}`);
    if (node.isolating !== undefined) extraFlags.push(`isolating: ${node.isolating}`);

    const flags = extraFlags.length > 0 ? `${extraFlags.join(',\n    ')},` : '';

    nodeLines.push(
      `  ${JSON.stringify(node.nodeName)}: {\n` +
        `    attrs: ${attrsObject},\n` +
        `    parseDOM: [{ tag: ${JSON.stringify(node.tagName)}, getAttrs: (dom) => parseDomAttrs(dom, ${attrsMap}) }],\n` +
        `    toDOM: createToDOM(${JSON.stringify(node.tagName)}, ${node.hasContent}, ${node.atom}, ${attrsMap}),\n` +
        (flags ? `    ${flags}\n` : '') +
        `  },`
    );
  }

  const mappingLines = sortedNodes
    .slice()
    .sort((a, b) => a.tagName.localeCompare(b.tagName))
    .map((node) => `  ${JSON.stringify(node.tagName)}: ${JSON.stringify(node.nodeName)}`);

  const toolbarLines = sortedNodes
    .filter((node) => node.toolbar)
    .map((node) => `  ${JSON.stringify(node.nodeName)}`);

  const output = `import { Schema, type MarkSpec, type NodeSpec } from 'prosemirror-model';

const coreNodes: Record<string, NodeSpec> = {
  paragraph: {
    content: 'inline*',
    group: 'block',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },
  image: {
    inline: true,
    group: 'inline',
    atom: true,
    attrs: {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    },
    parseDOM: [
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            src: el.getAttribute('src'),
            alt: el.getAttribute('alt'),
            title: el.getAttribute('title'),
          };
        },
      },
    ],
    toDOM: (node) => ['img', node.attrs],
  },
};

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
  ...coreNodes,
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

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, output);

  console.log(`Generated ProseMirror schema: ${path.relative(ROOT, OUTPUT_PATH)}`);
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
