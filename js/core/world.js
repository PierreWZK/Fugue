import { mulberry32 } from './rng.js';
import { BEAT_PX, createGenerator, nextObstacle } from './obstacles.js';
import { BONUSES, createItemGen, itemsFor } from './items.js';
import { NOTE_POINTS } from './score.js';

// Unités : pixels du canvas (1 unité = 1 px). y = hauteur au-dessus du sol.
export const PHYSICS = {
  GRAVITY: 2600,
  HOLD_GRAVITY: 1300, // gravité réduite pendant un appui long, en montée
  HOLD_MAX: 0.22, // secondes max d'appui long
  JUMP_SPEED: 900,
  MAX_FALL: 1400,
  FAST_FALL: 3, // en l'air, glisser = descente rapide : gravité multipliée par 3
  FAST_MAX_FALL: 2400,
  SLIDE_MAX: 0.9, // secondes de glissade d'affilée au plus
  SLIDE_REST: 0.3, // secondes à relâcher avant de pouvoir reglisser
  JUMP_BUFFER: 0.1, // un saut demandé juste avant l'atterrissage part à l'atterrissage
  SPEED_START: 360,
  SPEED_MAX: (180 * BEAT_PX) / 60, // plafond du niveau Moyen : 180 BPM
  SPEED_RAMP: 4, // px/s gagnés par seconde
  PLAYER_X: 120,
  PLAYER_W: 40,
  PLAYER_H: 64,
  SLIDE_H: 48, // hauteur de la pose de glissade du sprite à l'échelle du jeu
  SPAWN_AHEAD: 1200, // px devant la caméra où les obstacles sont créés
};

// Niveaux : tempo maximal et coefficient de points. Impossible n'a pas de plafond.
export const LEVELS = {
  easy: { name: 'Facile', bpm: 160, mult: 1 },
  medium: { name: 'Moyen', bpm: 180, mult: 1.5 },
  hard: { name: 'Difficile', bpm: 200, mult: 2 },
  impossible: { name: 'Impossible', bpm: Infinity, mult: 3 },
};
export const DEFAULT_LEVEL = 'medium';

// Partition du jour : 32 mesures de 4 temps, 3 vies, 1,5 s d'invincibilité après un choc.
export const MEASURE_COUNT = 32;
export const MEASURE_PX = 4 * BEAT_PX;
export const PARTITION_LIVES = 3;
export const PARTITION_GRACE = 1.5;

// Réglages des bonus (durées dans items.js).
export const POWER = {
  PLATFORM_JUMP: Math.sqrt(1.3), // saut 30 % plus haut : la hauteur suit le carré de la vitesse
  ROCKET_Y: 210, // altitude de vol, au-dessus du mur d'amplis
  GRACE: 1, // secondes d'invincibilité après une avance rapide, un vol ou un choc absorbé
  SLOW_BPM: 20,
  MAGNET_R: 260,
  BANNER: 1.6, // secondes d'affichage du nom du bonus
};
const TIMED = ['gold', 'platform', 'rocket', 'magnet', 'disco', 'grace'];

// Tolérance : boîtes de collision plus petites que les dessins.
const INSET = { player: 6, obstacle: 4 };

export function bpmOf(speed) {
  return (speed / BEAT_PX) * 60;
}

export function speedOfBpm(bpm) {
  return (bpm * BEAT_PX) / 60;
}

// Vitesse prévue à une distance donnée, sans bonus : la même pour tous, elle règle les écarts d'obstacles.
function plannedSpeed(world, px) {
  const { SPEED_START: v0, SPEED_RAMP: a } = PHYSICS;
  return Math.min(world.speedMax, Math.sqrt(v0 * v0 + 2 * a * px));
}

