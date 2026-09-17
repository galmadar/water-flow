import { describe, expect, it } from 'vitest';
import { parseLevel } from '../sim/level';
import { Puzzle } from '../sim/Puzzle';
import { LEVELS } from './levels';

/** About 25 seconds of play at the game's speed. */
const MAX_STEPS = 6000;

function stepsToWin(p: Puzzle): number | null {
  for (let s = 1; s <= MAX_STEPS; s++) {
    p.step();
    if (p.won) return s;
  }
  return null;
}

describe('level registry', () => {
  it('has 8 levels with unique ids and names', () => {
    expect(LEVELS).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(LEVELS.length);
  });

  it('every level is 12×10 with one spring, a plant and a hint', () => {
    for (const lvl of LEVELS) {
      const p = parseLevel(lvl);
      expect([p.width, p.height], lvl.id).toEqual([12, 10]);
      expect(p.tiles.filter((t) => t === 'spring'), lvl.id).toHaveLength(1);
      expect(p.tiles.includes('plant'), lvl.id).toBe(true);
      expect(lvl.hint.length).toBeGreaterThan(0);
    }
  });
});

describe.each(LEVELS.map((l) => [l.id, l] as const))('%s', (id, lvl) => {
  it('is not won by waiting', () => {
    expect(stepsToWin(new Puzzle(lvl))).toBeNull();
  });

  it('is won by its known solution, played by hand, within the dig budget', () => {
    const p = new Puzzle(lvl);
    for (const a of lvl.solution) expect(p.apply(a), `${id}: ${JSON.stringify(a)}`).toBe(true);
    if (lvl.budget !== undefined) expect(p.digsUsed()).toBeLessThanOrEqual(lvl.budget);
    expect(stepsToWin(p), id).not.toBeNull();
  });

  it('needs every fill it lists', () => {
    const fills = lvl.solution.filter((a) => a.type === 'fill');
    if (fills.length === 0) return;
    const p = new Puzzle(lvl);
    for (const a of lvl.solution) if (a.type === 'dig') p.apply(a);
    expect(stepsToWin(p)).toBeNull();
  });

  it('"solve it for me" wins from a messy board', () => {
    const p = new Puzzle(lvl);
    p.dig(0, 0);
    p.dig(0, 9);
    expect(p.applySolution()).toBe(true);
    expect(p.lastWasSolution()).toBe(true);
    expect(p.solutionTodo()).toEqual([]);
    expect(stepsToWin(p)).not.toBeNull();
  });
});
