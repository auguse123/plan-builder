/**
 * La retouche d'un plan déjà posé — poignées, redimensionnement, sommets.
 * Unités de plan (1 unité = 10 cm), aucun pixel, aucun React.
 *
 * UN PLAN SE CORRIGE PLUS SOUVENT QU'IL NE SE TRACE. La salle est trop petite,
 * la zone déborde d'un mètre, le mur a un sommet de travers : sans retouche, il
 * faut effacer et refaire — et on refait faux. `trace.js` pose, ce module
 * reprend.
 *
 * LA POIGNÉE EST UN COIN, ET LE COIN OPPOSÉ NE BOUGE PAS. Une poignée de côté
 * demanderait huit cas et rendrait le geste ambigu sur un rectangle de trois
 * centimètres à l'écran ; quatre coins suffisent à toute correction, et chacun
 * se lit sans légende.
 *
 * ON NE REDESCEND JAMAIS SOUS `MINI`. Un rectangle de largeur nulle disparaît
 * de l'écran sans disparaître de la base : il devient impossible à rattraper
 * autrement qu'en le supprimant.
 */
import { BORNES, PAS, aimanter, borner } from '@/lib/outils/equipe/plan';

/** Les quatre coins, dans le sens de lecture. `n` = haut, `w` = gauche. */
export const POIGNEES = ['nw', 'ne', 'se', 'sw'];

/** Le plus petit côté qu'on laisse atteindre : 4 unités = 40 cm. */
export const MINI = 4;

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

function rect(r) {
  return {
    x: nombre(r?.x), y: nombre(r?.y), l: nombre(r?.l), h: nombre(r?.h),
  };
}

/** Les quatre poignées d'un rectangle, prêtes à dessiner. */
export function poignees(r) {
  const { x, y, l, h } = rect(r);
  if (l <= 0 || h <= 0) return [];
  return [
    { cle: 'nw', x, y },
    { cle: 'ne', x: x + l, y },
    { cle: 'se', x: x + l, y: y + h },
    { cle: 'sw', x, y: y + h },
  ];
}

/**
 * Le rectangle tiré par une poignée.
 *
 * Le coin opposé tient, le point visé s'aimante sur la grille puis se borne au
 * plan ; le côté ne descend pas sous `MINI`, quitte à ignorer la fin du geste.
 *
 * @returns {{x:number,y:number,l:number,h:number}|null}
 */
export function redimensionner(r, cle, point, options = {}) {
  const base = rect(r);
  if (!POIGNEES.includes(cle)) return null;
  if (base.l <= 0 || base.h <= 0) return null;
  const pas = nombre(options.pas, PAS) || PAS;
  const mini = Math.max(1, nombre(options.mini, MINI));
  const largeur = nombre(options.plan?.largeur, BORNES.taille) || BORNES.taille;
  const hauteur = nombre(options.plan?.hauteur, BORNES.taille) || BORNES.taille;
  const px = borner(aimanter(nombre(point?.x), pas), 0, largeur);
  const py = borner(aimanter(nombre(point?.y), pas), 0, hauteur);

  let x0 = base.x; let y0 = base.y;
  let x1 = base.x + base.l; let y1 = base.y + base.h;
  if (cle.includes('w')) x0 = px; else x1 = px;
  if (cle.includes('n')) y0 = py; else y1 = py;
  if (cle.includes('w')) x0 = Math.min(x0, x1 - mini); else x1 = Math.max(x1, x0 + mini);
  if (cle.includes('n')) y0 = Math.min(y0, y1 - mini); else y1 = Math.max(y1, y0 + mini);
  x0 = borner(x0, 0, largeur - mini); y0 = borner(y0, 0, hauteur - mini);
  x1 = borner(x1, x0 + mini, largeur); y1 = borner(y1, y0 + mini, hauteur);

  return { x: x0, y: y0, l: x1 - x0, h: y1 - y0 };
}

/**
 * La poignée sous le doigt, ou `null`.
 *
 * Sert au clavier et aux tests : à l'écran, chaque poignée est un cercle qu'on
 * clique. Le seuil est en unités de plan, pas en pixels.
 */
export function poigneeProche(r, point, options = {}) {
  const seuil = nombre(options.seuil, 3);
  const p = { x: nombre(point?.x), y: nombre(point?.y) };
  let meilleure = null; let mieux = Infinity;
  for (const poignee of poignees(r)) {
    const d = Math.hypot(poignee.x - p.x, poignee.y - p.y);
    if (d <= seuil && d < mieux) { mieux = d; meilleure = poignee.cle; }
  }
  return meilleure;
}

