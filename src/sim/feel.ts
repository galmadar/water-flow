import { sketch } from './level';
import { Puzzle } from './Puzzle';
import type { LevelDef } from './types';

/**
 * How the water feels, measured from outside the sim. `feel.test.ts` fails when
 * any of these drift; `npm run feel:snapshot` accepts the new values.
 */

/** The game runs 180 water ticks a second (src/shell/Game.ts). */
export const TICKS_PER_SECOND = 180;
/** A measurement that hasn't happened by now counts as "never". */
const GIVE_UP = 20000;

export interface Tolerance {
  /** Allowed drift as a share of the old value, in percent. */
  percent?: number;
  /** Allowed drift in the measurement's own units. */
  abs?: number;
}

export interface FeelProbe {
  name: string;
  /** Plain words with `{n}` where the number goes. */
  label: string;
  board: string;
  tolerance: Tolerance;
  measure: () => number | null;
}

// Frozen copies of levels as they were on 2026-09-19, so new or reworked levels don't move the feel.
const BOARDS = {
  'First Drink': sketch([
    '............',
    '............',
    '............',
    '............',
    '..S******P..',
    '............',
    '............',
    '............',
    '............',
    '............',
  ]),
  'Two Thirsty Plants': sketch([
    '............',
    '............',
    '............',
    '..P.........',
    '..*.........',
    '..***S****..',
    '.........*..',
    '.........P..',
    '............',
    '............',
  ]),
  'Mind the Hole (the straight way)': sketch([
    '............',
    '............',
    '............',
    '............',
    '..S***O**P..',
    '............',
    '............',
    '............',
    '............',
    '............',
  ]),
  'The Pond': sketch([
    '............',
    '............',
    '............',
    '....uu......',
    '.S**uu**P...',
    '....uu......',
    '.....x=O....',
    '............',
    '............',
    '............',
  ]),
  'Dry Maze': sketch([
    '............',
    '.Sx=O#......',
    '.*...#..O...',
    '.*####..#...',
    '**...#..#*P.',
    '*.O..#..#*..',
    '*....O..#*..',
    '*###.####*..',
    '***********P',
    '............',
  ]),
  // A long straight ditch with the spring at one end: nothing to do but run.
  'Long Ditch': sketch(['S' + '*'.repeat(29)]),
} as const;

type BoardName = keyof typeof BOARDS;

/** A board with its answer already dug, water not yet running. */
function solved(board: BoardName): Puzzle {
  const p = new Puzzle({ id: board, name: board, hint: '', ...BOARDS[board] } satisfies LevelDef);
  if (!p.applySolution()) throw new Error(`feel: the answer on ${board} no longer digs in`);
  return p;
}

/** Ticks until `done` holds, or null if it never does. */
function ticksUntil(p: Puzzle, done: (p: Puzzle) => boolean): number | null {
  for (let t = 0; t <= GIVE_UP; t++) {
    if (done(p)) return t;
    p.step();
  }
  return null;
}

function firstPlant(p: Puzzle): { x: number; y: number } {
  return p.plants()[0];
}

export const PROBES: readonly FeelProbe[] = [
  {
    name: 'first-drink-reach',
    label: 'water takes {n} ticks to reach the plant on First Drink',
    board: 'First Drink',
    tolerance: { percent: 5 },
    measure: () => {
      const p = solved('First Drink');
      const plant = firstPlant(p);
      return ticksUntil(p, (q) => q.waterAt(plant.x, plant.y) > 0.01);
    },
  },
  {
    name: 'first-drink-bloom',
    label: 'the plant on First Drink blooms after {n} ticks',
    board: 'First Drink',
    tolerance: { percent: 5 },
    measure: () => ticksUntil(solved('First Drink'), (q) => q.won),
  },
  {
    name: 'two-plants-bloom',
    label: 'both plants on Two Thirsty Plants bloom after {n} ticks',
    board: 'Two Thirsty Plants',
    tolerance: { percent: 5 },
    measure: () => ticksUntil(solved('Two Thirsty Plants'), (q) => q.won),
  },
  {
    name: 'pond-spill',
    label: 'the pond on The Pond fills and spills over after {n} ticks',
    board: 'The Pond',
    tolerance: { percent: 5 },
    measure: () => {
      const p = solved('The Pond');
      // The first ditch square past the pond's right edge.
      const past = { x: 6, y: 4 };
      return ticksUntil(p, (q) => q.waterAt(past.x, past.y) > 0.01);
    },
  },
  {
    name: 'dry-maze-bloom',
    label: 'both plants on Dry Maze bloom after {n} ticks',
    board: 'Dry Maze',
    tolerance: { percent: 5 },
    measure: () => ticksUntil(solved('Dry Maze'), (q) => q.won),
  },
  {
    name: 'long-ditch-spread',
    label: 'after one second, water has run {n} squares down a long straight ditch',
    board: 'Long Ditch',
    tolerance: { abs: 1 },
    measure: () => {
      const p = solved('Long Ditch');
      p.step(TICKS_PER_SECOND);
      let wet = 0;
      for (let x = 1; x < p.width; x++) if (p.waterAt(x, 0) > 0.01) wet = x;
      return wet;
    },
  },
  {
    name: 'hole-drinks',
    label: 'on Mind the Hole, a straight ditch past the hole lets it swallow {n}% of the spring water in the first ten seconds',
    board: 'Mind the Hole (the straight way)',
    tolerance: { percent: 5 },
    measure: () => {
      const p = solved('Mind the Hole (the straight way)');
      p.step(10 * TICKS_PER_SECOND);
      return Math.round((p.field.drained / p.field.sourced) * 100);
    },
  },
  {
    name: 'hole-starves-plant',
    label: 'with the ditch running past the hole, the plant on Mind the Hole gets {n} percent of a drink in a minute',
    board: 'Mind the Hole (the straight way)',
    tolerance: { abs: 0 },
    measure: () => {
      const p = solved('Mind the Hole (the straight way)');
      const plant = firstPlant(p);
      p.step(60 * TICKS_PER_SECOND);
      return Math.round(p.plantProgress(plant.x, plant.y) * 100);
    },
  },
];

export interface FeelEntry {
  value: number | null;
  tolerance: Tolerance;
  label: string;
  board: string;
}

export type FeelSnapshot = Record<string, FeelEntry>;

export function measureFeel(): FeelSnapshot {
  const out: FeelSnapshot = {};
  for (const probe of PROBES) {
    out[probe.name] = { value: probe.measure(), tolerance: probe.tolerance, label: probe.label, board: probe.board };
  }
  return out;
}

export function allowed(t: Tolerance): string {
  return t.percent !== undefined ? `±${t.percent}%` : t.abs ? `±${t.abs}` : 'no change';
}

export function withinTolerance(was: number | null, now: number | null, t: Tolerance): boolean {
  if (was === null || now === null) return was === now;
  const slack = t.percent !== undefined ? (Math.abs(was) * t.percent) / 100 : (t.abs ?? 0);
  return Math.abs(now - was) <= slack + 1e-9;
}

function say(label: string, n: number | null): string {
  return n === null ? label.replace('{n}', 'never') : label.replace('{n}', String(n));
}

/** One plain sentence for Gal-facing failure output. */
export function driftMessage(name: string, was: FeelEntry, now: number | null): string {
  const nowText = say(was.label, now);
  const wasText = was.value === null ? 'never' : String(was.value);
  return (
    `The feel changed (${name}): ${nowText}, was ${wasText} (allowed ${allowed(was.tolerance)}). ` +
    'Gal has to play this before it ships. If he likes it, run npm run feel:snapshot.'
  );
}
