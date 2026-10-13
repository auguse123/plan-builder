/**
 * L'AIMANT ENTRE OBJETS : ce qu'on glisse s'arrête contre ce qui est posé.
 *
 * La grille aligne sur le vide ; un plan s'aligne sur ses voisins. Une table
 * poussée contre un mur doit s'y coller sans qu'on vise au centimètre, un
 * bureau glissé à côté d'un autre doit tomber dans son alignement. Comme dans
 * Rayon : le geste reste libre, et à quelques pixels d'un bon endroit il
 * marque un temps — on sent le bord, on lâche, c'est collé.
 *
 * DES REPÈRES, PAS DES OBJETS. Chaque objet se résume en droites verticales
 * (`x`) et horizontales (`y`) : bords et axe d'un rectangle, faces et axe d'un
 * mur droit, sommets d'un tracé. Ce qu'on glisse a les siens ; on cherche,
 * par axe, la paire la plus proche sous le seuil, et on corrige le décalage de
 * l'écart. Bord contre face = contact, axe contre axe = alignement : une seule
 * règle couvre les deux.
 *
 * Le seuil se donne en unités de plan, mesuré à l'écran par l'appelant : zoomé,
 * 8 pixels font un centimètre, dézoomé un mètre — l'aimant suit l'œil.
 *
 * Unités de plan (1 = 10 cm), aucun pixel, aucun React.
 */
import { EPAISSEUR_TRAIT, epaisseurDe } from './epaisseurs.js';

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

/** La boîte droite d'un rectangle tourné autour de son centre. */
export function boiteTournee(o) {
  const x = nombre(o?.x); const y = nombre(o?.y);
  const l = nombre(o?.l); const h = nombre(o?.h);
  const cx = x + l / 2; const cy = y + h / 2;
  const a = (nombre(o?.rot) * Math.PI) / 180;
  const c = Math.abs(Math.cos(a)); const s = Math.abs(Math.sin(a));
  const demiL = (l * c + h * s) / 2;
  const demiH = (l * s + h * c) / 2;
  const r = (v) => Math.round(v * 100) / 100;
  return { x0: r(cx - demiL), y0: r(cy - demiH), x1: r(cx + demiL), y1: r(cy + demiH), cx, cy };
}

/**
 * Les repères d'un ensemble d'objets.
 *
 * `x` porte des droites verticales `{v, a, b}` : à l'abscisse `v`, de `a` à
 * `b` en ordonnée — l'étendue sert à tracer le guide jusqu'à l'objet visé.
 *
 * @param {{rectangles?:Array, murs?:Array, epaisseurs?:Array}} contenu
 * @returns {{x:Array, y:Array}}
 */
export function reperesDe({ rectangles = [], murs = [], epaisseurs = [] } = {}) {
  const x = [];
  const y = [];
  for (const o of rectangles || []) {
    if (!o || !Number.isFinite(Number(o.x))) continue;
    const b = boiteTournee(o);
    for (const v of [b.x0, b.cx, b.x1]) x.push({ v, a: b.y0, b: b.y1 });
    for (const v of [b.y0, b.cy, b.y1]) y.push({ v, a: b.x0, b: b.x1 });
  }
  (murs || []).forEach((mur, i) => {
    const pts = Array.isArray(mur) ? mur : [];
    const h = (epaisseurs == null ? EPAISSEUR_TRAIT : epaisseurDe(epaisseurs, i)) / 2;
    for (const [px, py] of pts) {
      x.push({ v: nombre(px), a: nombre(py), b: nombre(py) });
      y.push({ v: nombre(py), a: nombre(px), b: nombre(px) });
    }
    for (let j = 0; j < pts.length - 1; j += 1) {
      const [ax, ay] = pts[j].map(Number);
      const [bx, by] = pts[j + 1].map(Number);
      // Un mur droit offre ses DEUX FACES : c'est contre elles qu'une table se
      // pousse, pas contre l'axe caché dans l'épaisseur.
      if (Math.abs(ax - bx) < 1e-6 && ay !== by) {
        const a = Math.min(ay, by); const b = Math.max(ay, by);
        for (const v of [ax - h, ax, ax + h]) x.push({ v, a, b });
      } else if (Math.abs(ay - by) < 1e-6 && ax !== bx) {
        const a = Math.min(ax, bx); const b = Math.max(ax, bx);
        for (const v of [ay - h, ay, ay + h]) y.push({ v, a, b });
      }
    }
  });
  return { x, y };
}

