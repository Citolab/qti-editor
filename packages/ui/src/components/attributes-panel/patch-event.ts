export const QTI_ATTRIBUTES_PATCH_EVENT = 'qti:attributes:patch';

export interface QtiAttributesPatchDetail {
  pos: number;
  attrs: Record<string, unknown>;
}
