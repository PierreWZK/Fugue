import { PHYSICS, POWER } from './world.js';
import { BONUSES } from './items.js';

export const VIEW = { W: 960, H: 360, GROUND_PX: 60 };

const C = {
  walnut: '#3b2417',
  deep: '#1d110a',
  orange: '#e2582b',
  olive: '#6f6a24',
  rust: '#a8431f',
  rope: '#f1e2c4',
  paper: '#f1e2c4',
  mustard: '#e9a93a',
};

// Bonus dessinés en petits vinyles : couleur de l'étiquette, symbole et couleur du symbole.
const LOOK = {
  gold: { label: C.mustard, glyph: '★', ink: C.deep },
  platform: { label: C.orange, glyph: '⇧', ink: C.paper },
  ffwd: { label: C.paper, glyph: '»', ink: C.deep },
  rocket: { label: C.rust, glyph: '▲', ink: C.paper },
  slow: { label: C.olive, glyph: '33', ink: C.paper },
  magnet: { label: C.orange, glyph: '◎', ink: C.paper },
  disco: { label: C.paper, glyph: '×2', ink: C.deep },
  shield: { label: C.mustard, glyph: '▣', ink: C.deep },
};

// Images CC0 préparées par scripts/build-assets.py (sources et licences dans CREDITS.md).
function load(name) {
  const img = new Image();
  img.src = new URL(`../../assets/game/${name}.png`, import.meta.url).href;
  return img;
}
const IMG = {
  bg: [1, 2, 3, 4, 5].map((i) => load(`bg${i}`)),
  runner: load('runner'),
  crates: ['crate001', 'crate002', 'crate003'].map(load),
  amp: load('amp'),
  amps: ['amp', 'amp-b'].map(load),
  barrier: load('barrier'),
};
const ready = (img) => img.complete && img.naturalWidth > 0;

// Décor : échelle d'affichage des couches et vitesse de chacune (1 = vitesse du sol).
const BG_SCALE = 0.6;
const BG_TOP = -64; // décalage vertical : les dunes proches arrivent juste derrière le coureur
const BG_SPEED = [0.04, 0.12, 0.25, 0.45, 0.7];
const GROOVE_PERIOD = 90;

// Planche du coureur : cases de 96×128, pieds en bas de case.
const FRAME = { W: 96, H: 128 };
const POSE = { run: [0, 1, 2], jump: 3, fall: 4, slide: 5, hurt: 6 };
// Le sprite debout (≈ 95 px utiles) est réduit à la hauteur de la boîte du joueur.
const RUNNER_SCALE = PHYSICS.PLAYER_H / 95;
const RUN_STRIDE = 42; // pixels de course par image d'animation

function drawBackground(ctx, distance) {
  BG_SPEED.forEach((speed, i) => {
    const img = IMG.bg[i];
    if (!ready(img)) return;
    const w = img.naturalWidth * BG_SCALE;
    const h = img.naturalHeight * BG_SCALE;
    const off = (distance * speed) % w;
    for (let x = -off; x < VIEW.W; x += w) ctx.drawImage(img, x, BG_TOP, w + 1, h);
  });
}

function drawGround(ctx, groundY, distance) {
  const { W, H } = VIEW;
  ctx.fillStyle = C.walnut;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = C.orange;
  ctx.fillRect(0, groundY, W, 3);

  // Sillon de disque : lignes qui filent, plus vite au premier plan.
  const lines = 6;
  for (let k = 1; k <= lines; k++) {
    const t = k / lines;
    const y = groundY + 6 + (H - groundY - 6) * t * t;
    const off = (distance * (0.8 + 0.4 * t)) % GROOVE_PERIOD;
    ctx.fillStyle = k % 2 ? C.rust : C.olive;
    for (let x = -off; x < W; x += GROOVE_PERIOD) ctx.fillRect(x, y, 50, 2);
  }
}

function drawStack(ctx, imgs, x, bottom, count, seed) {
  for (let k = 0; k < count; k++) {
    const img = imgs[(seed + k) % imgs.length];
    if (ready(img)) ctx.drawImage(img, x, bottom - (k + 1) * 48, 48, 48);
  }
}

function drawObstacle(ctx, o, groundY, distance) {
  const x = Math.round(o.x - distance);
  if (x > VIEW.W || x + o.w < 0) return;
  const bottom = groundY - o.y;

  if (o.type === 'low') {
    drawStack(ctx, [IMG.amp], x, bottom, 1, 0);
  } else if (o.type === 'tall') {
    drawStack(ctx, IMG.amps, x, bottom, 4, o.beat); // mur d'amplis
  } else {
    // Caisses suspendues à une corde, terminées par une barrière rayée.
    const barH = 19;
    ctx.fillStyle = C.rope;
    ctx.fillRect(x + 22, 0, 4, bottom);
    if (ready(IMG.barrier)) ctx.drawImage(IMG.barrier, x, bottom - barH, 48, barH);
    drawStack(ctx, IMG.crates, x, bottom - barH, Math.ceil(bottom / 48), o.beat);
  }
}

// Croche : tête ovale, hampe et crochet, moutarde cernée de brun.
function drawNote(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.ellipse(-4, 8, 7, 5, -0.45, 0, Math.PI * 2);
  ctx.rect(1, -14, 3.5, 21);
  ctx.moveTo(4.5, -14);
  ctx.quadraticCurveTo(7, -6, 12, -3);
  ctx.quadraticCurveTo(8, -6, 4.5, -8);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.deep;
  ctx.stroke();
  ctx.fillStyle = C.mustard;
  ctx.fill();
  ctx.restore();
}

