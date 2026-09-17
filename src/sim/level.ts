import type { Action, LevelDef, Tile } from './types';

export interface ParsedLevel {
  width: number;
  height: number;
  tiles: Tile[];
  /** Squares that start dug (old ditches). */
  dug: boolean[];
}

const TILES: Record<string, Tile> = {
  '.': 'sand',
  '=': 'sand',
  '#': 'rock',
  S: 'spring',
  P: 'plant',
  O: 'hole',
  u: 'pond',
};

export function parseLevel(level: Pick<LevelDef, 'id' | 'map'>): ParsedLevel {
  const height = level.map.length;
  const width = level.map[0]?.length ?? 0;
  const tiles: Tile[] = [];
  const dug: boolean[] = [];
  for (const row of level.map) {
    if (row.length !== width) throw new Error(`${level.id}: rows differ in width`);
    for (const ch of row) {
      const tile = TILES[ch];
      if (!tile) throw new Error(`${level.id}: unknown map char "${ch}"`);
      tiles.push(tile);
      dug.push(ch === '=');
    }
  }
  return { width, height, tiles, dug };
}

/**
 * Lets a level be drawn once with its answer marked on it:
 * `*` is sand the solution digs, `x` is an old ditch the solution fills.
 */
export function sketch(rows: readonly string[]): { map: string[]; solution: Action[] } {
  const solution: Action[] = [];
  const map = rows.map((row, y) =>
    [...row]
      .map((ch, x) => {
        if (ch === '*') {
          solution.push({ type: 'dig', at: { x, y } });
          return '.';
        }
        if (ch === 'x') {
          solution.push({ type: 'fill', at: { x, y } });
          return '=';
        }
        return ch;
      })
      .join(''),
  );
  return { map, solution };
}
