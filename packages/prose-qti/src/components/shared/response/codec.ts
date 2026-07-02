// Re-export the canonical codec from @qti-components/base — single source of
// truth across both the runtime and the editor. Local code keeps importing
// from this file; the implementation lives upstream.
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
} from '@qti-components/base';