/** La meilleure paire d'un axe sous le seuil : `{ecart, fixe, mobile}` ou null. */
function meilleure(mobiles, fixes, decale, seuil) {
  let mieux = null;
  for (const m of mobiles) {
    const v = m.v + decale;
    for (const f of fixes) {
      const e = f.v - v;
      if (Math.abs(e) <= seuil && (!mieux || Math.abs(e) < Math.abs(mieux.ecart))) {
        mieux = { ecart: e, fixe: f, mobile: m };
      }
    }
  }
  return mieux;
}

/**
 * Le décalage aimanté d'un lot, et les guides à montrer.
 *
 * Chaque axe se règle seul : un bureau peut se coller au mur de gauche tout en
 * glissant librement de haut en bas. `x`/`y` disent quels axes ont pris —
 * l'appelant n'y repose PAS la grille, sinon le cran défait le contact.
 *
 * @param {{x:Array,y:Array}} mobiles repères de ce qu'on glisse, avant décalage.
 * @param {{x:Array,y:Array}} fixes repères de ce qui reste en place.
 * @param {{dx:number,dy:number}} d le décalage brut du pointeur.
 * @param {number} seuil portée, en unités de plan.
 */
export function aimanterLot(mobiles, fixes, d = {}, seuil = 0) {
  let dx = nombre(d.dx);
  let dy = nombre(d.dy);
  const s = Math.max(0, nombre(seuil));
  if (!s || !mobiles || !fixes) return { dx, dy, x: false, y: false, guides: [] };
  const px = meilleure(mobiles.x || [], fixes.x || [], dx, s);
  const py = meilleure(mobiles.y || [], fixes.y || [], dy, s);
  const r = (v) => Math.round(v * 100) / 100;
  if (px) dx = r(dx + px.ecart);
  if (py) dy = r(dy + py.ecart);
  const guides = [];
  if (px) {
    const { fixe, mobile } = px;
    guides.push({
      x1: fixe.v, x2: fixe.v,
      y1: Math.min(fixe.a, mobile.a + dy), y2: Math.max(fixe.b, mobile.b + dy),
    });
  }
  if (py) {
    const { fixe, mobile } = py;
    guides.push({
      y1: fixe.v, y2: fixe.v,
      x1: Math.min(fixe.a, mobile.a + dx), x2: Math.max(fixe.b, mobile.b + dx),
    });
  }
  return { dx, dy, x: Boolean(px), y: Boolean(py), guides };
}

/**
 * Un point aimanté sur les repères — pour tirer un coin ou tracer un cadre.
 * Même règle qu'un lot d'un seul point.
 */
export function aimanterPoint(point, fixes, seuil = 0) {
  const p = { x: [{ v: 0, a: 0, b: 0 }], y: [{ v: 0, a: 0, b: 0 }] };
  const r = aimanterLot(p, fixes, { dx: nombre(point?.x), dy: nombre(point?.y) }, seuil);
  return { x: r.dx, y: r.dy, guides: r.guides, colle: r.x || r.y };
}

/**
 * Un tracé touche-t-il un rectangle ? Un sommet dedans, ou un segment qui en
 * croise un bord. C'est la sélection « qui traverse » : tirée de droite à
 * gauche, la bande prend tout mur qu'elle effleure, sans l'englober.
 */
