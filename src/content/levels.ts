import type { LevelDef } from '../sim/types';
import { EASY } from './levels-easy';
import { HARD } from './levels-hard';
import { MEDIUM } from './levels-medium';
import { STARTER } from './levels-starter';
import { BOMB_LEVELS, GATE_LEVELS, ICE_LEVELS, PIPE_LEVELS, SUN_LEVELS, TOOLBOX_LEVELS, WEED_LEVELS } from './toolLevels';

export { STARTER };

/** The digging levels: lessons first, then easy to hard. */
export const DIG_LEVELS: readonly LevelDef[] = [...STARTER, ...EASY, ...MEDIUM, ...HARD];

/**
 * Each tool group goes in after this many digging levels, so a new idea turns
 * up about every fifteen levels, once the player is at home with the last one.
 */
const TOOL_SLOTS: readonly (readonly [number, readonly LevelDef[]])[] = [
  [15, GATE_LEVELS],
  [27, PIPE_LEVELS],
  [39, BOMB_LEVELS],
  [51, SUN_LEVELS],
  [63, WEED_LEVELS],
  [75, ICE_LEVELS],
  [DIG_LEVELS.length, TOOLBOX_LEVELS],
];

function withTools(dig: readonly LevelDef[]): LevelDef[] {
  const out: LevelDef[] = [];
  let from = 0;
  for (const [after, group] of TOOL_SLOTS) {
    out.push(...dig.slice(from, after), ...group);
    from = after;
  }
  return [...out, ...dig.slice(from)];
}

/** Play order. Saved progress keys on `id`, so reordering is safe. */
export const LEVELS: readonly LevelDef[] = withTools(DIG_LEVELS);
