import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, PHYSICS, MEASURE_COUNT, MEASURE_PX, PARTITION_LIVES, PARTITION_GRACE } from '../js/core/world.js';
import { partitionOf } from '../js/core/daily.js';

const DT = 1 / 60;
const IDLE = { jumpPressed: false, jumpHeld: false, slideHeld: false };

function partition(seed = 1) {
  const w = createWorld(seed, { bonuses: false, partition: true });
  w.gen.nextBeat = Infinity;
  return w;
}

// Pose un obstacle juste devant le coureur : le prochain pas le touche.
function obstacleAhead(w) {
  w.obstacles = [{ type: 'low', beat: 0, x: w.distance + PHYSICS.PLAYER_X + 10, y: 0, w: 48, h: 48 }];
}

function run(w, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepWorld(w, IDLE, DT);
}

test('partition : trois vies, le troisième choc termine la partie', () => {
  const w = partition();
  assert.equal(w.lives, PARTITION_LIVES);
  for (let life = 2; life >= 0; life--) {
    obstacleAhead(w);
    stepWorld(w, IDLE, DT);
    assert.equal(w.lives, life);
    assert.equal(w.dead, life === 0, `vies restantes ${life}`);
    w.obstacles = [];
    run(w, PARTITION_GRACE + 0.1); // l'invincibilité passe, on repart
  }
  assert.equal(w.dead, true);
});

test('partition : après un choc, invincible un court instant', () => {
  const w = partition();
  obstacleAhead(w);
  stepWorld(w, IDLE, DT);
  assert.equal(w.effects.grace, PARTITION_GRACE);
  assert.equal(w.dead, false);
});

test('partition : finie à 32 mesures, sans mort, toutes mesures propres', () => {
  const w = partition();
  w.distance = MEASURE_PX * MEASURE_COUNT - 5;
  stepWorld(w, IDLE, 1 / 30);
  assert.equal(w.finished, true);
  assert.equal(w.dead, false);
  const r = partitionOf(w);
  assert.equal(r.done, MEASURE_COUNT);
  assert.equal(r.clean, MEASURE_COUNT);
  assert.equal(r.states, 'c'.repeat(MEASURE_COUNT));
});

test('partition : une mesure touchée reste marquée, les suivantes restent non atteintes après la mort', () => {
  const w = partition();
  w.distance = MEASURE_PX * 3 + 1; // touche dans la 4e mesure
  obstacleAhead(w);
  stepWorld(w, IDLE, DT);
  w.obstacles = [];
  w.effects = {}; // sans invincibilité, pour mourir tout de suite
  w.lives = 1;
  obstacleAhead(w);
  stepWorld(w, IDLE, DT);
  assert.equal(w.dead, true);
  const r = partitionOf(w);
  assert.equal(r.done, 3);
  assert.equal(r.states.slice(0, 3), 'ccc');
  assert.equal(r.states[3], 'm', 'la mesure en cours n est pas comptée jouée');
});

test('hors partition : pas de vies, la course est infinie comme avant', () => {
  const w = createWorld(1, { bonuses: false });
  assert.equal(w.lives, null);
  w.gen.nextBeat = Infinity;
  w.distance = MEASURE_PX * MEASURE_COUNT + 10;
  stepWorld(w, IDLE, DT);
  assert.equal(w.finished, false);
});
