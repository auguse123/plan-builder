/**
 * LA RETOUCHE D'UN SEGMENT DE MUR : le pousser, ou le couper.
 *
 * Un mur de pièce se corrige d'un côté entier — « la cloison recule de 40 cm »
 * — pas sommet par sommet : tirer deux coins l'un après l'autre déforme la
 * pièce entre les deux gestes. Le segment glisse donc PARALLÈLEMENT à lui-même,
 * ses deux bouts du même pas, le long de sa normale.
 *
 * UNE PIÈCE FERMÉE RESTE FERMÉE : sa polyligne écrit son premier point deux
 * fois (comme `deplacerSommet`) ; pousser le premier ou le dernier segment
 * déplace les deux copies.
 *
 * Un sommet s'INSÈRE au pied du point visé, sur le segment le plus proche :
 * c'est ainsi qu'on fait un décroché dans un mur droit.
 *
 * Unités de plan (1 = 10 cm), aucun React ; le pixel n'entre que par un
 * facteur passé (`poigneeDeSegment`).
 */
import { BORNES, PAS } from '@/lib/outils/equipe/plan';

const r2 = (v) => Math.round(v * 100) / 100;
const borne = (v) => Math.min(Math.max(r2(v), BORNES.min), BORNES.max);

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

function points(mur) {
  return (mur || []).map((p) => (Array.isArray(p)
    ? [nombre(p[0]), nombre(p[1])] : [nombre(p?.x), nombre(p?.y)]));
}

function estBoucle(l) {
  const d = l.length - 1;
  return l.length > 2 && l[0][0] === l[d][0] && l[0][1] === l[d][1];
}

/**
 * Le segment `index` (du point `index` au suivant) poussé du déplacement `d`
 * du pointeur, projeté sur sa normale et calé au `pas`.
 * @returns {number[][]|null} la polyligne, ou null si rien ne bouge.
 */
export function glisserSegment(mur = [], index, d = {}, options = {}) {
  const l = points(mur);
  if (index < 0 || index + 1 >= l.length) return null;
  const [ax, ay] = l[index]; const [bx, by] = l[index + 1];
  const long = Math.hypot(bx - ax, by - ay);
  if (!long) return null;
  const nx = -(by - ay) / long; const ny = (bx - ax) / long;
  const pas = nombre(options.pas, PAS) || PAS;
  const t = Math.round((nombre(d.dx) * nx + nombre(d.dy) * ny) / pas) * pas;
  if (!t) return null;
  const bouge = (p) => [borne(p[0] + nx * t), borne(p[1] + ny * t)];
  const dernier = l.length - 1;
  const boucle = estBoucle(l);
  const res = l.map((p) => [...p]);
  res[index] = bouge(l[index]);
  res[index + 1] = bouge(l[index + 1]);
  if (boucle && index === 0) res[dernier] = [...res[0]];
  if (boucle && index + 1 === dernier) res[0] = [...res[dernier]];
  return res;
}

/** Le pied de `p` sur chaque segment, le plus proche d'abord. */
function piedLePlusProche(l, p) {
  let mieux = null;
  for (let i = 0; i + 1 < l.length; i += 1) {
    const [ax, ay] = l[i]; const [bx, by] = l[i + 1];
    const dx = bx - ax; const dy = by - ay;
    const L2 = dx * dx + dy * dy;
    if (!L2) continue;
    const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / L2));
    const f = [ax + dx * t, ay + dy * t];
    const dist = Math.hypot(p.x - f[0], p.y - f[1]);
    if (!mieux || dist < mieux.dist) mieux = { i, f, dist };
  }
  return mieux;
}

/**
 * Un sommet ajouté au pied de `point` sur le segment le plus proche. Rien
 * d'ajouté trop près d'un sommet existant : un doublon ne se voit pas et
 * casse le segment suivant.
 * @returns {{mur:number[][], sommet:number}|null}
 */
export function insererSommet(mur = [], point = {}, options = {}) {
  const l = points(mur);
  const p = { x: nombre(point.x), y: nombre(point.y) };
  const m = piedLePlusProche(l, p);
  if (!m) return null;
  const mini = nombre(options.mini, 0.5);
  const f = [r2(m.f[0]), r2(m.f[1])];
  const pres = (q) => Math.hypot(q[0] - f[0], q[1] - f[1]) < mini;
  if (pres(l[m.i]) || pres(l[m.i + 1])) return null;
  const res = l.map((q) => [...q]);
  res.splice(m.i + 1, 0, f);
  return { mur: res, sommet: m.i + 1 };
}

/**
 * Où poser la poignée du milieu d'un segment `a`→`b`, `px` = unités par pixel.
 *
 * Au milieu, si le segment tient plus de 24 px à l'écran. En deçà, les deux
 * sommets (5 px de rayon) la recouvraient : elle sort du mur de 16 px, sur
 * sa normale, et `deporte` demande le fil qui la relie au milieu.
 * @returns {{x:number, y:number, milieu:number[], deporte:boolean}|null}
 */
export function poigneeDeSegment(a, b, px = 1) {
  const [[px0, py0], [qx, qy]] = points([a, b]);
  const p = { x: px0, y: py0 }; const q = { x: qx, y: qy };
  const dx = q.x - p.x; const dy = q.y - p.y;
  const l = Math.hypot(dx, dy);
  if (!(l > 0)) return null;
  const u = nombre(px, 1) || 1;
  const milieu = [(p.x + q.x) / 2, (p.y + q.y) / 2];
  if (l > 24 * u) return { x: milieu[0], y: milieu[1], milieu, deporte: false };
  const ecart = 16 * u;
  return { x: milieu[0] - (dy / l) * ecart, y: milieu[1] + (dx / l) * ecart, milieu, deporte: true };
}
