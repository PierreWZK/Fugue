import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, MEASURE_COUNT, MEASURE_PX } from '../js/core/world.js';
import {
  dayKey,
  yesterdayOf,
  dailySeed,
  emptyDaily,
  loadDaily,
  saveDaily,
  played,
  recordAttempt,
  currentStreak,
  partitionOf,
  precisionOf,
  partitionShare,
  courseShare,
  DAILY_KEY,
} from '../js/core/daily.js';

function memory(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

test('jour local : AAAA-MM-JJ, veille correcte y compris au changement de mois et d année', () => {
  assert.equal(dayKey(new Date(2026, 9, 29)), '2026-10-29');
  assert.equal(yesterdayOf('2026-03-01'), '2026-02-28');
  assert.equal(yesterdayOf('2027-01-01'), '2026-12-31');
});

test('graine du jour : même date et même défi, même graine ; défis différents, graines différentes', () => {
  assert.equal(dailySeed('2026-10-29', 'course'), dailySeed('2026-10-29', 'course'));
  assert.notEqual(dailySeed('2026-10-29', 'course'), dailySeed('2026-10-29', 'partition'));
  assert.notEqual(dailySeed('2026-10-29', 'course'), dailySeed('2026-10-30', 'course'));
});

test('un seul essai par défi et par jour', () => {
  const day = '2026-10-29';
  let data = recordAttempt(emptyDaily(), 'course', { meters: 500, bpm: 120, score: 600 }, day);
  assert.equal(played(data, 'course', day), true);
  assert.equal(played(data, 'partition', day), false);
  const again = recordAttempt(data, 'course', { meters: 9000, bpm: 170, score: 9000 }, day);
  assert.equal(again, data, 'le second essai du jour est ignoré');
});

test('série : +1 les jours qui se suivent, repart de 1 après un trou, inchangée le même jour', () => {
  let data = emptyDaily();
  data = recordAttempt(data, 'course', { meters: 1, bpm: 100, score: 1 }, '2026-10-27');
  assert.equal(data.streak.count, 1);
  data = recordAttempt(data, 'partition', { done: 3, clean: 3, states: 'c'.repeat(3) + 'm'.repeat(29) }, '2026-10-27');
  assert.equal(data.streak.count, 1, 'deux défis le même jour : une seule journée');
  data = recordAttempt(data, 'course', { meters: 1, bpm: 100, score: 1 }, '2026-10-28');
  assert.equal(data.streak.count, 2);
  data = recordAttempt(data, 'course', { meters: 1, bpm: 100, score: 1 }, '2026-10-30');
  assert.equal(data.streak.count, 1, 'un jour manqué remet la série à 1');
});

test('série affichée : vivante aujourd hui ou hier, morte après', () => {
  const data = recordAttempt(emptyDaily(), 'course', { meters: 1, bpm: 100, score: 1 }, '2026-10-28');
  assert.equal(currentStreak(data, '2026-10-28'), 1);
  assert.equal(currentStreak(data, '2026-10-29'), 1, 'pas encore joué aujourd hui : la série tient');
  assert.equal(currentStreak(data, '2026-10-30'), 0);
});

test('stockage : relecture fidèle ; stockage abîmé ou bloqué : repart de zéro', () => {
  const store = memory();
  const data = recordAttempt(emptyDaily(), 'course', { meters: 42, bpm: 111, score: 99 }, '2026-10-29');
  saveDaily(store, data);
  assert.deepEqual(loadDaily(store), data);
  assert.deepEqual(loadDaily(memory({ [DAILY_KEY]: '{cassé' })), emptyDaily());
  const broken = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };
  assert.deepEqual(loadDaily(broken), emptyDaily());
  assert.doesNotThrow(() => saveDaily(broken, data));
});

test('partage partition : une ligne de 8 cases par bloc de mesures, emoji exacts', () => {
  const states = 'c'.repeat(20) + 'h' + 'c'.repeat(3) + 'm'.repeat(8);
  const result = { done: 24, clean: 23, states };
  assert.equal(precisionOf(result), 96);
  const text = partitionShare(result, '2026-10-29', 4).split('\n');
  assert.equal(text[0], 'Fugue · Partition du jour 2026-10-29');
  assert.equal(text[1], '🟩'.repeat(8));
  assert.equal(text[2], '🟩'.repeat(8));
  assert.equal(text[3], '🟩'.repeat(4) + '🟨' + '🟩'.repeat(3));
  assert.equal(text[4], '⬛'.repeat(8));
  assert.equal(text[5], '24/32 mesures · 96 % propres');
  assert.equal(text[6], '🔥 4');
});

test('partage course : distance et tempo, série seulement si elle existe', () => {
  const text = courseShare({ meters: 1240, bpm: 148, score: 1300 }, '2026-10-29', 0).split('\n');
  assert.equal(text[1], '1 240 m · 148 BPM');
  assert.equal(text.length, 2);
});

test('partition : état de chaque mesure, mesures jouées seulement au passage complet', () => {
  const w = createWorld(1, { bonuses: false, partition: true });
  w.gen.nextBeat = Infinity;
  w.distance = MEASURE_PX * 2 + 10; // deux mesures passées, la troisième commencée
  const r = partitionOf(w);
  assert.equal(r.done, 2);
  assert.equal(r.clean, 2);
  assert.equal(r.states.length, MEASURE_COUNT);
  assert.equal(r.states.slice(2), 'm'.repeat(MEASURE_COUNT - 2));
});
