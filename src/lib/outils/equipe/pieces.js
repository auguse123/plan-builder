/**
 * LES PIÈCES DU PLAN : ce que les murs enferment, et sa surface.
 *
 * On ne dessine pas une pièce, on dessine des murs — quatre tracés séparés,
 * une cloison posée en T, un couloir qui en ferme deux. La pièce se DÉDUIT :
 * les axes des murs forment un graphe plan, chaque face bornée est une pièce.
 * Rayon affiche la surface de chacune ; un plan de bureaux se lit en m².
 *
 * UN BOUT DE CLOISON POSÉ SUR LA FACE d'un mur épais n'en touche pas l'axe :
 * il s'arrête une demi-épaisseur avant. On le prolonge donc jusqu'au pied sur
 * l'axe voisin (un « raccord »), sinon la pièce resterait ouverte d'un
 * centimètre et ne serait jamais comptée.
 *
 * LA SURFACE EST NETTE : l'aire entre axes, moins la demi-épaisseur des murs
 * le long du contour. C'est celle qu'on mesure au sol, au coin près.
 *
 * Unités de plan (1 = 10 cm), aucun pixel, aucun React.
 */
import { epaisseurDe } from './epaisseurs.js';

const TOL = 0.05;
const JEU = 0.3;
const AIRE_MINI = 1;

