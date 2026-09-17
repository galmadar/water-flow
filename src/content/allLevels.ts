import { LEVELS } from './levels';
import { TOOL_LEVELS } from './toolLevels';
import type { LevelDef } from '../sim/types';

/** Every level in play order: the digging levels, then the ones with new tools and squares. */
export const ALL_LEVELS: readonly LevelDef[] = [...LEVELS, ...TOOL_LEVELS];
