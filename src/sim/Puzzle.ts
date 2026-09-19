import { parseLevel } from './level';
import type { Action, DigRefusal, LevelDef, Pos, Tile, ToolRefusal } from './types';
import { blocks, DUG_HEIGHT, type FieldTile, PLANT_NEED, POND_HEIGHT, SAND_HEIGHT, THAW_STEPS, WaterField } from './water';

/** What the player has changed on a square. Undo snapshots all of these at once. */
const DUG = 1;
const PIPE = 2;
const BLAST = 4;
const BOMB = 8;
const OPEN = 16;

interface HistoryEntry {
  before: Uint8Array;
  after: Uint8Array;
  /** "Solve it for me" counts as help. */
  solution: boolean;
}

const STEPS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/**
 * One level in play: which squares are dug, piped, blown up or opened, the
 * water on them, and undo. Undo and redo change the ground only; water keeps what it has.
 */
export class Puzzle {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly Tile[];
  readonly budget: number | null;
  readonly pipes: number | null;
  readonly bombs: number | null;
  field!: WaterField;
  private readonly sun: readonly boolean[];
  private readonly startMarks: Uint8Array;
  private marks!: Uint8Array;
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private strokeStart: Uint8Array | null = null;

  constructor(readonly level: LevelDef) {
    const parsed = parseLevel(level);
    this.width = parsed.width;
    this.height = parsed.height;
    this.tiles = parsed.tiles;
    this.sun = parsed.sun;
    this.budget = level.budget ?? null;
    this.pipes = level.pipes ?? null;
    this.bombs = level.bombs ?? null;
    this.startMarks = Uint8Array.from(parsed.dug, (d, i) => (d ? DUG : 0) | (parsed.open[i] ? OPEN : 0));
    this.reset();
  }

  private reset(): void {
    this.marks = this.startMarks.slice();
    this.field = new WaterField(this.width, this.height, this.tiles);
    this.sun.forEach((s, i) => (this.field.sun[i] = s ? 1 : 0));
    for (let i = 0; i < this.tiles.length; i++) this.refresh(i);
    this.past = [];
    this.future = [];
    this.strokeStart = null;
  }

  /** Works out how square `i` behaves for the water from its tile and marks. */
  private refresh(i: number): void {
    const m = this.marks[i];
    const f = this.field;
    let tile: FieldTile = this.tiles[i];
    let ground = DUG_HEIGHT;
    switch (this.tiles[i]) {
      case 'sand':
        ground = m & DUG ? DUG_HEIGHT : SAND_HEIGHT;
        break;
      case 'rock':
        if (m & PIPE) tile = 'pipe';
        else if (m & BLAST) {
          tile = 'sand';
          ground = m & DUG ? DUG_HEIGHT : SAND_HEIGHT;
        } else ground = SAND_HEIGHT + 2;
        break;
      case 'hole':
        if (m & PIPE) tile = 'pipe';
        break;
      case 'pond':
        ground = POND_HEIGHT;
        break;
      case 'gate':
        tile = m & OPEN ? 'gate' : 'shut';
        break;
      case 'weed':
        ground = SAND_HEIGHT + 2;
        break;
      case 'frozen':
        // Thawing belongs to the water, not to undo.
        tile = f.tiles[i];
        break;
      default:
        break;
    }
    f.tiles[i] = tile;
    f.ground[i] = ground;
    if (ground >= SAND_HEIGHT || blocks(tile)) f.soak(i);
  }

  tileAt(x: number, y: number): Tile {
    return this.tiles[y * this.width + x];
  }

  isDug(x: number, y: number): boolean {
    return (this.marks[y * this.width + x] & DUG) !== 0;
  }

  hasPipe(x: number, y: number): boolean {
    return (this.marks[y * this.width + x] & PIPE) !== 0;
  }

  /** A rock blown up by a bomb: sand now. */
  isBlasted(x: number, y: number): boolean {
    return (this.marks[y * this.width + x] & BLAST) !== 0;
  }

