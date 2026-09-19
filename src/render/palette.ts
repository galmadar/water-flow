/** Every colour in the game: warm sand and clear water on a deep teal ground. Canvas and page CSS both read from here. */

const teal = { deep: '#15262b', page: '#1d3339', glow: '#2e5059', panel: '#27434b', edge: '#7fc4c9' };
const sand = { base: '#ecd09a', alt: '#e6c78e', speck: '#c9a56a', light: '#f7e3bb', rim: '#b98f58' };
const dirt = { floor: '#a97c4a', wall: '#8a6238', deep: '#7a5530' };
const water = { deep: '#1f7fc4', mid: '#3aa3e0', light: '#9fdcff', shine: '#e8f7ff' };
const leaf = { dark: '#3f7a2a', mid: '#5fa83a', light: '#9ad35f' };
const bloom = { petal: '#ff8fb1', centre: '#ffd35a' };
const coral = '#ff6b6b';
const orchid = '#e7a6ff';

export const BOARD = {
  shadow: '#0a141780',
  frame: sand.rim,
  frameWin: '#9dffc4',
  sand: sand.base,
  sandAlt: sand.alt,
  sandSpeck: sand.speck,
  sandLight: sand.light,
  ditchFloor: dirt.floor,
  ditchWall: dirt.wall,
  pondFloor: dirt.deep,
  waterDeep: water.deep,
  waterMid: water.mid,
  waterLight: water.light,
  waterShine: water.shine,
  rock: '#9a938c',
  rockLight: '#c4beb6',
  rockDark: '#6b655f',
  springStone: '#b5aea4',
  hole: '#2a1a10',
  holeRim: '#5a3c22',
  stem: leaf.dark,
  leaf: leaf.mid,
  leafLight: leaf.light,
  dryLeaf: '#b39055',
  dryStem: '#8a6a3c',
  petal: bloom.petal,
  petalCentre: bloom.centre,
  ringBack: '#00000033',
  ring: water.light,
  sunTint: '#ffb3473d',
  sunRay: '#ff9d2e',
  sunCore: '#ffd35a',
  rubble: '#8f887f',
  pipe: '#8fa3ad',
  pipeLight: '#c9d6dc',
  pipeDark: '#5c6f78',
  wood: '#a8733c',
  woodDark: '#6e4620',
  woodLight: '#d39a5b',
  weed: '#4d6b1f',
  weedLight: '#7f9a2c',
  weedFlower: '#b04fd1',
  weedFlowerLight: '#e3a6f5',
  weedEdge: '#2c3f0f',
  weedGround: '#8a6a3c66',
  ice: '#bfe9ff',
  iceEdge: '#7cc3e8',
  iceShine: '#ffffff',
  bomb: '#ff9d2e',
  hoverDig: '#ffffffcc',
  hoverFill: '#ffe08acc',
  no: coral,
  solution: orchid,
};

/** Page chrome. Each key becomes a CSS variable: `buttonInk` → `--button-ink`. */
export const UI = {
  bg: teal.page,
  bgGlow: teal.glow,
  panel: teal.panel,
  edge: teal.edge,
  ink: '#f1fbfb',
  dim: '#b5d3d6',
  gold: '#ffd97a',
  goldGlow: '#ffd97a59',
  button: sand.base,
  buttonEdge: sand.rim,
  buttonInk: '#3a2a14',
  buttonHotEdge: '#1f6fa8',
  buttonHot: water.light,
  buttonOff: '#46646b',
  buttonOffEdge: '#334d53',
  buttonOffInk: teal.deep,
  shadow: '#0a14178c',
  shadowSoft: '#0a141759',
  overlay: '#0f1d21b8',
  field: teal.deep,
  warn: coral,
  win: '#9dffc4',
  winGlow: '#9dffc4b3',
};

export function applyCssPalette(root: HTMLElement): void {
  for (const [key, value] of Object.entries(UI)) {
    root.style.setProperty(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value);
  }
  root.ownerDocument.querySelector('meta[name="theme-color"]')?.setAttribute('content', UI.bg);
}
