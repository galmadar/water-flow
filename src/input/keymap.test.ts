import { describe, expect, it } from 'vitest';
import { actionForKey, KEYMAP, type KeyLike } from './keymap';

const key = (k: string, mods: Partial<KeyLike> = {}): KeyLike => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
});

describe('keymap', () => {
  it('maps the tool keys', () => {
    expect(actionForKey(key('d'))).toEqual({ type: 'tool', tool: 'dig' });
    expect(actionForKey(key('F', { shiftKey: true }))).toEqual({ type: 'tool', tool: 'fill' });
    expect(actionForKey(key('x'))).toEqual({ type: 'swapTool' });
    expect(actionForKey(key(' '))).toEqual({ type: 'fast' });
  });

  it('tells undo from redo by Shift, on Ctrl or Cmd', () => {
    expect(actionForKey(key('z', { ctrlKey: true }))).toEqual({ type: 'undo' });
    expect(actionForKey(key('z', { metaKey: true }))).toEqual({ type: 'undo' });
    expect(actionForKey(key('Z', { metaKey: true, shiftKey: true }))).toEqual({ type: 'redo' });
    expect(actionForKey(key('z'))).toBeNull();
  });

  it('opens the level list with L, not Ctrl/Cmd L', () => {
    expect(actionForKey(key('l'))).toEqual({ type: 'levels' });
    expect(actionForKey(key('L', { shiftKey: true }))).toEqual({ type: 'levels' });
    expect(actionForKey(key('l', { metaKey: true }))).toBeNull();
  });

  it('leaves browser shortcuts alone', () => {
    expect(actionForKey(key('r', { metaKey: true }))).toBeNull();
    expect(actionForKey(key('d', { altKey: true }))).toBeNull();
    expect(actionForKey(key('g'))).toBeNull();
    expect(actionForKey(key('s', { ctrlKey: true }))).toBeNull();
  });

  it('never binds one key combination twice', () => {
    const seen = new Set<string>();
    for (const b of KEYMAP)
      for (const k of b.keys)
        for (const shift of b.shift === undefined ? [true, false] : [b.shift]) {
          const id = `${k}|${b.mod}|${shift}`;
          expect(seen.has(id), id).toBe(false);
          seen.add(id);
        }
  });
});
