import { describe, expect, it } from 'vitest';
import { pageCount, pageOf, pages, stepPage } from './levelPages';

describe('level pages', () => {
  it('splits 108 levels into pages of 20 with a short last page', () => {
    const ps = pages(108);
    expect(ps).toHaveLength(6);
    expect(ps[0]).toEqual({ start: 0, end: 20, label: '1–20' });
    expect(ps[5]).toEqual({ start: 100, end: 108, label: '101–108' });
  });

  it('keeps one page for a small game, and for none at all', () => {
    expect(pages(8)).toEqual([{ start: 0, end: 8, label: '1–8' }]);
    expect(pageCount(0)).toBe(1);
    expect(pages(21)[1].label).toBe('21');
  });

  it('opens on the page holding the current level', () => {
    expect(pageOf(0, 108)).toBe(0);
    expect(pageOf(19, 108)).toBe(0);
    expect(pageOf(20, 108)).toBe(1);
    expect(pageOf(107, 108)).toBe(5);
  });

  it('falls back to a real page when the saved level is out of range', () => {
    expect(pageOf(500, 108)).toBe(5);
    expect(pageOf(-3, 108)).toBe(0);
    expect(pageOf(Number.NaN, 108)).toBe(0);
  });

  it('stops paging at both ends', () => {
    expect(stepPage(0, -1, 108)).toBe(0);
    expect(stepPage(5, 1, 108)).toBe(5);
    expect(stepPage(2, 1, 108)).toBe(3);
  });
});
