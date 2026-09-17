import { CANVAS_H, CANVAS_W, cellAt, cellsBetween } from '../render/layout';
import type { Pos } from '../sim/types';

export type StrokeMode = 'tool' | 'fill';

/** What the board needs from mouse, pen and touch: hovering, and strokes across cells. */
export interface PointerHandlers {
  enabled(): boolean;
  hover(cell: Pos | null): void;
  /** `fill` for a right-button drag; `tool` means whatever tool is picked. */
  strokeStart(cell: Pos, mode: StrokeMode): void;
  strokeCell(cell: Pos): void;
  strokeEnd(): void;
}

interface Stroke {
  id: number;
  last: Pos | null;
}

export class PointerInput {
  private stroke: Stroke | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly h: PointerHandlers,
  ) {
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onEnd(e));
    canvas.addEventListener('pointercancel', (e) => this.onEnd(e));
    canvas.addEventListener('pointerleave', (e) => {
      if (!this.stroke && e.pointerType === 'mouse') h.hover(null);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private cellOf(e: PointerEvent): Pos | null {
    const r = this.canvas.getBoundingClientRect();
    return cellAt(((e.clientX - r.left) * CANVAS_W) / r.width, ((e.clientY - r.top) * CANVAS_H) / r.height);
  }

  private onDown(e: PointerEvent): void {
    if (this.stroke || !this.h.enabled()) return;
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    const cell = this.cellOf(e);
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // The pointer can already be gone (a very quick tap); the press still counts.
    }
    this.stroke = { id: e.pointerId, last: cell };
    if (cell) this.h.strokeStart(cell, e.button === 2 ? 'fill' : 'tool');
    else this.stroke = null;
  }

  private onMove(e: PointerEvent): void {
    const cell = this.cellOf(e);
    const s = this.stroke;
    if (e.pointerType === 'mouse') this.h.hover(cell);
    if (!s || s.id !== e.pointerId) return;
    // Off the board and back in: carry on from where the pointer came back.
    if (!cell) {
      s.last = null;
      return;
    }
    if (s.last && s.last.x === cell.x && s.last.y === cell.y) return;
    const path = s.last ? cellsBetween(s.last, cell) : [cell];
    for (const c of path) this.h.strokeCell(c);
    s.last = cell;
  }

  private onEnd(e: PointerEvent): void {
    const s = this.stroke;
    if (!s || s.id !== e.pointerId) return;
    this.stroke = null;
    this.h.strokeEnd();
  }
}
