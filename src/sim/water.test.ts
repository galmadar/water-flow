import { describe, expect, it } from 'vitest';
import { parseLevel } from './level';
import { Puzzle } from './Puzzle';
import type { LevelDef } from './types';
import { DUG_HEIGHT, SAND_HEIGHT, SPRING_HEAD, WaterField } from './water';

/** A bare field from a picture: `.` sand, `_` channel floor, `#` rock, digits set the ground height. */
function field(rows: string[]): WaterField {
  const tiles = rows.join('').split('').map((c) => (c === '#' ? 'rock' : 'sand'));
  const f = new WaterField(rows[0].length, rows.length, tiles as ('rock' | 'sand')[]);
  rows.join('').split('').forEach((c, i) => {
    f.ground[i] = c === '.' ? SAND_HEIGHT : c === '_' ? DUG_HEIGHT : c === '#' ? SAND_HEIGHT + 2 : Number(c);
  });
  return f;
}

function run(f: WaterField, steps: number): void {
  for (let s = 0; s < steps; s++) f.step();
}

function lvl(map: string[]): LevelDef {
  return { id: 'test', name: 'Test', hint: '-', map, solution: [] };
}

describe('water flow', () => {
  it('runs downhill and leaves the high end dry', () => {
    const f = field(['3210']);
    f.water[0] = 1;
    run(f, 2000);
    expect(f.water[0]).toBeLessThan(1e-3);
    expect(f.water[3]).toBeGreaterThan(0.9);
  });

  it('pools in a low spot and does not climb out of it', () => {
    // A pit between two walls of sand: the water stays in the pit.
    const f = field(['.0.']);
    f.water[1] = 2;
    run(f, 500);
    expect(f.water[1]).toBeCloseTo(2, 9);
    expect(f.water[0]).toBe(0);
    expect(f.water[2]).toBe(0);
  });

  it('fills a low spot first, then spills over the rim', () => {
    // A pit at 0, then two squares at 2.
    const g = field(['022']);
    g.water[0] = 1.5;
    run(g, 200);
    expect(g.water[1] + g.water[2]).toBe(0);
    g.water[0] = 3.5;
    run(g, 3000);
    // Spilled water levels out: one flat surface across the pit and the rim.
    expect(g.ground[0] + g.water[0]).toBeCloseTo(g.ground[2] + g.water[2], 3);
    expect(g.water[2]).toBeCloseTo(0.5, 3);
  });

  it('settles level, and never overshoots into a slosh', () => {
    const f = field(['______']);
    f.water[0] = 3;
    let prevSpread = Infinity;
    for (let s = 0; s < 1500; s++) {
      f.step();
      const spread = Math.max(...f.water) - Math.min(...f.water);
      expect(spread).toBeLessThanOrEqual(prevSpread + 1e-12);
      prevSpread = spread;
    }
    for (const w of f.water) expect(w).toBeCloseTo(0.5, 6);
  });

  it('keeps every drop when nothing drinks or drains', () => {
    const f = field(['._._#', '_3_0_', '__#__', '1_2_.']);
    f.water.set([0, 1, 0, 2, 0, 1.5, 0, 0.2, 0, 3, 0.5, 0, 0, 0, 0.7, 0, 1, 0, 0, 0]);
    const before = f.totalWater();
    run(f, 3000);
    expect(f.totalWater()).toBeCloseTo(before, 9);
  });

  it('never flows into or through rock', () => {
    const f = field(['_#_']);
    f.water[0] = 1;
    run(f, 500);
    expect(f.water[1]).toBe(0);
    expect(f.water[2]).toBe(0);
  });

  it('is deterministic', () => {
    const map = ['..S....', '..====P', '....O..'];
    const a = new Puzzle(lvl(map));
    const b = new Puzzle(lvl(map));
    a.step(700);
    b.step(700);
    expect([...a.field.water]).toEqual([...b.field.water]);
  });
});

describe('springs, holes and plants', () => {
  it('the spring only rises to its head, below the sand, so the board never floods', () => {
    const p = new Puzzle(lvl(['...', '.S.', '...']));
    p.step(5000);
    expect(p.waterAt(1, 1)).toBeCloseTo(SPRING_HEAD - DUG_HEIGHT, 9);
    expect(p.field.totalWater()).toBeCloseTo(p.waterAt(1, 1), 9);
  });

  it('books balance: added = held + drunk + drained', () => {
    const p = new Puzzle(lvl(['P=S======O']));
    p.step(4000);
    const f = p.field;
    expect(f.drained).toBeGreaterThan(0);
    expect(f.drankTotal).toBeGreaterThan(0);
    expect(f.sourced).toBeCloseTo(f.totalWater() + f.drankTotal + f.drained, 9);
  });

  it('a plant on a ditch from the spring drinks and blooms', () => {
    const p = new Puzzle(lvl(['S====P']));
    expect(p.won).toBe(false);
    p.step(2000);
    expect(p.isBloomed(5, 0)).toBe(true);
    expect(p.won).toBe(true);
  });

  it('a hole on the way drinks it all and the plant stays dry', () => {
    const p = new Puzzle(lvl(['...O....', 'S======P']));
    p.step(20000);
    expect(p.plantProgress(7, 1)).toBe(0);
    expect(p.field.drained).toBeGreaterThan(0);
  });

  it('a leak next to the spring starves the plant too', () => {
    const p = new Puzzle(lvl(['O=S====P']));
    p.step(20000);
    expect(p.plantProgress(7, 0)).toBe(0);
  });

  it('filling a ditch cuts the flow and soaks up its water', () => {
    const p = new Puzzle(lvl(['S====P']));
    p.step(100);
    expect(p.waterAt(1, 0)).toBeGreaterThan(0);
    expect(p.fill(1, 0)).toBe(true);
    expect(p.waterAt(1, 0)).toBe(0);
    p.step(5000);
    expect(p.plantProgress(5, 0)).toBe(0);
  });

  it('parses the map legend', () => {
    const parsed = parseLevel(lvl(['.=#SPOu']));
    expect(parsed.tiles).toEqual(['sand', 'sand', 'rock', 'spring', 'plant', 'hole', 'pond']);
    expect(parsed.dug).toEqual([false, true, false, false, false, false, false]);
    expect(() => parseLevel(lvl(['..', '.']))).toThrow();
    expect(() => parseLevel(lvl(['.?']))).toThrow();
  });
});
