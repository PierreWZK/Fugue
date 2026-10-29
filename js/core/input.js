// Clavier : Espace / flèche haut = sauter, flèche bas = glisser.
// Tactile et souris : moitié gauche du jeu = sauter, moitié droite = glisser.
// Le clavier n'est écouté que sur le canvas (focus), pour que la page défile normalement ailleurs.
const ACTION_OF_KEY = { Space: 'jump', ArrowUp: 'jump', ArrowDown: 'slide' };

export function createInput(canvas, win) {
  const keys = new Set();
  const pointers = new Map();
  let jumpPressed = false;

  const sideOf = (e) => {
    const r = canvas.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2 ? 'jump' : 'slide';
  };

  const isHeld = (action) =>
    [...keys].some((code) => ACTION_OF_KEY[code] === action) || [...pointers.values()].includes(action);

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus({ preventScroll: true });
    const side = sideOf(e);
    pointers.set(e.pointerId, side);
    if (side === 'jump') jumpPressed = true;
  });

  const release = (e) => pointers.delete(e.pointerId);
  win.addEventListener('pointerup', release);
  win.addEventListener('pointercancel', release);

  canvas.addEventListener('keydown', (e) => {
    if (!(e.code in ACTION_OF_KEY)) return;
    e.preventDefault();
    if (ACTION_OF_KEY[e.code] === 'jump' && !keys.has(e.code)) jumpPressed = true;
    keys.add(e.code);
  });
  canvas.addEventListener('keyup', (e) => keys.delete(e.code));

  // Évite une touche ou un doigt « coincés » quand le jeu perd le focus.
  const clear = () => {
    keys.clear();
    pointers.clear();
  };
  canvas.addEventListener('blur', clear);
  win.addEventListener('blur', clear);

  return {
    // Renvoie l'état du pas courant. Le saut ponctuel n'est donné qu'une fois.
    snapshot() {
      const out = { jumpPressed, jumpHeld: isHeld('jump'), slideHeld: isHeld('slide') };
      jumpPressed = false;
      return out;
    },
  };
}
