const KEY = 'water-flow.progress.v1';

interface Saved {
  /** Index of the level being played. Still written so an older build reads the save. */
  current: number;
  /** Id of the level being played; wins over `current`, since indexes shift when levels change. */
  currentId?: string;
  /** Won by the player alone. */
  solved: string[];
  /** Won with the solution showing or applied, and never yet alone. Kept apart so older saves still read right. */
  helped: string[];
}

export type SolvedState = 'no' | 'self' | 'helped';

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []);

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    return {
      current: Number(data.current) || 0,
      currentId: typeof data.currentId === 'string' ? data.currentId : undefined,
      solved: strings(data.solved),
      helped: strings(data.helped),
    };
  } catch {
    return { current: 0, solved: [], helped: [] };
  }
}

const saved = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // A private window just forgets between visits.
  }
}

/** Level order before saves had ids, so an old index still finds its level. */
const OLD_ORDER = [
  'first-drink',
  'around-the-rock',
  'two-plants',
  'mind-the-hole',
  'share-the-ditch',
  'the-pond',
  'three-gardens',
  'dry-maze',
];

/** Where to resume in `ids`. Always a valid index. */
export function resolveCurrent(data: Pick<Saved, 'current' | 'currentId'>, ids: readonly string[]): number {
  const clamp = (i: number) => Math.min(Math.max(0, Math.floor(i) || 0), ids.length - 1);
  if (data.currentId !== undefined) {
    const i = ids.indexOf(data.currentId);
    return i >= 0 ? i : clamp(data.current);
  }
  if (data.current < 0 || data.current >= OLD_ORDER.length) return clamp(data.current);
  // A removed level resumes just after the nearest earlier one that's still here.
  for (let j = Math.floor(data.current); j >= 0; j--) {
    const i = ids.indexOf(OLD_ORDER[j]);
    if (i >= 0) return clamp(j === Math.floor(data.current) ? i : i + 1);
  }
  return 0;
}

export function currentLevel(ids: readonly string[]): number {
  return resolveCurrent(saved, ids);
}

export function setCurrentLevel(id: string, index: number): void {
  saved.current = index;
  saved.currentId = id;
  save();
}

export function solvedState(id: string): SolvedState {
  if (saved.solved.includes(id)) return 'self';
  return saved.helped.includes(id) ? 'helped' : 'no';
}

/** A win alone upgrades a helped level; a helped win never downgrades one already won alone. */
export function markSolved(id: string, helped = false): void {
  const state = solvedState(id);
  if (helped) {
    if (state !== 'no') return;
    saved.helped.push(id);
  } else {
    if (state === 'self') return;
    saved.helped = saved.helped.filter((h) => h !== id);
    saved.solved.push(id);
  }
  save();
}
