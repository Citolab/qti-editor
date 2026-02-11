export const QTI_ATTRIBUTES_ANCHOR_NAME = '--qti-attributes-anchor';

export const QTI_ATTRIBUTES_ANCHOR_CLASS = 'qti-attributes-anchor-node';

export function isInteractionNodeName(name: string | null | undefined): boolean {
  if (!name) return false;
  return /interaction$/i.test(name);
}
