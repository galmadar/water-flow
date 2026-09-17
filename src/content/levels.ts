import type { LevelDef } from '../sim/types';
import { EASY } from './levels-easy';
import { HARD } from './levels-hard';
import { MEDIUM } from './levels-medium';
import { STARTER } from './levels-starter';

export { STARTER };

/** Play order: lessons first, then easy to hard. Saved progress keys on `id`, so reordering is safe. */
export const LEVELS: readonly LevelDef[] = [...STARTER, ...EASY, ...MEDIUM, ...HARD];
