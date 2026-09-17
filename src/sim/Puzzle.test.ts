import { describe, expect, it } from 'vitest';
import { Puzzle } from './Puzzle';
import type { LevelDef } from './types';

const LEVEL: LevelDef = {
  id: 'p',
  name: 'P',
  hint: '-',
  map: ['S...#', '=..OP'],
  budget: 2,
  solution: [],
};

describe('Puzzle', () => {
  it('digs only sand, once, and not past the budget', () => {
    const p = new Puzzle(LEVEL);
    expect(p.dig(4, 0)).toBe('not-sand');
    expect(p.dig(0, 0)).toBe('not-sand');
    expect(p.dig(3, 1)).toBe('not-sand');
    expect(p.dig(0, 1)).toBe('already');
    expect(p.dig(1, 0)).toBeNull();
    expect(p.dig(1, 0)).toBe('already');
    expect(p.dig(2, 0)).toBeNull();
    expect(p.digsLeft()).toBe(0);
    expect(p.dig(3, 0)).toBe('budget');
    // Filling gives a dig back; an old ditch never cost one.
    expect(p.fill(2, 0)).toBe(true);
    expect(p.fill(0, 1)).toBe(true);
    expect(p.digsLeft()).toBe(1);
    expect(p.dig(0, 1)).toBeNull();
    expect(p.digsLeft()).toBe(1);
    expect(p.fill(3, 0)).toBe(false);
    expect(p.fill(4, 1)).toBe(false);
  });

  it('one stroke is one undo step, and redo puts it back', () => {
    const p = new Puzzle({ ...LEVEL, budget: undefined });
    p.beginStroke();
    p.dig(1, 0);
    p.dig(2, 0);
    p.fill(0, 1);
    p.endStroke();
    expect(p.canUndo).toBe(true);
    expect(p.undo()).toBe(true);
    expect([p.isDug(1, 0), p.isDug(2, 0), p.isDug(0, 1)]).toEqual([false, false, true]);
    expect(p.canUndo).toBe(false);
    expect(p.redo()).toBe(true);
    expect([p.isDug(1, 0), p.isDug(2, 0), p.isDug(0, 1)]).toEqual([true, true, false]);
    expect(p.redo()).toBe(false);
  });

  it('a stroke that changes nothing leaves no undo step; a new change clears redo', () => {
    const p = new Puzzle(LEVEL);
    p.beginStroke();
    p.dig(4, 0);
    p.endStroke();
    expect(p.canUndo).toBe(false);
    p.dig(1, 0);
    p.undo();
    expect(p.canRedo).toBe(true);
    p.dig(2, 0);
    expect(p.canRedo).toBe(false);
  });

  it('restart puts the ground and the water back', () => {
    const p = new Puzzle(LEVEL);
    p.dig(1, 0);
    p.step(300);
    expect(p.field.totalWater()).toBeGreaterThan(0);
    p.restart();
    expect(p.isDug(1, 0)).toBe(false);
    expect(p.isDug(0, 1)).toBe(true);
    expect(p.field.totalWater()).toBe(0);
    expect(p.canUndo).toBe(false);
  });

  it('solve-it-for-me is one undo step that brings the player’s digging back', () => {
    const p = new Puzzle({ ...LEVEL, solution: [{ type: 'dig', at: { x: 1, y: 0 } }, { type: 'fill', at: { x: 0, y: 1 } }] });
    p.dig(2, 0);
    expect(p.solutionTodo()).toHaveLength(2);
    expect(p.applySolution()).toBe(true);
    expect([p.isDug(1, 0), p.isDug(2, 0), p.isDug(0, 1)]).toEqual([true, false, false]);
    expect(p.solutionTodo()).toEqual([]);
    p.undo();
    expect([p.isDug(1, 0), p.isDug(2, 0), p.isDug(0, 1)]).toEqual([false, true, true]);
  });
});
