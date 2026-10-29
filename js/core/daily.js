import { hashSeed } from './rng.js';
import { MEASURE_COUNT, MEASURE_PX, bpmOf } from './world.js';
import { metersOf, scoreOf } from './score.js';

// Défis du jour : même graine pour tout le monde (d'après la date), un essai par défi et par jour,
// une série 🔥 qui compte les jours où au moins un des deux a été joué.
export const DAILY_KEY = 'fugue-daily';
const SQUARE = { c: '🟩', h: '🟨', m: '⬛' }; // propre, touchée, non atteinte

// Jour local au format AAAA-MM-JJ.
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yesterdayOf(day) {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export function dailySeed(day, kind) {
  return hashSeed(`${day}:${kind}`);
}

export function emptyDaily() {
  return { partition: null, course: null, streak: { last: null, count: 0 } };
}

export function loadDaily(storage) {
  try {
    const raw = storage.getItem(DAILY_KEY);
    return raw ? { ...emptyDaily(), ...JSON.parse(raw) } : emptyDaily();
  } catch {
    return emptyDaily();
  }
}

export function saveDaily(storage, data) {
  try {
    storage.setItem(DAILY_KEY, JSON.stringify(data));
  } catch {
    // Stockage indisponible : l'essai du jour tient le temps de la page.
  }
}

export function played(data, kind, day) {
  return data[kind]?.day === day;
}

// Même jour : rien ne bouge. Jour suivant : la série grandit. Sinon elle repart de 1.
export function nextStreak(streak, day) {
  if (streak.last === day) return streak;
  return { last: day, count: streak.last === yesterdayOf(day) ? streak.count + 1 : 1 };
}

// Série affichée : vivante si jouée aujourd'hui ou hier, sinon 0.
export function currentStreak(data, day) {
  const last = data.streak.last;
  return last === day || last === yesterdayOf(day) ? data.streak.count : 0;
}

// Enregistre l'essai du jour pour ce défi ; sans effet si déjà joué aujourd'hui.
export function recordAttempt(data, kind, result, day) {
  if (played(data, kind, day)) return data;
  return { ...data, [kind]: { day, ...result }, streak: nextStreak(data.streak, day) };
}

// Partition : mesures jouées (complètes), mesures propres, et l'état de chaque mesure (c, h ou m).
export function partitionOf(world) {
  const done = world.finished ? MEASURE_COUNT : Math.min(MEASURE_COUNT, Math.floor(world.distance / MEASURE_PX));
  const hit = new Set(world.hits);
  let states = '';
  let clean = 0;
  for (let i = 0; i < MEASURE_COUNT; i++) {
    if (i >= done) states += 'm';
    else if (hit.has(i)) states += 'h';
    else {
      states += 'c';
      clean++;
    }
  }
  return { done, clean, states };
}

export function courseOf(world) {
  return { meters: metersOf(world), bpm: Math.round(bpmOf(world.maxSpeed)), score: scoreOf(world) };
}

export function precisionOf(result) {
  return result.done ? Math.round((result.clean / result.done) * 100) : 0;
}

export function partitionShare(result, day, streak) {
  const rows = [];
  for (let i = 0; i < result.states.length; i += 8) {
    rows.push([...result.states.slice(i, i + 8)].map((s) => SQUARE[s]).join(''));
  }
  const lines = [
    `Fugue · Partition du jour ${day}`,
    ...rows,
    `${result.done}/${MEASURE_COUNT} mesures · ${precisionOf(result)} % propres`,
  ];
  if (streak > 0) lines.push(`🔥 ${streak}`);
  return lines.join('\n');
}

// Milliers séparés par une espace simple, pour un texte à coller partout.
function spaced(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function courseShare(result, day, streak) {
  const lines = [`Fugue · Course du jour ${day}`, `${spaced(result.meters)} m · ${result.bpm} BPM`];
  if (streak > 0) lines.push(`🔥 ${streak}`);
  return lines.join('\n');
}
