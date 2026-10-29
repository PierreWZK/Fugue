import { metersOf, scoreOf } from './score.js';
import { bpmOf, LEVELS } from './world.js';
import { BONUSES } from './items.js';

// Succès et statistiques, gardés en localStorage. Tout est pur : main.js branche le stockage.
export const STATS_KEY = 'fugue-stats';
const QUICK_DEATH = 3; // secondes : mourir avant ce temps compte pour « Pied de nez »

export const CATEGORIES = [
  { id: 'tempo', name: 'Tempo' },
  { id: 'distance', name: 'Distance' },
  { id: 'score', name: 'Score' },
  { id: 'notes', name: 'Notes' },
  { id: 'bonus', name: 'Bonus' },
  { id: 'moves', name: 'Gestes' },
  { id: 'levels', name: 'Niveaux' },
  { id: 'daily', name: 'Défis du jour' },
  { id: 'runs', name: 'Courses' },
  { id: 'secret', name: 'Secrets' },
];

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const flag = (key) => (s) => (s.flags[key] ? 1 : 0);

// Une famille de paliers : un succès par objectif, nommés dans l'ordre.
function tiers(cat, key, value, goals, names, desc) {
  return goals.map((goal, i) => ({ id: `${key}-${goal}`, cat, name: names[i], desc: desc(goal), goal, value }));
}

const BONUS_NAMES = {
  gold: 'Tout ce qui brille',
  platform: 'Talons hauts',
  ffwd: 'Remonte le temps',
  rocket: 'Décollage',
  slow: 'Slow',
  magnet: 'Micro ouvert',
  disco: 'Boogie',
  shield: 'Sous pochette',
};

const LEVEL_NAMES = { easy: 'Tranquille', medium: 'Dans le tempo', hard: 'Sueurs froides', impossible: 'Kamikaze' };

const SECRETS = [
  ['quick', 'Pied de nez', 'Se faire toucher dans les 3 premières secondes.'],
  ['zen', 'Zen', 'Parcourir 150 m sans sauter ni glisser.'],
  ['unlucky', 'Pas de bol', "Se faire toucher moins d'une seconde après un bonus."],
  ['midas', 'Roi Midas', "Deux disques d'or dans la même course."],
  ['nest', "Vol au-dessus d'un nid d'amplis", "20 notes pendant un seul vol d'ampli-fusée."],
  ['rayed', 'Vinyle rayé', 'Passer un 33 tours au-dessus de 200 BPM.'],
  ['quickShield', 'Pochette surprise', "Absorber un choc moins d'une seconde après avoir pris la pochette."],
  ['ffwd500', 'Retour vers le futur', "Gagner plus de 500 m d'un coup avec l'avance rapide."],
  ['muted', 'Silence, on tourne', '500 m le son coupé.'],
  ['early', 'Lève-tôt', 'Finir une course entre 5 h et 7 h du matin.'],
  ['night', 'Oiseau de nuit', 'Finir une course entre minuit et 4 h.'],
  ['saturday', 'Fièvre du samedi soir', 'Finir une course un samedi, après 20 h.'],
  ['last', 'Sur le fil', 'Finir la Partition du jour avec une seule vie.'],
];

