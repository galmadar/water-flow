import { describe, expect, it } from 'vitest';
import { parseLevel } from '../sim/level';
import { Puzzle } from '../sim/Puzzle';
import { DIG_LEVELS, LEVELS } from './levels';
import { BOMB_LEVELS, GATE_LEVELS, ICE_LEVELS, PIPE_LEVELS, SUN_LEVELS, TOOL_LEVELS, TOOLBOX_LEVELS, WEED_LEVELS } from './toolLevels';

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
  it('spreads the tool groups through the list, each in its own order, Toolbox last', () => {
    expect(LEVELS.filter((l) => DIG_LEVELS.includes(l))).toEqual(DIG_LEVELS);
    expect(LEVELS.filter((l) => TOOL_LEVELS.includes(l))).toEqual(TOOL_LEVELS);
    const at = (g: readonly unknown[]) => LEVELS.indexOf(g[0] as (typeof LEVELS)[number]) + 1;
    const starts = [GATE_LEVELS, PIPE_LEVELS, BOMB_LEVELS, SUN_LEVELS, WEED_LEVELS, ICE_LEVELS].map(at);
    starts.forEach((s, k) => expect(Math.abs(s - 15 * (k + 1)), `group ${k} at ${s}`).toBeLessThanOrEqual(2));
    expect(LEVELS[LEVELS.length - 1]).toBe(TOOLBOX_LEVELS[TOOLBOX_LEVELS.length - 1]);
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
