/**
 * ALIGNER, RÉPARTIR, DUPLIQUER EN RÉSEAU : ranger un lot d'un geste.
 *
 * Une rangée de bureaux posés à la main n'est jamais droite : un centimètre
 * ici, trois là, et l'œil le voit sur le plan imprimé. Comme dans Rayon (et
 * tout logiciel de dessin), le lot s'aligne sur son bord le plus avancé et se
 * répartit à intervalles égaux entre ses deux extrêmes, qui ne bougent pas.
 *
 * TOUT SE RAISONNE EN BOÎTES : un bureau tourné occupe sa boîte droite, un mur
 * la sienne. Chaque fonction rend un décalage par objet, dans l'ordre reçu ;
 * c'est l'appelant qui l'applique à ce qu'il sait déplacer.
 *
 * Unités de plan (1 = 10 cm), aucun pixel, aucun React.
 */

export const ALIGNEMENTS = ['gauche', 'centreX', 'droite', 'haut', 'centreY', 'bas'];

const r2 = (v) => Math.round(v * 100) / 100;

function net(b) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return { x0: n(b?.x0), y0: n(b?.y0), x1: n(b?.x1), y1: n(b?.y1) };
}

/**
 * Le décalage qui aligne chaque boîte sur le repère commun du lot.
 * @param {Array<{x0:number,y0:number,x1:number,y1:number}>} boites
 * @param {'gauche'|'centreX'|'droite'|'haut'|'centreY'|'bas'} mode
 * @returns {Array<{dx:number, dy:number}>}
 */
export function alignerBoites(boites = [], mode) {
  const bs = (boites || []).map(net);
  if (bs.length < 2 || !ALIGNEMENTS.includes(mode)) return bs.map(() => ({ dx: 0, dy: 0 }));
  const min = (f) => Math.min(...bs.map(f));
  const max = (f) => Math.max(...bs.map(f));
  const cible = {
    gauche: min((b) => b.x0),
    droite: max((b) => b.x1),
    centreX: (min((b) => b.x0) + max((b) => b.x1)) / 2,
    haut: min((b) => b.y0),
    bas: max((b) => b.y1),
    centreY: (min((b) => b.y0) + max((b) => b.y1)) / 2,
  }[mode];
  const repere = {
    gauche: (b) => b.x0, droite: (b) => b.x1, centreX: (b) => (b.x0 + b.x1) / 2,
    haut: (b) => b.y0, bas: (b) => b.y1, centreY: (b) => (b.y0 + b.y1) / 2,
  }[mode];
  const enX = mode === 'gauche' || mode === 'droite' || mode === 'centreX';
  return bs.map((b) => {
    const e = r2(cible - repere(b));
    return enX ? { dx: e, dy: 0 } : { dx: 0, dy: e };
  });
}

/**
 * Le décalage qui répartit le lot à ESPACES égaux le long d'un axe : les deux
 * extrêmes restent, les autres se placent entre eux, dans leur ordre.
 * Des objets de tailles différentes gardent un vide égal, pas un pas égal.
 * @param {'x'|'y'} axe
 */
export function repartirBoites(boites = [], axe = 'x') {
  const bs = (boites || []).map(net);
  const zero = bs.map(() => ({ dx: 0, dy: 0 }));
  if (bs.length < 3) return zero;
  const [a, b] = axe === 'y' ? ['y0', 'y1'] : ['x0', 'x1'];
  const ordre = bs.map((bx, i) => i).sort((i, j) => bs[i][a] - bs[j][a] || i - j);
  const premier = bs[ordre[0]];
  const fin = Math.max(...bs.map((bx) => bx[b]));
  const pleins = bs.reduce((s, bx) => s + (bx[b] - bx[a]), 0);
  const vide = (fin - premier[a] - pleins) / (bs.length - 1);
  let curseur = premier[a];
  const out = zero.slice();
  for (const i of ordre) {
    const e = r2(curseur - bs[i][a]);
    out[i] = axe === 'y' ? { dx: 0, dy: e } : { dx: e, dy: 0 };
    curseur += bs[i][b] - bs[i][a] + vide;
  }
  return out;
}

/** Les décalages de `n` copies en réseau, au pas donné : k × pas, k = 1..n. */
export function reseau(n, pas = {}) {
  const k = Math.max(0, Math.min(50, Math.floor(Number(n) || 0)));
  const dx = Number(pas.dx) || 0; const dy = Number(pas.dy) || 0;
  if (!dx && !dy) return [];
  return Array.from({ length: k }, (_, i) => ({ dx: r2(dx * (i + 1)), dy: r2(dy * (i + 1)) }));
}
