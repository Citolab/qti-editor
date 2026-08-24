// Entry point for the preview iframe (see preview.html). This document is
// intentionally separate from the main editor document: `@qti-components/item`
// registers custom elements under the literal QTI spec tag names (e.g.
// `qti-extended-text-interaction`), and `@citolab/prose-qti`'s authoring
// components register the *same* tag names in the editor document for
// ProseMirror-driven editing (their textareas are `inert` by design). Custom
// element registration is global per document, so both can't coexist in one
// page — this iframe gives the real, candidate-interactive components their
// own registry to claim those tags in.

// item.css at page level, and only item.css.
//
// The actual choice/radio/checkbox visuals live in item.css as `::part()` rules sized from
// `:root { --qti-control-size: ...; }` custom properties. item-container already adopts its own copy
// of item.css into its shadow root (for the `::part()` selectors to match), but a `:root` block
// inside a shadow-adopted stylesheet never matches anything — only a real page-level `:root` does.
// Custom properties inherit through shadow boundaries even though selectors do not, so importing
// item.css here (page level) is what makes those variables — and therefore the visuals — take effect.
//
// native.css is NOT imported. It is the QTI-spec layout utility vocabulary (qti-display-flex,
// qti-orientation-*, qti-layout-col*), and item.css already `@import`s it — postcss-import inlines
// it at theme build time, so all 317 of its class selectors are in the file below. Importing both
// shipped the same 20KB twice into one document.
//
// The font comes from preview.html; the theme declares none. See the note there.

// Must come first: claims the standard QTI tag names for the correction-capable
// subclasses before the plain packages below register their own. See the module.
import './preview-corrections';

import '@qti-components/theme/item.css';
import '@qti-components/elements';
import '@qti-components/item';

// Response-processing rule/expression elements (qti-response-condition, qti-match,
// qti-set-outcome-value, etc.) used by the response processing templates that
// `<qti-response-processing template="...">` expands into. Without this, those
// elements never upgrade past plain HTMLElement and `rule.process()` throws.
import '@qti-components/processing';

import type { QtiAssessmentItem } from '@qti-components/elements';
import type { QtiAssessmentItemCorrection } from '@qti-components/corrections';

// Shared sub-elements referenced by multiple interaction types (qti-simple-choice,
// qti-simple-associable-choice, qti-gap, qti-gap-text, qti-hottext, qti-prompt, etc.)
// — each interaction package registers only its own top-level tag, not these.
import '@qti-components/interactions-core/register';

// Only the interaction types the editor can actually author — keeps this
// bundle from pulling in unused types (hotspot, slider, media, upload,
// graphic-*, custom/PCI, end-attempt) that @qti-components/interactions'
// umbrella package would otherwise include.
import '@qti-components/associate-interaction';
import '@qti-components/choice-interaction';
import '@qti-components/extended-text-interaction';
import '@qti-components/gap-match-interaction';
import '@qti-components/hottext-interaction';
import '@qti-components/inline-choice-interaction';
import '@qti-components/match-interaction';
import '@qti-components/order-interaction';
import '@qti-components/select-point-interaction';
import '@qti-components/text-entry-interaction';

interface QtiPreviewXmlMessage {
  type: 'qti-preview:xml';
  xml: string;
}

interface QtiPreviewSimulateEndAttemptMessage {
  type: 'qti-preview:simulate-end-attempt';
}

interface QtiPreviewShowCorrectResponseMessage {
  type: 'qti-preview:show-correct-response';
  show: boolean;
}

interface QtiPreviewScoreMessage {
  type: 'qti-preview:score';
  score: number | null;
  maxScore: number | null;
  completionStatus: string | null;
}

function isQtiPreviewXmlMessage(data: unknown): data is QtiPreviewXmlMessage {
  return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === 'qti-preview:xml';
}

function isQtiPreviewSimulateEndAttemptMessage(data: unknown): data is QtiPreviewSimulateEndAttemptMessage {
  return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === 'qti-preview:simulate-end-attempt';
}

function isQtiPreviewShowCorrectResponseMessage(data: unknown): data is QtiPreviewShowCorrectResponseMessage {
  return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === 'qti-preview:show-correct-response';
}

const root = document.getElementById('root')!;
root.innerHTML = `
  <qti-item>
    <item-container class="block"></item-container>
  </qti-item>
`;

const container = root.querySelector('item-container') as (HTMLElement & { itemXML: string | null }) | null;

// `qti-assessment-item` resolves to the correction subclass — preview-corrections
// registers it under that tag — so the element carries showCorrectResponse().
function getAssessmentItem(): QtiAssessmentItemCorrection | null {
  const item = container?.shadowRoot?.querySelector('qti-assessment-item');
  return (item as QtiAssessmentItemCorrection | null | undefined) ?? null;
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function postScore(assessmentItem: QtiAssessmentItem) {
  const message: QtiPreviewScoreMessage = {
    type: 'qti-preview:score',
    score: toNumber(assessmentItem.getOutcome('SCORE')?.value),
    maxScore: toNumber(assessmentItem.getOutcome('MAXSCORE')?.value),
    completionStatus: (assessmentItem.getOutcome('completionStatus')?.value as string) ?? null,
  };
  window.parent.postMessage(message, window.location.origin);
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin || event.source !== window.parent) return;

  if (isQtiPreviewXmlMessage(event.data) && container) {
    container.itemXML = event.data.xml;
    return;
  }

  if (isQtiPreviewSimulateEndAttemptMessage(event.data)) {
    const assessmentItem = getAssessmentItem();
    if (!assessmentItem?.querySelector('qti-response-processing')) return;
    try {
      assessmentItem.processResponse(true, true);
      postScore(assessmentItem);
    } catch (error) {
      console.error('Failed to simulate end attempt:', error);
    }
    return;
  }

  if (isQtiPreviewShowCorrectResponseMessage(event.data)) {
    getAssessmentItem()?.showCorrectResponse(event.data.show);
  }
});

window.parent.postMessage({ type: 'qti-preview:ready' }, window.location.origin);
