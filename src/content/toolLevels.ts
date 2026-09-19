import { sketch } from '../sim/level';
import type { Action, LevelDef } from '../sim/types';

/**
 * Levels for the new tools and squares: gates, pipes, bombs, hot sun, weeds
 * and frozen springs. Drawn like `levels.ts`; see `sketch` for the answer marks.
 * `wrong` is the tempting way that must not work, so the tests can prove the lesson.
 */
interface ToolLevel extends LevelDef {
  wrong?: readonly Action[];
}

function level(meta: Omit<LevelDef, 'map' | 'solution'>, rows: string[], wrong?: string[]): ToolLevel {
  return { ...meta, ...sketch(rows), ...(wrong ? { wrong: sketch(wrong).solution } : {}) };
}

export const GATE_LEVELS: readonly ToolLevel[] = [
  level(
    { id: 'the-gate', name: 'The Gate', hint: 'Tap the wooden gate to open it.' },
    [
      '............',
      '......S.....',
      '......=.....',
      '......=.....',
      '######d#####',
      '......=.....',
      '......=.....',
      '......P.....',
      '............',
      '............',
    ],
  ),
  level(
    { id: 'shut-the-leak', name: 'Shut the Leak', hint: 'One gate lets water into a hole. Shut it, open the other.' },
    [
      '............',
      '....O.......',
      '....=.......',
      '...#c#......',
      '.S===d====P.',
      '.....#......',
      '............',
      '............',
      '............',
      '............',
    ],
    [
      '............',
      '....O.......',
      '....=.......',
      '...#G#......',
      '.S===d====P.',
      '.....#......',
      '............',
      '............',
      '............',
      '............',
    ],
  ),
  level(
    {
      id: 'gate-wall',
      name: 'Gate Wall',
      hint: 'Three gates. Look where each one goes before you open it.',
      budget: 4,
    },
    [
      '......#.....',
      '.....=d=*P..',
      '.....=#.....',
      '.....=#.....',
      '.S====cO....',
      '.....=#.....',
      '.....=#.....',
      '.....=d***P.',
      '......#.....',
      '......#.....',
    ],
  ),

];

export const PIPE_LEVELS: readonly ToolLevel[] = [
  level(
    { id: 'pipe-under-rock', name: 'Pipe Under the Rock', hint: 'Pick the Pipe and tap a rock. Water runs through a pipe.', pipes: 1 },
    [
      '............',
      '..S.........',
      '..*.........',
      '..*.........',
      '..*.........',
      '##t####.....',
      '..*...######',
      '..*.........',
      '..*******P..',
      '............',
    ],
  ),
  level(
    { id: 'over-the-holes', name: 'Over the Holes', hint: 'A pipe can go over a hole too. Holes can’t drink from a pipe.', pipes: 2 },
    [
      '.....OO.....',
      '.....OO.....',
      '..P..OO.....',
      '..*..OO.....',
      '..*..OO.....',
      '..***oo***..',
      '.....OO..*..',
      '.....OO..S..',
      '.....OO.....',
      '.....OO.....',
    ],
  ),
  level(
    {
      id: 'wall-and-holes',
      name: 'Wall and Holes',
      hint: 'Going round is too far. One pipe for the rock, one for the holes.',
      budget: 15,
      pipes: 2,
    },
    [
      'S...........',
      '*...........',
      '*...........',
      't##########.',
      '*...........',
      '*...........',
      'oOOOOOOOOOOO',
      '*...........',
      '**********P.',
      '............',
    ],
  ),

];

export const BOMB_LEVELS: readonly ToolLevel[] = [
  level(
    { id: 'boom', name: 'Boom!', hint: 'Pick the Bomb and tap a rock. It breaks, and so do the rocks next to it.', bombs: 1 },
    [
      '............',
      '............',
      '.....###....',
      '.....#P#....',
      '.....#b#....',
      '......*.....',
      '......*.....',
      '..S****.....',
      '............',
      '............',
    ],
  ),
  level(
    { id: 'thick-wall', name: 'Thick Wall', hint: 'This wall is three rocks thick. One bomb breaks a whole row of three.', bombs: 1 },
    [
      '.....###....',
      '.....###....',
      '.....###....',
      '.....###....',
      '..S**rbr**P.',
      '.....###....',
      '.....###....',
      '.....###....',
      '.....###....',
      '.....###....',
    ],
  ),
  level(
    {
      id: 'one-bomb-two-plants',
      name: 'One Bomb, Two Plants',
      hint: 'One bomb has to open the way to both plants. Pick the spot well.',
      bombs: 1,
      budget: 7,
    },
    [
      '............',
      '.....S......',
      '.....*......',
      '.####r#####.',
      '.####brP###.',
      '.####r#####.',
      '.....*......',
      '.....*......',
      '.....P......',
      '............',
    ],
  ),

];

