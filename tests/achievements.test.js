import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld } from '../js/core/world.js';
import { ACHIEVEMENTS, CATEGORIES, emptyStats, loadStats, saveStats, runOf, applyRun, STATS_KEY } from '../js/core/achievements.js';

const IDLE = { jumpPressed: false, jumpHeld: false, slideHeld: false };

function memory(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

// Une course sans obstacle, de durée donnée (secondes).
function run(seconds, tweak = () => {}, opts = {}) {
  const w = createWorld(3, { bonuses: false, ...opts });
  w.gen.nextBeat = Infinity;
  tweak(w);
  for (let i = 0; i < seconds * 60; i++) stepWorld(w, IDLE, 1 / 60);
  return w;
}

const ids = (fresh) => fresh.map((a) => a.id);

test('catalogue : une centaine de succès, identifiants uniques, 15 secrets, familles connues', () => {
  assert.ok(ACHIEVEMENTS.length >= 100, `${ACHIEVEMENTS.length}`);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  assert.equal(ACHIEVEMENTS.filter((a) => a.secret).length, 15);
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const a of ACHIEVEMENTS) assert.ok(cats.has(a.cat), a.id);
  for (const bpm of [120, 140, 160, 180, 200, 220, 230, 240, 250]) assert.ok(ACHIEVEMENTS.some((a) => a.id === `bpm-${bpm}`));
});

test('catalogue : toute progression se calcule sur des stats vides', () => {
  const s = emptyStats();
  for (const a of ACHIEVEMENTS) assert.equal(typeof a.value(s, {}), 'number', a.id);
});

test('première course finie : « Premier pas », une seule fois ; en cours de course, rien n est compté', () => {
  const live = applyRun(emptyStats(), runOf(run(1)), false);
  assert.ok(!ids(live.fresh).includes('runs-1'));
  const first = applyRun(emptyStats(), runOf(run(1)), true);
  assert.ok(ids(first.fresh).includes('runs-1'));
  const second = applyRun({ ...first.view, unlocked: first.unlocked }, runOf(run(1)), true);
  assert.ok(!ids(second.fresh).includes('runs-1'));
});

test('tempo : les paliers tombent avec le BPM atteint, et pas au-delà', () => {
  const r = applyRun(emptyStats(), runOf(run(1, (w) => (w.maxSpeed = (205 * 216) / 60))), true);
  const got = ids(r.fresh);
  for (const bpm of [120, 140, 160, 180, 200]) assert.ok(got.includes(`bpm-${bpm}`), `${bpm}`);
  assert.ok(!got.includes('bpm-220'));
});

test('niveaux : 500 m comptent pour le niveau joué seulement', () => {
  const w = run(1, (w) => (w.distance = 5100), { level: 'hard' });
  const got = ids(applyRun(emptyStats(), runOf(w), true).fresh);
  assert.ok(got.includes('level-hard'));
  assert.ok(!got.includes('level-easy'));
});

test('collectionneur : les 8 bonus, répartis sur plusieurs courses', () => {
  let stats = emptyStats();
  const all = ['gold', 'platform', 'ffwd', 'rocket', 'slow', 'magnet', 'disco', 'shield'];
  for (const id of all.slice(0, 4)) stats = applyRun(stats, runOf(run(1, (w) => w.track.picked.push(id))), true).view;
  const last = applyRun(stats, runOf(run(1, (w) => w.track.picked.push(...all.slice(4)))), true);
  assert.ok(ids(last.fresh).includes('collector'));
});

test('secrets : pied de nez, zen, roi Midas, horaires', () => {
  const quick = createWorld(3);
  quick.dead = true;
  quick.clock = 2;
  assert.equal(runOf(quick).flags.quick, true);

  assert.equal(runOf(run(1, (w) => (w.distance = 1600))).flags.zen, true, '160 m sans geste');
  assert.equal(runOf(run(1, (w) => (w.track.firstMove = 40))).flags.zen, false);

  assert.equal(runOf(run(1, (w) => w.track.picked.push('gold', 'gold'))).flags.midas, true);

  const sat = runOf(run(1), { now: new Date(2026, 9, 31, 21, 30) }); // samedi 31 octobre 2026, 21 h 30
  assert.equal(sat.flags.saturday, true);
  assert.equal(sat.flags.night, false);
  assert.equal(runOf(run(1), { now: new Date(2026, 9, 29, 6, 0) }).flags.early, true);
});

test('défis du jour : partition parfaite et série comptées à la fin', () => {
  const partition = { done: 32, clean: 32, states: 'c'.repeat(32) };
  const r = applyRun(emptyStats(), runOf(run(1), { mode: 'partition', partition, streak: 3 }), true);
  const got = ids(r.fresh);
  for (const id of ['partition-1', 'partition-end', 'partition-clean', 'streak-3']) assert.ok(got.includes(id), id);
});

test('discographie complète : tombe quand tous les autres sont débloqués', () => {
  const stats = emptyStats();
  for (const a of ACHIEVEMENTS.slice(0, -2)) stats.unlocked[a.id] = 1;
  assert.ok(!ids(applyRun(stats, runOf(run(1)), false).fresh).includes('secret-all'));
  stats.unlocked[ACHIEVEMENTS.at(-2).id] = 1;
  assert.ok(ids(applyRun(stats, runOf(run(1)), false).fresh).includes('secret-all'));
});

test('stockage : relecture fidèle ; abîmé ou bloqué : repart de zéro sans erreur', () => {
  const store = memory();
  const stats = { ...emptyStats(), runs: 4, bonusCounts: { gold: 2 } };
  saveStats(store, stats);
  assert.deepEqual(loadStats(store), stats);
  assert.deepEqual(loadStats(memory({ [STATS_KEY]: '{pas du json' })), emptyStats());
  const broken = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  assert.deepEqual(loadStats(broken), emptyStats());
  assert.doesNotThrow(() => saveStats(broken, stats));
});