// bonuses : faux pour la Partition du jour (notes seulement). level : clé de LEVELS.
export function createWorld(seed, { bonuses = true, partition = false, level = DEFAULT_LEVEL } = {}) {
  const itemRand = mulberry32(seed ^ 0x85ebca6b);
  return {
    seed,
    level,
    speedMax: speedOfBpm(LEVELS[level].bpm),
    mult: LEVELS[level].mult,
    rand: mulberry32(seed),
    gen: createGenerator(),
    obstacles: [],
    itemRand,
    itemGen: createItemGen(bonuses, itemRand),
    items: [],
    effects: {}, // bonus actifs : secondes restantes, ou shield = true
    banner: null, // { text, t } : message affiché en jeu (bonus, succès)
    events: [], // ce qui s'est passé pendant le dernier pas (sons)
    lives: partition ? PARTITION_LIVES : null, // null hors Partition du jour
    hits: [], // mesures touchées (Partition du jour)
    finished: false, // Partition du jour : les 32 mesures sont jouées
    maxSpeed: PHYSICS.SPEED_START,
    // Ce que la course retient pour les succès.
    track: {
      jumps: 0,
      slides: 0,
      fastFalls: 0,
      shieldSaves: 0,
      picked: [], // bonus ramassés
      combo: 0, // notes d'affilée sans en rater
      bestCombo: 0,
      flightNotes: 0, // notes ramassées pendant le vol en cours
      bestFlight: 0,
      firstMove: null, // mètres au premier saut ou à la première glissade
      lastBonusAt: null, // horloge au dernier bonus ramassé
      shieldAt: null, // horloge à la prise de la pochette
      quickShield: false, // choc absorbé moins d'une seconde après la prise
      slowFast: false, // 33 tours pris au-dessus de 200 BPM
      ffwdBest: 0, // meilleur gain d'une avance rapide, en mètres
      descending: false,
      wasSliding: false,
    },
    clock: 0, // secondes réelles depuis le départ (le temps de jeu, lui, recule avec le 33 tours)
    time: 0,
    distance: 0,
    notes: 0,
    points: 0,
    speed: PHYSICS.SPEED_START,
    dead: false,
    player: { x: PHYSICS.PLAYER_X, y: 0, vy: 0, onGround: true, sliding: false, holdTime: 0, jumpBuffer: 0, slideTime: 0, slideRest: 0 },
  };
}

// Points d'un tronçon de course : chaque mètre vaut (BPM / 100) × coefficient du niveau.
function pointsFor(world, px) {
  return (px / 10) * (bpmOf(world.speed) / 100) * world.mult;
}

// Boîte de collision du joueur, en coordonnées écran (x) et hauteur (y).
export function hitbox(player) {
  const h = player.sliding ? PHYSICS.SLIDE_H : PHYSICS.PLAYER_H;
  return { x: player.x + INSET.player, y: player.y, w: PHYSICS.PLAYER_W - 2 * INSET.player, h: h - INSET.player };
}

function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function collides(world) {
  const p = hitbox(world.player);
  return world.obstacles.some((o) => {
    const i = INSET.obstacle;
    const box = { x: o.x - world.distance + i, y: o.y, w: o.w - 2 * i, h: o.h - i };
    return overlaps(p, box);
  });
}

function tickEffects(world, dt) {
  const fx = world.effects;
  for (const k of TIMED) {
    if (fx[k] === undefined) continue;
    fx[k] -= dt;
    if (fx[k] > 0) continue;
    delete fx[k];
    if (k === 'rocket') fx.grace = POWER.GRACE; // 1 s de répit à l'arrivée
  }
  if (world.banner && (world.banner.t -= dt) <= 0) world.banner = null;
}

function spawn(world) {
  const speedAt = (px) => plannedSpeed(world, px);
  while (world.obstacles.length === 0 || world.obstacles.at(-1).x < world.distance + PHYSICS.SPAWN_AHEAD) {
    const ob = nextObstacle(world.gen, world.rand, PHYSICS.PLAYER_X, speedAt);
    world.obstacles.push(ob);
    world.items.push(...itemsFor(world.itemGen, world.itemRand, ob, PHYSICS.PLAYER_X + PHYSICS.PLAYER_W / 2));
  }
  world.obstacles = world.obstacles.filter((o) => o.x + o.w > world.distance - 50);
}

