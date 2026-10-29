import { createWorld, stepWorld, bpmOf, MEASURE_COUNT, MEASURE_PX, PARTITION_LIVES, LEVELS, DEFAULT_LEVEL } from './core/world.js';
import { dayKey, dailySeed, loadDaily, saveDaily, played, recordAttempt, currentStreak, partitionOf, courseOf, precisionOf, partitionShare, courseShare } from './core/daily.js';
import { createLoop } from './core/loop.js';
import { createInput } from './core/input.js';
import { render } from './core/render.js';
import { hashSeed } from './core/rng.js';
import { createMusic } from './audio/music.js';
import { scoreOf, metersOf, loadBest, saveIfBest } from './core/score.js';
import { ACHIEVEMENTS, loadStats, saveStats, runOf, applyRun, progressOf } from './core/achievements.js';
import { trophyItem } from './trophy-item.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ui = {
  score: document.getElementById('score'),
  dist: document.getElementById('dist'),
  best: document.getElementById('best'),
  stats: document.getElementById('over-stats'),
  bpm: document.getElementById('bpm'),
  over: document.getElementById('over'),
  title: document.getElementById('over-title'),
  hint: document.getElementById('over-hint'),
};

// ?seed=texte pour rejouer une course donnée ; sans paramètre, la course est aléatoire.
const param = new URLSearchParams(location.search).get('seed');
const newSeed = () => hashSeed(param ?? String(Math.random()));

// ready : en attente d'un geste ; running : la course ; over : touché, en attente de rejouer.
let state = 'ready';
let world = createWorld(newSeed());
let onScreen = true;
// Lire window.localStorage peut lever une erreur (stockage bloqué) : le record vit alors le temps de la page.
const store = (() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
})();
let best = loadBest(store);
let stats = loadStats(store);
let mode = 'free'; // free | partition | course : le mode de la course en cours
const today = dayKey();
let daily = loadDaily(store);
// Niveau du mode libre, retenu par le navigateur. Les défis du jour se jouent toujours en Moyen.
const LEVEL_KEY = 'fugue-level';
let level = (() => {
  try {
    const saved = store.getItem(LEVEL_KEY);
    return saved in LEVELS ? saved : DEFAULT_LEVEL;
  } catch {
    return DEFAULT_LEVEL;
  }
})();
world = createWorld(newSeed(), { level });
let overAt = 0; // instant du choc : on ignore les appuis juste après, pour ne pas relancer par erreur
const REPLAY_DELAY = 500;
let tapped = false; // sur l'écran d'accueil ou de fin, toucher n'importe où relance (pas seulement la moitié « saut »)
const fmt = (n) => n.toLocaleString('fr-FR');
const input = createInput(canvas, window);
const music = createMusic();

canvas.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') music.toggleMute();
});

function showOverlay(title, hint, stats = '') {
  ui.title.textContent = title;
  ui.hint.textContent = hint;
  ui.stats.textContent = stats;
  ui.stats.hidden = !stats;
  ui.over.hidden = false;
}

function endRun() {
  const ctx = { mode, muted: music.isMuted(), now: new Date() };
  let title;
  let line;
  if (mode === 'free') {
    const score = scoreOf(world);
    const result = saveIfBest(store, score);
    best = result.best;
    ctx.record = result.isNew;
    title = result.isNew ? 'Nouveau record !' : 'Touché !';
    line = `Score ${fmt(score)} · ${fmt(metersOf(world))} m · Record ${fmt(best)}`;
  } else {
    const result = mode === 'partition' ? partitionOf(world) : courseOf(world);
    daily = recordAttempt(daily, mode, result, today);
    saveDaily(store, daily);
    if (mode === 'partition') ctx.partition = result;
    title = world.finished ? 'Partition terminée !' : 'Touché !';
    line =
      mode === 'partition'
        ? `${result.done}/${MEASURE_COUNT} mesures · ${precisionOf(result)} % propres`
        : `${fmt(result.meters)} m · ${result.bpm} BPM`;
  }
  ctx.streak = currentStreak(daily, today);
  const done = applyRun(stats, runOf(world, ctx), true);
  stats = { ...done.view, unlocked: done.unlocked };
  saveStats(store, stats);
  const hint = mode === 'free' ? "Touche l'écran ou Espace pour rejouer" : "Touche l'écran pour jouer en libre";
  showOverlay(title, hint, line + unlockedText(done.fresh));
  mode = 'free';
  renderDaily();
  renderTrophies();
}

