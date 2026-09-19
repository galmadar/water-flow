import type { Action, LevelDef, Tile } from './types';

export interface ParsedLevel {
  width: number;
  height: number;
  tiles: Tile[];
  /** Squares that start dug (old ditches). */
  dug: boolean[];
  /** Hot sun squares, where water dries up. */
  sun: boolean[];
  /** Gates that start open. */
  open: boolean[];
}

const TILES: Record<string, Tile> = {
  '.': 'sand',
  '=': 'sand',
  '~': 'sand',
  '-': 'sand',
  '#': 'rock',
  S: 'spring',
  P: 'plant',
  O: 'hole',
  u: 'pond',
  w: 'weed',
  I: 'frozen',
  g: 'gate',
  G: 'gate',
};

export function parseLevel(level: Pick<LevelDef, 'id' | 'map'>): ParsedLevel {
  const height = level.map.length;
  const width = level.map[0]?.length ?? 0;
  const tiles: Tile[] = [];
  const dug: boolean[] = [];
  const sun: boolean[] = [];
  const open: boolean[] = [];
  for (const row of level.map) {
    if (row.length !== width) throw new Error(`${level.id}: rows differ in width`);
    for (const ch of row) {
      const tile = TILES[ch];
      if (!tile) throw new Error(`${level.id}: unknown map char "${ch}"`);
      tiles.push(tile);
      dug.push(ch === '=' || ch === '-');
      sun.push(ch === '~' || ch === '-');
      open.push(ch === 'G');
    }
  }
  return { width, height, tiles, dug, sun, open };
}

/** Marker → [map char it stands on, what the solution does there]. */
const MARKERS: Record<string, [string, (at: { x: number; y: number }) => Action[]]> = {
  '*': ['.', (at) => [{ type: 'dig', at }]],
  x: ['=', (at) => [{ type: 'fill', at }]],
  '+': ['~', (at) => [{ type: 'dig', at }]],
  t: ['#', (at) => [{ type: 'pipe', at }]],
  o: ['O', (at) => [{ type: 'pipe', at }]],
  b: ['#', (at) => [{ type: 'bomb', at }, { type: 'dig', at }]],
  r: ['#', (at) => [{ type: 'dig', at }]],
  d: ['g', (at) => [{ type: 'gate', at, open: true }]],
  c: ['G', (at) => [{ type: 'gate', at, open: false }]],
};

/**
 * Lets a level be drawn once with its answer marked on it:
 * `*` is sand the solution digs, `x` is an old ditch the solution fills,
 * `+` is sun sand it digs, `t` a rock and `o` a hole it lays a pipe on,
 * `b` a rock it bombs then digs, `r` a rock it digs once a bomb has blown it up,
 * `d` a shut gate it opens, `c` an open gate it shuts.
 * Pipes, bombs and gates come first, then digs and fills in reading order.
 */
export function sketch(rows: readonly string[]): { map: string[]; solution: Action[] } {
  const first: Action[] = [];
  const rest: Action[] = [];
  const map = rows.map((row, y) =>
    [...row]
      .map((ch, x) => {
        const marker = MARKERS[ch];
        if (!marker) return ch;
        for (const a of marker[1]({ x, y })) (a.type === 'dig' || a.type === 'fill' ? rest : first).push(a);
        return marker[0];
      })
      .join(''),
  );
  return { map, solution: [...first, ...rest] };
}
