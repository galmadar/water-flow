import { describe, expect, it } from 'vitest';
import { markSolved, resolveCurrent, solvedState } from './progress';

const IDS = ['first-drink', 'around-the-rock', 'two-plants', 'mind-the-hole', 'share-the-ditch', 'the-pond', 'new-a', 'dry-maze', 'new-b'];

describe('resuming a level', () => {
  it('finds the saved level by id, wherever it moved', () => {
    expect(resolveCurrent({ current: 0, currentId: 'dry-maze' }, IDS)).toBe(7);
  });

  it('falls back to a clamped index when the saved id is gone', () => {
    expect(resolveCurrent({ current: 3, currentId: 'gone' }, IDS)).toBe(3);
    expect(resolveCurrent({ current: 99, currentId: 'gone' }, IDS)).toBe(IDS.length - 1);
  });

  it('reads an old index-only save by the old level order', () => {
    expect(resolveCurrent({ current: 5 }, IDS)).toBe(5);
    expect(resolveCurrent({ current: 7 }, IDS)).toBe(7);
    // Old level 7 (three-gardens) was removed: resume right after the-pond.
    expect(resolveCurrent({ current: 6 }, IDS)).toBe(6);
  });

  it('never returns an index outside the list', () => {
    for (const current of [-5, NaN, 1e9]) {
      const i = resolveCurrent({ current }, IDS);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(IDS.length);
    }
  });
});

// No localStorage under vitest, so progress lives in memory for the run.
describe('progress', () => {
  it('keeps "solved with help" apart from solved alone', () => {
    expect(solvedState('a')).toBe('no');
    markSolved('a', true);
    expect(solvedState('a')).toBe('helped');
    markSolved('b');
    expect(solvedState('b')).toBe('self');
  });

  it('a win alone upgrades a helped level; a helped win never downgrades', () => {
    markSolved('c', true);
    markSolved('c');
    expect(solvedState('c')).toBe('self');
    markSolved('c', true);
    expect(solvedState('c')).toBe('self');
  });
});
