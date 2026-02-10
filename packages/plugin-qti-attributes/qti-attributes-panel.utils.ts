export interface RectCoords {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Position {
  left: number;
  top: number;
}

export interface PopoverLayoutInput {
  anchor: RectCoords;
  manualPosition: Position | null;
  viewportWidth: number;
  viewportHeight: number;
  popoverWidth: number;
  popoverMaxHeight: number;
  viewportPadding: number;
  gap: number;
  tetherOffset: number;
}

export interface PopoverLayout {
  left: number;
  top: number;
  popoverWidth: number;
  popoverHeight: number;
  connectorPath: string;
}

export function buildCandidatePositions(
  selection: { head?: number; from?: number } | null | undefined,
  activeNodePos: number | null,
): number[] {
  const positions: number[] = [];

  if (selection) {
    const selectionPos =
      typeof selection.head === 'number' ? selection.head : selection.from;
    if (typeof selectionPos === 'number') {
      positions.push(selectionPos);
    }
  }

  if (typeof activeNodePos === 'number') {
    positions.push(activeNodePos, activeNodePos + 1);
  }

  return positions;
}

export function getCoordsFromCandidates(
  positions: number[],
  getCoordsAtPos: (pos: number) => RectCoords,
): RectCoords | null {
  for (const pos of positions) {
    try {
      const coords = getCoordsAtPos(pos);
      if (coords) {
        return coords;
      }
    } catch {
      // Continue trying candidate positions.
    }
  }

  return null;
}

export function clampPopoverPosition(
  position: Position,
  bounds: {
    viewportWidth: number;
    viewportHeight: number;
    popoverWidth: number;
    popoverHeight: number;
    viewportPadding: number;
  },
): Position {
  const left = Math.max(
    bounds.viewportPadding,
    Math.min(
      position.left,
      bounds.viewportWidth - bounds.popoverWidth - bounds.viewportPadding,
    ),
  );

  const top = Math.max(
    bounds.viewportPadding,
    Math.min(
      position.top,
      bounds.viewportHeight - bounds.popoverHeight - bounds.viewportPadding,
    ),
  );

  return { left, top };
}

export function computePopoverLayout(input: PopoverLayoutInput): PopoverLayout {
  const popoverWidth = Math.min(
    input.popoverWidth,
    input.viewportWidth - input.viewportPadding * 2,
  );
  const popoverHeight = Math.min(
    input.popoverMaxHeight,
    input.viewportHeight - input.viewportPadding * 2,
  );

  const canPlaceRight =
    input.anchor.right + input.gap + popoverWidth <=
    input.viewportWidth - input.viewportPadding;
  const canPlaceLeft =
    input.anchor.left - input.gap - popoverWidth >= input.viewportPadding;
  const placeRight = canPlaceRight
    ? true
    : canPlaceLeft
      ? false
      : input.viewportWidth - input.anchor.right >= input.anchor.left;

  const initialLeft = input.manualPosition
    ? input.manualPosition.left
    : placeRight
      ? input.anchor.right + input.gap
      : input.anchor.left - popoverWidth - input.gap;
  const initialTop = input.manualPosition
    ? input.manualPosition.top
    : input.anchor.top;

  const { left, top } = clampPopoverPosition(
    { left: initialLeft, top: initialTop },
    {
      viewportWidth: input.viewportWidth,
      viewportHeight: input.viewportHeight,
      popoverWidth,
      popoverHeight,
      viewportPadding: input.viewportPadding,
    },
  );

  const anchorX = (input.anchor.left + input.anchor.right) / 2;
  const anchorY = (input.anchor.top + input.anchor.bottom) / 2;
  const popoverLeft = left;
  const popoverRight = left + popoverWidth;
  const popoverTop = top;
  const popoverBottom = top + popoverHeight;

  let endX = popoverLeft - input.tetherOffset;
  if (anchorX > popoverRight) {
    endX = popoverRight + input.tetherOffset;
  } else if (anchorX > popoverLeft) {
    endX =
      anchorX >= (popoverLeft + popoverRight) / 2
        ? popoverRight + input.tetherOffset
        : popoverLeft - input.tetherOffset;
  }

  const endY = Math.max(popoverTop + 16, Math.min(anchorY, popoverBottom - 16));
  const controlOffset = Math.max(28, Math.min(120, Math.abs(endX - anchorX) * 0.45));
  const c1x = anchorX < endX ? anchorX + controlOffset : anchorX - controlOffset;
  const c2x = anchorX < endX ? endX - controlOffset : endX + controlOffset;

  const connectorPath = `M ${anchorX} ${anchorY} C ${c1x} ${anchorY}, ${c2x} ${endY}, ${endX} ${endY}`;

  return {
    left,
    top,
    popoverWidth,
    popoverHeight,
    connectorPath,
  };
}
