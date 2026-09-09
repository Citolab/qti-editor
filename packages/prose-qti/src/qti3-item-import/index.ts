export { roundtripChoice } from './roundtrip-choice';
export { roundtripTextEntry } from './roundtrip-text-entry';
export { roundtripExtendedText } from './roundtrip-extended-text';
export { roundtripMatch } from './roundtrip-match';
export { roundtripGapMatch } from './roundtrip-gap-match';
export { roundtripOrder } from './roundtrip-order';
export { roundtripSelectPoint } from './roundtrip-select-point';
export { roundtripInteractions } from './roundtrip-interactions';
export { roundtripItemBody } from './roundtrip-item-body';
export { reduceToItemBody } from './reduce-to-item-body';
export { roundtripQtiItem } from './roundtrip-qti-item';
// The scoring-gap scan. Here rather than left inside `_shared` because `_shared` is not an exported
// subpath, so a self-reference into it would emit an import no consumer of this package can resolve
// — and because `item-roundtrip` needs it to build `itemBodyAndGapsFromString`.
export {
  findUnrepresentableResponseProcessing,
  type FindUnrepresentableResponseProcessingOptions,
} from './_shared/index.js';
