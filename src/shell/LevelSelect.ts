import { pageOf, pages } from './levelPages';
import type { SolvedState } from './progress';

export interface LevelSelectSource {
  levels: () => readonly { id: string; name: string }[];
  current: () => number;
  solved: (id: string) => SolvedState;
  pick: (index: number) => void;
}

const MARK: Record<SolvedState, string> = { self: '★', helped: '☆', no: '' };
const SAID: Record<SolvedState, string> = { self: 'solved', helped: 'solved with help', no: 'not solved yet' };

/** The grid of level tiles, a page of 20 at a time. Styled like a modal; one at a time with them. */
export class LevelSelect {
  private overlay: HTMLDivElement | null = null;
  private page = 0;
  private grid: HTMLDivElement | null = null;
  private tabs: HTMLDivElement | null = null;
  private caption: HTMLParagraphElement | null = null;

  constructor(
    private readonly host: HTMLElement,
    private readonly src: LevelSelectSource,
  ) {}

  isOpen(): boolean {
    return this.overlay !== null;
  }

  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open(): void {
    this.close();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('pointerdown', (e) => {
      if (e.target === overlay) this.close();
    });
    const panel = document.createElement('div');
    panel.className = 'modal levels';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Levels');

    const title = document.createElement('h2');
    title.textContent = 'Levels';
    const close = document.createElement('button');
    close.className = 'levels-close';
    close.setAttribute('aria-label', 'Close');
    close.title = 'Close (Esc)';
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>';
    close.addEventListener('click', () => this.close());

    this.tabs = document.createElement('div');
    this.tabs.className = 'levels-tabs';
    this.tabs.setAttribute('role', 'tablist');
    this.grid = document.createElement('div');
    this.grid.className = 'levels-grid';
    this.caption = document.createElement('p');
    this.caption.className = 'levels-caption';

    panel.append(title, close, this.tabs, this.grid, this.caption);
    overlay.append(panel);
    this.host.append(overlay);
    this.overlay = overlay;

    const all = this.src.levels();
    this.page = pageOf(this.src.current(), all.length);
    this.render();
    this.focusTile(this.src.current()) || close.focus();
  }

  close(): void {
    this.overlay?.remove();
    this.overlay = this.grid = this.tabs = this.caption = null;
  }

  /** Call from the page's keydown while open. */
  handleKey(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // Keep browser find-next away, as the modals do.
      if (k === 'g') e.preventDefault();
      return;
    }
    if (k === 'escape' || k === 'l') {
      e.preventDefault();
      this.close();
    } else if (k === 'pageup' || k === '[') {
      e.preventDefault();
      this.setPage(this.page - 1);
    } else if (k === 'pagedown' || k === ']') {
      e.preventDefault();
      this.setPage(this.page + 1);
    } else if (k.startsWith('arrow')) {
      e.preventDefault();
      this.moveFocus(k);
    } else if (k === 'tab') {
      this.trapTab(e);
    } else if (k !== 'enter' && k !== ' ') {
      // Game keys stay off while the grid is up; Enter/Space press the focused tile.
      e.preventDefault();
    }
  }

  private setPage(page: number): void {
    const count = pages(this.src.levels().length).length;
    const next = Math.min(count - 1, Math.max(0, page));
    if (next === this.page) return;
    this.page = next;
    this.render();
    this.grid?.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private render(): void {
    if (!this.grid || !this.tabs || !this.caption) return;
    const all = this.src.levels();
    const current = this.src.current();
    const ps = pages(all.length);
    const page = ps[this.page];

    this.tabs.textContent = '';
    this.tabs.hidden = ps.length < 2;
    ps.forEach((p, i) => {
      const tab = document.createElement('button');
      tab.textContent = p.label;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(i === this.page));
      tab.classList.toggle('on', i === this.page);
      tab.classList.toggle('has-current', current >= p.start && current < p.end);
      tab.addEventListener('click', () => this.setPage(i));
      this.tabs?.append(tab);
    });

    this.grid.textContent = '';
    for (let i = page.start; i < page.end; i++) {
      const lvl = all[i];
      const state = this.src.solved(lvl.id);
      const tile = document.createElement('button');
      tile.className = `level-tile ${state}`;
      tile.dataset.index = String(i);
      tile.classList.toggle('current', i === current);
      if (i === current) tile.setAttribute('aria-current', 'true');
      tile.title = lvl.name;
      tile.setAttribute('aria-label', `Level ${i + 1}, ${lvl.name}, ${SAID[state]}`);
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(i + 1);
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = MARK[state];
      tile.append(num, mark);
      tile.addEventListener('click', () => {
        this.close();
        this.src.pick(i);
      });
      tile.addEventListener('pointerenter', () => this.describe(i));
      tile.addEventListener('focus', () => this.describe(i));
      this.grid.append(tile);
    }
    this.describe(current >= page.start && current < page.end ? current : page.start);
  }

  private describe(i: number): void {
    const lvl = this.src.levels()[i];
    if (!this.caption || !lvl) return;
    const mark = MARK[this.src.solved(lvl.id)];
    const here = i === this.src.current() ? ' · playing now' : '';
    this.caption.textContent = `${i + 1}. ${lvl.name}${mark ? ` ${mark}` : ''}${here}`;
  }

  private focusTile(index: number): boolean {
    const tile = this.grid?.querySelector<HTMLButtonElement>(`[data-index="${index}"]`);
    tile?.focus();
    return !!tile;
  }

  private moveFocus(arrow: string): void {
    const grid = this.grid;
    if (!grid) return;
    const tiles = [...grid.querySelectorAll<HTMLButtonElement>('.level-tile')];
    const at = tiles.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return void tiles[0]?.focus();
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 5;
    const step = { arrowleft: -1, arrowright: 1, arrowup: -cols, arrowdown: cols }[arrow] ?? 0;
    const to = at + step;
    if (to >= 0 && to < tiles.length) return void tiles[to].focus();
    // Off the side of the page: turn it.
    if (arrow === 'arrowright' && to >= tiles.length) this.setPage(this.page + 1);
    if (arrow === 'arrowleft' && to < 0) this.setPage(this.page - 1);
  }

  private trapTab(e: KeyboardEvent): void {
    const items = [...(this.overlay?.querySelectorAll<HTMLButtonElement>('button') ?? [])].filter(
      (b) => b.offsetParent !== null,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
