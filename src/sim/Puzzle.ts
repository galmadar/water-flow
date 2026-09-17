import { parseLevel } from './level';
import type { Action, DigRefusal, LevelDef, Pos, Tile } from './types';
import { DUG_HEIGHT, PLANT_NEED, POND_HEIGHT, SAND_HEIGHT, WaterField } from './water';

interface HistoryEntry {
  before: Uint8Array;
  after: Uint8Array;
  /** "Solve it for me" counts as help. */
  solution: boolean;
}

/**
 * One level in play: which squares are dug, the water on them, and undo.
 * Undo and redo change the ground only; water keeps what it has.
 */
export class Puzzle {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
  readonly budget: number | null;
  field!: WaterField;
  private readonly startDug: Uint8Array;
  private dug!: Uint8Array;
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private strokeStart: Uint8Array | null = null;

  constructor(readonly level: LevelDef) {
    const parsed = parseLevel(level);
    this.width = parsed.width;
    this.height = parsed.height;
    this.tiles = parsed.tiles;
    this.budget = level.budget ?? null;
    this.startDug = Uint8Array.from(parsed.dug, (d) => (d ? 1 : 0));
    this.reset();
  }

  private reset(): void {
    this.dug = this.startDug.slice();
    this.field = new WaterField(this.width, this.height, this.tiles);
    for (let i = 0; i < this.tiles.length; i++) this.field.ground[i] = this.groundFor(i);
    this.past = [];
    this.future = [];
    this.strokeStart = null;
  }

  private groundFor(i: number): number {
    switch (this.tiles[i]) {
      case 'sand':
        return this.dug[i] ? DUG_HEIGHT : SAND_HEIGHT;
      case 'rock':
        return SAND_HEIGHT + 2;
      case 'pond':
        return POND_HEIGHT;
      default:
        return DUG_HEIGHT;
    }
  }

  tileAt(x: number, y: number): Tile {
    return this.tiles[y * this.width + x];
  }

  isDug(x: number, y: number): boolean {
    return this.dug[y * this.width + x] === 1;
  }

  /** Squares dug by the player that weren't ditches to begin with. */
  digsUsed(): number {
    let n = 0;
    for (let i = 0; i < this.dug.length; i++) if (this.dug[i] && !this.startDug[i]) n++;
    return n;
  }

  digsLeft(): number | null {
    return this.budget === null ? null : this.budget - this.digsUsed();
  }

  waterAt(x: number, y: number): number {
    return this.field.water[y * this.width + x];
  }

  /** 0 to 1: how close a plant is to blooming. */
  plantProgress(x: number, y: number): number {
    return Math.min(1, this.field.drunk[y * this.width + x] / PLANT_NEED);
  }

  isBloomed(x: number, y: number): boolean {
    return this.field.bloomed[y * this.width + x] === 1;
  }

  plants(): Pos[] {
    const out: Pos[] = [];
    this.tiles.forEach((t, i) => {
      if (t === 'plant') out.push({ x: i % this.width, y: Math.floor(i / this.width) });
    });
    return out;
  }

  get won(): boolean {
    const plants = this.plants();
    return plants.length > 0 && plants.every((p) => this.isBloomed(p.x, p.y));
  }

  canDig(x: number, y: number): DigRefusal | null {
    const i = y * this.width + x;
    if (this.tiles[i] !== 'sand') return 'not-sand';
    if (this.dug[i]) return 'already';
    if (!this.startDug[i] && this.budget !== null && this.digsUsed() >= this.budget) return 'budget';
    return null;
  }

  dig(x: number, y: number): DigRefusal | null {
    const refusal = this.canDig(x, y);
    if (refusal) return refusal;
    this.record(() => this.setDug(y * this.width + x, true));
    return null;
  }

  /** Returns false when there is nothing to fill there. */
  fill(x: number, y: number): boolean {
    const i = y * this.width + x;
    if (this.tiles[i] !== 'sand' || !this.dug[i]) return false;
    this.record(() => this.setDug(i, false));
    return true;
  }

  apply(action: Action): boolean {
    const { x, y } = action.at;
    return action.type === 'dig' ? this.dig(x, y) === null : this.fill(x, y);
  }

  /** Several digs and fills (one drag) become one undo step. */
  beginStroke(): void {
    this.strokeStart ??= this.dug.slice();
  }

  endStroke(): void {
    const before = this.strokeStart;
    this.strokeStart = null;
    if (before) this.push(before, false);
  }

  /** Clears the player's digging back to the start and plays the known solution, as one undo step. */
  applySolution(): boolean {
    this.endStroke();
    const before = this.dug.slice();
    this.strokeStart = before;
    for (let i = 0; i < this.dug.length; i++) if (this.dug[i] !== this.startDug[i]) this.setDug(i, this.startDug[i] === 1);
    const ok = this.level.solution.every((a) => this.apply(a));
    this.strokeStart = null;
    this.push(before, true);
    return ok;
  }

  /** Squares the known solution wants changed that aren't changed yet. */
  solutionTodo(): Action[] {
    return this.level.solution.filter((a) => {
      const dug = this.isDug(a.at.x, a.at.y);
      return a.type === 'dig' ? !dug : dug;
    });
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  lastWasSolution(): boolean {
    return this.past[this.past.length - 1]?.solution ?? false;
  }

  undo(): boolean {
    this.endStroke();
    const entry = this.past.pop();
    if (!entry) return false;
    this.setAll(entry.before);
    this.future.push(entry);
    return true;
  }

  redo(): boolean {
    const entry = this.future.pop();
    if (!entry) return false;
    this.setAll(entry.after);
    this.past.push(entry);
    return true;
  }

  restart(): void {
    this.reset();
  }

  step(n = 1): void {
    for (let k = 0; k < n; k++) this.field.step();
  }

  private record(change: () => void): void {
    if (this.strokeStart) return change();
    const before = this.dug.slice();
    change();
    this.push(before, false);
  }

  private push(before: Uint8Array, solution: boolean): void {
    if (before.every((v, i) => v === this.dug[i])) return;
    this.past.push({ before, after: this.dug.slice(), solution });
    this.future = [];
  }

  private setAll(state: Uint8Array): void {
    for (let i = 0; i < state.length; i++) if (state[i] !== this.dug[i]) this.setDug(i, state[i] === 1);
  }

  private setDug(i: number, dug: boolean): void {
    this.dug[i] = dug ? 1 : 0;
    this.field.ground[i] = this.groundFor(i);
    if (!dug) this.field.soak(i);
  }
}
