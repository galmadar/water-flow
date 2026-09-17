import type { Puzzle } from '../sim/Puzzle';
import type { Action, Pos, ToolName } from '../sim/types';
import { CANVAS_H, CANVAS_W, CELL, COLS, MARGIN, ROWS, cellOrigin } from './layout';
import { BOARD as PAL, applyCssPalette } from './palette';

export interface ViewState {
  puzzle: Puzzle;
  tool: ToolName;
  hoverCell: Pos | null;
  shake: { cell: Pos; start: number } | null;
  wonAt: number | null;
  /** Squares the solution still wants changed, or null when the overlay is off. */
  solution: Action[] | null;
}

const SHAKE_MS = 320;
/** How far a ditch's dirt wall and its floor sit in from the cell edge. */
const WALL_INSET = 3;
const FLOOR_INSET = 5;
/** Thinner than this and the water isn't drawn at all. */
const MIN_DRAWN_DEPTH = 0.02;

type LowTest = (x: number, y: number) => boolean;

/** Draws in layout units scaled to the canvas's real device pixels, so hit-testing in layout.ts stays the same at any size. */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2D canvas');
    this.ctx = ctx;
    applyCssPalette(canvas.ownerDocument.documentElement);
  }

  draw(v: ViewState, now: number): void {
    const { ctx } = this;
    const p = v.puzzle;
    this.fitBacking();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const bw = COLS * CELL;
    const bh = ROWS * CELL;

    // Frame and sand.
    ctx.save();
    ctx.shadowColor = PAL.shadow;
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = v.wonAt === null ? PAL.frame : PAL.frameWin;
    rounded(ctx, MARGIN - 6, MARGIN - 6, bw + 12, bh + 12, 14);
    ctx.fill();
    ctx.restore();
    if (v.wonAt !== null) {
      const glow = 0.5 + 0.5 * Math.sin((now - v.wonAt) / 260);
      ctx.save();
      ctx.shadowColor = PAL.frameWin;
      ctx.shadowBlur = 8 + 10 * glow;
      ctx.strokeStyle = PAL.frameWin;
      ctx.lineWidth = 3;
      rounded(ctx, MARGIN - 5, MARGIN - 5, bw + 10, bh + 10, 13);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    rounded(ctx, MARGIN, MARGIN, bw, bh, 9);
    ctx.clip();
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        this.sand(x, y);
        if (p.isSun(x, y)) this.sunGround(x, y);
        if (p.tileAt(x, y) === 'rock' && p.isBlasted(x, y)) this.rubble(x, y);
      }

    const low: LowTest = (x, y) => inBoard(x, y) && isLow(p, x, y);
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        if (!low(x, y)) continue;
        ctx.fillStyle = PAL.ditchWall;
        blob(ctx, x, y, WALL_INSET, low);
        ctx.fill();
        ctx.fillStyle = p.tileAt(x, y) === 'pond' ? PAL.pondFloor : PAL.ditchFloor;
        blob(ctx, x, y, FLOOR_INSET, low);
        ctx.fill();
      }

    const wet: LowTest = (x, y) => inBoard(x, y) && low(x, y) && p.waterAt(x, y) > MIN_DRAWN_DEPTH;
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) if (wet(x, y)) this.water(x, y, p.waterAt(x, y), wet, now);

    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        if (p.isSun(x, y)) this.sunGlare(x, y, p.isDug(x, y), now);
        switch (p.tileAt(x, y)) {
          case 'rock':
            if (p.hasPipe(x, y)) this.pipe(x, y, low, p.waterAt(x, y) > MIN_DRAWN_DEPTH, true);
            else if (!p.isBlasted(x, y)) this.rock(x, y);
            break;
          case 'gate':
            this.gate(x, y, p.isGateOpen(x, y), low);
            break;
          case 'weed':
            this.weed(x, y, p.weedDrunk(x, y), now);
            break;
          case 'frozen':
            if (p.isThawed(x, y)) this.spring(x, y, now);
            else this.ice(x, y, p.thawProgress(x, y));
            break;
          case 'spring':
            this.spring(x, y, now);
            break;
          case 'hole':
            if (p.hasPipe(x, y)) {
              this.hole(x, y, now);
              this.pipe(x, y, low, p.waterAt(x, y) > MIN_DRAWN_DEPTH, false);
            } else this.hole(x, y, now);
            break;
          case 'plant':
            this.plant(x, y, p.plantProgress(x, y), p.isBloomed(x, y), now);
            break;
          default:
            break;
        }
      }

    if (v.solution) for (const a of v.solution) this.ghost(a, now);
    ctx.restore();

    if (v.hoverCell && canTouch(p, v.hoverCell, v.tool)) this.hover(v.hoverCell, v.tool);
    if (v.shake && now - v.shake.start < SHAKE_MS) this.flash(v.shake.cell, (now - v.shake.start) / SHAKE_MS);
  }

  private fitBacking(): void {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round((c.clientWidth || CANVAS_W) * dpr));
    const h = Math.max(1, Math.round((c.clientHeight || CANVAS_H) * dpr));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    this.ctx.setTransform(w / CANVAS_W, 0, 0, h / CANVAS_H, 0, 0);
  }

  private sand(x: number, y: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    ctx.fillStyle = (x + y) % 2 === 0 ? PAL.sand : PAL.sandAlt;
    ctx.fillRect(o.x, o.y, CELL, CELL);
    ctx.fillStyle = PAL.sandSpeck;
    for (let k = 0; k < 3; k++) {
      const h = hash(x, y, k);
      ctx.fillRect(o.x + 3 + (h % 26), o.y + 3 + ((h >> 5) % 26), 1.5, 1.5);
    }
    ctx.fillStyle = PAL.sandLight;
    const h = hash(x, y, 9);
    ctx.fillRect(o.x + 4 + (h % 24), o.y + 4 + ((h >> 5) % 24), 2, 1);
  }

  private water(x: number, y: number, depth: number, wet: LowTest, now: number): void {
    const { ctx } = this;
    const d = Math.min(1, depth);
    ctx.fillStyle = mix(PAL.waterMid, PAL.waterDeep, Math.min(1, depth / 2));
    ctx.globalAlpha = 0.7 + 0.3 * d;
    blob(ctx, x, y, FLOOR_INSET, wet);
    ctx.fill();
    // A glint that drifts across moving water.
    const o = cellOrigin(x, y);
    const t = (now / 1400 + hash(x, y, 3) / 997) % 1;
    ctx.globalAlpha = 0.25 + 0.3 * d;
    ctx.strokeStyle = PAL.waterShine;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const gy = o.y + FLOOR_INSET + 3 + t * (CELL - 2 * FLOOR_INSET - 6);
    const gx = o.x + 9 + (hash(x, y, 4) % 8);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 6, gy);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private rock(x: number, y: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    const cx = o.x + CELL / 2;
    const cy = o.y + CELL / 2 + 1;
    const h = hash(x, y, 7);
    ctx.fillStyle = PAL.rockDark;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.rock;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 12 + (h % 2), 10 + ((h >> 3) % 2), ((h % 7) - 3) / 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.rockLight;
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 4, 5, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private spring(x: number, y: number, now: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    const cx = o.x + CELL / 2;
    const cy = o.y + CELL / 2;
    ctx.strokeStyle = PAL.springStone;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 2; k++) {
      const t = (now / 1200 + k / 2) % 1;
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = PAL.waterShine;
      ctx.beginPath();
      ctx.arc(cx, cy, 2 + t * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.waterLight;
    ctx.beginPath();
    ctx.arc(cx, cy, 2 + Math.sin(now / 180), 0, Math.PI * 2);
    ctx.fill();
  }

  private hole(x: number, y: number, now: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    const cx = o.x + CELL / 2;
    const cy = o.y + CELL / 2;
    ctx.fillStyle = PAL.holeRim;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.hole;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    // A slow swirl so it reads as a hole that swallows.
    ctx.strokeStyle = PAL.holeRim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const a = now / 700;
    ctx.arc(cx, cy, 4.5, a, a + 2.2);
    ctx.stroke();
  }

  private plant(x: number, y: number, progress: number, bloomed: boolean, now: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    const cx = o.x + CELL / 2;
    const base = o.y + CELL - 7;
    const green = bloomed ? 1 : progress;
    const sway = Math.sin(now / 700 + x) * (bloomed ? 1.2 : 0.4);
    const tall = bloomed ? 17 : 11 + 3 * progress;
    const topX = cx + sway;
    const topY = base - tall;

    if (!bloomed) {
      ctx.strokeStyle = PAL.ringBack;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, o.y + CELL / 2, 13, 0, Math.PI * 2);
      ctx.stroke();
      if (progress > 0) {
        ctx.strokeStyle = PAL.ring;
        ctx.beginPath();
        ctx.arc(cx, o.y + CELL / 2, 13, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = mix(PAL.dryStem, PAL.stem, green);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, base);
    ctx.quadraticCurveTo(cx, base - tall / 2, topX, topY);
    ctx.stroke();

    const leafColour = mix(PAL.dryLeaf, PAL.leaf, green);
    const droop = (1 - green) * 0.9;
    this.leaf(cx, base - tall * 0.45, -1, droop, leafColour);
    this.leaf(cx, base - tall * 0.3, 1, droop, leafColour);

    if (bloomed) {
      ctx.fillStyle = PAL.petal;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + now / 3000;
        ctx.beginPath();
        ctx.arc(topX + Math.cos(a) * 4, topY + Math.sin(a) * 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = PAL.petalCentre;
      ctx.beginPath();
      ctx.arc(topX, topY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = mix(PAL.dryLeaf, PAL.leafLight, green);
      ctx.beginPath();
      ctx.arc(topX, topY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private leaf(x: number, y: number, side: -1 | 1, droop: number, colour: string): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(side * (-0.5 + droop));
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(side * 5, 0, 5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private ghost(a: Action, now: number): void {
    const { ctx } = this;
    const o = cellOrigin(a.at.x, a.at.y);
    const cx = o.x + CELL / 2;
    const cy = o.y + CELL / 2;
    ctx.strokeStyle = PAL.solution;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.65 + 0.3 * Math.sin(now / 300);
    if (a.type === 'pipe') {
      // Two dashed rails: lay a pipe here.
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(o.x + 4, cy - 6);
      ctx.lineTo(o.x + CELL - 4, cy - 6);
      ctx.moveTo(o.x + 4, cy + 6);
      ctx.lineTo(o.x + CELL - 4, cy + 6);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (a.type === 'bomb') {
      // A dashed star: bomb here.
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const r = k % 2 === 0 ? 13 : 6;
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (a.type === 'gate') {
      // A dashed ring with a dot: tap this gate.
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = PAL.solution;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (a.type === 'dig') {
      ctx.setLineDash([4, 3]);
      rounded(ctx, o.x + 5, o.y + 5, CELL - 10, CELL - 10, 6);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(o.x + 10, o.y + 10);
      ctx.lineTo(o.x + CELL - 10, o.y + CELL - 10);
      ctx.moveTo(o.x + CELL - 10, o.y + 10);
      ctx.lineTo(o.x + 10, o.y + CELL - 10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private hover(c: Pos, tool: ToolName): void {
    const { ctx } = this;
    const o = cellOrigin(c.x, c.y);
    ctx.strokeStyle = tool === 'fill' ? PAL.hoverFill : tool === 'bomb' ? PAL.bomb : PAL.hoverDig;
    ctx.lineWidth = 2;
    rounded(ctx, o.x + 1.5, o.y + 1.5, CELL - 3, CELL - 3, 7);
    ctx.stroke();
  }

  private sunGround(x: number, y: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    ctx.fillStyle = PAL.sunTint;
    ctx.fillRect(o.x, o.y, CELL, CELL);
  }

  /** Drawn over the ditch and water too, so a dug sun square still reads as hot. */
  private sunGlare(x: number, y: number, dug: boolean, now: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    if (dug) {
      ctx.fillStyle = PAL.sunTint;
      ctx.fillRect(o.x, o.y, CELL, CELL);
    }
    // A small sun in the corner, its rays turning slowly.
    const cx = o.x + CELL - 8;
    const cy = o.y + 8;
    const a0 = now / 2500 + hash(x, y, 5);
    ctx.strokeStyle = PAL.sunRay;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = a0 + (k / 6) * Math.PI * 2;
      ctx.moveTo(cx + Math.cos(a) * 3.6, cy + Math.sin(a) * 3.6);
      ctx.lineTo(cx + Math.cos(a) * 5.6, cy + Math.sin(a) * 5.6);
    }
    ctx.stroke();
    ctx.fillStyle = PAL.sunCore;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  private rubble(x: number, y: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    ctx.fillStyle = PAL.rubble;
    for (let k = 0; k < 6; k++) {
      const h = hash(x, y, 20 + k);
      ctx.beginPath();
      ctx.arc(o.x + 5 + (h % 22), o.y + 5 + ((h >> 6) % 22), 1.2 + ((h >> 11) % 3) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** A grey pipe running toward each joined neighbour; a blue line shows water inside. */
  private pipe(x: number, y: number, low: LowTest, wet: boolean, onRock: boolean): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    const cx = o.x + CELL / 2;
    const cy = o.y + CELL / 2;
    if (onRock) {
      ctx.fillStyle = PAL.rockDark;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 1, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const arms: [number, number][] = [];
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ] as const)
      if (low(x + dx, y + dy)) arms.push([dx, dy]);
    if (arms.length === 0) arms.push([1, 0], [-1, 0]);
    ctx.lineCap = 'butt';
    for (const [width, colour] of [
      [12, PAL.pipeDark],
      [9, PAL.pipe],
      [3, wet ? PAL.waterMid : PAL.pipeLight],
    ] as const) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.beginPath();
      for (const [dx, dy] of arms) {
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (dx * CELL) / 2, cy + (dy * CELL) / 2);
      }
      ctx.stroke();
    }
    ctx.fillStyle = PAL.pipeDark;
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = wet ? PAL.waterMid : PAL.pipe;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Two posts; shut, a plank bars the ditch, open, the plank swings to the side. */
  private gate(x: number, y: number, open: boolean, low: LowTest): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    const cx = o.x + CELL / 2;
    const cy = o.y + CELL / 2;
    const alongX = low(x - 1, y) || low(x + 1, y) || !(low(x, y - 1) || low(x, y + 1));
    ctx.save();
    ctx.translate(cx, cy);
    if (!alongX) ctx.rotate(Math.PI / 2);
    // Water runs along x here; posts sit above and below the channel.
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(-3, -14, 6, 5);
    ctx.fillRect(-3, 9, 6, 5);
    if (open) {
      ctx.fillStyle = PAL.wood;
      ctx.save();
      ctx.translate(0, -11);
      ctx.rotate(-1.2);
      ctx.fillRect(0, -2.5, 16, 5);
      ctx.restore();
    } else {
      ctx.fillStyle = PAL.wood;
      ctx.fillRect(-4, -11, 8, 22);
      ctx.strokeStyle = PAL.woodLight;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-1.5, -9);
      ctx.lineTo(-1.5, 9);
      ctx.stroke();
      ctx.strokeStyle = PAL.woodDark;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** A spiky weed that swells as it drinks. */
  private weed(x: number, y: number, drunk: number, now: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    const cx = o.x + CELL / 2;
    const cy = o.y + CELL / 2 + 2;
    const grow = 1 + Math.min(0.45, drunk / 6);
    const sway = Math.sin(now / 500 + x * 3 + y) * 0.08;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(grow, grow);
    ctx.rotate(sway);
    for (const [colour, len, count] of [
      [PAL.weed, 11, 7],
      [PAL.weedLight, 7, 5],
    ] as const) {
      ctx.fillStyle = colour;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + (len === 7 ? 0.4 : 0);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.35) * 2, Math.sin(a - 0.35) * 2);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.lineTo(Math.cos(a + 0.35) * 2, Math.sin(a + 0.35) * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = PAL.weedFlower;
    ctx.beginPath();
    ctx.arc(0, -1, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** A frozen spring: an ice block that cracks as it warms. */
  private ice(x: number, y: number, thaw: number): void {
    const { ctx } = this;
    const o = cellOrigin(x, y);
    ctx.fillStyle = PAL.iceEdge;
    rounded(ctx, o.x + 3, o.y + 3, CELL - 6, CELL - 6, 7);
    ctx.fill();
    ctx.fillStyle = PAL.ice;
    rounded(ctx, o.x + 5, o.y + 5, CELL - 10, CELL - 10, 5);
    ctx.fill();
    ctx.strokeStyle = PAL.iceShine;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(o.x + 9, o.y + 14);
    ctx.lineTo(o.x + 14, o.y + 9);
    ctx.stroke();
    // The spring sleeping inside.
    ctx.strokeStyle = PAL.springStone;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(o.x + CELL / 2, o.y + CELL / 2, 6, 0, Math.PI * 2);
    ctx.stroke();
    if (thaw > 0) {
      ctx.strokeStyle = PAL.iceEdge;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const cracks = Math.ceil(thaw * 4);
      for (let k = 0; k < cracks; k++) {
        const a = k * 1.7 + 0.5;
        ctx.moveTo(o.x + CELL / 2, o.y + CELL / 2);
        ctx.lineTo(o.x + CELL / 2 + Math.cos(a) * 11, o.y + CELL / 2 + Math.sin(a) * 11);
      }
      ctx.stroke();
    }
  }

  private flash(c: Pos, t: number): void {
    const { ctx } = this;
    const o = cellOrigin(c.x, c.y);
    const dx = Math.sin(t * Math.PI * 6) * 2.5 * (1 - t);
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = PAL.no;
    ctx.lineWidth = 3;
    rounded(ctx, o.x + 2 + dx, o.y + 2, CELL - 4, CELL - 4, 7);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function inBoard(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

/** Squares sunk below the sand, where water can sit. */
function isLow(p: Puzzle, x: number, y: number): boolean {
  switch (p.tileAt(x, y)) {
    case 'sand':
      return p.isDug(x, y);
    case 'rock':
      return p.hasPipe(x, y) || (p.isBlasted(x, y) && p.isDug(x, y));
    case 'weed':
      return false;
    case 'frozen':
      return p.isThawed(x, y);
    default:
      return true;
  }
}

/** Whether the picked tool (or a tap, for gates) does something on this square. */
function canTouch(p: Puzzle, c: Pos, tool: ToolName): boolean {
  const t = p.tileAt(c.x, c.y);
  if (t === 'gate') return true;
  if (tool === 'pipe') return p.hasPipe(c.x, c.y) || t === 'hole' || (t === 'rock' && !p.isBlasted(c.x, c.y));
  if (tool === 'bomb') return t === 'rock' && !p.hasPipe(c.x, c.y) && !p.isBlasted(c.x, c.y);
  return p.isDiggable(c.x, c.y);
}

/** One cell's share of a joined-up shape: it reaches the cell edge toward each joined neighbour. */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, inset: number, joined: LowTest): void {
  const o = cellOrigin(x, y);
  const up = joined(x, y - 1);
  const right = joined(x + 1, y);
  const down = joined(x, y + 1);
  const left = joined(x - 1, y);
  const x0 = o.x + (left ? 0 : inset);
  const y0 = o.y + (up ? 0 : inset);
  const x1 = o.x + CELL - (right ? 0 : inset);
  const y1 = o.y + CELL - (down ? 0 : inset);
  const r = 8;
  ctx.beginPath();
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, [
    up || left ? 0 : r,
    up || right ? 0 : r,
    down || right ? 0 : r,
    down || left ? 0 : r,
  ]);
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function hash(x: number, y: number, k: number): number {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
