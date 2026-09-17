# Water Flow — design

A sandy board, seen from above. A spring bubbles water at one spot. Thirsty
plants sit elsewhere. Dig ditches in the sand so the water runs from the spring
to every plant. When a plant has had enough to drink it turns green and blooms.
Every plant in bloom wins the level.

## The board

12×10 squares.

| Square | What it does |
|---|---|
| Sand | Dig it into a ditch; fill a ditch back in. |
| Old ditch | Already dug when the level starts. Filling it in is free. |
| Rock | Can't be dug. Water never passes it. |
| Spring | Where the water comes from. It only rises so high: never above the sand. |
| Plant | Drinks water that reaches it. A ring shows how full it is; at full it blooms and stays bloomed. |
| Hole | Swallows every drop that reaches it. A ditch touching a hole leaks dry. |
| Pond | A deep dry hollow. It fills up first, then spills over into the ditch beyond. |
| Gate | A wooden gate in a ditch. Tap it to open or shut it. Shut, water can't pass. Free to use. |
| Hot sun | Sand you can dig, but water in a sunny ditch dries up. Four wet sun squares dry up all a spring gives. |
| Weed | Can't be dug; water can't run onto it. It drinks from any ditch touching it: one weed takes half a spring, two take it all. It swells as it drinks. |
| Frozen spring | An ice block: water can't pass. Water touching it melts it, and then it's a second spring. |

Water only moves up, down, left and right — never corner to corner.

Some levels have a **dig budget**: at most that many squares dug at once.
Filling a square you dug gives it back.

Some levels hand out **pipes** and **bombs**, with a count shown like digs left:

- **Pipe** — tap a rock or a hole to lay one; water runs through it like a
  ditch. A pipe is closed, so a hole beside it can't drink from it. Tap it again
  to take it back. Dragging lays a row of them.
- **Bomb** — tap a rock: it and the rocks touching its sides break into sand,
  which you then dig. Undo is the only way to get a bomb back.

## How the water works

Every square has a ground height: sand 4, ditch 2, pond 1, and the water depth
on top. Each step, each wet square pushes a fifth of the height difference
toward every lower neighbour (never more than it holds). All moves are worked
out from the old state and then applied together, so the result doesn't depend
on scan order and the same digging always gives the same water.

- The spring adds up to 0.012 per step until its surface reaches 3. Because
  that's under the sand (4), water never floods the board.
- A plant drinks up to 0.02 per step, but only water deeper than 0.3, so a
  trickle isn't enough. At 2 drunk it blooms.
- A hole empties itself every step. Because the spring is slow, a hole anywhere
  in the same ditch network drains the water low enough that plants go dry.
- Filling a wet ditch soaks its water into the sand. So does shutting a gate or taking up a pipe.
- A sun square dries up to 0.003 per step. A weed drinks up to 0.006 per step,
  but only water deeper than 0.05 — shallower than a plant needs, so weeds get
  served first.
- A frozen spring thaws after 90 steps touching water deeper than 0.1. Undo
  doesn't freeze it again; starting over does.

Water runs 180 steps a second; **Fast** makes it 4× quicker.

## Controls