function move(p, controls, dt, fx, track) {
  p.jumpBuffer = controls.jumpPressed ? PHYSICS.JUMP_BUFFER : Math.max(0, p.jumpBuffer - dt);
  if (p.onGround && p.jumpBuffer > 0) {
    p.vy = PHYSICS.JUMP_SPEED * (fx.platform ? POWER.PLATFORM_JUMP : 1);
    p.onGround = false;
    p.holdTime = 0;
    p.jumpBuffer = 0;
    track.jumps++;
  }

  if (!p.onGround) {
    p.holdTime += dt;
    // Glisser en l'air = descente rapide, qui coupe l'appui long du saut.
    const fastFall = controls.slideHeld;
    const holding = !fastFall && controls.jumpHeld && p.vy > 0 && p.holdTime < PHYSICS.HOLD_MAX;
    const g = fastFall ? PHYSICS.GRAVITY * PHYSICS.FAST_FALL : holding ? PHYSICS.HOLD_GRAVITY : PHYSICS.GRAVITY;
    const maxFall = fastFall ? PHYSICS.FAST_MAX_FALL : PHYSICS.MAX_FALL;
    p.vy = Math.max(p.vy - g * dt, -maxFall);
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.onGround = true;
    }
  }

  // La glissade s'arrête après 0,9 s ; relâcher 0,3 s remet la limite à zéro.
  p.slideRest = controls.slideHeld ? 0 : p.slideRest + dt;
  if (p.slideRest >= PHYSICS.SLIDE_REST) p.slideTime = 0;
  p.sliding = p.onGround && controls.slideHeld && p.slideTime < PHYSICS.SLIDE_MAX;
  if (p.sliding) p.slideTime += dt;
  if (p.sliding && !track.wasSliding) track.slides++;
  track.wasSliding = p.sliding;
}

// Ampli-fusée : le coureur monte à son altitude de vol et y reste.
function fly(p, dt) {
  p.onGround = false;
  p.sliding = false;
  p.vy = 0;
  p.y += (POWER.ROCKET_Y - p.y) * Math.min(1, dt * 4);
}

// Avance rapide : gain = 200 × (distance / 1000)^0,7 mètres.
export function fastForwardGain(meters) {
  return 200 * (meters / 1000) ** 0.7;
}

function fastForward(world) {
  const gain = fastForwardGain(world.distance / 10);
  world.distance += gain * 10;
  world.points += pointsFor(world, gain * 10);
  world.track.ffwdBest = Math.max(world.track.ffwdBest, gain);
  // Les obstacles sautés disparaissent ; les suivants partent au moins deux temps plus loin.
  const beat = Math.ceil(world.distance / BEAT_PX) + 2;
  world.obstacles = world.obstacles.filter((o) => o.beat > beat);
  if (world.gen.nextBeat < beat) {
    world.gen.nextBeat = beat;
    world.itemGen.prevBeat = beat;
  }
  world.effects.grace = Math.max(world.effects.grace ?? 0, POWER.GRACE);
}

// 33 tours : le tempo redescend d'environ 20 BPM, puis la rampe reprend.
function slowDown(world) {
  if (bpmOf(world.speed) >= 200) world.track.slowFast = true;
  const atMax = (world.speedMax - PHYSICS.SPEED_START) / PHYSICS.SPEED_RAMP;
  const back = (POWER.SLOW_BPM * BEAT_PX) / 60 / PHYSICS.SPEED_RAMP;
  world.time = Math.max(0, Math.min(world.time, atMax) - back);
}

