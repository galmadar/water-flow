import { describe, expect, it } from 'vitest';
import { parseLevel } from '../sim/level';
import { Puzzle } from '../sim/Puzzle';
import { ALL_LEVELS } from './allLevels';
import { LEVELS } from './levels';
import { TOOL_LEVELS } from './toolLevels';

/** About 25 seconds of play at the game's speed, same as the first levels. */
const MAX_STEPS = 6000;

function stepsToWin(p: Puzzle): number | null {
  for (let s = 1; s <= MAX_STEPS; s++) {
    p.step();
    if (p.won) return s;
  }
  return null;
}

describe('tool level registry', () => {
  it('comes after the first levels, with ids and names unique across all of them', () => {
    expect(ALL_LEVELS).toEqual([...LEVELS, ...TOOL_LEVELS]);
    expect(new Set(ALL_LEVELS.map((l) => l.id)).size).toBe(ALL_LEVELS.length);
    expect(new Set(ALL_LEVELS.map((l) => l.name)).size).toBe(ALL_LEVELS.length);
  });

  it('every level is 12×10 with one spring, a plant and a hint', () => {
    for (const lvl of TOOL_LEVELS) {
      const p = parseLevel(lvl);
      expect([p.width, p.height], lvl.id).toEqual([12, 10]);
      expect(p.tiles.filter((t) => t === 'spring'), lvl.id).toHaveLength(1);
      expect(p.tiles.includes('plant'), lvl.id).toBe(true);
      expect(lvl.hint.length).toBeGreaterThan(0);
    }
  });

  it('each new thing gets at least three levels', () => {
    const uses = (test: (l: (typeof TOOL_LEVELS)[number], map: string) => boolean) =>
      TOOL_LEVELS.filter((l) => test(l, l.map.join(''))).length;
    expect(uses((l) => l.solution.some((a) => a.type === 'gate'))).toBeGreaterThanOrEqual(3);
    expect(uses((l) => l.solution.some((a) => a.type === 'pipe'))).toBeGreaterThanOrEqual(3);
    expect(uses((l) => l.solution.some((a) => a.type === 'bomb'))).toBeGreaterThanOrEqual(3);
    expect(uses((_, m) => /[~-]/.test(m))).toBeGreaterThanOrEqual(3);
    expect(uses((_, m) => m.includes('w'))).toBeGreaterThanOrEqual(3);
    expect(uses((_, m) => m.includes('I'))).toBeGreaterThanOrEqual(3);
  });
});

describe.each(TOOL_LEVELS.map((l) => [l.id, l] as const))('%s', (id, lvl) => {
  it('is not won by waiting', () => {
    expect(stepsToWin(new Puzzle(lvl))).toBeNull();
  });

  it('is won by its known solution, played by hand, within its digs, pipes and bombs', () => {
    const p = new Puzzle(lvl);
    for (const a of lvl.solution) expect(p.apply(a), `${id}: ${JSON.stringify(a)}`).toBe(true);
    if (lvl.budget !== undefined) expect(p.digsUsed()).toBeLessThanOrEqual(lvl.budget);
    expect(p.pipesLeft() ?? 0).toBeGreaterThanOrEqual(0);
    expect(p.bombsLeft() ?? 0).toBeGreaterThanOrEqual(0);
    expect(stepsToWin(p), id).not.toBeNull();
  });

  it('needs its pipes, bombs, gates and fills', () => {
    const extras = lvl.solution.filter((a) => a.type !== 'dig');
    if (extras.length === 0) return;
    const p = new Puzzle(lvl);
    for (const a of lvl.solution) if (a.type === 'dig') p.apply(a);
    expect(stepsToWin(p)).toBeNull();
  });

  it('"solve it for me" wins from a messy board', () => {
    const p = new Puzzle(lvl);
    p.dig(0, 0);
    p.dig(11, 9);
    p.pipe(6, 0);
    expect(p.applySolution()).toBe(true);
    expect(p.lastWasSolution()).toBe(true);
    expect(p.solutionTodo()).toEqual([]);
    expect(stepsToWin(p)).not.toBeNull();
  });
});

describe.each(TOOL_LEVELS.filter((l) => l.wrong).map((l) => [l.id, l] as const))('%s', (id, lvl) => {
  it('the tempting way doesn’t work', () => {
    const p = new Puzzle({ ...lvl, budget: undefined });
    for (const a of lvl.wrong ?? []) expect(p.apply(a), `${id}: ${JSON.stringify(a)}`).toBe(true);
    expect(stepsToWin(p)).toBeNull();
  });
});