  isGateOpen(x: number, y: number): boolean {
    return (this.marks[y * this.width + x] & OPEN) !== 0;
  }

  isSun(x: number, y: number): boolean {
    return this.sun[y * this.width + x];
  }

  /** A frozen spring that has melted and now gives water. */
  isThawed(x: number, y: number): boolean {
    const i = y * this.width + x;
    return this.tiles[i] === 'frozen' && this.field.tiles[i] === 'spring';
  }

  /** 0 to 1: how far a frozen spring is from thawing. */
  thawProgress(x: number, y: number): number {
    return this.isThawed(x, y) ? 1 : Math.min(1, this.field.warmth[y * this.width + x] / THAW_STEPS);
  }

  /** Squares the shovel works on: sand, and rock a bomb has turned into sand. */
  isDiggable(x: number, y: number): boolean {
    const t = this.tileAt(x, y);
    return t === 'sand' || (t === 'rock' && this.isBlasted(x, y));
  }

  /** Squares dug by the player that weren't ditches to begin with. */
  digsUsed(): number {
    return this.count((m, i) => (m & DUG) !== 0 && (this.startMarks[i] & DUG) === 0);
  }

  digsLeft(): number | null {
    return this.budget === null ? null : this.budget - this.digsUsed();
  }

  pipesLeft(): number | null {
    return this.pipes === null ? null : this.pipes - this.count((m) => (m & PIPE) !== 0);
  }

  bombsLeft(): number | null {
    return this.bombs === null ? null : this.bombs - this.count((m) => (m & BOMB) !== 0);
  }

  private count(test: (m: number, i: number) => boolean): number {
    let n = 0;
    for (let i = 0; i < this.marks.length; i++) if (test(this.marks[i], i)) n++;
    return n;
  }

  waterAt(x: number, y: number): number {
    return this.field.water[y * this.width + x];
  }

  /** 0 to 1: how close a plant is to blooming. */
  plantProgress(x: number, y: number): number {
    return Math.min(1, this.field.drunk[y * this.width + x] / PLANT_NEED);
  }

  /** How much a weed has drunk, for drawing it bigger. */
  weedDrunk(x: number, y: number): number {
    return this.field.weedDrunk[y * this.width + x];
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
    if (!this.isDiggable(x, y)) return 'not-sand';
    if (this.marks[i] & DUG) return 'already';
    if (!(this.startMarks[i] & DUG) && this.budget !== null && this.digsUsed() >= this.budget) return 'budget';
    return null;
  }

  dig(x: number, y: number): DigRefusal | null {
    const refusal = this.canDig(x, y);
    if (refusal) return refusal;
    this.record(() => this.setMarks(y * this.width + x, this.marks[y * this.width + x] | DUG));
    return null;
  }

  /** Returns false when there is nothing to fill there. */
  fill(x: number, y: number): boolean {
    const i = y * this.width + x;
    if (!this.isDiggable(x, y) || !(this.marks[i] & DUG)) return false;
    this.record(() => this.setMarks(i, this.marks[i] & ~DUG));
    return true;
  }

  canPipe(x: number, y: number): ToolRefusal | null {
    const t = this.tileAt(x, y);
    if (this.hasPipe(x, y)) return 'already';
    if (t !== 'hole' && !(t === 'rock' && !this.isBlasted(x, y))) return 'wrong-square';
    if ((this.pipesLeft() ?? 0) <= 0) return 'none-left';
    return null;
  }

  /** Lays a pipe on a rock or a hole; water runs through it like a ditch. */
  pipe(x: number, y: number): ToolRefusal | null {
    const refusal = this.canPipe(x, y);
    if (refusal) return refusal;
    const i = y * this.width + x;
    this.record(() => this.setMarks(i, this.marks[i] | PIPE));
    return null;
  }

