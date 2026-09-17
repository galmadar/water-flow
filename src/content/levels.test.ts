import { describe, expect, it } from 'vitest';
import { parseLevel } from '../sim/level';
import { Puzzle } from '../sim/Puzzle';
import type { LevelDef } from '../sim/types';
import { LEVELS, STARTER } from './levels';

/** About 33 seconds of play at the game's speed. */
const MAX_STEPS = 6000;
/** The known solution must win within 15 seconds of normal-speed water. */
const WIN_STEPS = 15 * 180;
/** Two levels this alike (0 to 1) would feel like the same puzzle. */
const SIMILAR = 0.5;

function stepsToWin(p: Puzzle, limit = MAX_STEPS): number | null {
  for (let s = 1; s <= limit; s++) {
    p.step();
    if (p.won) return s;
  }
  return null;
}

/** The map with its answer drawn on, so the solution's shape counts too. */
function drawn(lvl: LevelDef): string[] {
  const rows = lvl.map.map((r) => [...r]);
  for (const a of lvl.solution) rows[a.at.y][a.at.x] = a.type === 'dig' ? '*' : 'x';
  return rows.map((r) => r.join(''));
}

type Cell = [number, number, string];
const W = 12;
const H = 10;
const MIRRORS: ((c: Cell) => Cell)[] = [
  ([x, y, c]) => [x, y, c],
  ([x, y, c]) => [W - 1 - x, y, c],
  ([x, y, c]) => [x, H - 1 - y, c],
  ([x, y, c]) => [W - 1 - x, H - 1 - y, c],
];
function cells(rows: readonly string[]): Cell[] {
  const out: Cell[] = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => c !== '.' && out.push([x, y, c])));
  return out;
}

/** Share of non-sand squares that line up, under the best mirror and shift. */
function similarity(a: readonly string[], b: readonly string[]): number {
  const A = cells(a);
  const B0 = cells(b);
  let best = 0;
  for (const mirror of MIRRORS) {
    const counts = new Map<number, number>();
    for (const [bx, by, bc] of B0.map(mirror))
      for (const [ax, ay, ac] of A) {
        if (ac !== bc) continue;
        const key = (bx - ax + 20) * 64 + (by - ay + 20);
        const n = (counts.get(key) ?? 0) + 1;
        counts.set(key, n);
        best = Math.max(best, n);
      }
  }
  return best / Math.max(A.length, B0.length, 1);
}

/** Same map up to shifting and mirroring: crop to the drawn part, take the smallest mirror. */
function shape(rows: readonly string[]): string {
  const forms = MIRRORS.map((m) => {
    const cs = cells(rows).map(m);
    const x0 = Math.min(...cs.map((c) => c[0]));
    const y0 = Math.min(...cs.map((c) => c[1]));
    return cs
      .map(([x, y, c]) => `${x - x0},${y - y0},${c}`)
      .sort()
      .join(' ');
  });
  return forms.sort()[0];
}

describe('level registry', () => {
  it('has the 6 lessons, Dry Maze and 100 more, with unique ids and names', () => {
    expect(LEVELS).toHaveLength(107);
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

  it('no two levels share a map, even shifted or mirrored', () => {
    const seen = new Map<string, string>();
    for (const lvl of LEVELS) {
      const key = shape(lvl.map);
      expect(seen.get(key), `${lvl.id} repeats ${seen.get(key)}`).toBeUndefined();
      seen.set(key, lvl.id);
    }
  });

  it('no two levels are too alike (the tiny lessons may resemble each other)', () => {
    const pics = LEVELS.map(drawn);
    for (let i = 0; i < LEVELS.length; i++)
      for (let j = i + 1; j < LEVELS.length; j++) {
        if (STARTER.includes(LEVELS[i]) && STARTER.includes(LEVELS[j])) continue;
        const s = similarity(pics[i], pics[j]);
        expect(s, `${LEVELS[i].id} vs ${LEVELS[j].id}`).toBeLessThan(SIMILAR);
      }
  });
});

describe.each(LEVELS.map((l) => [l.id, l] as const))('%s', (id, lvl) => {
  it('is not won by waiting', () => {
    expect(stepsToWin(new Puzzle(lvl))).toBeNull();
  });

  it('is won by its known solution, played by hand, within the dig budget and 15 seconds', () => {
    const p = new Puzzle(lvl);
    for (const a of lvl.solution) expect(p.apply(a), `${id}: ${JSON.stringify(a)}`).toBe(true);
    if (lvl.budget !== undefined) expect(p.digsUsed()).toBeLessThanOrEqual(lvl.budget);
    const steps = stepsToWin(p, WIN_STEPS);
    expect(steps, id).not.toBeNull();
  });

  it('needs every fill it lists, each one on its own', () => {
    const fills = lvl.solution.filter((a) => a.type === 'fill');
    for (const skip of fills) {
      const p = new Puzzle(lvl);
      for (const a of lvl.solution) if (a !== skip) p.apply(a);
      expect(stepsToWin(p), `${id}: fill at ${skip.at.x},${skip.at.y}`).toBeNull();
    }
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