export const SUN_LEVELS: readonly ToolLevel[] = [
  level(
    { id: 'hot-sun', name: 'Hot Sun', hint: 'The sun dries water up. A ditch across all that sun never gets there. Go round.' },
    [
      '............',
      '............',
      '............',
      '....~~~~~...',
      '.S..~~~~~.P.',
      '.*..~~~~~.*.',
      '.**********.',
      '............',
      '............',
      '............',
    ],
    [
      '............',
      '............',
      '............',
      '....~~~~~...',
      '.S**+++++*P.',
      '....~~~~~...',
      '............',
      '............',
      '............',
      '............',
    ],
  ),
  level(
    {
      id: 'thin-shade',
      name: 'Cross Where It’s Thin',
      hint: 'A little sun is fine. Cross the sunny strip where it’s thinnest.',
      budget: 14,
    },
    [
      '.S..........',
      '.*..........',
      '.*******....',
      '~~~~~~~+~~~~',
      '~~~~~~~+~~~~',
      '~~~~~~~*~~~~',
      '~~~~~~~*~~~~',
      '~~~~~~~*~~~~',
      '.......*....',
      '.......P....',
    ],
    [
      '.S..........',
      '.*..........',
      '.*..........',
      '~+~~~~~.~~~~',
      '~+~~~~~.~~~~',
      '~+~~~~~.~~~~',
      '~+~~~~~.~~~~',
      '~+~~~~~.~~~~',
      '.*..........',
      '.******P....',
    ],
  ),
  level(
    {
      id: 'dry-old-ditch',
      name: 'Sunburnt Ditch',
      hint: 'The old ditch in the sun drinks all the water. Cut it off.',
      budget: 12,
    },
    [
      '.-----......',
      '.x####......',
      '.S***+P.....',
      '.*...~~.....',
      '.*...~~.....',
      '.*...~~.....',
      '~+~~~~~.....',
      '.*..........',
      '.*..........',
      '.**P........',
    ],
  ),

];

export const WEED_LEVELS: readonly ToolLevel[] = [
  level(
    { id: 'greedy-weeds', name: 'Greedy Weeds', hint: 'Weeds drink from any ditch that touches them. Keep away from them.' },
    [
      '..S.........',
      '..*..w....w.',
      '..*.........',
      '..*******...',
      '.w......*.w.',
      '........*...',
      '...w....*...',
      '........*..w',
      '.....w..*...',
      '........P...',
    ],
    [
      '..S.........',
      '..*..w....w.',
      '..*.........',
      '..*.........',
      '.w*.......w.',
      '..*.........',
      '..*w........',
      '..*........w',
      '..*..w......',
      '..******P...',
    ],
  ),
  level(
    {
      id: 'one-weed-is-ok',
      name: 'One Weed Is OK',
      hint: 'One weed only takes a little. Two take it all.',
      budget: 16,
    },
    [
      '............',
      '............',
      '..w......w..',
      '............',
      '...w..w.....',
      '.S........P.',
      '.*.w....w.*.',
      '.*........*.',
      '.*...w....*.',
      '.**********.',
    ],
    [
      '............',
      '............',
      '..w......w..',
      '............',
      '...w..w.....',
      '.S........P.',
      '.*.w....w.*.',
      '.**********.',
      '.....w......',
      '............',
    ],
  ),
  level(
    {
      id: 'hot-and-weedy',
      name: 'Hot and Weedy',
      hint: 'Sun and weeds both take water. Add them up.',
      budget: 19,
    },
    [
      '....~~......',
      '....~~.w.w..',
      '....~~......',
      '....~~.w.w..',
      '.S..~~.....P',
      '.*..~~.w.w.*',
      '.*..~~.....*',
      '.*..~~.w.w.*',
      '.*..~~.....*',
      '.***++******',
    ],
    [
      '.***++******',
      '.*..~~.w.w.*',
      '.*..~~.....*',
      '.*..~~.w.w.*',
      '.S..~~.....P',
      '....~~.w.w..',
      '....~~......',
      '....~~.w.w..',
      '....~~......',
      '....~~......',
    ],
  ),

];

export const ICE_LEVELS: readonly ToolLevel[] = [
  level(
    { id: 'frozen-spring', name: 'Frozen Spring', hint: 'Ice melts when water touches it. Then it’s a spring too.' },
    [
      '............',
      '........###.',
      '........#P#.',
      '........#=#.',
      '........#=#.',
      '........#=#.',
      '.........I..',
      '.S********..',
      '............',
      '............',
    ],
  ),
  level(
    {
      id: 'two-springs',
      name: 'Two Springs',
      hint: 'One spring can’t push water all along that sunny ditch. Wake the frozen one.',
      budget: 7,
    },
    [
      '............',
      '............',
      '..S.........',
      '..*.........',
      '..*...######',
      '..****-----P',
      '..*...######',
      '..I.........',
      '............',
      '............',
    ],
    [
      '............',
      '............',
      '..S.........',
      '..*.........',
      '..*...######',
      '..****-----P',
      '......######',
      '..I.........',
      '............',
      '............',
    ],
  ),
  level(
    { id: 'ice-and-weeds', name: 'Ice and Weeds', hint: 'The only way down is past hungry weeds. One spring isn’t enough for them.' },
    [
      '............',
      '............',
      '............',
      '...S*****I..',
      '#####*######',
      '####w*w#####',
      '#####*######',
      '####w*######',
      '#####*######',
      '.....P......',
    ],
    [
      '............',
      '............',
      '............',
      '...S**...I..',
      '#####*######',
      '####w*w#####',
      '#####*######',
      '####w*######',
      '#####*######',
      '.....P......',
    ],
  ),

];

export const TOOLBOX_LEVELS: readonly ToolLevel[] = [
  level(
    {
      id: 'toolbox',
      name: 'Toolbox',
      hint: 'A gate, a river of holes and a thick wall. Use a bit of everything.',
      pipes: 1,
      bombs: 1,
      budget: 15,
    },
    [
      '......#.....',
      '......#.....',
      '.S===*d***P.',
      '.*....#.....',
      '.*....#.....',
      '.*....#.....',
      'OoOOOOOOOOOO',
      '.*.###......',
      '.*.###......',
      '.**rbr*P....',
    ],
  ),
];

/** Each group in its own teaching order. `levels.ts` spreads them through the list. */
export const TOOL_LEVELS: readonly ToolLevel[] = [
  ...GATE_LEVELS,
  ...PIPE_LEVELS,
  ...BOMB_LEVELS,
  ...SUN_LEVELS,
  ...WEED_LEVELS,
  ...ICE_LEVELS,
  ...TOOLBOX_LEVELS,
];