function drawToken(ctx, x, y, id, r = 18) {
  const look = LOOK[id];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = C.deep;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(241, 226, 196, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = look.label;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.ink;
  ctx.font = `700 ${Math.round(r * 0.6)}px Rubik, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(look.glyph, 0, 1);
  ctx.restore();
}

function drawItems(ctx, world, groundY) {
  for (const it of world.items) {
    const x = it.x - world.distance;
    if (x < -30 || x > VIEW.W + 30) continue;
    const bob = Math.sin(world.time * 5 + it.x * 0.01) * 3;
    if (it.kind === 'note') drawNote(ctx, x, groundY - it.y + bob);
    else drawToken(ctx, x, groundY - it.y + bob, it.id, it.r * (1 + Math.sin(world.time * 6) * 0.06));
  }
}

// Jauges des bonus actifs, en haut à droite ; la pochette reste pleine jusqu'au choc.
function drawEffects(ctx, fx) {
  const active = Object.keys(LOOK).filter((id) => (id === 'shield' ? fx.shield : fx[id] > 0 && BONUSES[id].duration));
  active.forEach((id, k) => {
    const x = VIEW.W - 190;
    const y = 28 + k * 34;
    drawToken(ctx, x, y, id, 13);
    ctx.font = '600 12px Rubik, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.paper;
    ctx.fillText(BONUSES[id].name, x + 20, y - 3);
    const left = id === 'shield' ? 1 : Math.min(1, fx[id] / BONUSES[id].duration);
    ctx.fillStyle = 'rgba(29, 17, 10, 0.6)';
    ctx.fillRect(x + 20, y + 3, 120, 6);
    ctx.fillStyle = LOOK[id].label;
    ctx.fillRect(x + 20, y + 3, 120 * left, 6);
  });
}

function drawBanner(ctx, banner) {
  if (!banner) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, banner.t / 0.4);
  ctx.font = '700 34px Fraunces, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.deep;
  const text = banner.text;
  ctx.strokeText(text, VIEW.W / 2, 92);
  ctx.fillStyle = C.paper;
  ctx.fillText(text, VIEW.W / 2, 92);
  ctx.restore();
}

function poseOf(p, dead, distance) {
  if (dead) return POSE.hurt;
  if (p.sliding) return POSE.slide;
  if (!p.onGround) return p.vy > 0 ? POSE.jump : POSE.fall;
  return POSE.run[Math.floor(distance / RUN_STRIDE) % POSE.run.length];
}

function drawRunner(ctx, p, groundY, dead, distance, fx, time) {
  if (!ready(IMG.runner)) return;
  const frame = poseOf(p, dead, distance);
  const w = FRAME.W * RUNNER_SCALE;
  const h = FRAME.H * RUNNER_SCALE;
  const cx = p.x + PHYSICS.PLAYER_W / 2;
  const cy = groundY - p.y - PHYSICS.PLAYER_H / 2;
  // Ombre au sol, qui rétrécit avec la hauteur du saut.
  const shadow = Math.max(0.3, 1 - p.y / 260);
  ctx.fillStyle = 'rgba(29, 17, 10, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 2, 22 * shadow, 5 * shadow, 0, 0, Math.PI * 2);
  ctx.fill();

  if (fx.gold) {
    // Disque d'or : halo doré qui pulse.
    const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 58 + Math.sin(time * 10) * 4);
    glow.addColorStop(0, 'rgba(233, 169, 58, 0.75)');
    glow.addColorStop(1, 'rgba(233, 169, 58, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 70, cy - 70, 140, 140);
  }
  if (fx.rocket) {
    // Ampli-fusée : flamme qui vacille sous les pieds.
    const feet = groundY - p.y;
    const len = 26 + Math.sin(time * 40) * 6;
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.moveTo(cx - 12, feet - 4);
    ctx.lineTo(cx, feet + len);
    ctx.lineTo(cx + 12, feet - 4);
    ctx.fill();
    ctx.fillStyle = C.mustard;
    ctx.beginPath();
    ctx.moveTo(cx - 6, feet - 4);
    ctx.lineTo(cx, feet + len * 0.6);
    ctx.lineTo(cx + 6, feet - 4);
    ctx.fill();
  }
  ctx.save();
  // Répit après un choc absorbé ou un saut dans le temps : le coureur clignote.
  if (fx.grace && !fx.gold && !fx.rocket) ctx.globalAlpha = Math.floor(time * 12) % 2 ? 0.35 : 1;
  ctx.drawImage(IMG.runner, frame * FRAME.W, 0, FRAME.W, FRAME.H, cx - w / 2, groundY - p.y - h, w, h);
  ctx.restore();
  if (fx.shield) {
    ctx.strokeStyle = 'rgba(241, 226, 196, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (fx.magnet) {
    ctx.strokeStyle = 'rgba(233, 169, 58, 0.35)';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 60 + ((time * 40) % 30), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Rendu du monde sur le canvas ; le texte (distance, BPM, fin de partie) est en HTML.
export function render(ctx, world) {
  const groundY = VIEW.H - VIEW.GROUND_PX;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = C.deep;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  drawBackground(ctx, world.distance);
  drawGround(ctx, groundY, world.distance);
  for (const o of world.obstacles) drawObstacle(ctx, o, groundY, world.distance);
  drawItems(ctx, world, groundY);
  drawRunner(ctx, world.player, groundY, world.dead, world.distance, world.effects, world.time);
  drawEffects(ctx, world.effects);
  drawBanner(ctx, world.banner);
}
