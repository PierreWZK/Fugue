import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, hitbox, bpmOf, PHYSICS } from '../js/core/world.js';
import { BEAT_PX, TYPES } from '../js/core/obstacles.js';
import { mulberry32, hashSeed } from '../js/core/rng.js';

const DT = 1 / 60;
const IDLE = { jumpPressed: false, jumpHeld: false, slideHeld: false };

// Monde sans obstacle, pour tester la physique seule.
function emptyWorld() {
  const w = createWorld(1);
  w.gen.nextBeat = Infinity;
  return w;
}

// Fait avancer le monde et renvoie la hauteur maximale atteinte.
function run(world, controls, seconds) {
  let maxY = 0;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    stepWorld(world, controls, DT);
    maxY = Math.max(maxY, world.player.y);
  }
  return maxY;
}

test('mulberry32 : même graine, même suite ; valeurs dans [0, 1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('hashSeed : stable pour un même texte, différent pour un autre', () => {
  assert.equal(hashSeed('2026-10-27'), hashSeed('2026-10-27'));
  assert.notEqual(hashSeed('2026-10-27'), hashSeed('2026-10-28'));
});

test('saut : quitte le sol puis y revient', () => {
  const w = emptyWorld();
  stepWorld(w, { ...IDLE, jumpPressed: true }, DT);
  assert.equal(w.player.onGround, false);
  run(w, IDLE, 1);
  assert.equal(w.player.onGround, true);
  assert.equal(w.player.y, 0);
});

test('appui long : le saut monte plus haut qu un tap', () => {
  const tap = emptyWorld();
  stepWorld(tap, { ...IDLE, jumpPressed: true }, DT);
  const tapApex = run(tap, IDLE, 1);

  const hold = emptyWorld();
  stepWorld(hold, { ...IDLE, jumpPressed: true, jumpHeld: true }, DT);
  const holdApex = run(hold, { ...IDLE, jumpHeld: true }, 1);

  assert.ok(holdApex > tapApex + 60, `hold ${holdApex} vs tap ${tapApex}`);
});

test('mémoire de l appui : un saut demandé juste avant l atterrissage part au sol', () => {
  const w = emptyWorld();
  stepWorld(w, { ...IDLE, jumpPressed: true }, DT);
  while (w.player.vy > -800) stepWorld(w, IDLE, DT); // presque au sol
  stepWorld(w, { ...IDLE, jumpPressed: true }, DT);
  run(w, IDLE, 0.1);
  assert.equal(w.player.onGround, false, 'a resauté sans nouvel appui');
});

test('glissade : seulement au sol, réduit la boîte de collision', () => {
  const w = emptyWorld();
  stepWorld(w, { ...IDLE, slideHeld: true }, DT);
  assert.equal(w.player.sliding, true);
  assert.ok(hitbox(w.player).h < TYPES.bar.y);

  stepWorld(w, { ...IDLE, jumpPressed: true, slideHeld: true }, DT);
  assert.equal(w.player.sliding, false, 'pas de glissade en l air');
});

test('vitesse : croît puis plafonne ; le tempo suit', () => {
  const w = emptyWorld();
  run(w, IDLE, 120);
  assert.equal(w.speed, PHYSICS.SPEED_MAX);
  assert.equal(Math.round(bpmOf(PHYSICS.SPEED_START)), 100);
  assert.ok(Math.round(bpmOf(PHYSICS.SPEED_MAX)) <= 180);
});

test('collision : sans rien faire, on meurt sur le premier obstacle, au bon temps', () => {
  const w = createWorld(7);
  run(w, IDLE, 20);
  assert.equal(w.dead, true);
  const first = w.obstacles[0];
  // Le contact se fait dans la largeur du joueur qui précède le temps de l'obstacle.
  const onBeat = first.beat * BEAT_PX;
  assert.ok(w.distance > onBeat - PHYSICS.PLAYER_W && w.distance <= onBeat, `${w.distance} vs ${onBeat}`);
});

test('obstacles : toujours sur un temps, même graine = même course', () => {
  const a = createWorld(99);
  const b = createWorld(99);
  a.dead = b.dead = false;
  for (const w of [a, b]) {
    w.player.y = 10_000; // hors d'atteinte : on ne teste que la génération
    run(w, IDLE, 30);
  }
  assert.deepEqual(a.obstacles.map((o) => o.beat), b.obstacles.map((o) => o.beat));
  for (const o of a.obstacles) assert.equal((o.x - PHYSICS.PLAYER_X) % BEAT_PX, 0);
});

test('descente rapide : glisser en l air tombe plus vite, sans appui long', () => {
  const normal = emptyWorld();
  stepWorld(normal, { ...IDLE, jumpPressed: true, jumpHeld: true }, DT);
  run(normal, { ...IDLE, jumpHeld: true }, 0.15);

  const fast = emptyWorld();
  stepWorld(fast, { ...IDLE, jumpPressed: true, jumpHeld: true }, DT);
  run(fast, { ...IDLE, jumpHeld: true, slideHeld: true }, 0.15);
  assert.ok(fast.player.vy < normal.player.vy - 500, `fast ${fast.player.vy} vs normal ${normal.player.vy}`);

  const peak = emptyWorld();
  stepWorld(peak, { ...IDLE, jumpPressed: true, jumpHeld: true }, DT);
  const apex = run(peak, { ...IDLE, jumpHeld: true }, 0.1);
  const cut = emptyWorld();
  stepWorld(cut, { ...IDLE, jumpPressed: true, jumpHeld: true }, DT);
  const cutApex = run(cut, { ...IDLE, jumpHeld: true, slideHeld: true }, 0.1);
  assert.ok(cutApex < apex, 'la descente rapide coupe l appui long');
});

test('chute : plafonnée à 2400 px/s en descente rapide', () => {
  const w = emptyWorld();
  w.player.y = 100_000;
  w.player.onGround = false;
  run(w, { ...IDLE, slideHeld: true }, 2);
  assert.equal(w.player.vy, -PHYSICS.FAST_MAX_FALL);
});

test('glissade : 0,9 s au plus, puis il faut relâcher 0,3 s pour reglisser', () => {
  const w = emptyWorld();
  const held = { ...IDLE, slideHeld: true };
  run(w, held, 0.85);
  assert.equal(w.player.sliding, true);
  run(w, held, 0.1);
  assert.equal(w.player.sliding, false, 'arrêtée après 0,9 s');

  run(w, IDLE, 0.2);
  run(w, held, 0.05);
  assert.equal(w.player.sliding, false, 'pas de reglisse après 0,2 s de pause');

  run(w, IDLE, 0.3);
  run(w, held, DT);
  assert.equal(w.player.sliding, true, 'reglisse après 0,3 s de pause');
});

test('glissade : garder la touche enfoncée en atterrissant enchaîne sur une glissade', () => {
  const w = emptyWorld();
  stepWorld(w, { ...IDLE, jumpPressed: true }, DT);
  for (let i = 0; i < 300 && !w.player.onGround; i++) stepWorld(w, { ...IDLE, slideHeld: true }, DT);
  assert.equal(w.player.onGround, true);
  assert.equal(w.player.sliding, true);
});
