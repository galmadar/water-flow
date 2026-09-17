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

Water only moves up, down, left and right — never corner to corner.

Some levels have a **dig budget**: at most that many squares dug at once.
Filling a square you dug gives it back.

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
- Filling a wet ditch soaks its water into the sand.

Water runs 180 steps a second; **Fast** makes it 4× quicker.

## Controls

| Do | Mouse | Touch | Keys |
|---|---|---|---|
| Dig | drag across sand (Dig tool) | drag (Dig tool) | D picks the shovel |
| Fill a ditch back in | right-drag, or drag with Fill tool | pick Fill, then drag | F picks sand |
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

Dashed purple squares show where to dig, purple crosses what to fill. **Solve it
for me** clears your ditches and digs the answer in one undo step; the water
still has to run. Levels won with help get ☆ instead of ★.

## Levels

107 levels, easy to hard. The first six are lessons, one idea each:

1. **First Drink** — straight ditch, spring to plant.
2. **Around the Rock** — a rock wall in the way.
3. **Two Thirsty Plants** — one spring, two branches.
4. **Mind the Hole** — the straight way touches a hole; go one row wider.
5. **Share the Ditch** — two plants, budget 15: they must share one ditch.
6. **The Pond** — the pond fills and spills; fill the old ditch leaking into a hole. Budget 4.

Then 101 more that mix those ideas: rocks and long detours, holes beside the
short way, ponds, old ditches to reuse, leaky old ditches to fill, up to five
plants, and tight dig budgets. The hand-made **Dry Maze** sits among them.
The rest were made by a generator and checked by the level tests: each one has
a known answer that wins within 15 seconds, and no two look alike, even
mirrored or shifted.

Progress remembers the level by name, so adding or reordering levels never
moves a player somewhere else.
