import { ACHIEVEMENTS, CATEGORIES, loadStats } from './core/achievements.js';
import { trophyItem } from './trophy-item.js';

// Page des succès : toute la liste, filtrée par famille et par état. Lecture seule des stats du jeu.
const store = (() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
})();
const stats = loadStats(store);
const got = (a) => Boolean(stats.unlocked[a.id]);
const filter = { cat: 'all', state: 'all' };
const STATES = [
  { id: 'all', name: 'Tous' },
  { id: 'got', name: 'Débloqués' },
  { id: 'todo', name: 'À faire' },
];

const list = document.getElementById('ach-list');
const empty = document.getElementById('ach-empty');

function button(label, pressed, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'filter';
  b.textContent = label;
  b.setAttribute('aria-pressed', String(pressed));
  b.addEventListener('click', onClick);
  return b;
}

function count(items) {
  return `${items.filter(got).length}/${items.length}`;
}

function renderFilters() {
  const cats = [{ id: 'all', name: 'Toutes' }, ...CATEGORIES];
  document.getElementById('cat-filters').replaceChildren(
    ...cats.map((c) => {
      const items = c.id === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.cat === c.id);
      return button(`${c.name} · ${count(items)}`, filter.cat === c.id, () => {
        filter.cat = c.id;
        render();
      });
    }),
  );
  document.getElementById('state-filters').replaceChildren(
    ...STATES.map((s) =>
      button(s.name, filter.state === s.id, () => {
        filter.state = s.id;
        render();
      }),
    ),
  );
}

function render() {
  renderFilters();
  const shown = ACHIEVEMENTS.filter(
    (a) =>
      (filter.cat === 'all' || a.cat === filter.cat) &&
      (filter.state === 'all' || (filter.state === 'got') === got(a)),
  );
  list.replaceChildren(...shown.map((a) => trophyItem(a, stats)));
  empty.hidden = shown.length > 0;
}

document.getElementById('ach-count').textContent = `${ACHIEVEMENTS.filter(got).length} / ${ACHIEVEMENTS.length} débloqués`;
render();
