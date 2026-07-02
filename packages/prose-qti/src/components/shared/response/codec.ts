// Re-export the response codec. Temporarily sourced from a local vendored copy
// (`./response.ts`) so the editor can consume the latest published
// `@qti-components/*` packages from npm without waiting on an upstream release.
// Once the upstream package publishes these symbols, delete `./response.ts` and
// change the source below back to `@qti-components/base`.
export {
  parseResponseAttribute,
  serializeResponseAttribute,
  responseAttributeConverter,
  type ResponseValue,
  type Identifier,
  type DirectedPair,
  type Point,
  iterResponseValues,
  parsePair,
  serializePair,
  parsePoint,
  serializePoint,
} from './response.js';
