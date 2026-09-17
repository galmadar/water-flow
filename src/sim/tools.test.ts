import { describe, expect, it } from 'vitest';
import { parseLevel, sketch } from './level';
import { Puzzle } from './Puzzle';
import type { LevelDef } from './types';

function lvl(map: string[], extra: Partial<LevelDef> = {}): LevelDef {
  return { id: 'test', name: 'Test', hint: '-', map, solution: [], ...extra };
}

function grow(p: Puzzle, steps = 8000): boolean {
  for (let s = 0; s < steps; s++) {
    p.step();
    if (p.won) return true;
  }
  return false;
}

describe('map legend for the new squares', () => {
  it('parses sun, weeds, frozen springs and gates', () => {
    const parsed = parseLevel(lvl(['~-wIgG']));
    expect(parsed.tiles).toEqual(['sand', 'sand', 'weed', 'frozen', 'gate', 'gate']);
    expect(parsed.dug).toEqual([false, true, false, false, false, false]);
    expect(parsed.sun).toEqual([true, true, false, false, false, false]);
    expect(parsed.open).toEqual([false, false, false, false, false, true]);
  });

  it('sketch puts pipes, bombs and gates before the digging', () => {
    const { map, solution } = sketch(['*to', 'b+r', 'dcx']);
    expect(map).toEqual(['.#O', '#~#', 'gG=']);
    expect(solution.map((a) => a.type)).toEqual(['pipe', 'pipe', 'bomb', 'gate', 'gate', 'dig', 'dig', 'dig', 'dig', 'fill']);
    expect(solution[3]).toEqual({ type: 'gate', at: { x: 0, y: 2 }, open: true });
    expect(solution[4]).toEqual({ type: 'gate', at: { x: 1, y: 2 }, open: false });
  });
});

describe('pipes', () => {
  it('carry water under a rock and over a hole', () => {
    const p = new Puzzle(lvl(['S=#O=P'], { pipes: 2 }));
    expect(grow(p, 3000)).toBe(false);
    expect(p.pipe(2, 0)).toBeNull();
    expect(p.pipe(3, 0)).toBeNull();
    expect(p.pipesLeft()).toBe(0);
    expect(grow(p)).toBe(true);
  });

  it('are closed: a hole beside a pipe can’t drink from it', () => {
    const p = new Puzzle(lvl(['..O..', 'S=O=P', '..O..'], { pipes: 1 }));
    p.pipe(2, 1);
    expect(grow(p)).toBe(true);
    // A plain ditch next to a hole still leaks.
    const q = new Puzzle(lvl(['.O...', 'S===P', '.....']));
    expect(grow(q)).toBe(false);
  });

  it('only go on rocks and holes, and only as many as you have', () => {
    const p = new Puzzle(lvl(['S.##OP'], { pipes: 1 }));
    expect(p.pipe(1, 0)).toBe('wrong-square');
    expect(p.pipe(5, 0)).toBe('wrong-square');
    expect(p.pipe(2, 0)).toBeNull();
    expect(p.pipe(2, 0)).toBe('already');
    expect(p.pipe(3, 0)).toBe('none-left');
    expect(p.unpipe(2, 0)).toBe(true);
    expect(p.pipesLeft()).toBe(1);
    expect(p.pipe(4, 0)).toBeNull();
  });

  it('a level with no pipes has none to lay', () => {
    const p = new Puzzle(lvl(['S#P']));
    expect(p.pipesLeft()).toBeNull();
    expect(p.pipe(1, 0)).toBe('none-left');
  });

  it('taking a pipe up soaks its water and blocks the flow again', () => {
    const p = new Puzzle(lvl(['S=#=P'], { pipes: 1 }));
    p.pipe(2, 0);
    p.step(200);
    expect(p.waterAt(2, 0)).toBeGreaterThan(0);
    p.unpipe(2, 0);
    expect(p.waterAt(2, 0)).toBe(0);
    p.step(200);
    expect(p.waterAt(2, 0)).toBe(0);
  });
});

describe('bombs', () => {
  it('blow up a rock and the rocks beside it into sand you can dig', () => {
    const p = new Puzzle(lvl(['.#.', '###', '.#.', '.#.'], { bombs: 1 }));
    expect(p.dig(1, 1)).toBe('not-sand');
    expect(p.bomb(1, 1)).toBeNull();
    expect(p.bombsLeft()).toBe(0);
    for (const [x, y] of [[1, 1], [0, 1], [2, 1], [1, 0], [1, 2]]) expect(p.isBlasted(x, y), `${x},${y}`).toBe(true);
    // Not corners, not two away.
    expect(p.isBlasted(1, 3)).toBe(false);
    expect(p.dig(1, 1)).toBeNull();
    expect(p.dig(1, 3)).toBe('not-sand');
    expect(p.bomb(1, 3)).toBe('none-left');
    expect(p.bomb(1, 1)).toBe('already');
    expect(p.bomb(0, 0)).toBe('wrong-square');
  });

  it('let water through once the rubble is dug, and undo puts the rock back', () => {
    const p = new Puzzle(lvl(['S=#=P'], { bombs: 1 }));
    p.beginStroke();
    p.bomb(2, 0);
    p.dig(2, 0);
    p.endStroke();
    expect(p.digsUsed()).toBe(1);
    expect(grow(p)).toBe(true);
    p.undo();
    expect(p.isBlasted(2, 0)).toBe(false);
    expect(p.isDug(2, 0)).toBe(false);
    expect(p.waterAt(2, 0)).toBe(0);
    expect(p.bombsLeft()).toBe(1);
  });

  it('leave pipes alone', () => {
    const p = new Puzzle(lvl(['##'], { bombs: 1, pipes: 1 }));
    p.pipe(1, 0);
    expect(p.bomb(1, 0)).toBe('wrong-square');
    p.bomb(0, 0);
    expect(p.isBlasted(1, 0)).toBe(false);
    expect(p.hasPipe(1, 0)).toBe(true);
  });
});

