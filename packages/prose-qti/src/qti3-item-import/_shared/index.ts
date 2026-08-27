export { buildCorrectResponseIndex } from './correct-response';
export {
  analyzeResponseProcessing,
  normalizeTemplateUri,
  readAreaMapping,
  readStringMapping,
} from './response-processing';
export type { ResponseProcessingFacts } from './response-processing';
export { findUnrepresentableResponseProcessing } from './response-processing-gaps';
export type { FindUnrepresentableResponseProcessingOptions } from './response-processing-gaps';
export { buildScoreIndex, extractItemScore } from './score';
export { hoistScoringAttributes } from './hoist';
