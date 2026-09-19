import type { PointerHandlers, StrokeMode } from '../input/PointerInput';
import { Puzzle } from '../sim/Puzzle';
import type { Action, LevelDef, Pos, ToolName } from '../sim/types';

/** `out` means no pipes or bombs left. */
export type GameEvent = 'changed' | 'won' | 'no' | 'budget' | 'out';
export type Tool = ToolName;
type StrokeTool = Tool | 'unpipe';

export interface Shake {
  cell: Pos;
  start: number;
}

/** Water steps per second of play. */
const STEPS_PER_SECOND = 180;
const FAST_FACTOR = 4;
/** A hidden tab can come back with a huge gap; don't try to catch all of it up. */
const MAX_STEPS_PER_FRAME = 60;

/** One level being played: the puzzle, the running water, and what the hand is doing. */
export class Game implements PointerHandlers {
  readonly puzzle: Puzzle;
  tool: Tool = 'dig';
  fast = false;
  hoverCell: Pos | null = null;
  shake: Shake | null = null;
  wonAt: number | null = null;
  /** The solution overlay is up. It stays while the player keeps playing. */
  showSolution = false;
  private helped = false;
  private strokeMode: StrokeTool | null = null;
  private strokeRefused = false;
  private lastTick: number | null = null;
  private owed = 0;

  constructor(
    level: LevelDef,
    private readonly emit: (e: GameEvent) => void,
  ) {
    this.puzzle = new Puzzle(level);
  }

  /** Called once per frame: runs the water for the time that passed. */
  tick(now: number): void {
    const dt = this.lastTick === null ? 0 : Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;
    this.owed += dt * STEPS_PER_SECOND * (this.fast ? FAST_FACTOR : 1);
    const steps = Math.min(MAX_STEPS_PER_FRAME, Math.floor(this.owed));
    this.owed -= steps;
    if (steps === 0) return;
    const wasWon = this.puzzle.won;
    this.puzzle.step(steps);
    if (!wasWon && this.puzzle.won && this.wonAt === null) {
      this.wonAt = now;
      this.emit('won');
    }
  }

  get solution(): Action[] | null {
    return this.showSolution ? this.puzzle.solutionTodo() : null;
  }

  setSolution(show: boolean): void {
    this.showSolution = show;
    this.emit('changed');
  }

  /** Digs the known solution in as one undo step; the water still has to get there. */
  applySolution(): void {
    this.showSolution = false;
    this.helped = true;
    this.puzzle.applySolution();
    this.emit('changed');
  }

  /** Won with the overlay up, or after "solve it for me". */
  wonWithHelp(): boolean {
    return this.showSolution || this.helped;
  }

  setTool(tool: Tool): void {
    this.tool = tool;
    this.emit('changed');
  }

  toggleFast(): void {
    this.fast = !this.fast;
    this.emit('changed');
  }

  enabled(): boolean {
    return true;
  }

  hover(cell: Pos | null): void {
    this.hoverCell = cell;
  }

  strokeStart(cell: Pos, mode: StrokeMode): void {
    this.strokeMode = mode === 'fill' ? 'fill' : this.tool;
    this.strokeRefused = false;
    this.puzzle.beginStroke();
    const p = this.puzzle;
    // Gates open with a tap, whatever the tool; a bomb goes off once per tap.
    if (p.tileAt(cell.x, cell.y) === 'gate') {
      this.strokeMode = null;
      this.hoverCell = cell;
      p.toggleGate(cell.x, cell.y);
      this.emit('changed');
      return;
    }
    if (this.strokeMode === 'pipe' && p.hasPipe(cell.x, cell.y)) this.strokeMode = 'unpipe';
    this.strokeCell(cell);
    if (this.strokeMode === 'bomb') this.strokeMode = null;
  }

  strokeCell(cell: Pos): void {
    this.hoverCell = cell;
    const p = this.puzzle;
    if (this.strokeMode === 'dig') {
      const refusal = p.dig(cell.x, cell.y);
      if (refusal === 'budget') this.no(cell, 'budget');
      else if (refusal === 'not-sand') this.no(cell, 'no');
      else if (!refusal) this.emit('changed');
    } else if (this.strokeMode === 'fill') {
      if (p.fill(cell.x, cell.y)) this.emit('changed');
      else if (!p.isDiggable(cell.x, cell.y) && p.tileAt(cell.x, cell.y) !== 'gate') this.no(cell, 'no');
    } else if (this.strokeMode === 'pipe' || this.strokeMode === 'bomb') {
      const refusal = this.strokeMode === 'pipe' ? p.pipe(cell.x, cell.y) : p.bomb(cell.x, cell.y);
      if (refusal === 'none-left') this.no(cell, 'out');
      // Dragging a pipe across sand is fine; only a wrong tap buzzes.
      else if (refusal === 'wrong-square' && (this.strokeMode === 'bomb' || !p.isDiggable(cell.x, cell.y))) this.no(cell, 'no');
      else if (!refusal) this.emit('changed');
    } else if (this.strokeMode === 'unpipe') {
      if (p.unpipe(cell.x, cell.y)) this.emit('changed');
    }
  }

  strokeEnd(): void {
    this.strokeMode = null;
    this.puzzle.endStroke();
    this.emit('changed');
  }

  undo(): void {
    if (this.puzzle.undo()) this.emit('changed');
  }

  redo(): void {
    if (this.puzzle.redo()) this.emit('changed');
  }

  restart(): void {
    this.puzzle.restart();
    this.wonAt = null;
    this.helped = false;
    this.emit('changed');
  }

  private no(cell: Pos, event: 'no' | 'budget' | 'out'): void {
    this.shake = { cell, start: performance.now() };
    // One buzz per stroke, not one per square dragged over.
    if (this.strokeRefused) return;
    this.strokeRefused = true;
    this.emit(event);
  }
}
