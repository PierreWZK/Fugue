import { progressOf } from './core/achievements.js';

const fmt = (n) => n.toLocaleString('fr-FR');

// Carte d'un succès : nom, description, progression. Un secret reste « ??? » tant qu'il n'est pas débloqué.
export function trophyItem(a, stats) {
  const got = Boolean(stats.unlocked[a.id]);
  const hidden = a.secret && !got;
  const li = document.createElement('li');
  li.className = got ? 'got' : 'locked';
  const name = document.createElement('strong');
  name.textContent = hidden ? '???' : a.name;
  const desc = document.createElement('span');
  desc.textContent = hidden ? 'Succès secret' : a.desc;
  const progress = document.createElement('em');
  const value = progressOf(a, stats);
  progress.textContent = got ? 'Débloqué' : hidden ? '' : `${fmt(value)} / ${fmt(a.goal)}`;
  li.append(name, desc, progress);
  if (!got && !hidden) {
    const bar = document.createElement('i');
    bar.className = 'bar';
    bar.style.setProperty('--p', value / a.goal);
    li.append(bar);
  }
  return li;
}
