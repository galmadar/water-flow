import { sketch } from '../sim/level';
import type { LevelDef } from '../sim/types';

/**
 * Each map is drawn with its answer on it: `*` is a square to dig, `x` an old
 * ditch to fill. `sketch` turns those back into sand/ditch plus the `solution` list.
 */
export function level(meta: Omit<LevelDef, 'map' | 'solution'>, rows: string[]): LevelDef {
  return { ...meta, ...sketch(rows) };
}
