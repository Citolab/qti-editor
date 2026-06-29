import { expect, test } from 'vitest';
import { mountQtiRuntime } from './runtime-harness';

const MINIMAL_ITEM = `<qti-assessment-item identifier="smoke" title="smoke" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>A</qti-value>
    </qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>
  <qti-item-body>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1">
      <qti-simple-choice identifier="A">A</qti-simple-choice>
      <qti-simple-choice identifier="B">B</qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct.xml"/>
</qti-assessment-item>`;

test('runtime harness mounts an item and exposes processResponse + getOutcome', async () => {
  const harness = await mountQtiRuntime(MINIMAL_ITEM);
  const ai = harness.assessmentItem as any;

  // Start at default score 0
  expect(+ai.getOutcome('SCORE').value).toBe(0);

  // Pick correct answer programmatically, process, expect score=1
  ai.updateResponseVariable('RESPONSE', 'A');
  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

test('mounting twice in the same test does not throw on customElements.define', async () => {
  const a = await mountQtiRuntime(MINIMAL_ITEM);
  const b = await mountQtiRuntime(MINIMAL_ITEM);
  expect(a.iframe).not.toBe(b.iframe);
  a.destroy();
  b.destroy();
});
