/**
 * Phase 1 snapshot fixture — REGEX PIPELINE BASELINE
 *
 * Locks the CURRENT byte-for-byte output of the regex-based
 * `preserveEditorDataAttributes` pass in `packages/qti/package/src/index.ts`,
 * driven via `createQtiPackageFromItems`. This pipeline operates on raw XML strings
 * (no DOM) and only mirrors the small EDITOR_DATA_ATTRIBUTE_MAPPINGS set.
 *
 * For the DOM compose pipeline baseline (which additionally STRIPS source attrs and
 * SYNTHESIZES `<qti-rubric-block>`), see:
 *   packages/qti/core/src/composer/non-qti-mirror.snapshot.browser.test.ts
 *
 * This file is the regression detector for the
 * `plans/unify-non-qti-attribute-metadata.md` migration. Phase 4 changes the regex
 * pipeline; each subsequent phase must keep these snapshots byte-identical. If
 * anything diffs, the migration broke the wire format — STOP and investigate.
 *
 * Do NOT use non-deterministic data (no Math.random / no Date.now / no random ids).
 * Do NOT snapshot the IMS package zip — only per-item XML strings.
 */
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';

import { createQtiPackageFromItems } from './index';

const itemXml = (identifier: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="${identifier}" title="${identifier}" adaptive="false" time-dependent="false">
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;

async function exportItemXml(identifier: string, body: string): Promise<string> {
  const blob = await createQtiPackageFromItems(
    [{ identifier, title: identifier, xml: itemXml(identifier, body) }],
    { identifier: 'snapshot-pkg' },
  );
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file(`items/${identifier}.xml`)?.async('string');
  if (xml == null) throw new Error(`Item XML missing for ${identifier}`);
  return xml;
}

describe('non-QTI data-* mirror snapshots (Phase 1 baseline)', () => {
  it('choice interaction mirrors correct-response and score', async () => {
    const xml = await exportItemXml(
      'snap-choice',
      String.raw`
        <qti-choice-interaction response-identifier="RESPONSE" correct-response="choice-a" score="2" max-choices="1">
          <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
          <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
        </qti-choice-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-choice" title="snap-choice" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-choice-interaction response-identifier="RESPONSE" correct-response="choice-a" score="2" max-choices="1" data-correct-response="choice-a" data-score="2">
                <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
                <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
              </qti-choice-interaction>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('inline-choice interaction mirrors correct-response and score', async () => {
    const xml = await exportItemXml(
      'snap-inline-choice',
      String.raw`
        <p>Pick:
          <qti-inline-choice-interaction response-identifier="INLINE" correct-response="ic-a" score="1">
            <qti-inline-choice identifier="ic-a">A</qti-inline-choice>
            <qti-inline-choice identifier="ic-b">B</qti-inline-choice>
          </qti-inline-choice-interaction>
        </p>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-inline-choice" title="snap-inline-choice" adaptive="false" time-dependent="false">
        <qti-item-body>
              <p>Pick:
                <qti-inline-choice-interaction response-identifier="INLINE" correct-response="ic-a" score="1" data-correct-response="ic-a" data-score="1">
                  <qti-inline-choice identifier="ic-a">A</qti-inline-choice>
                  <qti-inline-choice identifier="ic-b">B</qti-inline-choice>
                </qti-inline-choice-interaction>
              </p>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('text-entry interaction mirrors correct-response, score, case-sensitive', async () => {
    const xml = await exportItemXml(
      'snap-text-entry',
      String.raw`
        <p>
          <qti-text-entry-interaction
            response-identifier="TEXT"
            correct-response="alpha,beta"
            score="3"
            case-sensitive="true" />
        </p>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-text-entry" title="snap-text-entry" adaptive="false" time-dependent="false">
        <qti-item-body>
              <p>
                <qti-text-entry-interaction
                  response-identifier="TEXT"
                  correct-response="alpha,beta"
                  score="3"
                  case-sensitive="true"  data-correct-response="alpha,beta" data-score="3" data-case-sensitive="true" />
              </p>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('extended-text interaction mirrors correct-response and score', async () => {
    const xml = await exportItemXml(
      'snap-extended-text',
      String.raw`
        <qti-extended-text-interaction response-identifier="EXTENDED" correct-response="Model answer" score="4" expected-lines="6" />
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-extended-text" title="snap-extended-text" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-extended-text-interaction response-identifier="EXTENDED" correct-response="Model answer" score="4" expected-lines="6"  data-correct-response="Model answer" data-score="4" />
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('extended-text interaction with rubricScoringBlock — regex pipeline does NOT strip and does NOT synthesize rubric block (DOM-compose-only behavior)', async () => {
    // PIPELINE DIVERGENCE NOTE: The regex pipeline in roundtrip-export only mirrors
    // the EDITOR_DATA_ATTRIBUTE_MAPPINGS set (correct-response, score). It does NOT
    // strip arbitrary camelCase attrs and does NOT synthesize <qti-rubric-block>.
    // That synthesis happens only in the DOM compose pipeline in qti-core.
    // This snapshot locks the CURRENT regex-pipeline behavior for Phase 4 regression.
    const xml = await exportItemXml(
      'snap-extended-text-rubric',
      String.raw`
        <qti-extended-text-interaction
          response-identifier="EXTENDED"
          correct-response="Model answer"
          score="4"
          expected-lines="6"
          rubricScoringBlock="Award 1 point for any correct mention of photosynthesis." />
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-extended-text-rubric" title="snap-extended-text-rubric" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-extended-text-interaction
                response-identifier="EXTENDED"
                correct-response="Model answer"
                score="4"
                expected-lines="6"
                rubricScoringBlock="Award 1 point for any correct mention of photosynthesis."  data-correct-response="Model answer" data-score="4" />
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('associate interaction mirrors correct-response and score', async () => {
    const xml = await exportItemXml(
      'snap-associate',
      String.raw`
        <qti-associate-interaction response-identifier="ASSOC" correct-response="a b" score="2" max-associations="1">
          <qti-simple-associable-choice identifier="a" match-max="1">A</qti-simple-associable-choice>
          <qti-simple-associable-choice identifier="b" match-max="1">B</qti-simple-associable-choice>
        </qti-associate-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-associate" title="snap-associate" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-associate-interaction response-identifier="ASSOC" correct-response="a b" score="2" max-associations="1" data-correct-response="a b" data-score="2">
                <qti-simple-associable-choice identifier="a" match-max="1">A</qti-simple-associable-choice>
                <qti-simple-associable-choice identifier="b" match-max="1">B</qti-simple-associable-choice>
              </qti-associate-interaction>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('hottext interaction mirrors correct-response and score', async () => {
    const xml = await exportItemXml(
      'snap-hottext',
      String.raw`
        <qti-hottext-interaction response-identifier="HOT" correct-response="ht-a" score="2" max-choices="1">
          <p>
            Select <qti-hottext identifier="ht-a">this</qti-hottext> or <qti-hottext identifier="ht-b">that</qti-hottext>.
          </p>
        </qti-hottext-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-hottext" title="snap-hottext" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-hottext-interaction response-identifier="HOT" correct-response="ht-a" score="2" max-choices="1" data-correct-response="ht-a" data-score="2">
                <p>
                  Select <qti-hottext identifier="ht-a">this</qti-hottext> or <qti-hottext identifier="ht-b">that</qti-hottext>.
                </p>
              </qti-hottext-interaction>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('match interaction mirrors correct-response and score', async () => {
    const xml = await exportItemXml(
      'snap-match',
      String.raw`
        <qti-match-interaction response-identifier="MATCH" correct-response="a x" score="2">
          <qti-simple-match-set>
            <qti-simple-associable-choice identifier="a" match-max="1">A</qti-simple-associable-choice>
          </qti-simple-match-set>
          <qti-simple-match-set>
            <qti-simple-associable-choice identifier="x" match-max="1">X</qti-simple-associable-choice>
          </qti-simple-match-set>
        </qti-match-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-match" title="snap-match" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-match-interaction response-identifier="MATCH" correct-response="a x" score="2" data-correct-response="a x" data-score="2">
                <qti-simple-match-set>
                  <qti-simple-associable-choice identifier="a" match-max="1">A</qti-simple-associable-choice>
                </qti-simple-match-set>
                <qti-simple-match-set>
                  <qti-simple-associable-choice identifier="x" match-max="1">X</qti-simple-associable-choice>
                </qti-simple-match-set>
              </qti-match-interaction>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('gap-match interaction mirrors correct-response and score', async () => {
    const xml = await exportItemXml(
      'snap-gap-match',
      String.raw`
        <qti-gap-match-interaction response-identifier="GAP" correct-response="g1 gap-a" score="2">
          <qti-gap-text identifier="g1" match-max="1">Word</qti-gap-text>
          <p>Fill: <qti-gap identifier="gap-a"/></p>
        </qti-gap-match-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-gap-match" title="snap-gap-match" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-gap-match-interaction response-identifier="GAP" correct-response="g1 gap-a" score="2" data-correct-response="g1 gap-a" data-score="2">
                <qti-gap-text identifier="g1" match-max="1">Word</qti-gap-text>
                <p>Fill: <qti-gap identifier="gap-a"/></p>
              </qti-gap-match-interaction>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('order interaction mirrors correct-response and score', async () => {
    const xml = await exportItemXml(
      'snap-order',
      String.raw`
        <qti-order-interaction response-identifier="ORDER" correct-response="o-a,o-b,o-c" score="2">
          <qti-simple-choice identifier="o-a">A</qti-simple-choice>
          <qti-simple-choice identifier="o-b">B</qti-simple-choice>
          <qti-simple-choice identifier="o-c">C</qti-simple-choice>
        </qti-order-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-order" title="snap-order" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-order-interaction response-identifier="ORDER" correct-response="o-a,o-b,o-c" score="2" data-correct-response="o-a,o-b,o-c" data-score="2">
                <qti-simple-choice identifier="o-a">A</qti-simple-choice>
                <qti-simple-choice identifier="o-b">B</qti-simple-choice>
                <qti-simple-choice identifier="o-c">C</qti-simple-choice>
              </qti-order-interaction>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('select-point interaction mirrors correct-response, score, area-mappings', async () => {
    const xml = await exportItemXml(
      'snap-select-point',
      String.raw`
        <qti-select-point-interaction
          response-identifier="SP"
          correct-response="120 80"
          score="2"
          max-choices="1"
          area-mappings='{"defaultValue":0,"entries":[]}'>
          <qti-prompt><p>Click the point.</p></qti-prompt>
        </qti-select-point-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-select-point" title="snap-select-point" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-select-point-interaction
                response-identifier="SP"
                correct-response="120 80"
                score="2"
                max-choices="1"
                area-mappings='{"defaultValue":0,"entries":[]}' data-correct-response="120 80" data-score="2" data-area-mappings="{&quot;defaultValue&quot;:0,&quot;entries&quot;:[]}">
                <qti-prompt><p>Click the point.</p></qti-prompt>
              </qti-select-point-interaction>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });

  it('choice interaction with legacy camelCase correctResponse (Phase 4 alias-deletion guard)', async () => {
    // The forward mapping table today contains dead-code aliases `correctResponse`
    // and `correctAnswer` → `data-correct-response`. Per the plan, upstream
    // `renameLegacyHtmlAttributes` should rename camelCase to `correct-response`
    // before this pipeline ever sees the element. This snapshot captures the
    // CURRENT behavior; after Phase 4 deletes the dead aliases the snapshot must
    // still pass byte-identically — proving the aliases were unreachable.
    const xml = await exportItemXml(
      'snap-choice-legacy-camel',
      String.raw`
        <qti-choice-interaction response-identifier="RESPONSE" correctResponse="choice-a" score="2" max-choices="1">
          <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
          <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
        </qti-choice-interaction>
      `,
    );
    expect(xml).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="snap-choice-legacy-camel" title="snap-choice-legacy-camel" adaptive="false" time-dependent="false">
        <qti-item-body>
              <qti-choice-interaction response-identifier="RESPONSE" correctResponse="choice-a" score="2" max-choices="1" data-correct-response="choice-a" data-score="2">
                <qti-simple-choice identifier="choice-a">A</qti-simple-choice>
                <qti-simple-choice identifier="choice-b">B</qti-simple-choice>
              </qti-choice-interaction>
            </qti-item-body>
      </qti-assessment-item>"
    `);
  });
});