describe('gates', () => {
  it('a shut gate stops the water; opening it lets it through', () => {
    const p = new Puzzle(lvl(['S=g=P']));
    expect(grow(p, 3000)).toBe(false);
    expect(p.waterAt(3, 0)).toBe(0);
    expect(p.toggleGate(2, 0)).toBe(true);
    expect(p.isGateOpen(2, 0)).toBe(true);
    expect(grow(p)).toBe(true);
  });

  it('shutting a gate soaks its water; gates are free and undoable', () => {
    const p = new Puzzle(lvl(['S=G=O', '...P.']));
    p.step(100);
    expect(p.waterAt(2, 0)).toBeGreaterThan(0);
    expect(p.setGate(2, 0, false)).toBe(true);
    expect(p.setGate(2, 0, false)).toBe(false);
    expect(p.waterAt(2, 0)).toBe(0);
    expect(p.setGate(0, 1, true)).toBe(false);
    p.undo();
    expect(p.isGateOpen(2, 0)).toBe(true);
  });

  it('solution todo knows which way a gate should be', () => {
    const p = new Puzzle(lvl(['S=g=P'], { solution: [{ type: 'gate', at: { x: 2, y: 0 }, open: true }] }));
    expect(p.solutionTodo()).toHaveLength(1);
    p.toggleGate(2, 0);
    expect(p.solutionTodo()).toEqual([]);
    p.toggleGate(2, 0);
    expect(p.applySolution()).toBe(true);
    expect(p.isGateOpen(2, 0)).toBe(true);
  });
});

describe('hot sun', () => {
  it('dries water, so a long sunny ditch never gets there', () => {
    expect(grow(new Puzzle(lvl(['S--------P'])))).toBe(false);
    expect(grow(new Puzzle(lvl(['S========P'])))).toBe(true);
  });

  it('a short sunny stretch is fine', () => {
    expect(grow(new Puzzle(lvl(['S==--====P'])))).toBe(true);
  });

  it('keeps the books: added = held + drunk + lost', () => {
    const p = new Puzzle(lvl(['S--===P']));
    p.step(3000);
    const f = p.field;
    expect(f.sourced).toBeCloseTo(f.totalWater() + f.drankTotal + f.drained, 9);
  });
});

describe('greedy weeds', () => {
  it('two weeds by the ditch drink it all; one leaves enough', () => {
    expect(grow(new Puzzle(lvl(['.w..w.', 'S====P'])))).toBe(false);
    const one = new Puzzle(lvl(['.w....', 'S====P']));
    expect(grow(one)).toBe(true);
    expect(one.weedDrunk(1, 0)).toBeGreaterThan(0);
  });

  it('a weed drinks nothing from a ditch that doesn’t touch it', () => {
    const p = new Puzzle(lvl(['.w.w..', '......', 'S====P']));
    expect(grow(p)).toBe(true);
    expect(p.weedDrunk(1, 0)).toBe(0);
  });

  it('water can’t run onto a weed', () => {
    const p = new Puzzle(lvl(['S=w=P']));
    expect(grow(p)).toBe(false);
    expect(p.waterAt(2, 0)).toBe(0);
    expect(p.waterAt(3, 0)).toBe(0);
  });
});

describe('frozen springs', () => {
  it('stay frozen and dry until water touches them, then give water', () => {
    const alone = new Puzzle(lvl(['I===P', '.....', 'S....']));
    alone.step(3000);
    expect(alone.isThawed(0, 0)).toBe(false);
    expect(alone.field.totalWater()).toBeGreaterThan(0);
    expect(alone.plantProgress(4, 0)).toBe(0);

    const p = new Puzzle(lvl(['I===P', '=....', 'S....']));
    expect(grow(p)).toBe(true);
    expect(p.isThawed(0, 0)).toBe(true);
  });

  it('two springs feed what one alone can’t', () => {
    // Four sun squares take a whole spring's worth.
    expect(grow(new Puzzle(lvl(['S=----', '=.....', '=====P'])))).toBe(false);
    const p = new Puzzle(lvl(['S=----', '=.....', 'I====P']));
    expect(grow(p)).toBe(true);
    expect(p.isThawed(0, 2)).toBe(true);
  });

  it('once thawed it stays thawed through undo, until restart', () => {
    const p = new Puzzle(lvl(['I.', 'S.']));
    p.dig(1, 1);
    p.dig(1, 0);
    p.step(1500);
    expect(p.isThawed(0, 0)).toBe(true);
    p.undo();
    p.undo();
    expect(p.isThawed(0, 0)).toBe(true);
    p.restart();
    expect(p.isThawed(0, 0)).toBe(false);
    expect(p.thawProgress(0, 0)).toBe(0);
  });

  it('is deterministic with every new square in play', () => {
    const map = ['S=--=G=P', '.w.=#=..', 'I==g=O..'];
    const a = new Puzzle(lvl(map, { pipes: 1 }));
    const b = new Puzzle(lvl(map, { pipes: 1 }));
    for (const p of [a, b]) {
      p.pipe(4, 1);
      p.step(2500);
    }
    expect([...a.field.water]).toEqual([...b.field.water]);
    expect(a.field.totalWater()).toBeGreaterThan(0);
  });
});
