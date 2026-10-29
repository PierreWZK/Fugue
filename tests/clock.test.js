import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, PHYSICS } from '../js/core/world.js';
import { timeToDistance } from '../js/core/clock.js';

const DT = 1 / 60;
const { SPEED_START, SPEED_MAX, SPEED_RAMP } = PHYSICS;

// Monde sans obstacle, pour que la course ne s'arrête pas.
function openWorld(time) {
  const w = createWorld(1);
  w.gen.nextBeat = Infinity;
  w.time = time;
  return w;
}

const speedAt = (t) => Math.min(SPEED_MAX, SPEED_START + SPEED_RAMP * t);

// Temps réel mis par la simulation pour couvrir D pixels.
function simulate(time, D) {
  const w = openWorld(time);
  let t = 0;
  while (w.distance < D) {
    stepWorld(w, { jumpPressed: false, jumpHeld: false, slideHeld: false }, DT);
    t += DT;
  }
  return t;
}

test('timeToDistance : concorde avec la simulation avant le plafond', () => {
  const t0 = 0;
  const D = 1000;
  const formula = timeToDistance(D, speedAt(t0), SPEED_RAMP, SPEED_MAX);
  assert.ok(Math.abs(formula - simulate(t0, D)) < 2 * DT, `${formula} vs ${simulate(t0, D)}`);
});

test('timeToDistance : concorde avec la simulation en pleine accélération', () => {
  const t0 = 40;
  const D = 3000;
  const formula = timeToDistance(D, speedAt(t0), SPEED_RAMP, SPEED_MAX);
  assert.ok(Math.abs(formula - simulate(t0, D)) < 2 * DT, `${formula} vs ${simulate(t0, D)}`);
});

test('timeToDistance : concorde avec la simulation une fois plafonné', () => {
  const t0 = 200;
  const D = 5000;
  const formula = timeToDistance(D, SPEED_MAX, SPEED_RAMP, SPEED_MAX);
  assert.ok(Math.abs(formula - D / SPEED_MAX) < 1e-9);
  assert.ok(Math.abs(formula - simulate(t0, D)) < 2 * DT);
});

test('timeToDistance : une distance nulle ou négative prend zéro temps', () => {
  assert.equal(timeToDistance(0, SPEED_START, SPEED_RAMP, SPEED_MAX), 0);
  assert.equal(timeToDistance(-5, SPEED_START, SPEED_RAMP, SPEED_MAX), 0);
});