// Fin de partie : les succès débloqués, deux noms au plus.
function unlockedText(fresh) {
  if (!fresh.length) return '';
  const names = fresh.slice(0, 2).map((a) => a.name).join(', ');
  return ` · Succès : ${names}${fresh.length > 2 ? ` et ${fresh.length - 2} autres` : ''}`;
}

// Accueil : compteur, quelques chiffres et les six succès les plus proches. La liste complète est sur succes.html.
function renderTrophies() {
  const list = document.getElementById('ach-list');
  if (!list) return;
  const got = ACHIEVEMENTS.filter((a) => stats.unlocked[a.id]).length;
  document.getElementById('ach-count').textContent = `${got} / ${ACHIEVEMENTS.length} débloqués`;
  document.getElementById('ach-stats').textContent =
    `${fmt(stats.runs)} courses · record ${fmt(best)} · ${fmt(stats.bestMeters)} m le plus long · ${stats.maxBpm || 100} BPM au plus haut`;
  const next = ACHIEVEMENTS.filter((a) => !a.secret && !stats.unlocked[a.id])
    .map((a) => ({ a, ratio: progressOf(a, stats) / a.goal }))
    .sort((x, y) => y.ratio - x.ratio)
    .slice(0, 6);
  list.replaceChildren(...next.map(({ a }) => trophyItem(a, stats)));
}

// Chaque défi du jour a sa propre graine : même course pour tout le monde, la même journée.
function makeWorld() {
  if (mode === 'partition') return createWorld(dailySeed(today, 'partition'), { bonuses: false, partition: true });
  if (mode === 'course') return createWorld(dailySeed(today, 'course'));
  return createWorld(newSeed(), { level });
}

