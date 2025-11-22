/**
 * Masonry layout calculation for gallery display
 * Generates position and size for each image based on preset spans
 */

export interface MasonryItem {
  id: string;
  span: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

export interface LayoutDimensions {
  items: MasonryItem[];
  totalHeight: number;
  columnCount: number;
}

const ITEM_HEIGHT = 200; // Base height for all items
const COLUMN_WIDTH = 100; // % of available space per column
const COLUMNS = 12; // Total columns in grid

/**
 * Calculate masonry layout based on item order and preset spans
 * Returns positioning info for each item
 */
export function calculateMasonryLayout(
  itemIds: string[],
  spans: number[],
  containerWidth: number
): LayoutDimensions {
  const items: MasonryItem[] = [];
  const columnHeights: number[] = Array(COLUMNS).fill(0);

  let itemIndex = 0;
  let currentRow = 0;
  let rowStartIndex = 0;

  // Process items in batches (rows)
  while (itemIndex < itemIds.length) {
    const currentSpan = spans[itemIndex % spans.length];
    
    // Find best column position for this item
    let bestCol = 0;
    let bestHeight = columnHeights[0];

    for (let col = 0; col <= COLUMNS - currentSpan; col++) {
      let maxHeight = 0;
      for (let c = col; c < col + currentSpan; c++) {
        maxHeight = Math.max(maxHeight, columnHeights[c]);
      }
      if (maxHeight < bestHeight) {
        bestHeight = maxHeight;
        bestCol = col;
      }
    }

    // Calculate dimensions
    const colWidth = (containerWidth / COLUMNS) * currentSpan;
    const height = ITEM_HEIGHT;

    items.push({
      id: itemIds[itemIndex],
      span: currentSpan,
      width: colWidth,
      height,
      row: currentRow,
      col: bestCol,
    });

    // Update column heights
    for (let col = bestCol; col < bestCol + currentSpan; col++) {
      columnHeights[col] = bestHeight + height;
    }

    itemIndex++;

    // Check if we've filled a row and need to start a new one
    if (itemIndex % Math.ceil(COLUMNS / Math.min(...spans)) === 0) {
      currentRow++;
    }
  }

  const totalHeight = Math.max(...columnHeights);

  return {
    items,
    totalHeight,
    columnCount: COLUMNS,
  };
}

/**
 * Responsive column count based on container width
 */
export function getResponsiveColumns(containerWidth: number): number {
  if (containerWidth < 640) return 2; // mobile
  if (containerWidth < 1024) return 3; // tablet
  return 4; // desktop
}

/**
 * Recalculate spans for responsive design
 */
export function recalculateResponsiveSpans(
  originalSpans: number[],
  originalColumns: number,
  newColumns: number
): number[] {
  // Scale spans based on column change
  const scale = newColumns / originalColumns;
  return originalSpans.map((span) => Math.max(1, Math.round(span * scale)));
}
