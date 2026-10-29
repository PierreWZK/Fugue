import { BEAT_PX } from '../core/obstacles.js';
import { PHYSICS } from '../core/world.js';
import { timeToDistance } from '../core/clock.js';
import { mulberry32 } from '../core/rng.js';

// Une croche = une demi-mesure de course. Les notes sont programmées sur la distance,
// donc le tempo suit la vitesse sans réglage séparé.
const EIGHTH = BEAT_PX / 2;
const LOOKAHEAD = 0.15; // secondes d'avance pour programmer les notes
const PATTERN_LEN = 16; // deux mesures de huit croches
const ROOTS = [110, 146.83, 164.81]; // La, Ré, Mi
const PENTA = [0, 3, 5, 7, 10]; // gamme mineure pentatonique, en demi-tons
const KICK = [0, 6, 8, 14];
const SNARE = [4, 12];
const STAB = [2, 7, 10, 15];
const VOLUME = 0.6;
const MUTE_KEY = 'fugue-muted';

function buildPattern(seed) {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const root = ROOTS[Math.floor(rand() * ROOTS.length)];
  const bass = [];
  for (let i = 0; i < PATTERN_LEN; i++) {
    const keep = i % 2 === 0 ? rand() < 0.8 : rand() < 0.25;
    bass[i] = keep ? root * 2 ** (PENTA[Math.floor(rand() * PENTA.length)] / 12) : 0;
  }
  return { root, bass };
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(value) {
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {
    // Stockage indisponible (navigation privée) : le choix tient le temps de la page.
  }
}

export function createMusic() {
  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let pattern = null;
  let next = 0; // prochaine croche à programmer
  let picked = 0; // notes ramassées, pour faire monter la gamme
  let active = false;
  let muted = readMuted();

  const gainValue = () => (muted ? 0 : VOLUME);

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.26);
  }

  function noise(t, { type, freq, q, dur, vol, sweepTo }) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  function bass(t, freq) {
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = 600;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.23);
  }

  // Accord de « clavinet » : trois carrés filtrés sur l'accord mineur de la tonique.
  function stab(t, root) {
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    f.connect(g).connect(master);
    for (const semis of [0, 3, 7]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = root * 2 * 2 ** (semis / 12);
      o.connect(f);
      o.start(t);
      o.stop(t + 0.13);
    }
  }

  // Petite note de clavinet, pour les notes et les bonus ramassés.
  function blip(t, freq, vol = 0.1) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.16);
  }

  function playEighth(k, t) {
    const i = k % PATTERN_LEN;
    if (KICK.includes(i)) kick(t);
    if (SNARE.includes(i)) noise(t, { type: 'bandpass', freq: 1800, q: 1.2, dur: 0.18, vol: 0.35 });
    noise(t, { type: 'highpass', freq: 7000, q: 0.7, dur: 0.04, vol: 0.05 });
    if (pattern.bass[i]) bass(t, pattern.bass[i]);
    if (STAB.includes(i)) stab(t, pattern.root);
  }

  return {
    // Doit venir d'un geste de l'utilisateur (règle des navigateurs sur l'audio).
    start() {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = gainValue();
        // Filtre doux, pour la chaleur du vinyle.
        const warm = ctx.createBiquadFilter();
        warm.type = 'lowpass';
        warm.frequency.value = 7000;
        master.connect(warm).connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      ctx.resume();
    },

    // Nouvelle course : nouvelle boucle, tirée de la graine de la course.
    begin(seed) {
      pattern = buildPattern(seed);
      next = 0;
      active = true;
      if (master) master.gain.setTargetAtTime(gainValue(), ctx.currentTime, 0.05);
    },

    // À appeler à chaque pas du jeu : programme les croches qui arrivent dans LOOKAHEAD.
    update(world) {
      if (!active || !ctx || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      while (next * EIGHTH < world.distance) next++;
      for (;;) {
        const D = next * EIGHTH - world.distance;
        const t = now + timeToDistance(D, world.speed, PHYSICS.SPEED_RAMP, world.speedMax);
        if (t - now > LOOKAHEAD) break;
        playEighth(next, t);
        next++;
      }
    },

    // Fin de partie : la musique s'éteint, rien n'est plus programmé.
    stop() {
      active = false;
      if (master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    },

    // Note ramassée : la gamme monte d'un cran à chaque note.
    note() {
      if (!active || !ctx) return;
      picked++;
      blip(ctx.currentTime, pattern.root * 4 * 2 ** (PENTA[picked % PENTA.length] / 12));
    },

    // Bonus ramassé : arpège montant sur l'accord de la tonique.
    bonus() {
      if (!active || !ctx) return;
      [0, 3, 7, 12].forEach((semis, k) => blip(ctx.currentTime + k * 0.06, pattern.root * 4 * 2 ** (semis / 12), 0.12));
    },

    crash() {
      if (!ctx) return;
      const t = ctx.currentTime;
      noise(t, { type: 'bandpass', freq: 2000, q: 2, dur: 0.35, vol: 0.5, sweepTo: 200 });
    },

    pause() {
      if (ctx && ctx.state === 'running') ctx.suspend();
    },

    resume() {
      if (ctx && ctx.state === 'suspended' && active) ctx.resume();
    },

    isMuted() {
      return muted;
    },

    toggleMute() {
      muted = !muted;
      writeMuted(muted);
      if (master) master.gain.setTargetAtTime(gainValue(), ctx.currentTime, 0.05);
      return muted;
    },
  };
}
