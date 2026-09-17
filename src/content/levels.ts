import { sketch } from '../sim/level';
import type { LevelDef } from '../sim/types';

/**
 * Each map is drawn with its answer on it: `*` is a square to dig, `x` an old
 * ditch to fill. `sketch` turns those back into sand/ditch plus the `solution` list.
 */
function level(meta: Omit<LevelDef, 'map' | 'solution'>, rows: string[]): LevelDef {
  return { ...meta, ...sketch(rows) };
}

export const LEVELS: readonly LevelDef[] = [
  level(
    { id: 'first-drink', name: 'First Drink', hint: 'Drag across the sand to dig a ditch from the spring to the plant.' },
    [
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
    ],
  ),
  level(
    { id: 'around-the-rock', name: 'Around the Rock', hint: 'You can’t dig through rock. Go around it.' },
    [
      '............',
      '............',
      '.....#......',
      '.....#......',
      '..S..#...P..',
      '..*..#...*..',
      '..*..#...*..',
      '..********..',
      '............',
      '............',
    ],
  ),
  level(
    { id: 'two-plants', name: 'Two Thirsty Plants', hint: 'One spring can feed two plants.' },
    [
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
    ],
  ),
  level(
    { id: 'mind-the-hole', name: 'Mind the Hole', hint: 'The hole drinks any water that touches it. Keep your ditch away.' },
    [
      '............',
      '............',
      '............',
      '............',
      '..S...O..P..',
      '..*......*..',
      '..********..',
      '............',
      '............',
      '............',
    ],
  ),
  level(
    {
      id: 'share-the-ditch',
      name: 'Share the Ditch',
      hint: 'Not much digging left. Let both plants drink from one ditch.',
      budget: 15,
    },
    [
      '............',
      '..........P.',
      '.....******.',
      '.....*#...*.',
      '.S****#...*.',
      '......#...*.',
      '..........*.',
      '..........P.',
      '............',
      '............',
    ],
  ),
  level(
    {
      id: 'the-pond',
      name: 'The Pond',
      hint: 'The pond fills up first, then spills over. Block the old ditch that leaks.',
      budget: 4,
    },
    [
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
    ],
  ),
  level(
    { id: 'three-gardens', name: 'Three Gardens', hint: 'Three plants, one spring, and just enough digging.', budget: 13 },
    [
      '............',
      '.P...##.....',
      '.*...##..P..',
      '.*.......*..',
      '.***S*****..',
      '.....*..#...',
      '.....*..#...',
      '.....P..#...',
      '..O.........',
      '............',
    ],
  ),
  level(
    {
      id: 'dry-maze',
      name: 'Dry Maze',
      hint: 'Fill the ditch that runs into the hole, then find the long way round.',
      budget: 22,
    },
    [
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
    ],
  ),
];
