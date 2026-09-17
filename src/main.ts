import { LEVELS } from './content/levels';
import { actionForKey, KEYMAP, type KeyAction } from './input/keymap';
import { PointerInput, type PointerHandlers } from './input/PointerInput';
import { CANVAS_H, CANVAS_W } from './render/layout';
import { Renderer } from './render/Renderer';
import { Game, type GameEvent, type Tool } from './shell/Game';
import { Modals } from './shell/Modal';
import * as progress from './shell/progress';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>('board');
const levelLabel = $('level-label');
const hint = $('hint');
const stats = $('stats');
const solutionBar = $('solution-bar');
const help = $('help');
const buttons = {
  prev: $<HTMLButtonElement>('btn-prev'),
  next: $<HTMLButtonElement>('btn-next'),
  undo: $<HTMLButtonElement>('btn-undo'),
  redo: $<HTMLButtonElement>('btn-redo'),
  restart: $<HTMLButtonElement>('btn-restart'),
  help: $<HTMLButtonElement>('btn-help'),
  solution: $<HTMLButtonElement>('btn-solution'),
  solutionHide: $<HTMLButtonElement>('btn-solution-hide'),
  solutionApply: $<HTMLButtonElement>('btn-solution-apply'),
  dig: $<HTMLButtonElement>('btn-dig'),
  fill: $<HTMLButtonElement>('btn-fill'),
  fast: $<HTMLButtonElement>('btn-fast'),
};

const renderer = new Renderer(canvas);
const modals = new Modals(document.body);

let levelIndex = Math.min(Math.max(0, progress.currentLevel()), LEVELS.length - 1);
let tool: Tool = 'dig';
let fast = false;
let game = makeGame(levelIndex);
let winTimer: number | null = null;
let budgetNote = false;

function makeGame(index: number): Game {
  const g: Game = new Game(LEVELS[index], (e) => onGameEvent(g, e));
  // Tool and speed are the player's choice, not the level's.
  g.tool = tool;
  g.fast = fast;
  return g;
}

function loadLevel(index: number): void {
  if (winTimer !== null) window.clearTimeout(winTimer);
  modals.close();
  levelIndex = index;
  game = makeGame(index);
  budgetNote = false;
  progress.setCurrentLevel(index);
  updateHud();
}

function onGameEvent(g: Game, e: GameEvent): void {
  if (g !== game) return;
  if (e === 'won') {
    progress.markSolved(g.puzzle.level.id, g.wonWithHelp());
    if (winTimer !== null) window.clearTimeout(winTimer);
    // Let the flowers open first, then say so.
    winTimer = window.setTimeout(() => {
      winTimer = null;
      if (g === game && !modals.isOpen()) showWin();
    }, 900);
  }
  if (e === 'no' || e === 'budget') navigator.vibrate?.(30);
  if (e === 'budget') budgetNote = true;
  updateHud();
}

function showWin(): void {
  const last = levelIndex === LEVELS.length - 1;
  modals.open({
    className: 'win',
    title: last ? 'ALL LEVELS DONE!' : 'LEVEL COMPLETE!',
    body: last ? 'Every garden is in bloom. Nice work.' : 'Every plant got a drink.',
    ok: { label: last ? 'Play level 1' : 'Next level', run: () => loadLevel(last ? 0 : levelIndex + 1) },
    cancel: { label: 'Stay here' },
  });
}

function askLevel(index: number): void {
  if (index < 0 || index >= LEVELS.length) return;
  modals.open({
    title: `Go to level ${index + 1}?`,
    body: `${LEVELS[index].name}. Your ditches on this level will be lost.`,
    ok: { label: 'Go', run: () => loadLevel(index) },
    cancel: { label: 'Stay' },
  });
}