// value(s, unlocked) : progression ; goal : valeur à atteindre. secret : caché tant qu'il n'est pas débloqué.
export const ACHIEVEMENTS = [
  ...tiers('tempo', 'bpm', (s) => s.maxBpm, [120, 140, 160, 180, 200, 220, 230, 240, 250],
    ['Moderato', 'Allegretto', 'Allegro', 'Vivace', 'Presto', 'Prestissimo', 'Furioso', 'Supersonique', 'Mur du son'],
    (g) => `Atteindre ${g} BPM.`),

  ...tiers('distance', 'run', (s) => s.bestMeters, [250, 500, 1000, 2000, 3000, 5000, 7500, 10000],
    ['Premiers pas de danse', 'Footing', 'Marathonien', 'Demi-fond', 'Grand fond', 'Ultra-trail', 'Tour de piste', 'Dix bornes'],
    (g) => `${fmt(g)} m en une course.`),
  ...tiers('distance', 'total', (s) => s.totalMeters, [1000, 5000, 10000, 25000, 50000, 100000],
    ['Mise en jambes', 'Petite tournée', 'Tournée régionale', 'Tournée nationale', 'Tournée européenne', 'Tournée mondiale'],
    (g) => `${fmt(g / 1000)} km parcourus au total.`),

  ...tiers('score', 'score', (s) => s.bestScore, [500, 1000, 2500, 5000, 10000, 25000, 50000],
    ['Démo', 'Premier single', 'Maxi 45 tours', 'Premier album', "Disque d'or", 'Disque de platine', 'Disque de diamant'],
    (g) => `Score de ${fmt(g)} en une course.`),

  ...tiers('notes', 'notes-run', (s) => s.bestNotes, [10, 25, 50, 100, 200, 300],
    ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La'],
    (g) => `${g} notes en une course.`),
  ...tiers('notes', 'notes', (s) => s.notes, [100, 500, 1000, 2500, 5000],
    ['Solfège', 'Gamme', 'Arpège', 'Partition', 'Symphonie'],
    (g) => `${fmt(g)} notes ramassées au total.`),
  ...tiers('notes', 'combo', (s) => s.bestCombo, [10, 25],
    ['Legato', 'Phrasé'],
    (g) => `${g} notes d'affilée sans en rater.`),

  ...Object.keys(BONUSES).map((id) => ({
    id: `bonus-${id}`, cat: 'bonus', name: BONUS_NAMES[id], desc: `Ramasser : ${BONUSES[id].name}.`, goal: 1,
    value: (s) => s.bonusCounts[id] ?? 0,
  })),
  { id: 'collector', cat: 'bonus', name: 'Collectionneur', desc: 'Ramasser les 8 bonus, au moins une fois.', goal: Object.keys(BONUSES).length,
    value: (s) => Object.keys(s.bonusCounts).length },
  ...tiers('bonus', 'bonus-total', (s) => Object.values(s.bonusCounts).reduce((a, b) => a + b, 0), [10, 50, 100],
    ['Chineur', 'Collectionneur averti', 'Disquaire'],
    (g) => `${g} bonus ramassés au total.`),
  ...tiers('bonus', 'shield', (s) => s.shieldSaves, [1, 10],
    ['Pochette sauvée', 'Pochette blindée'],
    (g) => (g === 1 ? 'Absorber un choc avec la pochette.' : `${g} chocs absorbés par la pochette.`)),

  ...tiers('moves', 'fall', (s) => s.fastFalls, [20, 100, 500],
    ['Chute libre', 'Plongeur', 'Gravité ×3'],
    (g) => `${g} descentes rapides au total.`),
  ...tiers('moves', 'slide', (s) => s.slides, [50, 250],
    ['Glissade', 'Moonwalk'],
    (g) => `${g} glissades au total.`),
  ...tiers('moves', 'jump', (s) => s.jumps, [100, 1000, 5000],
    ['Ressort', 'Kangourou', 'Sauterelle'],
    (g) => `${fmt(g)} sauts au total.`),

  ...Object.keys(LEVELS).map((level) => ({
    id: `level-${level}`, cat: 'levels', name: LEVEL_NAMES[level], desc: `500 m en ${LEVELS[level].name}.`, goal: 500,
    value: (s) => s.levelBest[level] ?? 0,
  })),
  { id: 'level-impossible-2000', cat: 'levels', name: "Impossible n'est pas Fugue", desc: '2 000 m en Impossible.', goal: 2000,
    value: (s) => s.levelBest.impossible ?? 0 },

  { id: 'partition-1', cat: 'daily', name: 'Première partition', desc: 'Jouer une Partition du jour.', goal: 1, value: (s) => s.partitions },
  { id: 'partition-end', cat: 'daily', name: 'Fin du morceau', desc: 'Jouer les 32 mesures de la Partition du jour.', goal: 32, value: (s) => s.bestPartition },
  { id: 'partition-clean', cat: 'daily', name: 'Sans fausse note', desc: 'Une Partition du jour sans aucun choc.', goal: 1, value: (s) => (s.perfectPartition ? 1 : 0) },
  { id: 'course-1', cat: 'daily', name: 'Course du jour', desc: 'Jouer une Course du jour.', goal: 1, value: (s) => s.courses },
  { id: 'course-1000', cat: 'daily', name: 'Champion du jour', desc: '1 000 m dans une Course du jour.', goal: 1000, value: (s) => s.bestCourse },
  ...tiers('daily', 'streak', (s) => s.bestStreak, [3, 7, 14, 30],
    ['Trois jours', 'Une semaine', 'Quinzaine', 'Abonné'],
    (g) => `Série de ${g} jours 🔥.`),

  ...tiers('runs', 'runs', (s) => s.runs, [1, 10, 50, 100, 500],
    ['Premier pas', 'Habitué', 'Régulier', 'Accro', 'Dans le sillon'],
    (g) => (g === 1 ? 'Finir une première course.' : `${g} courses au total.`)),
  { id: 'records-5', cat: 'runs', name: 'Recordman', desc: 'Battre son record 5 fois.', goal: 5, value: (s) => s.records },

  ...SECRETS.map(([key, name, desc]) => ({ id: `secret-${key}`, cat: 'secret', name, desc, goal: 1, value: flag(key), secret: true })),
  { id: 'secret-melomane', cat: 'secret', name: 'Mélomane', desc: "50 notes d'affilée sans en rater.", goal: 50, value: (s) => s.bestCombo, secret: true },
  // En dernier : il compte tous les autres.
  { id: 'secret-all', cat: 'secret', name: 'Discographie complète', desc: 'Débloquer tous les autres succès.', goal: 0, value: () => 0, secret: true },
];
const ALL = ACHIEVEMENTS.at(-1);
ALL.goal = ACHIEVEMENTS.length - 1;
ALL.value = (s, unlocked) => ACHIEVEMENTS.filter((a) => a !== ALL && unlocked[a.id]).length;

