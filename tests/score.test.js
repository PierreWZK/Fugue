import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../js/core/world.js';
import { scoreOf, metersOf, loadBest, saveIfBest, NOTE_POINTS, BEST_KEY } from '../js/core/score.js';

const IDLE = { jumpPressed: false, jumpHeld: false, slideHeld: false };

// Stockage en mémoire, au format localStorage.
function memory(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    data,
  };
}

const broken = {
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
};

test('score : les points cumulés, arrondis à l unité ; la distance en mètres', () => {
  const w = createWorld(1);
  w.distance = 1240 * 10;
  assert.equal(metersOf(w), 1240);
  w.points = 1859.7;
  assert.equal(scoreOf(w), 1859);
});

test('score : plus de points par mètre à tempo élevé et dans les niveaux durs', () => {
  const run = (level, time) => {
    const w = createWorld(1, { level });
    w.gen.nextBeat = Infinity;
    w.time = time;
    for (let i = 0; i < 60; i++) stepWorld(w, IDLE, 1 / 60);
    return scoreOf(w) / metersOf(w);
  };
  assert.ok(run('medium', 60) > run('medium', 0), 'tempo élevé');
  assert.ok(Math.abs(run('impossible', 0) / run('easy', 0) - 3) < 0.05, 'Impossible vaut 3 fois Facile');
});

test('score : une note vaut 10 × le coefficient du niveau', () => {
  const w = createWorld(1, { level: 'hard' });
  w.gen.nextBeat = Infinity;
  stepWorld(w, IDLE, 0);
  w.items = [{ kind: 'note', x: 300, y: 24, r: 14 }];
  const before = w.points;
  for (let i = 0; i < 60; i++) stepWorld(w, IDLE, 1 / 60);
  assert.equal(w.notes, 1);
  assert.ok(w.points - before >= NOTE_POINTS * 2);
});

test('record : premier score, puis seulement si battu', () => {
  const s = memory();
  assert.deepEqual(saveIfBest(s, 500), { best: 500, isNew: true });
  assert.deepEqual(saveIfBest(s, 300), { best: 500, isNew: false });
  assert.deepEqual(saveIfBest(s, 900), { best: 900, isNew: true });
  assert.equal(loadBest(s), 900);
});

test('record : survit au rechargement (même stockage, nouvelle lecture)', () => {
  const s = memory({ [BEST_KEY]: '1820' });
  assert.equal(loadBest(s), 1820);
});

test('record : stockage cassé, pas de plantage, record de la page', () => {
  assert.equal(loadBest(broken), 0);
  assert.deepEqual(saveIfBest(broken, 42), { best: 42, isNew: true });
});

test('record : valeur corrompue ignorée', () => {
  assert.equal(loadBest(memory({ [BEST_KEY]: 'n importe quoi' })), 0);
  assert.equal(loadBest(memory({ [BEST_KEY]: '-5' })), 0);
});