function askGoTo(): void {
  modals.open({
    title: 'Go to level',
    body: `Type a number from 1 to ${LEVELS.length}.`,
    numberInput: { min: 1, max: LEVELS.length, value: levelIndex + 1 },
    ok: { label: 'Go', run: (n) => loadLevel(n - 1) },
    cancel: { label: 'Cancel' },
  });
}

/** Hiding needs no question; showing is a spoiler, so it asks first. */
function toggleSolution(): void {
  if (game.showSolution) return game.setSolution(false);
  modals.open({
    title: 'Show the solution?',
    body: 'You will see where to dig (dashed squares) and what to fill (crosses). Your own ditches stay.',
    ok: { label: 'Show', run: () => game.setSolution(true) },
    extra: { label: 'Solve it for me', run: () => game.applySolution() },
    cancel: { label: 'Not now' },
  });
}

function toggleHelp(show = help.hidden): void {
  help.hidden = !show;
  buttons.help.classList.toggle('on', show);
}

function setTool(t: Tool): void {
  tool = t;
  game.setTool(t);
}

function toggleFast(): void {
  fast = !fast;
  game.fast = fast;
  updateHud();
}

function restart(): void {
  budgetNote = false;
  game.restart();
}

function run(action: KeyAction): void {
  switch (action.type) {
    case 'tool':
      return setTool(action.tool);
    case 'swapTool':
      return setTool(tool === 'dig' ? 'fill' : 'dig');
    case 'fast':
      return toggleFast();
    case 'escape':
      if (!help.hidden) return toggleHelp(false);
      if (game.showSolution) return game.setSolution(false);
      return;
    case 'restart':
      return restart();
    case 'nextLevel':
      return askLevel(levelIndex + 1);
    case 'prevLevel':
      return askLevel(levelIndex - 1);
    case 'goToLevel':
      return askGoTo();
    case 'undo':
      return game.undo();
    case 'redo':
      return game.redo();
    case 'toggleHelp':
      return toggleHelp();
    case 'toggleSolution':
      return toggleSolution();
  }
}

document.addEventListener('keydown', (e) => {
  if (modals.isOpen()) {
    // Keep the browser's find-next away even with a modal up.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') e.preventDefault();
    modals.handleKey(e);
    return;
  }
  const action = actionForKey(e);
  if (!action) return;
  e.preventDefault();
  if (e.repeat && action.type !== 'undo' && action.type !== 'redo') return;
  run(action);
});

// Pointer events always go to whichever level is loaded now.
const pointer: PointerHandlers = {
  enabled: () => !modals.isOpen(),
  hover: (c) => game.hover(c),
  strokeStart: (c, mode) => game.strokeStart(c, mode),
  strokeCell: (c) => game.strokeCell(c),
  strokeEnd: () => game.strokeEnd(),
};
new PointerInput(canvas, pointer);

buttons.prev.addEventListener('click', () => askLevel(levelIndex - 1));
buttons.next.addEventListener('click', () => askLevel(levelIndex + 1));
buttons.undo.addEventListener('click', () => game.undo());
buttons.redo.addEventListener('click', () => game.redo());
buttons.restart.addEventListener('click', () => restart());
buttons.help.addEventListener('click', () => toggleHelp());
buttons.solution.addEventListener('click', () => toggleSolution());
buttons.solutionHide.addEventListener('click', () => game.setSolution(false));
buttons.solutionApply.addEventListener('click', () => game.applySolution());
buttons.dig.addEventListener('click', () => setTool('dig'));
buttons.fill.addEventListener('click', () => setTool('fill'));
buttons.fast.addEventListener('click', () => toggleFast());
$('help-close').addEventListener('click', () => toggleHelp(false));

