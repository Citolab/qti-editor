// Registers the correction-capable element set, and must be imported *before*
// any of the plain @qti-components packages (see preview-entry.ts).
//
// `@qti-components/corrections` supplies subclasses that claim the same standard
// tag names as the plain packages — `qti-assessment-item` resolves to
// `QtiAssessmentItemCorrection`, which is what adds `showCorrectResponse()` and
// `showCandidateCorrection()` on top of `QtiAssessmentItem`. Every package's own
// register step guards with `if (!customElements.get(tag))`, so registration is
// first-one-wins: whichever set is defined first keeps the tag. Registering the
// corrections here, from a module that evaluates ahead of the plain imports, is
// what makes the correction behaviour take effect.
//
// This has to be a separate module rather than a block at the top of
// preview-entry.ts: a module's own statements run only after *all* of its static
// imports have been evaluated, so inline code there would run too late.
//
// The corrections package deliberately imports the non-registering `/elements`
// subpath of each plain package, so importing it does not itself define any tag
// and cannot lose the race it is trying to win.
import { qtiCorrectionElements } from '@qti-components/corrections/elements';

for (const { tag, ctor } of qtiCorrectionElements) {
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
}
