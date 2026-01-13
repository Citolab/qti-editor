import { schema, tagNameToNodeName } from '../packages/plugin-qti-components/src/shared/generated-prosemirror-schema.ts';

const customNodeNames = Object.values(tagNameToNodeName);
const missing: string[] = [];

if (!schema.nodes.doc) missing.push('doc');
if (!schema.nodes.text) missing.push('text');
if (customNodeNames.length === 0) missing.push('custom nodes');

if (missing.length > 0) {
  console.error(`Schema validation failed: missing ${missing.join(', ')}.`);
  process.exitCode = 1;
  process.exit();
}

const summary = customNodeNames.map((nodeName) => {
  const spec = schema.nodes[nodeName]?.spec || {};
  return {
    node: nodeName,
    group: spec.group ?? 'block',
    inline: Boolean(spec.inline),
    atom: Boolean(spec.atom),
    content: spec.content ?? ''
  };
});

console.log(`Schema OK. Custom nodes: ${customNodeNames.length}`);
for (const item of summary) {
  console.log(
    `- ${item.node} (group=${item.group}, inline=${item.inline}, atom=${item.atom}, content=${item.content})`
  );
}
