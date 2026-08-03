import { describe, expect, test } from 'vitest';

import { buildEditorSchema } from './editor-schema';
import { IDENTIFIED, NOTES } from './notes';

/**
 * Keep `notes.ts` honest.
 *
 * The notes are prose about a schema that changes underneath them, and prose does not fail a build
 * when it goes stale. These two tests are the only mechanical claims the notes make — that each one
 * describes a node that still exists, and that every node listed in IDENTIFIED really carries the
 * attribute the name promises. Both are cheap, and both catch the failure mode that matters: a note
 * outliving what it describes.
 *
 * The document shapes those notes describe are asserted in markup-contract.browser.test.ts. This
 * file only checks the notes still point at something real.
 */
const built = () => buildEditorSchema();

describe('hand-authored notes', () => {
  test('every note names a node that still exists', () => {
    const names = Object.keys(built().nodes);
    const orphans = Object.keys(NOTES).filter(name => !names.includes(name));
    expect(orphans, `notes for nodes that are gone: ${orphans.join(', ')}`).toEqual([]);
  });

  test('every IDENTIFIED node really has an identifier attribute', () => {
    const real = new Map<string, Record<string, unknown>>();
    built().spec.nodes.forEach((name: string, spec: Record<string, unknown>) => real.set(name, spec));
    const problems = IDENTIFIED.filter(name => !(real.get(name)?.attrs as Record<string, unknown>)?.identifier);
    expect(problems, `listed in IDENTIFIED without an identifier attr: ${problems.join(', ')}`).toEqual([]);
  });
});