export function applyBonus(world, id) {
  const fx = world.effects;
  const track = world.track;
  if (id === 'ffwd') fastForward(world);
  else if (id === 'slow') slowDown(world);
  else if (id === 'shield') {
    fx.shield = true;
    track.shieldAt = world.clock;
  } else {
    fx[id] = BONUSES[id].duration;
    if (id === 'rocket') {
      fly(world.player, 0);
      track.flightNotes = 0;
    }
  }
  track.picked.push(id);
  track.lastBonusAt = world.clock;
  world.banner = { text: `${BONUSES[id].name} !`, t: POWER.BANNER };
}

function collect(world, dt) {
  const fx = world.effects;
  const track = world.track;
  const box = hitbox(world.player);
  const left = world.distance + box.x;
  const cx = left + box.w / 2;
  const cy = box.y + box.h / 2;
  const kept = [];
  for (const it of world.items) {
    // Micro : les notes proches filent vers le coureur.
    if (fx.magnet && it.kind === 'note' && Math.hypot(it.x - cx, it.y - cy) < POWER.MAGNET_R) {
      const k = Math.min(1, dt * 10);
      it.x += (cx - it.x) * k;
      it.y += (cy - it.y) * k;
    }
    const inX = it.x - it.r < left + box.w && it.x + it.r > left;
    // En vol, tout ce qui passe sous l'ampli-fusée est ramassé.
    const inY = fx.rocket || (it.y - it.r < box.y + box.h && it.y + it.r > box.y);
    if (!(inX && inY)) {
      if (it.x + it.r > world.distance) kept.push(it);
      else if (it.kind === 'note') track.combo = 0; // note sortie de l'écran sans être prise
    } else if (it.kind === 'note') {
      world.notes++;
      world.points += NOTE_POINTS * world.mult * (fx.disco ? 2 : 1);
      track.bestCombo = Math.max(track.bestCombo, ++track.combo);
      if (fx.rocket) track.bestFlight = Math.max(track.bestFlight, ++track.flightNotes);
      world.events.push({ type: 'note' });
    } else {
      applyBonus(world, it.id);
      world.events.push({ type: 'bonus', id: it.id });
    }
  }
  world.items = kept;
}

function hit(world) {
  const fx = world.effects;
  if (fx.gold || fx.rocket || fx.grace) return;
  if (fx.shield) {
    delete fx.shield;
    world.track.shieldSaves++;
    if (world.clock - world.track.shieldAt < 1) world.track.quickShield = true;
    fx.grace = POWER.GRACE;
    world.events.push({ type: 'shield' });
    return;
  }
  if (world.lives !== null) {
    world.lives--;
    world.hits.push(Math.floor(world.distance / MEASURE_PX));
    world.events.push({ type: 'hurt' });
    fx.grace = PARTITION_GRACE;
    if (world.lives > 0) return;
  }
  world.dead = true;
}

// controls = { jumpPressed, jumpHeld, slideHeld } ; dt en secondes.
export function stepWorld(world, controls, dt) {
  if (world.dead || world.finished) return world;
  world.events = [];
  const track = world.track;

  world.clock += dt;
  world.time += dt;
  tickEffects(world, dt);
  world.speed = Math.min(world.speedMax, PHYSICS.SPEED_START + PHYSICS.SPEED_RAMP * world.time);
  world.maxSpeed = Math.max(world.maxSpeed, world.speed);
  world.distance += world.speed * dt;
  world.points += pointsFor(world, world.speed * dt);
  if (world.lives !== null && world.distance >= MEASURE_PX * MEASURE_COUNT) {
    world.finished = true;
    return world;
  }
  spawn(world);

  const descending = !world.player.onGround && controls.slideHeld;
  if (descending && !track.descending) track.fastFalls++;
  track.descending = descending;

  if (world.effects.rocket) fly(world.player, dt);
  else move(world.player, controls, dt, world.effects, track);
  if (track.firstMove === null && (track.jumps || track.slides)) track.firstMove = world.distance / 10;

  collect(world, dt);
  if (collides(world)) hit(world);
  return world;
}
