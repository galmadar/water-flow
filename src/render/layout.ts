import type { Pos } from '../sim/types';

/** Layout units; the renderer scales them to the canvas's real pixels. */
export const CELL = 32;
export const COLS = 12;
export const ROWS = 10;
export const MARGIN = 12;

export const CANVAS_W = COLS * CELL + MARGIN * 2;
export const CANVAS_H = ROWS * CELL + MARGIN * 2;

export function cellOrigin(x: number, y: number): Pos {
  return { x: MARGIN + x * CELL, y: MARGIN + y * CELL };
}

export function cellAt(px: number, py: number): Pos | null {
  const x = Math.floor((px - MARGIN) / CELL);
  const y = Math.floor((py - MARGIN) / CELL);
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
  return { x, y };
}

/** Every cell a straight drag passes through, so a fast swipe doesn't skip squares. */
export function cellsBetween(a: Pos, b: Pos): Pos[] {
  const out: Pos[] = [];
  let { x, y } = a;
  const dx = Math.abs(b.x - x);
  const dy = Math.abs(b.y - y);
  const sx = Math.sign(b.x - x);
  const sy = Math.sign(b.y - y);
  let err = dx - dy;
  for (;;) {
    if (x !== a.x || y !== a.y) out.push({ x, y });
    if (x === b.x && y === b.y) return out;
    // Step one axis at a time: water only flows sideways, so the ditch must too.
    if (err * 2 > -dy) {
      err -= dy;
      x += sx;
    } else {
      err += dx;
      y += sy;
    }
  }
}
