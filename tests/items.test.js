import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, applyBonus, fastForwardGain, bpmOf, PHYSICS, POWER } from '../js/core/world.js';
import { BEAT_PX, TYPES } from '../js/core/obstacles.js';
import { BONUS_GAP } from '../js/core/items.js';
import { NOTE_POINTS } from '../js/core/score.js';

const DT = 1 / 60;
const IDLE = { jumpPressed: false, jumpHeld: false, slideHeld: false };
const CENTER = PHYSICS.PLAYER_X + PHYSICS.PLAYER_W / 2;

function run(world, controls, seconds) {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepWorld(world, controls, DT);
}

// Génère la course temps par temps, joueur hors d'atteinte ; renvoie tout ce qui a été posé.
function course(seed, beats, opts) {
  const w = createWorld(seed, opts);
  w.player.y = 100_000;
  w.player.onGround = false;
  const items = [];
  const obstacles = new Map();
  for (let b = 0; b <= beats; b += 4) {
    w.distance = b * BEAT_PX;
    stepWorld(w, IDLE, 0);
    items.push(...w.items);
    w.items = [];
    for (const o of w.obstacles) obstacles.set(o.beat, o);
  }
  return { w, items, obstacles: [...obstacles.values()] };
}

// Un monde sans obstacle, avec une seule note ou un seul bonus posés devant le joueur.
function lane(item) {
  const w = createWorld(1);
  w.gen.nextBeat = Infinity;
  stepWorld(w, IDLE, 0);
  w.items = [{ r: 14, ...item }];
  return w;
}

test('notes et bonus : même graine, mêmes objets ; obstacles inchangés', () => {
  const a = course(3, 200);
  const b = course(3, 200);
  assert.deepEqual(a.items, b.items);
  const noBonus = course(3, 200, { bonuses: false });
  assert.deepEqual(a.obstacles, noBonus.obstacles);
});

test('notes : posées sur les temps, jamais au sol dans un obstacle', () => {
  const w = course(4, 300);
  const notes = w.items.filter((i) => i.kind === 'note');
  assert.ok(notes.length > 50);
  for (const n of notes) {
    const beats = (n.x - CENTER) / BEAT_PX;
    assert.equal((beats * 3) % 1, 0, 'sur un temps ou un tiers de temps');
  }
  for (const o of w.obstacles) {
    if (o.type === 'bar') continue;
    for (const n of notes) {
      const inside = n.x > o.x && n.x < o.x + o.w && n.y < o.y + o.h;
      assert.ok(!inside, `note dans un obstacle ${o.type} au temps ${o.beat}`);
    }
  }
});

test('bonus : un tous les 25 à 40 temps environ, aucun en Partition du jour', () => {
  const beats = course(9, 3000)
    .items.filter((i) => i.kind === 'bonus')
    .map((i) => Math.round((i.x - CENTER) / BEAT_PX));
  assert.ok(beats.length > 50);
  for (let i = 1; i < beats.length; i++) {
    const gap = beats[i] - beats[i - 1];
    assert.ok(gap >= BONUS_GAP[0] && gap <= BONUS_GAP[1] + 1, `écart ${gap}`);
  }
  const partition = course(9, 2000, { bonuses: false });
  assert.equal(partition.items.filter((i) => i.kind === 'bonus').length, 0);
});

test('note ramassée : +1 note ; avec la boule à facettes, points doublés', () => {
  const w = lane({ kind: 'note', x: 300, y: 24 });
  run(w, IDLE, 1);
  assert.equal(w.notes, 1);
  assert.deepEqual(w.items, []);

  const disco = lane({ kind: 'note', x: 300, y: 24 });
  applyBonus(disco, 'disco');
  run(disco, IDLE, 1);
  assert.equal(disco.notes, 1);
  const plain = lane({ kind: 'note', x: 300, y: 24 });
  run(plain, IDLE, 1);
  assert.ok(Math.abs(disco.points - plain.points - NOTE_POINTS * plain.mult) < 1e-6, 'la note compte double');
});

test('micro : une note hors de portée est attirée et ramassée', () => {
  const w = lane({ kind: 'note', x: 400, y: 200 });
  applyBonus(w, 'magnet');
  run(w, IDLE, 1);
  assert.equal(w.notes, 1);
});

test('disque d or : invincible 10 s, puis le choc tue', () => {
  const w = createWorld(7);
  applyBonus(w, 'gold');
  run(w, IDLE, 9.5);
  assert.equal(w.dead, false);
  run(w, IDLE, 10);
  assert.equal(w.dead, true);
});

test('pochette : absorbe un seul choc', () => {
  const w = createWorld(7);
  applyBonus(w, 'shield');
  run(w, IDLE, 20);
  assert.equal(w.dead, true);
  assert.equal(w.effects.shield, undefined);
  assert.ok(w.time > 6, 'le premier choc a été absorbé');
});

test('avance rapide : 200 m à 1 000 m, environ 1 000 m à 10 000 m ; obstacles sautés retirés', () => {
  assert.equal(Math.round(fastForwardGain(1000)), 200);
  assert.ok(Math.abs(fastForwardGain(10_000) - 1000) < 30);

  const { w } = course(5, 44);
  w.distance = 10_000; // 1 000 m
  Object.assign(w.player, { y: 0, onGround: true });
  applyBonus(w, 'ffwd');
  assert.ok(Math.abs(w.distance - 12_000) < 1);
  assert.ok(w.obstacles.every((o) => o.x > w.distance + PHYSICS.PLAYER_X));
  assert.equal(w.effects.grace, POWER.GRACE);
  run(w, IDLE, 0.5);
  assert.equal(w.dead, false);
});

test('33 tours : le tempo redescend d environ 20 BPM', () => {
  const w = createWorld(1);
  w.gen.nextBeat = Infinity;
  w.time = 30;
  stepWorld(w, IDLE, DT);
  const before = bpmOf(w.speed);
  applyBonus(w, 'slow');
  stepWorld(w, IDLE, DT);
  assert.ok(Math.abs(before - bpmOf(w.speed) - 20) < 0.5, `${before} -> ${bpmOf(w.speed)}`);
});

test('ampli-fusée : vole au-dessus des obstacles 6 s, ramasse les notes au sol, puis 1 s de répit', () => {
  const w = createWorld(11);
  applyBonus(w, 'rocket');
  run(w, IDLE, 2);
  assert.ok(w.player.y > TYPES.tall.h, `altitude ${w.player.y}`);
  const notes = w.notes;
  run(w, IDLE, 3.9);
  assert.equal(w.dead, false);
  assert.ok(w.notes > notes, 'notes ramassées en vol');
  run(w, IDLE, 0.2);
  assert.equal(w.effects.rocket, undefined);
  assert.ok(w.effects.grace > 0);
});

test('semelles compensées : saut 30 % plus haut', () => {
  const apex = (boost) => {
    const w = createWorld(1);
    w.gen.nextBeat = Infinity;
    if (boost) applyBonus(w, 'platform');
    stepWorld(w, { ...IDLE, jumpPressed: true }, DT);
    let max = 0;
    for (let i = 0; i < 90; i++) {
      stepWorld(w, IDLE, DT);
      max = Math.max(max, w.player.y);
    }
    return max;
  };
  const ratio = apex(true) / apex(false);
  assert.ok(Math.abs(ratio - 1.3) < 0.05, `ratio ${ratio}`);
});
