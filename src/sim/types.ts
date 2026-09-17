export interface Pos {
  x: number;
  y: number;
}

/** What sits on a square. `sand` is the only kind the player can dig or fill. */
export type Tile = 'sand' | 'rock' | 'spring' | 'plant' | 'hole' | 'pond';

export type Action = { type: 'dig'; at: Pos } | { type: 'fill'; at: Pos };

export interface LevelDef {
  id: string;
  name: string;
  hint: string;
  /**
   * One string per row, all the same width.
   * `.` sand · `=` old ditch (sand, already dug) · `#` rock · `S` spring
   * `P` plant · `O` hole that drinks water · `u` pond (deep dry hollow)
   */
  map: readonly string[];
  /** Most squares the player may dig at once. Filling an old ditch is free. */
  budget?: number;
  /** A known win, played in order from the start. */
  solution: readonly Action[];
}

export type DigRefusal = 'not-sand' | 'already' | 'budget';
