import { describe, expect, it } from 'vitest';
import { cellsBetween } from './layout';

describe('cellsBetween', () => {
  const touching = (cells: { x: number; y: number }[], from: { x: number; y: number }) => {
    let prev = from;
    for (const c of cells) {
      expect(Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y)).toBe(1);
      prev = c;
    }
  };

  it('walks a straight line and ends on the target', () => {
    expect(cellsBetween({ x: 0, y: 0 }, { x: 3, y: 0 })).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(cellsBetween({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([]);
  });

  it('never steps diagonally, in any direction', () => {
    for (const [bx, by] of [[4, 3], [-3, 5], [-5, -2], [2, -6], [1, 1]]) {
      const cells = cellsBetween({ x: 0, y: 0 }, { x: bx, y: by });
      touching(cells, { x: 0, y: 0 });
      expect(cells[cells.length - 1]).toEqual({ x: bx, y: by });
      expect(cells).toHaveLength(Math.abs(bx) + Math.abs(by));
    }
  });
});
