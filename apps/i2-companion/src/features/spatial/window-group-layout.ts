import type {
  CanonicalWidgetId,
  WindowGroupLayout,
  WindowGroupLayoutMode,
} from '../../types/widgets';

export interface ResolvedGroupLayout {
  columns: 1 | 2;
  colWeights: number[];
  rowWeights: number[];
}

export interface GroupCellRect {
  widgetId: CanonicalWidgetId;
  index: number;
  col: number;
  row: number;
  colSpan: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GroupDividerRect {
  axis: 'col' | 'row';
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeWeights(raw: readonly number[] | undefined, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  const base = Array.from({ length: count }, (_, idx) => {
    const v = raw?.[idx];
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0.2, Math.min(0.8, v)) : 1;
  });
  const sum = base.reduce((acc, v) => acc + v, 0) || count;
  return base.map((v) => v / sum);
}

/**
 * Resolves a SpatialWindow's widget list & groupLayout into an active simultaneous grid.
 * Legacy 'stack' and 'tabs' presets load with every widget simultaneously visible
 * in structured side-by-side or 2D grid cells without losing existing preset data.
 */
export function resolveWindowGroupLayout(win: {
  widgetIds: readonly CanonicalWidgetId[];
  layoutMode: WindowGroupLayoutMode;
  groupLayout?: WindowGroupLayout;
}): ResolvedGroupLayout {
  const count = win.widgetIds.length;
  if (count <= 1) {
    return { columns: 1, colWeights: [1], rowWeights: [1] };
  }
  const preferredCols: 1 | 2 =
    win.groupLayout?.columns === 1 ? 1 : win.groupLayout?.columns === 2 ? 2 : count >= 2 ? 2 : 1;
  const rows = Math.ceil(count / preferredCols);
  return {
    columns: preferredCols,
    colWeights: normalizeWeights(win.groupLayout?.colWeights, preferredCols),
    rowWeights: normalizeWeights(win.groupLayout?.rowWeights, rows),
  };
}

export function adjustNormalizedWeightPair(
  weights: readonly number[],
  index: number,
  delta: number
): number[] {
  if (weights.length < 2 || index < 0 || index >= weights.length - 1) {
    return [...weights];
  }
  const next = [...weights];
  const pairTotal = next[index] + next[index + 1];
  const minPart = Math.min(0.24 * pairTotal, pairTotal * 0.45);
  const clampedFirst = Math.max(minPart, Math.min(pairTotal - minPart, next[index] + delta));
  next[index] = clampedFirst;
  next[index + 1] = pairTotal - clampedFirst;
  return normalizeWeights(next, next.length);
}

/**
 * Computes exact pixel cell rectangles + adjustable divider bounds for all widgets
 * inside a SpatialWindow content frame.
 */
export function computeGroupedCellLayout(
  win: {
    widgetIds: readonly CanonicalWidgetId[];
    layoutMode: WindowGroupLayoutMode;
    groupLayout?: WindowGroupLayout;
  },
  bounds: { x: number; y: number; width: number; height: number },
  gapPx = 12
): {
  resolved: ResolvedGroupLayout;
  cells: GroupCellRect[];
  dividers: GroupDividerRect[];
} {
  const resolved = resolveWindowGroupLayout(win);
  const count = win.widgetIds.length;
  if (count === 0) {
    return { resolved, cells: [], dividers: [] };
  }

  const cols = resolved.columns;
  const rows = resolved.rowWeights.length;
  const usableW = Math.max(40, bounds.width - gapPx * Math.max(0, cols - 1));
  const usableH = Math.max(40, bounds.height - gapPx * Math.max(0, rows - 1));

  const colWidths = resolved.colWeights.map((w) => usableW * w);
  const rowHeights = resolved.rowWeights.map((h) => usableH * h);

  const colX: number[] = [];
  let cx = bounds.x;
  for (let c = 0; c < cols; c++) {
    colX.push(cx);
    cx += colWidths[c] + gapPx;
  }

  const rowY: number[] = [];
  let ry = bounds.y;
  for (let r = 0; r < rows; r++) {
    rowY.push(ry);
    ry += rowHeights[r] + gapPx;
  }

  const cells: GroupCellRect[] = [];
  win.widgetIds.forEach((widgetId, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const isLastOddItem = cols === 2 && index === count - 1 && count % 2 === 1;
    const colSpan = isLastOddItem ? 2 : 1;
    const width = colSpan === 2 ? bounds.width : colWidths[col];
    cells.push({
      widgetId,
      index,
      col,
      row,
      colSpan,
      x: colX[col],
      y: rowY[row],
      width,
      height: rowHeights[row],
    });
  });

  const dividers: GroupDividerRect[] = [];
  if (cols === 2 && colWidths.length === 2 && count >= 2) {
    // Only split top-to-bottom where two side-by-side columns actually coexist.
    const splitBottom = count % 2 === 1 ? rowY[rows - 1] - gapPx : bounds.y + bounds.height;
    if (splitBottom > bounds.y + 20) {
      dividers.push({
        axis: 'col',
        index: 0,
        x: colX[0] + colWidths[0],
        y: bounds.y,
        width: gapPx,
        height: splitBottom - bounds.y,
      });
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    dividers.push({
      axis: 'row',
      index: r,
      x: bounds.x,
      y: rowY[r] + rowHeights[r],
      width: bounds.width,
      height: gapPx,
    });
  }

  return { resolved, cells, dividers };
}