export function traceTouche(points = [], r = {}) {
  const x0 = nombre(r.x); const y0 = nombre(r.y);
  const x1 = x0 + nombre(r.l); const y1 = y0 + nombre(r.h);
  const dedans = ([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const pts = Array.isArray(points) ? points : [];
  if (pts.some(dedans)) return true;
  const croise = (a, b, c, d) => {
    const o = (p, q, s) => Math.sign((q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0]));
    return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
  };
  const bords = [
    [[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]],
  ];
  for (let j = 0; j < pts.length - 1; j += 1) {
    if (bords.some(([c, d]) => croise(pts[j], pts[j + 1], c, d))) return true;
  }
  return false;
}

/**
 * Un meuble poussé contre un mur DE BIAIS pivote à son angle et s'y colle.
 *
 * Les repères ne sont que verticaux et horizontaux : un mur oblique n'en donne
 * pas, et un bureau glissé contre lui restait droit, un coin dans la cloison.
 * Ici, pour chaque segment oblique, on prend l'angle du mur au quart de tour
 * le plus proche de celui du meuble (il garde son sens), on mesure la distance
 * de son centre à la face, et si l'écart tient sous le seuil on le pose à plat.
 *
 * @param {{x:number, y:number, l:number, h:number, rot?:number}} objet
 * @returns {{dx:number, dy:number, rot:number, guide:object}|null} `guide` : la face, en ligne.
 */
export function collerAuBiais(objet, murs = [], epaisseurs = [], d = {}, seuil = 0) {
  const s = Math.max(0, nombre(seuil));
  if (!s || !objet) return null;
  const l = nombre(objet.l); const h = nombre(objet.h);
  const dx = nombre(d.dx); const dy = nombre(d.dy);
  const cx = nombre(objet.x) + l / 2 + dx; const cy = nombre(objet.y) + h / 2 + dy;
  const rot0 = ((nombre(objet.rot) % 360) + 360) % 360;
  const ecartAngle = (a, b) => { const v = Math.abs(a - b) % 360; return Math.min(v, 360 - v); };
  let mieux = null;
  (murs || []).forEach((ligne, k) => {
    const pts = (ligne || []).map((p) => ({ x: nombre(p?.[0]), y: nombre(p?.[1]) }));
    const demi = epaisseurDe(epaisseurs, k) / 2;
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1]; const b = pts[i];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L < 1e-6) continue;
      const theta = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const reste = ((theta % 90) + 90) % 90;
      if (reste < 0.5 || reste > 89.5) continue;
      const ux = (b.x - a.x) / L; const uy = (b.y - a.y) / L;
      const t = (cx - a.x) * ux + (cy - a.y) * uy;
      if (t < 0 || t > L) continue;
      let rot = 0; let quart = 0;
      for (let q = 0; q < 4; q += 1) {
        const r = Math.round((((theta + q * 90) % 360) + 360) % 360) % 360;
        if (q === 0 || ecartAngle(r, rot0) < ecartAngle(rot, rot0)) { rot = r; quart = q; }
      }
      const e = quart % 2 ? l / 2 : h / 2;
      const dist = (cx - a.x) * -uy + (cy - a.y) * ux;
      const cote = dist < 0 ? -1 : 1;
      const ecart = Math.abs(dist) - (demi + e);
      if (Math.abs(ecart) > s || (mieux && Math.abs(ecart) >= mieux.ecart)) continue;
      const nx = -uy * cote; const ny = ux * cote;
      mieux = {
        ecart: Math.abs(ecart),
        dx: dx - nx * ecart,
        dy: dy - ny * ecart,
        rot,
        guide: {
          x1: a.x + nx * demi, y1: a.y + ny * demi, x2: b.x + nx * demi, y2: b.y + ny * demi,
        },
      };
    }
  });
  if (!mieux) return null;
  const r2 = (v) => Math.round(v * 100) / 100;
  return {
    dx: r2(mieux.dx), dy: r2(mieux.dy), rot: mieux.rot,
    guide: Object.fromEntries(Object.entries(mieux.guide).map(([k, v]) => [k, r2(v)])),
  };
}

/**
 * Un bloc de la bibliothèque aimanté AVANT d'être posé.
 *
 * LE BLOC NE S'AIMANTAIT PAS : il tombait au cran de grille sous le clic,
 * à un pas du mur qu'on visait, et rien ne le montrait avant. Ses formes
 * (les places d'un bench, une salle, un meuble) prennent donc le même aimant
 * qu'un lot qu'on glisse — bords, axes, faces de mur — et, seules, se collent
 * à plat contre un mur de biais. L'appelant dessine le résultat sous le
 * curseur ; le clic pose exactement ce qu'on a vu.
 *
 * @param {Array} formes rectangles `{x,y,l,h,rot?}` déjà calés à la grille.
 * @returns {{formes:Array, guides:Array, colle:boolean}}
 */
export function aimanterPose(formes = [], { fixes = null, murs = [], epaisseurs = [], seuil = 0, biais = 0 } = {}) {
  const liste = Array.isArray(formes) ? formes : [];
  if (!liste.length || !(nombre(seuil) > 0)) return { formes: liste, guides: [], colle: false };
  let a = aimanterLot(reperesDe({ rectangles: liste }), fixes, { dx: 0, dy: 0 }, seuil);
  let rot = null;
  const b = liste.length === 1 && nombre(biais) > 0
    ? collerAuBiais(liste[0], murs, epaisseurs, { dx: 0, dy: 0 }, biais) : null;
  if (b) { a = { dx: b.dx, dy: b.dy, x: true, y: true, guides: [b.guide] }; rot = b.rot; }
  const r = (v) => Math.round(v * 100) / 100;
  return {
    formes: liste.map((f) => ({ ...f, x: r(nombre(f.x) + a.dx), y: r(nombre(f.y) + a.dy), ...(rot != null ? { rot } : {}) })),
    guides: a.guides,
    colle: Boolean(a.x || a.y),
  };
}
