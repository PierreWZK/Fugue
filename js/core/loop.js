// Pas de temps fixe : la logique avance par pas de 1/60 s, quel que soit le taux d'images de l'écran.
const STEP = 1 / 60;
// Un retard de plus de 0,25 s (onglet gelé) n'est pas rattrapé en entier : évite une spirale de pas.
const MAX_FRAME = 0.25;

export function createLoop({ step, render }) {
  let running = false;
  let raf = 0;
  let last = 0;
  let acc = 0;

  function frame(now) {
    if (!running) return;
    acc += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (acc >= STEP) {
      step(STEP);
      acc -= STEP;
    }
    render();
    raf = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      acc = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
