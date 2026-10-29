import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, PHYSICS } from '../js/core/world.js';
import { TYPES, BEAT_PX } from '../js/core/obstacles.js';

const DT = 1 / 60;
const IDLE = { jumpPressed: false, jumpHeld: false, slideHeld: false };

// Copie jouable sans toucher à l'original ; les obstacles futurs n'ont pas d'importance ici.
function clone(w) {
  return {
    ...w,
    rand: () => 0.5,
    gen: { ...w.gen },
    obstacles: w.obstacles.map((o) => ({ ...o })),
    player: { ...w.player },
    itemRand: () => 0.5,
    itemGen: { ...w.itemGen },
    items: w.items.map((i) => ({ ...i })),
    effects: { ...w.effects },
    track: { ...w.track, picked: [...w.track.picked] },
    hits: [...w.hits],
  };
}

function nextObstacleAhead(w) {
  return w.obstacles.find((o) => o.x + o.w - w.distance > PHYSICS.PLAYER_X);
}

// Plans candidats pour franchir un obstacle : rien, glisser, ou sauter (court ou long) à chaque image possible.
// Chaque plan dure jusqu'au passage complet de l'obstacle (frames + pass).
function candidates(frames, pass) {
  const len = frames + pass;
  const plans = [Array(len).fill(IDLE), Array(len).fill({ ...IDLE, slideHeld: true })];
  // Glissade limitée à SLIDE_MAX, démarrée à chaque image possible.
  const slideFrames = Math.ceil(PHYSICS.SLIDE_MAX / DT);
  for (let f = 0; f < frames; f++) {
    const slide = Array(len).fill(IDLE);
    slide.fill({ ...IDLE, slideHeld: true }, f, f + slideFrames);
    plans.push(slide);
  }
  for (let f = 0; f < frames; f++) {
    for (const held of [false, true]) {
      const plan = Array(len).fill(held ? { ...IDLE, jumpHeld: true } : IDLE);
      plan.fill(IDLE, 0, f);
      plan[f] = { jumpPressed: true, jumpHeld: held, slideHeld: false };
      plans.push(plan);
    }
  }
  return plans;
}

// Un plan est bon si le joueur passe l'obstacle et retouche le sol sans mourir.
function survives(w, ob, plan) {
  const sim = clone(w);
  for (let i = 0; i < 240; i++) {
    stepWorld(sim, plan[i] ?? IDLE, DT);
    if (sim.dead) return false;
    const passed = ob.x + ob.w - sim.distance < PHYSICS.PLAYER_X;
    if (passed && sim.player.onGround) return true;
  }
  return false;
}

// Place le monde à difficulté maximale, à la vitesse plafond du niveau (250 BPM pour Impossible),
// avec une distance cohérente avec cette vitesse : c'est elle qui règle les écarts entre obstacles.
function hardStart(w) {
  const { SPEED_START: v0, SPEED_RAMP: a } = PHYSICS;
  const v = Math.min(w.speedMax, 900);
  const beat = Math.max(240, Math.ceil((v * v - v0 * v0) / (2 * a) / BEAT_PX));
  w.time = (v - v0) / a;
  w.gen.nextBeat = beat;
  w.distance = (beat - 8) * BEAT_PX;
}

// Rejoue une course entière avec un joueur parfait ; renvoie le nombre d'obstacles franchis.
// hard : vitesse et difficulté déjà au maximum ; tweak(w) ajuste le monde avant de courir.
// Sans bonus à ramasser : on vérifie les obstacles, les effets sont posés par tweak.
function playPerfectly(seed, seconds, { hard = false, level = 'medium', tweak = () => {} } = {}) {
  const w = createWorld(seed, { bonuses: false, level });
  if (hard) hardStart(w);
  tweak(w);
  let queue = [];
  const cleared = { low: 0, tall: 0, bar: 0 };
  for (let i = 0; i < seconds / DT; i++) {
    const ahead = nextObstacleAhead(w);
    // Le joueur parfait choisit son geste quand l'obstacle est à moins d'une seconde.
    const near = ahead && ahead.x - w.distance - PHYSICS.PLAYER_X < w.speed;
    if (queue.length === 0 && near) {
      const ob = ahead;
      const frames = Math.ceil((ob.x - w.distance - PHYSICS.PLAYER_X) / (w.speed * DT));
      const pass = Math.ceil((ob.w + PHYSICS.PLAYER_W) / (w.speed * DT));
      const plan = candidates(Math.max(1, frames), pass).find((p) => survives(w, ob, p));
      assert.ok(plan, `graine ${seed} : obstacle ${ob.type} au temps ${ob.beat} infranchissable`);
      queue = [...plan];
      cleared[ob.type]++;
    }
    stepWorld(w, queue.shift() ?? IDLE, DT);
    assert.equal(w.dead, false, `graine ${seed} : mort au temps ${w.time.toFixed(2)} s`);
    if (!w.player.onGround || w.player.sliding) continue;
    // Le plan suivant se décide une fois l'obstacle courant passé.
    const ob = nextObstacleAhead(w);
    if (queue.length && ob && ob.x - w.distance > PHYSICS.PLAYER_X + 200) queue = [];
  }
  return cleared;
}

test('équité : un joueur parfait survit au début de la course', () => {
  for (const seed of [1, 2, 3, 4]) assert.ok(playPerfectly(seed, 40).low > 5);
});

test('équité : un joueur parfait survit à vitesse maximale', () => {
  const total = { low: 0, tall: 0, bar: 0 };
  for (const seed of [5, 6, 7, 8, 9, 10, 11, 12]) {
    const c = playPerfectly(seed, 60, { hard: true });
    for (const k in total) total[k] += c[k];
  }
  // Les trois types ont bien été rencontrés, en nombre.
  for (const k in total) assert.ok(total[k] > 30, `${k} : ${total[k]}`);
});

test('équité : avec les semelles compensées, à vitesse maximale', () => {
  for (const seed of [5, 6, 7, 8]) playPerfectly(seed, 60, { hard: true, tweak: (w) => (w.effects.platform = Infinity) });
});

test('équité : après un 33 tours, difficulté maximale au tempo de départ', () => {
  for (const seed of [5, 6, 7, 8]) playPerfectly(seed, 30, { hard: true, tweak: (w) => (w.time = 0) });
});

for (const level of ['easy', 'hard', 'impossible']) {
  test(`équité : niveau ${level}, difficulté maximale (Impossible : de 250 à près de 300 BPM)`, () => {
    for (const seed of [5, 6, 7, 8]) playPerfectly(seed, 40, { hard: true, level });
  });
}

test('chaque type demande la bonne action', () => {
  const tapApex = (PHYSICS.JUMP_SPEED ** 2) / (2 * PHYSICS.GRAVITY);
  assert.ok(TYPES.low.h < tapApex, 'petit saut suffit pour low');
  assert.ok(TYPES.tall.h > tapApex, 'tall demande un saut long');
  assert.ok(TYPES.bar.y > PHYSICS.SLIDE_H && TYPES.bar.y < PHYSICS.PLAYER_H, 'bar : glisser oui, debout non');
});