const cle = (p) => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`;

function segmentsDe(murs, epaisseurs) {
  const segs = [];
  (murs || []).forEach((ligne, k) => {
    const pts = (ligne || []).map((p) => ({ x: Number(p?.[0]) || 0, y: Number(p?.[1]) || 0 }));
    const demi = epaisseurDe(epaisseurs, k) / 2;
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1]; const b = pts[i];
      if (Math.hypot(b.x - a.x, b.y - a.y) < TOL) continue;
      segs.push({ a, b, demi, mur: k, rang: i - 1, coupes: [0, 1] });
    }
  });
  return segs;
}

function croisement(s, t) {
  const rx = s.b.x - s.a.x; const ry = s.b.y - s.a.y;
  const qx = t.b.x - t.a.x; const qy = t.b.y - t.a.y;
  const den = rx * qy - ry * qx;
  if (Math.abs(den) < 1e-9) return null;
  const wx = t.a.x - s.a.x; const wy = t.a.y - s.a.y;
  const u = (wx * qy - wy * qx) / den;
  const v = (wx * ry - wy * rx) / den;
  const e = 1e-6;
  return u > e && u < 1 - e && v > e && v < 1 - e ? { u, v } : null;
}

function pied(p, s) {
  const dx = s.b.x - s.a.x; const dy = s.b.y - s.a.y;
  const L2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / L2));
  const f = { x: s.a.x + dx * t, y: s.a.y + dy * t };
  return { t, f, d: Math.hypot(p.x - f.x, p.y - f.y) };
}

function pointDe(s, t) {
  return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
}

/** Le graphe des axes : nœuds, arêtes (avec leur demi-épaisseur). */
function graphe(murs, epaisseurs) {
  const segs = segmentsDe(murs, epaisseurs);
  for (let i = 0; i < segs.length; i += 1) {
    for (let j = i + 1; j < segs.length; j += 1) {
      const c = croisement(segs[i], segs[j]);
      if (c) { segs[i].coupes.push(c.u); segs[j].coupes.push(c.v); }
    }
  }
  const raccords = [];
  // Les bouts libres : chaque extrémité de tracé ouvert.
  (murs || []).forEach((ligne, k) => {
    const n = (ligne || []).length;
    if (n < 2) return;
    const debut = { x: Number(ligne[0][0]), y: Number(ligne[0][1]) };
    const fin = { x: Number(ligne[n - 1][0]), y: Number(ligne[n - 1][1]) };
    if (Math.hypot(debut.x - fin.x, debut.y - fin.y) < TOL) return;
    [[debut, 0], [fin, n - 2]].forEach(([p, rang]) => {
      let mieux = null;
      for (const s of segs) {
        if (s.mur === k && s.rang === rang) continue;
        const r = pied(p, s);
        if (r.d > s.demi + JEU) continue;
        if (!mieux || r.d < mieux.r.d) mieux = { s, r };
      }
      if (!mieux) return;
      mieux.s.coupes.push(mieux.r.t);
      if (mieux.r.d > TOL) raccords.push({ a: p, b: mieux.r.f });
    });
  });
  const noeuds = new Map();
  const noeud = (p) => {
    const c = cle(p);
    if (!noeuds.has(c)) noeuds.set(c, { x: p.x, y: p.y, voisins: new Map() });
    return c;
  };
  const lier = (p, q, demi) => {
    const u = noeud(p); const v = noeud(q);
    if (u === v) return;
    const du = noeuds.get(u).voisins; const dv = noeuds.get(v).voisins;
    du.set(v, Math.max(du.get(v) ?? 0, demi));
    dv.set(u, Math.max(dv.get(u) ?? 0, demi));
  };
  for (const s of segs) {
    const ts = [...new Set(s.coupes.map((t) => Math.round(t * 1e6) / 1e6))].sort((x, y) => x - y);
    for (let i = 1; i < ts.length; i += 1) lier(pointDe(s, ts[i - 1]), pointDe(s, ts[i]), s.demi);
  }
  for (const r of raccords) lier(r.a, r.b, 0);
  // Les bouts qui ne ferment rien s'élaguent : un couloir ouvert n'est pas une pièce.
  let elague = true;
  while (elague) {
    elague = false;
    for (const [c, n] of noeuds) {
      if (n.voisins.size > 1) continue;
      for (const v of n.voisins.keys()) noeuds.get(v)?.voisins.delete(c);
      noeuds.delete(c);
      elague = true;
    }
  }
  return noeuds;
}

function dedans(p, poly) {
  let oui = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i]; const b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) oui = !oui;
  }
  return oui;
}

/** Le point où poser l'étiquette : dedans, et loin des murs. */
function centreLisible(poly) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const p of poly) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  const marge = (p) => {
    let m = Infinity;
    for (let i = 0; i < poly.length; i += 1) {
      const s = { a: poly[i], b: poly[(i + 1) % poly.length] };
      if (Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) > 0) m = Math.min(m, pied(p, s).d);
    }
    return m;
  };
  let mieux = null;
  const N = 16;
  for (let i = 0; i <= N; i += 1) {
    for (let j = 0; j <= N; j += 1) {
      const p = { x: x0 + ((x1 - x0) * i) / N, y: y0 + ((y1 - y0) * j) / N };
      if (!dedans(p, poly)) continue;
      const m = marge(p);
      if (!mieux || m > mieux.m) mieux = { p, m };
    }
  }
  return mieux ? mieux.p : { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

/**
 * Les cotes intérieures d'une pièce droite : largeur × profondeur NETTES, en m.
 * Les nœuds alignés (un T de cloison) se fondent d'abord ; il reste quatre
 * côtés d'équerre, ou la pièce n'a pas de cotes — une pièce en L se lit à la
 * surface, pas à deux nombres.
 */
function cotesDe(cycle, noeuds) {
  const cotes = [];
  cycle.forEach(([a, b]) => {
    const p = noeuds.get(a); const q = noeuds.get(b);
    const demi = p.voisins.get(b) || 0;
    const der = cotes[cotes.length - 1];
    if (der && Math.abs((der.q.x - der.p.x) * (q.y - p.y) - (der.q.y - der.p.y) * (q.x - p.x)) < 1e-6) {
      der.q = q; der.demi = Math.max(der.demi, demi);
    } else cotes.push({ p, q, demi });
  });
  const pr = cotes[0]; const de = cotes[cotes.length - 1];
  if (cotes.length > 1
    && Math.abs((de.q.x - de.p.x) * (pr.q.y - pr.p.y) - (de.q.y - de.p.y) * (pr.q.x - pr.p.x)) < 1e-6) {
    pr.p = de.p; pr.demi = Math.max(pr.demi, de.demi); cotes.pop();
  }
  if (cotes.length !== 4) return null;
  const verticaux = cotes.filter((c) => Math.abs(c.p.x - c.q.x) < TOL);
  const horizontaux = cotes.filter((c) => Math.abs(c.p.y - c.q.y) < TOL);
  if (verticaux.length !== 2 || horizontaux.length !== 2) return null;
  const l = Math.abs(verticaux[0].p.x - verticaux[1].p.x) - verticaux[0].demi - verticaux[1].demi;
  const h = Math.abs(horizontaux[0].p.y - horizontaux[1].p.y) - horizontaux[0].demi - horizontaux[1].demi;
  if (l <= 0 || h <= 0) return null;
  return { l: Math.round(l * 10) / 100, h: Math.round(h * 10) / 100 };
}

/**
 * Les pièces fermées par les murs.
 * @returns {Array<{contour:number[][], aire:number, brute:number, centre:{x:number,y:number},
 *   cotes:{l:number,h:number}|null}>}
 *   `aire` nette en m² (demi-murs déduits), `brute` entre axes, `cotes` en m.
 */
export function piecesDuPlan(murs = [], epaisseurs = []) {
  const noeuds = graphe(murs, epaisseurs);
  const ordre = new Map();
  for (const [c, n] of noeuds) {
    ordre.set(c, [...n.voisins.keys()].sort((u, v) => {
      const a = noeuds.get(u); const b = noeuds.get(v);
      return Math.atan2(a.y - n.y, a.x - n.x) - Math.atan2(b.y - n.y, b.x - n.x);
    }));
  }
  const vus = new Set();
  const pieces = [];
  for (const [u0] of noeuds) {
    for (const v0 of ordre.get(u0)) {
      if (vus.has(`${u0}|${v0}`)) continue;
      const cycle = [];
      let u = u0; let v = v0; let garde = 0;
      while (!vus.has(`${u}|${v}`) && garde < 10000) {
        vus.add(`${u}|${v}`);
        cycle.push([u, v]);
        const l = ordre.get(v);
        const w = l[(l.indexOf(u) - 1 + l.length) % l.length];
        u = v; v = w; garde += 1;
      }
      const poly = cycle.map(([a]) => noeuds.get(a));
      let somme = 0; let bord = 0;
      cycle.forEach(([a, b]) => {
        const p = noeuds.get(a); const q = noeuds.get(b);
        somme += p.x * q.y - q.x * p.y;
        bord += Math.hypot(q.x - p.x, q.y - p.y) * (p.voisins.get(b) || 0);
      });
      // Sens positif = face bornée ; la face extérieure tourne à l'envers.
      if (somme <= 0) continue;
      const brute = somme / 2 / 100;
      if (brute < AIRE_MINI) continue;
      const r = (x) => Math.round(x * 100) / 100;
      pieces.push({
        contour: poly.map((p) => [r(p.x), r(p.y)]),
        brute: r(brute),
        aire: r(Math.max(0, brute - bord / 100)),
        centre: (({ x, y }) => ({ x: r(x), y: r(y) }))(centreLisible(poly)),
        cotes: cotesDe(cycle, noeuds),
      });
    }
  }
  return pieces;
}

/**
 * Les métrés du plan : surface des pièces, linéaire de murs, m² par poste.
 * @param {Array} pieces sortie de `piecesDuPlan`
 * @returns {{surface:number, lineaire:number, parPoste:number|null}}
 */
export function metresDuPlan(murs = [], pieces = [], postes = 0) {
  let lineaire = 0;
  for (const s of segmentsDe(murs, [])) lineaire += Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
  const surface = (pieces || []).reduce((t, p) => t + (Number(p?.aire) || 0), 0);
  const n = Math.max(0, Math.floor(Number(postes) || 0));
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    surface: r1(surface),
    lineaire: r1(lineaire / 10),
    parPoste: n && surface ? r1(surface / n) : null,
  };
}
