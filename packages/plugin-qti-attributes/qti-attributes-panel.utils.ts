export interface EditorLikeView {
  dom?: ParentNode | null;
}

export type PopoverSide = 'left' | 'right';

export function resolveAnchorElement(
  view: EditorLikeView | null | undefined,
  selector: string,
): HTMLElement | null {
  const root = view?.dom;
  if (!root || typeof root.querySelector !== 'function') return null;
  const element = root.querySelector(selector);
  return element instanceof HTMLElement ? element : null;
}

export function computePopoverSide(anchor: HTMLElement, viewportWidth: number): PopoverSide {
  const rect = anchor.getBoundingClientRect();
  const rightSpace = viewportWidth - rect.right;
  const leftSpace = rect.left;
  return rightSpace >= leftSpace ? 'right' : 'left';
}
