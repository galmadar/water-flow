export interface Pos {
  x: number;
  y: number;
}

/**
 * What sits on a square. `sand` is what the player digs or fills (a rock blown
 * up by a bomb becomes diggable too).
 */
export type Tile = 'sand' | 'rock' | 'spring' | 'plant' | 'hole' | 'pond' | 'gate' | 'weed' | 'frozen';

export type Action =
  | { type: 'dig'; at: Pos }
  | { type: 'fill'; at: Pos }
  /** Lay a pipe on a rock or a hole. */
  | { type: 'pipe'; at: Pos }
  /** Blow up a rock and the rocks touching it. */
  | { type: 'bomb'; at: Pos }
  /** Set a wooden gate open or shut. */
  | { type: 'gate'; at: Pos; open: boolean };

/** The tools the player holds. Gates need no tool: tap them. */
export type ToolName = 'dig' | 'fill' | 'pipe' | 'bomb';

export interface LevelDef {
  id: string;
  name: string;
  hint: string;
  /**
   * One string per row, all the same width.
   * `.` sand · `=` old ditch (sand, already dug) · `#` rock · `S` spring
   * `P` plant · `O` hole that drinks water · `u` pond (deep dry hollow)
   * `~` hot sun sand · `-` old ditch in the sun · `w` greedy weed
   * `I` frozen spring · `g` shut gate · `G` open gate
   */
  map: readonly string[];
  /** Most squares the player may dig at once. Filling an old ditch is free. */
  budget?: number;
  /** Pipes the player can lay. */
  pipes?: number;
  /** Bombs the player can use. */
  bombs?: number;
  /** A known win, played in order from the start. */
  solution: readonly Action[];
}

export type DigRefusal = 'not-sand' | 'already' | 'budget';
/** Why a pipe or bomb can't go there: wrong square, already done, or none left. */
export type ToolRefusal = 'wrong-square' | 'already' | 'none-left';
