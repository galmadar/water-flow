import type { Tile } from './types';

/** Heights are in the same units as water depth. */
export const SAND_HEIGHT = 4;
export const DUG_HEIGHT = 2;
export const POND_HEIGHT = 1;
/** The spring tops its surface up to here: above a channel floor, below the sand, so it never floods the board. */
export const SPRING_HEAD = 3;
/** Most water the spring adds per step. Small enough that a hole near it starves everything else. */
export const SPRING_RATE = 0.012;

/** Share of a surface difference that moves per step. Under 1/4 keeps the explicit update from overshooting. */
export const FLOW_RATE = 0.2;
export const PLANT_DRINK = 0.02;
/** A plant only drinks water deeper than this, so a trickle is not enough. */
export const PLANT_WET = 0.3;
export const PLANT_NEED = 2;
/** Differences below this are treated as level, so still water stays still. */
const EPSILON = 1e-7;

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/**
 * Height map plus water depth on a grid. Deterministic: every step reads the
 * old state, then writes all moves at once, so scan order never matters.
 */
export class WaterField {
  readonly ground: Float64Array;
  readonly water: Float64Array;
  /** How much each plant has drunk so far. */
  readonly drunk: Float64Array;
  readonly bloomed: Uint8Array;
  /** Totals since the start, so tests can balance the books. */
  sourced = 0;
  drained = 0;
  drankTotal = 0;
  steps = 0;
  private readonly delta: Float64Array;
  private readonly flow = [0, 0, 0, 0];

  constructor(
    readonly width: number,
    readonly height: number,
    readonly tiles: readonly Tile[],
  ) {
    const n = width * height;
    this.ground = new Float64Array(n);
    this.water = new Float64Array(n);
    this.drunk = new Float64Array(n);
    this.bloomed = new Uint8Array(n);
    this.delta = new Float64Array(n);
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  totalWater(): number {
    let sum = 0;
    for (let i = 0; i < this.water.length; i++) sum += this.water[i];
    return sum;
  }

  step(): void {
    const { width, height, tiles, ground, water, delta, flow } = this;
    delta.fill(0);

    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] !== 'spring') continue;
      const add = Math.min(SPRING_RATE, SPRING_HEAD - ground[i] - water[i]);
      if (add > 0) {
        this.sourced += add;
        water[i] += add;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const w = water[i];
        if (w <= EPSILON || tiles[i] === 'rock') continue;
        const surface = ground[i] + w;
        let out = 0;
        for (let d = 0; d < 4; d++) {
          flow[d] = 0;
          const nx = x + NEIGHBOURS[d][0];
          const ny = y + NEIGHBOURS[d][1];
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (tiles[j] === 'rock') continue;
          const drop = surface - (ground[j] + water[j]);
          if (drop > EPSILON) {
            flow[d] = FLOW_RATE * drop;
            out += flow[d];
          }
        }
        if (out === 0) continue;
        // A cell can't give more than it holds.
        const scale = out > w ? w / out : 1;
        for (let d = 0; d < 4; d++) {
          if (flow[d] === 0) continue;
          const f = flow[d] * scale;
          delta[i] -= f;
          delta[(y + NEIGHBOURS[d][1]) * width + x + NEIGHBOURS[d][0]] += f;
        }
      }
    }

    for (let i = 0; i < water.length; i++) {
      const w = water[i] + delta[i];
      water[i] = w > 0 ? w : 0;
    }

    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === 'hole') {
        this.drained += water[i];
        water[i] = 0;
      } else if (tiles[i] === 'plant' && !this.bloomed[i]) {
        const sip = Math.min(water[i] - PLANT_WET, PLANT_DRINK);
        if (sip <= 0) continue;
        water[i] -= sip;
        this.drunk[i] += sip;
        this.drankTotal += sip;
        if (this.drunk[i] >= PLANT_NEED) this.bloomed[i] = 1;
      }
    }
    this.steps++;
  }

  /** Water on a square the player just filled soaks into the sand. */
  soak(i: number): void {
    this.drained += this.water[i];
    this.water[i] = 0;
  }
}