function updateHud(): void {
  const lvl = LEVELS[levelIndex];
  const p = game.puzzle;
  const solved = progress.solvedState(lvl.id);
  const star = solved === 'self' ? ' ★' : solved === 'helped' ? ' ☆' : '';
  levelLabel.textContent = `Level ${levelIndex + 1}/${LEVELS.length} · ${lvl.name}${star}`;
  levelLabel.title = solved === 'helped' ? 'Solved with help' : solved === 'self' ? 'Solved' : '';

  const plants = p.plants();
  const bloomed = plants.filter((q) => p.isBloomed(q.x, q.y)).length;
  stats.textContent = '';
  const plantText = document.createElement('span');
  plantText.textContent = `🌱 ${bloomed}/${plants.length}`;
  stats.append(plantText);
  const left = p.digsLeft();
  if (left !== null) {
    const digs = document.createElement('span');
    digs.textContent = ` · Digs left ${left}`;
    digs.classList.toggle('low', left === 0);
    stats.append(digs);
  }

  hint.textContent = budgetNote && left === 0 ? 'No digs left. Fill a square back in to get one back.' : lvl.hint;
  hint.hidden = game.showSolution;
  solutionBar.hidden = !game.showSolution;
  buttons.solution.classList.toggle('on', game.showSolution);
  buttons.solution.setAttribute('aria-pressed', String(game.showSolution));
  buttons.prev.disabled = levelIndex === 0;
  buttons.next.disabled = levelIndex === LEVELS.length - 1;
  buttons.undo.disabled = !p.canUndo;
  buttons.redo.disabled = !p.canRedo;
  for (const [b, on] of [
    [buttons.dig, tool === 'dig'],
    [buttons.fill, tool === 'fill'],
    [buttons.fast, fast],
  ] as const) {
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

function buildHelp(): void {
  const list = $('help-keys');
  const rows: [string, string][] = [
    ['Drag', 'Dig a ditch (or fill, with the Fill tool)'],
    ['Right-drag', 'Fill ditches back in, whatever the tool'],
    ['Dig / Fill buttons', 'Pick the tool (on touch, this is how you fill)'],
    ...KEYMAP.map((b) => [b.label, b.help] as [string, string]),
  ];
  for (const [k, what] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = what;
    list.append(dt, dd);
  }
}

function fit(): void {
  const top = $('bar').getBoundingClientRect().height;
  const tools = $('tools').getBoundingClientRect().height;
  const bottom = $('below').getBoundingClientRect().height;
  const availW = window.innerWidth - 16;
  const availH = window.innerHeight - top - tools - bottom - 36;
  // Any scale stays sharp: the renderer sizes its backing store to these CSS pixels × devicePixelRatio.
  const s = Math.max(0.5, Math.min(availW / CANVAS_W, availH / CANVAS_H));
  canvas.style.width = `${Math.floor(CANVAS_W * s)}px`;
  canvas.style.height = `${Math.floor(CANVAS_H * s)}px`;
}

let lastBloomed = -1;
function frame(now: number): void {
  game.tick(now);
  // Plants open as the water runs, not only when the player acts.
  const p = game.puzzle;
  const bloomed = p.plants().filter((q) => p.isBloomed(q.x, q.y)).length;
  if (bloomed !== lastBloomed) {
    lastBloomed = bloomed;
    updateHud();
  }
  renderer.draw(
    {
      puzzle: p,
      tool: game.tool,
      hoverCell: game.hoverCell,
      shake: game.shake,
      wonAt: game.wonAt,
      solution: game.solution,
    },
    now,
  );
  requestAnimationFrame(frame);
}

// Dev server only: a browser check fires `water:dump` and reads the state back off the page.
if (import.meta.env.DEV) {
  document.addEventListener('water:dump', () => {
    const p = game.puzzle;
    document.documentElement.dataset.water = JSON.stringify({
      level: levelIndex + 1,
      tool,
      fast,
      digsUsed: p.digsUsed(),
      water: Number(p.field.totalWater().toFixed(3)),
      steps: p.field.steps,
      won: p.won,
      modal: document.querySelector('.modal h2')?.textContent ?? null,
    });
  });
}

buildHelp();
updateHud();
fit();
window.addEventListener('resize', fit);
requestAnimationFrame(frame);
