// Un temps musical = BEAT_PX de course. Le tempo suit la vitesse (voir world.js),
// donc un obstacle posé sur un multiple de BEAT_PX arrive toujours sur un temps.
export const BEAT_PX = 216;

// x/w en pixels de monde ; y = bas de l'obstacle au-dessus du sol, h = hauteur.
// Tailles calées sur les images (caisses de 48 px, voir render.js).
export const TYPES = {
  low: { w: 48, y: 0, h: 48 }, // un ampli : petit saut
  tall: { w: 48, y: 0, h: 192 }, // mur de quatre amplis : saut long (appui maintenu)
  bar: { w: 48, y: 52, h: 600 }, // caisses suspendues : glisser dessous
};

const INTRO_BEATS = 8;
// Vitesse à laquelle les écarts ci-dessous ont été réglés. Plus vite, les écarts grandissent d'autant.
const TUNED_SPEED = 660;

// Écart minimal en temps entre deux obstacles, réglé pour rester franchissable à la vitesse max
// (vérifié par le bot de tests/fairness.test.js). Un saut long couvre environ 3 temps.
function minGap(prev, next) {
  if (prev === 'tall' || next === 'tall') return 4;
  if (prev === 'bar' && next === 'bar') return 2;
  return 3;
}

// Difficulté de 0 à 1 selon le temps atteint.
export function difficulty(beat) {
  return Math.min(1, beat / 240);
}

function pickType(rand, d) {
  const r = rand();
  if (d < 0.08) return 'low';
  if (r < 0.15 + 0.15 * d) return 'tall';
  if (r < 0.45 + 0.1 * d) return 'bar';
  return 'low';
}

export function createGenerator() {
  return { nextBeat: INTRO_BEATS, prevType: null };
}

// Produit le prochain obstacle et avance le générateur.
// speedAt(px) : vitesse prévue à cette distance (sans bonus), pour garder chaque obstacle franchissable.
export function nextObstacle(gen, rand, playerX, speedAt = () => 0) {
  const d = difficulty(gen.nextBeat);
  const type = pickType(rand, d);
  if (gen.prevType) {
    const k = Math.max(1, speedAt((gen.nextBeat + 3) * BEAT_PX) / TUNED_SPEED);
    const lo = Math.ceil(minGap(gen.prevType, type) * k - 1e-9);
    const hi = Math.max(lo, Math.round((6 - 3 * d) * k));
    gen.nextBeat += lo + Math.floor(rand() * (hi - lo + 1));
  }
  const beat = gen.nextBeat;
  gen.prevType = type;
  // Le bord gauche atteint l'avant du joueur exactement quand distance = beat * BEAT_PX.
  return { type, beat, x: beat * BEAT_PX + playerX, ...TYPES[type] };
}
