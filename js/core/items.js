import { BEAT_PX } from './obstacles.js';

// Notes ♪ (+10 points) et bonus, posés sur les temps. Ils ont leur propre graine :
// la suite des obstacles reste la même avec ou sans bonus.
export const NOTE_R = 14;
export const BONUS_R = 18;

// duration en secondes ; 0 = effet immédiat (ou jusqu'au prochain choc pour la pochette).
export const BONUSES = {
  gold: { name: "Disque d'or", duration: 10 },
  platform: { name: 'Semelles compensées', duration: 10 },
  ffwd: { name: 'Avance rapide', duration: 0 },
  rocket: { name: 'Ampli-fusée', duration: 6 },
  slow: { name: '33 tours', duration: 0 },
  magnet: { name: 'Micro', duration: 10 },
  disco: { name: 'Boule à facettes', duration: 15 },
  shield: { name: 'Pochette', duration: 0 },
};
const IDS = Object.keys(BONUSES);
export const BONUS_GAP = [25, 40]; // temps entre deux bonus

const GROUND = 24; // hauteur du centre d'une note au sol : prise debout comme en glissade
const BONUS_Y = 40;
const LINE_CHANCE = 0.6;
// Arcs autour de chaque obstacle : décalage en x et hauteur du centre de chaque note.
const ARCS = {
  low: [[-72, 120], [0, 170], [72, 120]],
  tall: [[-72, 190], [0, 222], [72, 190]],
  bar: [[-72, GROUND], [0, GROUND], [72, GROUND]], // sous les caisses : à prendre en glissant
};

const gapOf = (rand) => BONUS_GAP[0] + Math.floor(rand() * (BONUS_GAP[1] - BONUS_GAP[0] + 1));

export function createItemGen(withBonuses, rand) {
  return { prevBeat: null, nextBonus: withBonuses ? gapOf(rand) : Infinity };
}

// Objets liés à un nouvel obstacle : ligne de notes au sol dans l'écart qui le précède,
// arc de notes autour de lui, et le bonus s'il tombe dans cet écart.
// centerX : abscisse du centre du joueur quand distance = 0.
export function itemsFor(gen, rand, ob, centerX) {
  if (!Number.isFinite(ob.beat)) return [];
  const at = (beat) => beat * BEAT_PX + centerX;
  const out = [];
  const line = rand() < LINE_CHANCE;
  for (let b = gen.prevBeat === null ? 2 : gen.prevBeat + 1; b < ob.beat; b++) {
    if (b >= gen.nextBonus) {
      out.push({ kind: 'bonus', id: IDS[Math.floor(rand() * IDS.length)], x: at(b), y: BONUS_Y, r: BONUS_R });
      gen.nextBonus = b + gapOf(rand);
    } else if (line) {
      out.push({ kind: 'note', x: at(b), y: GROUND, r: NOTE_R });
    }
  }
  if (gen.nextBonus === ob.beat) gen.nextBonus++; // jamais sur l'obstacle : décalé au temps suivant
  for (const [dx, y] of ARCS[ob.type]) out.push({ kind: 'note', x: at(ob.beat) + dx, y, r: NOTE_R });
  gen.prevBeat = ob.beat;
  return out;
}
