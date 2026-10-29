// Score : points gagnés en course (mètres pondérés par le tempo et le niveau) et notes. Voir world.js.
export const NOTE_POINTS = 10;
export const BEST_KEY = 'fugue-best';

export function metersOf(world) {
  return Math.floor(world.distance / 10);
}

export function scoreOf(world) {
  return Math.floor(world.points);
}

// storage : un objet au format localStorage (getItem / setItem). Peut lever une erreur (navigation privée).
export function loadBest(storage) {
  try {
    const v = Number(storage.getItem(BEST_KEY));
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

// Enregistre le score s'il bat le record. isNew : vrai si le record vient d'être battu.
export function saveIfBest(storage, score) {
  const previous = loadBest(storage);
  if (score <= previous) return { best: previous, isNew: false };
  try {
    storage.setItem(BEST_KEY, String(score));
  } catch {
    // Stockage indisponible : le record tient le temps de la page, sans sauvegarde.
  }
  return { best: score, isNew: true };
}