export function emptyStats() {
  return {
    runs: 0, totalMeters: 0, bestMeters: 0, bestScore: 0, maxBpm: 0, notes: 0, bestNotes: 0, bestCombo: 0,
    fastFalls: 0, slides: 0, jumps: 0, shieldSaves: 0, bonusCounts: {}, records: 0, levelBest: {},
    partitions: 0, bestPartition: 0, perfectPartition: false, courses: 0, bestCourse: 0, bestStreak: 0,
    flags: {}, unlocked: {},
  };
}

// Lit les stats ; stockage absent ou abîmé : on repart de zéro, sans planter.
export function loadStats(storage) {
  try {
    const raw = storage.getItem(STATS_KEY);
    return raw ? { ...emptyStats(), ...JSON.parse(raw) } : emptyStats();
  } catch {
    return emptyStats();
  }
}

export function saveStats(storage, stats) {
  try {
    storage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Stockage indisponible : les succès tiennent le temps de la page.
  }
}

// Ce qu'une course (en cours ou finie) apporte aux stats.
// ctx : { mode, record, muted, now, streak, partition } connus de main.js.
export function runOf(world, ctx = {}) {
  const t = world.track;
  const meters = metersOf(world);
  const hour = ctx.now?.getHours();
  const timed = ctx.now !== undefined;
  const bonus = {};
  for (const id of t.picked) bonus[id] = (bonus[id] ?? 0) + 1;
  return {
    meters,
    score: scoreOf(world),
    notes: world.notes,
    bpm: bpmOf(world.maxSpeed),
    combo: t.bestCombo,
    fastFalls: t.fastFalls,
    slides: t.slides,
    jumps: t.jumps,
    shieldSaves: t.shieldSaves,
    bonus,
    level: world.level,
    mode: ctx.mode ?? 'free',
    record: Boolean(ctx.record),
    partition: ctx.partition ?? null,
    streak: ctx.streak ?? 0,
    flags: {
      quick: world.dead && world.clock < QUICK_DEATH,
      zen: (t.firstMove ?? meters) >= 150,
      unlucky: world.dead && t.lastBonusAt !== null && world.clock - t.lastBonusAt < 1,
      midas: t.picked.filter((id) => id === 'gold').length >= 2,
      nest: t.bestFlight >= 20,
      rayed: t.slowFast,
      quickShield: t.quickShield,
      ffwd500: t.ffwdBest >= 500,
      muted: Boolean(ctx.muted) && meters >= 500,
      early: timed && hour >= 5 && hour < 7,
      night: timed && hour < 4,
      saturday: timed && ctx.now.getDay() === 6 && hour >= 20,
      last: world.finished && world.lives === 1,
    },
  };
}

// Ajoute une course aux stats. finished : vrai à la fin de la course (compte une course de plus).
export function merge(stats, run, finished) {
  const bonusCounts = { ...stats.bonusCounts };
  for (const [id, n] of Object.entries(run.bonus)) bonusCounts[id] = (bonusCounts[id] ?? 0) + n;
  const flags = { ...stats.flags };
  for (const [k, v] of Object.entries(run.flags)) if (v) flags[k] = true;
  const daily = finished ? run.mode : null;
  return {
    ...stats,
    runs: stats.runs + (finished ? 1 : 0),
    totalMeters: stats.totalMeters + run.meters,
    bestMeters: Math.max(stats.bestMeters, run.meters),
    bestScore: Math.max(stats.bestScore, run.score),
    maxBpm: Math.max(stats.maxBpm, Math.round(run.bpm)),
    notes: stats.notes + run.notes,
    bestNotes: Math.max(stats.bestNotes, run.notes),
    bestCombo: Math.max(stats.bestCombo, run.combo),
    fastFalls: stats.fastFalls + run.fastFalls,
    slides: stats.slides + run.slides,
    jumps: stats.jumps + run.jumps,
    shieldSaves: stats.shieldSaves + run.shieldSaves,
    bonusCounts,
    records: stats.records + (finished && run.record ? 1 : 0),
    levelBest: { ...stats.levelBest, [run.level]: Math.max(stats.levelBest[run.level] ?? 0, run.meters) },
    partitions: stats.partitions + (daily === 'partition' ? 1 : 0),
    bestPartition: Math.max(stats.bestPartition, run.partition?.done ?? 0),
    perfectPartition: stats.perfectPartition || run.partition?.clean === 32,
    courses: stats.courses + (daily === 'course' ? 1 : 0),
    bestCourse: daily === 'course' ? Math.max(stats.bestCourse, run.meters) : stats.bestCourse,
    bestStreak: Math.max(stats.bestStreak, run.streak),
    flags,
  };
}

// Renvoie les stats fusionnées, les succès qui viennent de tomber, et la liste des déblocages à sauver.
export function applyRun(stats, run, finished) {
  const view = merge(stats, run, finished);
  const unlocked = { ...stats.unlocked };
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked[a.id] || a.value(view, unlocked) < a.goal) continue;
    unlocked[a.id] = Date.now();
    fresh.push(a);
  }
  return { view, fresh, unlocked };
}

// Progression bornée à l'objectif, pour l'affichage.
export function progressOf(a, stats) {
  return Math.min(a.goal, a.value(stats, stats.unlocked));
}