| Do | Mouse | Touch | Keys |
|---|---|---|---|
| Dig | drag across sand (Dig tool) | drag (Dig tool) | D picks the shovel |
| Fill a ditch back in | right-drag, or drag with Fill tool | pick Fill, then drag | F picks sand |
| Lay a pipe | Pipe tool, tap a rock or hole (tap again to take it up) | same | T picks the pipe |
| Bomb a rock | Bomb tool, tap a rock | same | B picks the bomb |
| Open / shut a gate | tap it, any tool | same | — |
| Swap tools | Dig / Fill buttons | Dig / Fill buttons | X |
| Fast water | Fast button | Fast button | Space |
| Undo / redo | ↶ ↷ buttons | same | Ctrl/Cmd Z, Ctrl/Cmd Shift Z |
| Start again | ↺ button | same | R |
| Next / previous level | ▶ ◀ buttons (asks first) | same | N ] / P [ |
| Go to a level | — | — | Ctrl/Cmd G |
| See the solution | bulb (asks first) | same | S |
| Hide solution / card | bulb, Hide | same | Esc |
| Controls card | ? button | same | ? or H |

One drag is one undo step. Undo changes the ditches, not the water already
flowing. Digging rock or a special square gives a little red shake; digging past
the budget says so under the board.

## Show the solution

Dashed purple squares show where to dig, purple crosses what to fill, dashed
rails where to lay a pipe, a dashed star where to bomb, and a dashed ring on a
gate to tap. **Solve it
for me** clears your ditches and digs the answer in one undo step; the water
still has to run. Levels won with help get ☆ instead of ★.

## Levels

126 levels, easy to hard. The first six are lessons, one idea each:

1. **First Drink** — straight ditch, spring to plant.
2. **Around the Rock** — a rock wall in the way.
3. **Two Thirsty Plants** — one spring, two branches.
4. **Mind the Hole** — the straight way touches a hole; go one row wider.
5. **Share the Ditch** — two plants, budget 15: they must share one ditch.
6. **The Pond** — the pond fills and spills; fill the old ditch leaking into a hole. Budget 4.

Then 101 digging levels that mix those ideas: rocks and long detours, holes
beside the short way, ponds, old ditches to reuse, leaky old ditches to fill,
up to five plants, and tight dig budgets. The hand-made **Dry Maze** sits among
them. The rest were made by a generator and checked by the level tests: each
one has a known answer that wins within 15 seconds, and no two look alike, even
mirrored or shifted.

A new thing turns up about every fifteen levels, three levels each, teaching it
first and then using it:

- **16–18 Gates** — The Gate (tap it open); Shut the Leak (shut the gate into a
  hole, open the other); Gate Wall (three gates, budget 4).
- **31–33 Pipes** — Pipe Under the Rock; Over the Holes (two pipes across a
  double row of holes); Wall and Holes (going round is over budget, 15).
- **46–48 Bombs** — Boom! (bomb into a ring of rocks); Thick Wall (one bomb
  opens three in a row); One Bomb, Two Plants (budget 7).
- **61–63 Hot sun** — Hot Sun (go round the sun); Cross Where It's Thin (budget
  14); Sunburnt Ditch (fill the old ditch leading into the sun, budget 12).
- **76–78 Weeds** — Greedy Weeds (the short way touches two); One Weed Is OK
  (budget 16); Hot and Weedy (sun and weeds add up, budget 19).
- **91–93 Frozen springs** — Frozen Spring (water melts the ice in the way);
  Two Springs (one spring can't push water along a sunny ditch, budget 7); Ice
  and Weeds (three weeds in the only corridor).
- **126 Toolbox** — a gate, a pipe over holes and a bomb through a thick wall,
  budget 15.

The tool levels pass the same checks as the rest, and also prove the tempting
way fails where there is one.

Progress remembers the level by name, so adding or reordering levels never
moves a player somewhere else.

## How it's built

TypeScript + Vite + Vitest, Canvas 2D, like the other games here.

- `src/sim/` — height map, water steps, digging, tools, budget, undo. No drawing, no browser.
- `src/content/` — the levels, each drawn as text with its answer marked.
  `levels-starter/easy/medium/hard.ts` hold the digging levels,
  `toolLevels.ts` the gate, pipe, bomb, sun, weed and ice groups, and
  `levels.ts` puts them all in play order as the one `LEVELS` list.
- `src/render/` — layout and drawing, scaled to fit the screen at full sharpness.
- `src/input/` — pointer strokes (mouse, pen, touch) and the key table.
- `src/shell/` — the running level, question boxes, saved progress.

`npm test` checks `sim/` and `content/` stay pure, tests the water (runs
downhill, pools, spills, conserves, drains, dries, thaws) and plays every
level's solution.

## Not yet

- Sound.
- Deeper digging (more than one level down) and hills.