/**
 * Le sommet d'un mur sous le doigt, ou -1.
 *
 * Un mur fermé a son premier point écrit deux fois ; c'est le premier trouvé
 * qui gagne, et `deplacerSommet` déplacera les deux.
 */
export function sommetProche(mur = [], point, options = {}) {
  const seuil = nombre(options.seuil, 3);
  const p = { x: nombre(point?.x), y: nombre(point?.y) };
  let index = -1; let mieux = Infinity;
  (mur || []).forEach((s, i) => {
    const q = Array.isArray(s) ? { x: nombre(s[0]), y: nombre(s[1]) } : { x: nombre(s?.x), y: nombre(s?.y) };
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d <= seuil && d < mieux) { mieux = d; index = i; }
  });
  return index;
}

/** Le nom qu'on peut vraiment envoyer : coupé à 80, vide refusé. */
export function nomNet(texte) {
  const net = String(texte ?? '').trim().replace(/\s+/g, ' ');
  if (!net) return null;
  return net.slice(0, 80);
}

/**
 * LE CALQUE EST UNE PHOTO, PAS UN OBJET DU PLAN.
 *
 * Il ne s'aimante pas — une image sert à relever ce qu'elle montre, donc elle
 * se cale AU POINT VU, pas au cran le plus proche — et il ne se déforme pas :
 * son rapport tient, sinon tout ce qu'on mesure dessus devient faux d'un côté.
 * Les quatre coins suffisent ; pas de poignée de côté, qui ne pourrait
 * qu'étirer.
 */
const mm = (n) => Math.round(nombre(n) * 100) / 100;

function bornesDe(options) {
  return {
    largeur: nombre(options?.plan?.largeur, BORNES.taille) || BORNES.taille,
    hauteur: nombre(options?.plan?.hauteur, BORNES.taille) || BORNES.taille,
  };
}

/**
 * Le calque translaté, recollé dans la feuille.
 *
 * Une image plus grande que la feuille garde le droit de sortir des deux
 * côtés : la borner à zéro interdirait de regarder son bord droit.
 *
 * @returns {object|null} le calque déplacé, ou `null` s'il n'y en a pas.
 */
export function glisserCalque(calque, d, options = {}) {
  if (!calque?.src) return null;
  const { largeur, hauteur } = bornesDe(options);
  const l = nombre(calque.l);
  const h = nombre(calque.h);
  if (l <= 0 || h <= 0) return null;
  const tenir = (v, reste) => borner(v, Math.min(0, reste), Math.max(0, reste));
  return {
    ...calque,
    x: mm(tenir(nombre(calque.x) + nombre(d?.dx), largeur - l)),
    y: mm(tenir(nombre(calque.y) + nombre(d?.dy), hauteur - h)),
  };
}

/**
 * Le calque tiré par un coin : le coin opposé tient, le rapport aussi.
 *
 * On suit le plus exigeant des deux écarts — l'image COUVRE le point visé
 * plutôt que de s'arrêter avant lui — puis la place restante d'un côté comme
 * de l'autre décide de la taille finale.
 *
 * @returns {object|null} le calque retaillé, ou `null` si le geste n'a rien à
 *   dire (poignée inconnue, calque vide, place insuffisante).
 */
export function etirerCalque(calque, cle, point, options = {}) {
  if (!calque?.src || !POIGNEES.includes(cle)) return null;
  const l0 = nombre(calque.l);
  const h0 = nombre(calque.h);
  if (l0 <= 0 || h0 <= 0) return null;
  const { largeur, hauteur } = bornesDe(options);
  const mini = Math.max(1, nombre(options.mini, MINI));
  const rapport = l0 / h0;

  const ouest = cle.includes('w');
  const nord = cle.includes('n');
  const fixe = {
    x: ouest ? nombre(calque.x) + l0 : nombre(calque.x),
    y: nord ? nombre(calque.y) + h0 : nombre(calque.y),
  };
  const placeL = ouest ? fixe.x : largeur - fixe.x;
  const placeH = nord ? fixe.y : hauteur - fixe.y;
  const plafond = Math.min(placeL, placeH * rapport);
  const plancher = Math.max(mini, mini * rapport);
  if (plafond < plancher) return null;

  const vise = Math.max(
    Math.abs(nombre(point?.x) - fixe.x),
    Math.abs(nombre(point?.y) - fixe.y) * rapport,
  );
  const l = borner(vise, plancher, plafond);
  const h = l / rapport;
  return {
    ...calque,
    x: mm(ouest ? fixe.x - l : fixe.x),
    y: mm(nord ? fixe.y - h : fixe.y),
    l: mm(l),
    h: mm(h),
  };
}
