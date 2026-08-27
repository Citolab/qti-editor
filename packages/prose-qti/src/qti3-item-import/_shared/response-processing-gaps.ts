/**
 * Reporting response processing the editor cannot model.
 *
 * The editor holds three scoring models — `match_correct`, `map_response`,
 * `map_response_point` — and QTI response processing is a general-purpose
 * program. Anything outside those three is dropped, and until now dropped
 * silently: `reduceToItemBody` discards the whole `qti-assessment-item` root, and
 * the schema-gap scan that would have reported it runs on the item body
 * *afterwards*, so it structurally cannot see response processing at all.
 *
 * This scan closes that hole. It deliberately produces the existing
 * `SchemaGapOutcome`, so a finding reaches the reader through the same notice as
 * an unsupported element — the author does not care which door the loss came
 * through.
 *
 * It must run on the FULL item, BEFORE `reduceToItemBody`.
 */

import { withHostMessage } from '@citolab/prose-qti/schema-recovery';

import { analyzeResponseProcessing } from './response-processing.js';

import type { PreservedFragment } from '@citolab/prose-qti/interfaces';
import type {
  RecoveryChange,
  RecoveryMessageOptions,
  SchemaGapOutcome,
} from '@citolab/prose-qti/schema-recovery';

export interface FindUnrepresentableResponseProcessingOptions extends RecoveryMessageOptions {
  /** Longest quoted excerpt of a reported rule. Default 80. */
  excerptLimit?: number;
}

/**
 * Report every response-processing rule the editor cannot represent.
 *
 * Silence is the expected result for the sample corpus — all sixteen items are
 * scored by the three standard models, whether by template reference or written
 * out — and that matters: a notice that fires on every import teaches the reader
 * to dismiss it, and the next one, the one about real loss, goes with it.
 */
export function findUnrepresentableResponseProcessing(
  itemDoc: XMLDocument,
  options: FindUnrepresentableResponseProcessingOptions = {},
): SchemaGapOutcome {
  const excerptLimit = options.excerptLimit ?? 80;
  const changes: RecoveryChange[] = [];
  const preservedFragments: PreservedFragment[] = [];

  const processing = itemDoc.querySelector('qti-response-processing');
  if (!processing) return { changes, preservedFragments };

  const facts = analyzeResponseProcessing(itemDoc);

  for (const rule of facts.unrecognized) {
    const tagName = rule.localName.toLowerCase();
    const isTemplate = rule === processing;
    const path = rulePath(rule, processing);

    preservedFragments.push({
      path,
      reason: isTemplate
        ? `Response processing template "${facts.unrecognizedTemplate}" is not one this editor can score.`
        : `No scoring model in this editor can represent <${tagName}>.`,
      payload: rule.outerHTML,
      nodeType: tagName,
    });

    const change: RecoveryChange = {
      // The same kind the DOM scan uses, and for the same reason its docblock
      // gives: the sentence wanted here is "this has no equivalent in this
      // editor" about a file being imported.
      kind: 'unrepresentable-element',
      // Distinct from the DOM scan's UNKNOWN_NODE_PRESERVED, because the notice
      // groups findings by code and these are a different kind of news.
      code: 'UNSUPPORTED_CONTENT_PRESERVED',
      severity: 'warning',
      message: isTemplate
        ? `This item is scored by the response processing template "${facts.unrecognizedTemplate}", which this editor does not know. Its scoring was not imported.`
        : `Dropped a <${tagName}> scoring rule, which this editor cannot represent. The item's other scoring was imported.`,
      path,
      nodeType: tagName,
      data: {
        ...(isTemplate && facts.unrecognizedTemplate
          ? { template: facts.unrecognizedTemplate }
          : {}),
        ...(excerptOfRule(rule, excerptLimit) ? { excerpt: excerptOfRule(rule, excerptLimit) } : {}),
      },
    };

    changes.push(withHostMessage(change, options.getMessage));
  }

  return { changes, preservedFragments };
}

/** A readable trail from `qti-response-processing` down to the offending rule. */
function rulePath(rule: Element, root: Element): string {
  if (rule === root) return root.localName;

  const steps: string[] = [];
  let current: Element | null = rule;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    const index = parent ? Array.from(parent.children).indexOf(current) : -1;
    steps.unshift(index >= 0 ? `${current.localName}[${index}]` : current.localName);
    current = parent;
  }
  return [root.localName, ...steps].join(' > ');
}

/**
 * A short quote naming the rule.
 *
 * Response processing is mostly empty elements, so text content is usually
 * absent — the serialized markup is what identifies a rule to a person.
 */
function excerptOfRule(rule: Element, limit: number): string | undefined {
  const markup = rule.outerHTML.replace(/\s+/g, ' ').trim();
  if (!markup) return undefined;
  return markup.length > limit ? `${markup.slice(0, limit).trimEnd()}…` : markup;
}