  /** Takes a pipe back up. */
  unpipe(x: number, y: number): boolean {
    const i = y * this.width + x;
    if (!(this.marks[i] & PIPE)) return false;
    this.record(() => this.setMarks(i, this.marks[i] & ~PIPE));
    return true;
  }

  canBomb(x: number, y: number): ToolRefusal | null {
    if (this.tileAt(x, y) !== 'rock' || this.hasPipe(x, y)) return 'wrong-square';
    if (this.isBlasted(x, y)) return 'already';
    if ((this.bombsLeft() ?? 0) <= 0) return 'none-left';
    return null;
  }

  /** Blows up a rock and every rock touching its sides (not pipes) into plain sand. */
  bomb(x: number, y: number): ToolRefusal | null {
    const refusal = this.canBomb(x, y);
    if (refusal) return refusal;
    this.record(() => {
      const i = y * this.width + x;
      this.setMarks(i, this.marks[i] | BOMB | BLAST);
      for (const [dx, dy] of STEPS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) continue;
        if (this.tileAt(nx, ny) !== 'rock' || this.hasPipe(nx, ny)) continue;
        const j = ny * this.width + nx;
        this.setMarks(j, this.marks[j] | BLAST);
      }
    });
    return null;
  }

  /** Opens or shuts a gate. False if it isn't a gate or is already that way. */
  setGate(x: number, y: number, open: boolean): boolean {
    const i = y * this.width + x;
    if (this.tiles[i] !== 'gate' || this.isGateOpen(x, y) === open) return false;
    this.record(() => this.setMarks(i, open ? this.marks[i] | OPEN : this.marks[i] & ~OPEN));
    return true;
  }

  toggleGate(x: number, y: number): boolean {
    return this.setGate(x, y, !this.isGateOpen(x, y));
  }

  apply(action: Action): boolean {
    const { x, y } = action.at;
    switch (action.type) {
      case 'dig':
        return this.dig(x, y) === null;
      case 'fill':
        return this.fill(x, y);
      case 'pipe':
        return this.pipe(x, y) === null;
      case 'bomb':
        return this.bomb(x, y) === null;
      case 'gate':
        return this.setGate(x, y, action.open);
    }
  }

  /** True when the board already looks the way this action would leave it. */
  private isDone(a: Action): boolean {
    const { x, y } = a.at;
    switch (a.type) {
      case 'dig':
        return this.isDug(x, y);
      case 'fill':
        return !this.isDug(x, y);
      case 'pipe':
        return this.hasPipe(x, y);
      case 'bomb':
        return (this.marks[y * this.width + x] & BOMB) !== 0;
      case 'gate':
        return this.isGateOpen(x, y) === a.open;
    }
  }

  /** Several changes (one drag) become one undo step. */
  beginStroke(): void {
    this.strokeStart ??= this.marks.slice();
  }

  endStroke(): void {
    const before = this.strokeStart;
    this.strokeStart = null;
    if (before) this.push(before, false);
  }

  /** Clears the player's changes back to the start and plays the known solution, as one undo step. */
  applySolution(): boolean {
    this.endStroke();
    const before = this.marks.slice();
    this.strokeStart = before;
    this.setAll(this.startMarks);
    const ok = this.level.solution.every((a) => this.apply(a));
    this.strokeStart = null;
    this.push(before, true);
    return ok;
  }

  /** What the known solution wants changed that isn't changed yet. */
  solutionTodo(): Action[] {
    return this.level.solution.filter((a) => !this.isDone(a));
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
    const before = this.marks.slice();
    change();
    this.push(before, false);
  }

  private push(before: Uint8Array, solution: boolean): void {
    if (before.every((v, i) => v === this.marks[i])) return;
    this.past.push({ before, after: this.marks.slice(), solution });
    this.future = [];
  }

  private setAll(state: Uint8Array): void {
    for (let i = 0; i < state.length; i++) if (state[i] !== this.marks[i]) this.setMarks(i, state[i]);
  }

  private setMarks(i: number, m: number): void {
    this.marks[i] = m;
    this.refresh(i);
  }
}
