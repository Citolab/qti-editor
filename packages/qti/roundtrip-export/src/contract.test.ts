import { describe, expect, it } from 'vitest';
import { DATA_ATTRIBUTE_MAPPINGS } from '@qti-editor/qti-roundtrip-import';
import { collectMirrorMappings } from '@qti-editor/core/composer';
import { listInteractionDescriptors } from '@qti-editor/core/interactions/composer';

/**
 * Executable form of the paired-contract guard described in ROUNDTRIP.md.
 *
 * If this test fails, the export and import packages have drifted — likely
 * someone added a `data-*` mapping to one package without its mirror in the
 * other. Update both packages and the ROUNDTRIP.md contract table.
 */
describe('roundtrip data-* contract (export ↔ import)', () => {
  const exportTargets = new Set<string>(
    listInteractionDescriptors().flatMap(descriptor =>
      collectMirrorMappings(descriptor.composerMetadata).map(m => m.target),
    ),
  );
  const importSources = new Set<string>(DATA_ATTRIBUTE_MAPPINGS.map(m => m.source));

  it('every data-* attribute written by export is read by import', () => {
    const missing = [...exportTargets].filter(target => !importSources.has(target));
    expect(missing, `export writes ${missing.join(', ')} but import has no mapping for it`).toEqual([]);
  });

  it('every data-* attribute read by import is written by export', () => {
    const unused = [...importSources].filter(source => !exportTargets.has(source));
    expect(unused, `import reads ${unused.join(', ')} but export never writes it`).toEqual([]);
  });

  it('all export `target` keys use the data- prefix', () => {
    const bad = [...exportTargets].filter(t => !t.startsWith('data-'));
    expect(bad, `export mappings must produce data-* attributes, got: ${bad.join(', ')}`).toEqual([]);
  });

  it('all import `source` keys use the data- prefix', () => {
    const bad = [...importSources].filter(s => !s.startsWith('data-'));
    expect(bad, `import mappings must consume data-* attributes, got: ${bad.join(', ')}`).toEqual([]);
  });
});