// Bouton d'un défi : un seul essai par jour.
function startMode(kind) {
  if (state === 'running' || played(daily, kind, today)) return;
  mode = kind;
  begin();
  document.getElementById('jouer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function begin() {
  world = makeWorld();
  music.start(); // appelé pendant un geste : autorisé par le navigateur
  music.begin(world.seed);
  ui.over.hidden = true;
  state = 'running';
}

function updateHud(w) {
  if (w.lives !== null) {
    ui.score.textContent = `Mesure ${Math.min(MEASURE_COUNT, Math.floor(w.distance / MEASURE_PX) + 1)}/${MEASURE_COUNT}`;
    ui.dist.textContent = '♥'.repeat(w.lives) + '♡'.repeat(PARTITION_LIVES - w.lives);
    ui.best.textContent = '';
    ui.bpm.textContent = `${Math.round(bpmOf(w.speed))} BPM`;
    return;
  }
  ui.score.textContent = fmt(scoreOf(w));
  ui.dist.textContent = `${fmt(metersOf(w))} m`;
  ui.best.textContent = best > 0 ? `Record ${fmt(best)}` : '';
  ui.bpm.textContent = `${Math.round(bpmOf(w.speed))} BPM · ${LEVELS[w.level].name}`;
}

renderTrophies();

const loop = createLoop({
  step: (dt) => {
    if (state !== 'running') {
      const wants = input.snapshot().jumpPressed || tapped;
      tapped = false;
      if (wants && performance.now() - overAt > REPLAY_DELAY) begin();
      return;
    }
    world = stepWorld(world, input.snapshot(), dt);
    if (world.dead || world.finished) {
      state = 'over';
      overAt = performance.now();
      if (world.dead) music.crash();
      music.stop();
      endRun();
    } else {
      for (const e of world.events) {
        if (e.type === 'note') music.note();
        else if (e.type === 'bonus') music.bonus();
        else music.crash(); // choc absorbé par la pochette
      }
      // Succès débloqué en pleine course : bannière, et sauvegarde tout de suite.
      const live = applyRun(stats, runOf(world, { mode, muted: music.isMuted() }), false);
      if (live.fresh.length) {
        stats.unlocked = live.unlocked;
        saveStats(store, stats);
        const more = live.fresh.length > 1 ? ` (+${live.fresh.length - 1})` : '';
        world.banner = { text: `Succès : ${live.fresh[0].name}${more}`, t: 2.4 };
      }
      music.update(world);
    }
  },
  render: () => {
    render(ctx, world);
    updateHud(world);
  },
});

// Le navigateur exige un geste pour l'audio : on lance dans l'écouteur même du geste.
canvas.addEventListener('pointerdown', () => {
  music.start();
  if (state !== 'running') tapped = true;
});
canvas.addEventListener('keydown', () => music.start());

function syncRunning() {
  if (!document.hidden && onScreen) {
    music.resume();
    loop.start();
  } else {
    loop.stop();
    music.pause();
  }
}

// Pause automatique quand l'onglet est caché ou que le jeu sort de l'écran.
document.addEventListener('visibilitychange', syncRunning);
new IntersectionObserver(([e]) => {
  onScreen = e.isIntersecting;
  syncRunning();
}).observe(canvas);

// Cartes des défis : résultat du jour, état du bouton, série et partage.
function renderDaily() {
  const pDone = played(daily, 'partition', today);
  const cDone = played(daily, 'course', today);
  const streak = currentStreak(daily, today);
  document.getElementById('streak').textContent = streak > 0 ? `🔥 ${streak} jour${streak > 1 ? 's' : ''} de suite` : '';

  const states = pDone ? daily.partition.states : '';
  const cells = Array.from({ length: MEASURE_COUNT }, (_, i) => {
    const span = document.createElement('span');
    span.className = pDone ? { c: 'ok', h: 'hit', m: 'miss' }[states[i]] : 'todo';
    return span;
  });
  document.getElementById('partition-grid').replaceChildren(...cells);
  document.getElementById('partition-status').textContent = pDone
    ? `${daily.partition.done}/${MEASURE_COUNT} mesures · ${precisionOf(daily.partition)} % propres`
    : 'Un essai, aujourd’hui.';
  const playP = document.getElementById('play-partition');
  playP.disabled = pDone;
  playP.textContent = pDone ? 'Revenir demain' : 'Jouer la partition';
  document.getElementById('share-partition').hidden = !pDone;

  document.getElementById('run-result').textContent = cDone ? `${fmt(daily.course.meters)} m · ${daily.course.bpm} BPM` : '';
  document.getElementById('run-status').textContent = cDone ? '' : 'Un essai, aujourd’hui.';
  const playC = document.getElementById('play-course');
  playC.disabled = cDone;
  playC.textContent = cDone ? 'Revenir demain' : 'Jouer la course';
  document.getElementById('share-course').hidden = !cDone;
}

async function share(kind) {
  const streak = currentStreak(daily, today);
  const text = kind === 'partition' ? partitionShare(daily.partition, today, streak) : courseShare(daily.course, today, streak);
  const btn = document.getElementById(`share-${kind}`);
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copié !';
  } catch {
    btn.textContent = 'Copie impossible';
  }
  setTimeout(() => (btn.textContent = 'Partager'), 1500);
}

document.getElementById('play-partition').addEventListener('click', () => startMode('partition'));
document.getElementById('play-course').addEventListener('click', () => startMode('course'));
document.getElementById('share-partition').addEventListener('click', () => share('partition'));
document.getElementById('share-course').addEventListener('click', () => share('course'));
renderDaily();

// Choix du niveau : retenu par le navigateur, appliqué à la prochaine course libre.
for (const radio of document.querySelectorAll('input[name="level"]')) {
  radio.checked = radio.value === level;
  radio.addEventListener('change', () => {
    level = radio.value;
    try {
      store.setItem(LEVEL_KEY, level);
    } catch {
      // Stockage indisponible : le niveau tient le temps de la page.
    }
    if (state !== 'running' && mode === 'free') world = makeWorld();
  });
}
