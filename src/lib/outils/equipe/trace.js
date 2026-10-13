/**
 * Le tracé d'un plan — longueurs, angles, accroches. Toujours en unités de
 * plan (1 unité = 10 cm), aucun pixel, aucun React.
 *
 * DESSINER UN MUR À LA SOURIS DONNE UN PLAN FAUX. Un plateau se mesure au
 * décamètre : « ce mur fait 6,40 m ». L'éditeur doit donc accepter la mesure
 * telle qu'elle est dite — une longueur, un angle — et n'utiliser la souris que
 * pour viser. `versPoint` est cette porte : longueur + cap → point.
 *
 * TROIS AIDES, EMPRUNTÉES AUX ÉDITEURS DE PLAN :
 *
 *   * CONTRAINTE D'ANGLE (`contraindre`) — le cap se colle au multiple choisi.
 *     À 90° on ne trace que des angles droits, ce qui est le cas de 95 % des
 *     cloisons ; à 15° on garde les biais courants ; libre pour le reste.
 *   * ACCROCHE (`accrocher`) — le point se colle à ce qui existe : un sommet,
 *     le milieu d'un segment, le segment lui-même, l'équerre d'un mur voisin,
 *     l'axe d'un sommet. Sans elle, deux murs « qui se touchent » sont à 3 cm
 *     l'un de l'autre, et la pièce n'est jamais fermée.
 *   * COTES (`cotes`) — chaque segment porte sa longueur au milieu, tournée
 *     dans son sens. C'est ce qui rend un plan vérifiable d'un coup d'œil.
 *
 * L'angle est en degrés, 0 = vers la droite, et il CROÎT VERS LE BAS : l'axe y
 * d'un SVG descend. Écrire l'inverse serait plus mathématique et ferait tourner
 * tous les murs dans le mauvais sens.
 */
import { BORNES, PAS, aimanter } from '@/lib/outils/equipe/plan';
import { epaisseurDe } from '@/lib/outils/equipe/epaisseurs';

/**
 * Les pas d'angle offerts, l'angle libre d'abord.
 *
 * ON TRACE LIBRE, PUIS ON CONTRAINT. Un plateau relevé n'est pas d'équerre :
 * imposer 90° au premier trait force à se battre contre l'outil dès le mur du
 * fond. L'accroche, elle, travaille dans les deux cas — et 90° reste à un clic.
 */
export const ANGLES = [0, 90, 45, 15];

/** L'accroche à ce qui existe : 5 unités = 50 cm, la portée de référence. */
export const ACCROCHE = 5;

/**
 * La portée de chaque genre, en unités de plan.
 *
 * UNE ACCROCHE QUI TIRE DE PARTOUT EMPÊCHE DE TRACER. Une portée unique de
 * 80 cm rendait impossible un poteau à 40 cm d'un mur : le point sautait sur le
 * mur quoi qu'on fasse. Le coin, qu'on vise vraiment, garde la portée pleine ;
 * le segment et l'alignement, qui passent sous le doigt par accident, tirent de
 * beaucoup moins loin. `options.seuil` met le tout à l'échelle.
 */
export const PORTEES = {
  sommet: 5, face: 5, milieu: 3, segment: 3, equerre: 3.5, axe: 2.5,
};

/**
 * Les genres d'accroche, du plus fort au plus faible.
 *
 * L'ORDRE EST LA RÈGLE, PAS LA DISTANCE. Un sommet à 7 unités bat un segment à
 * 1 : qui vise un coin veut le coin, pas le mur qui passe devant. C'est la
 * convention de tous les éditeurs de plan, et ce qui rend l'accroche prévisible.
 */
export const ACCROCHES = ['sommet', 'face', 'milieu', 'segment', 'equerre', 'axe'];

/** La tolérance d'équerre, en degrés : au-delà, c'est un biais voulu. */
export const EQUERRE = 5;

/**
 * Les pas de tracé offerts, du centimètre au pas de grille. Échelle 1-2-5 :
 * celle des règles graduées, la seule qui donne des cotes rondes.
 */
export const FINESSES = [0.1, 0.2, 0.5, 1, PAS];

/** Ce qu'un cran de grille et une accroche doivent mesurer À L'ÉCRAN, en px. */
const CRAN_PX = 7;
const ACCROCHE_PX = 16;

/**
 * Le pas et l'accroche à un zoom donné — la précision suit l'œil.
 *
 * UN PAS FIXE MENT À FORT ZOOM. À ×1 le plateau entier tient à l'écran, 20 cm
 * valent trois pixels, et coller à la grille est une aide. Zoomé sur un angle
 * de cloison, ces mêmes 20 cm font un centimètre d'écran : le point qu'on
 * vise, qu'on VOIT, est refusé par un aimant qu'on ne peut plus doser. Même
 * chose pour l'accroche : 50 cm de portée avalent tout un mur quand on
 * travaille au détail.
 *
 * Les deux se choisissent donc en PIXELS : un cran tous les ~7 px, une
 * accroche à ~16 px, quel que soit le zoom. Dézoomé, on retombe sur les
 * valeurs d'avant (`PAS` et `ACCROCHE`) — ce sont les plafonds, jamais
 * dépassés : la grille ne devient pas grossière parce qu'on a reculé.
 *
 * @param {number} unitesParPixel ce que vaut un pixel, de `unitesParPixel`.
 *   0 (rien de mesuré encore) rend le réglage d'avant.
 * @returns {{pas:number, accroche:number}} en unités de plan.
 */
export function finesseDe(unitesParPixel) {
  const u = Math.max(0, nombre(unitesParPixel, 0));
  if (!u) return { pas: PAS, accroche: ACCROCHE };
  const vise = CRAN_PX * u;
  const pas = FINESSES.find((f) => f >= vise) ?? PAS;
  // L'accroche ne descend jamais sous le pas : une portée plus fine que le
  // cran ne rattraperait plus rien, le point tomberait toujours à côté.
  const accroche = Math.min(ACCROCHE, Math.max(pas, ACCROCHE_PX * u));
  return { pas, accroche };
}

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

function xy(p) {
  if (Array.isArray(p)) return { x: nombre(p[0]), y: nombre(p[1]) };
  return { x: nombre(p?.x), y: nombre(p?.y) };
}

/** La longueur d'un segment, en unités de plan. */
export function longueur(a, b) {
  const p = xy(a); const q = xy(b);
  return Math.hypot(q.x - p.x, q.y - p.y);
}

/** Le cap d'un segment en degrés, 0 = est, croissant vers le bas, dans [0, 360[. */
export function cap(a, b) {
  const p = xy(a); const q = xy(b);
  const d = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  return ((d % 360) + 360) % 360;
}

/** Le point à telle distance et tel cap d'une origine — la saisie au clavier. */
export function versPoint(origine, distance, degres) {
  const o = xy(origine);
  const r = Math.max(0, nombre(distance));
  const a = (nombre(degres) * Math.PI) / 180;
  return {
    x: Math.min(Math.max(o.x + r * Math.cos(a), BORNES.min), BORNES.max),
    y: Math.min(Math.max(o.y + r * Math.sin(a), BORNES.min), BORNES.max),
  };
}

/**
 * Le point visé, ramené sur un multiple d'angle et sur le pas de grille.
 *
 * La longueur est aimantée, pas le point d'arrivée : aimanter x et y
 * séparément casserait l'angle qu'on vient d'imposer (un 45° deviendrait un
 * 43°). On garde donc le cap, on arrondit la distance.
 */
export function contraindre(origine, vise, options = {}) {
  const pas = nombre(options.pas, PAS) || PAS;
  const grain = Math.max(0, nombre(options.angle, 90));
  const d = longueur(origine, vise);
  if (d === 0) return { ...xy(origine), longueur: 0, cap: 0 };
  const brut = cap(origine, vise);
  const a = grain ? Math.round(brut / grain) * grain : brut;
  const r = Math.max(pas, aimanter(d, pas));
  const point = versPoint(origine, r, a);
  return { ...point, longueur: r, cap: ((a % 360) + 360) % 360 };
}

/**
 * Le sommet existant assez proche pour qu'on ait voulu le viser.
 *
 * Rend le point accroché, ou le point tel quel. Deux murs qui se rejoignent à
 * 3 cm près ne ferment aucune pièce et se voient à l'impression.
 */
export function accrocher(point, murs = [], options = {}) {
  const seuil = Math.max(0, nombre(options.seuil, ACCROCHE));
  // Le seuil demandé n'est pas une portée : c'est un facteur. Chaque genre
  // garde sa part, et `seuil: 0` coupe l'accroche net (la touche Alt).
  const facteur = seuil / ACCROCHE;
  const portee = (genre) => PORTEES[genre] * facteur;
  const p = xy(point);
  if (!facteur) return { ...p, accroche: false, genre: null };
  const origine = options.origine ? xy(options.origine) : null;
  const sommets = [];
  const segments = [];
  const candidats = [];
  const eps = options.epaisseurs;
  const exclus = (options.reperes || []).map(xy);
  (murs || []).forEach((ligne, k) => {
    const pts = (ligne || []).map(xy);
    const demi = Array.isArray(eps) ? epaisseurDe(eps, k) / 2 : 0;
    for (const q of pts) {
      sommets.push(q);
      if (!exclus.some((e) => e.x === q.x && e.y === q.y)) candidats.push({ x: q.x, y: q.y, genre: 'sommet' });
    }
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1]; const b = pts[i];
      if (a.x === b.x && a.y === b.y) continue;
      segments.push({ a, b, demi });
      candidats.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, genre: 'milieu' });
    }
  });
  // Des points qu'on aligne sans les viser : les voisins d'un sommet tiré.
  for (const q of exclus) sommets.push(q);
  for (const s of segments) {
    candidats.push({ ...pied(p, s.a, s.b), genre: 'segment' });
    // UN MUR ÉPAIS SE TOUCHE PAR SA FACE, pas par son axe : c'est contre la
    // bande qu'on pose le bout d'une cloison, et un point visé à l'axe
    // tomberait au milieu de l'épaisseur, hors de portée de la main.
    if (s.demi > 0) candidats.push({ ...face(p, s.a, s.b, s.demi), genre: 'face' });
  }
  // L'équerre : le cap se cale sur celui d'un mur voisin ou sur sa
  // perpendiculaire — « à 90° de ce tracé-là », pas du repère de l'écran.
  if (origine) {
    const vise = cap(origine, p);
    const d = longueur(origine, p);
    for (const s of segments) {
      const base = cap(s.a, s.b);
      for (const tour of [0, 90, 180, 270]) {
        const a = ((base + tour) % 360 + 360) % 360;
        if (ecartAngle(vise, a) > EQUERRE) continue;
        candidats.push({ ...versPoint(origine, d, a), genre: 'equerre' });
      }
    }
  }
  // L'axe : aligné sur un sommet existant, en x ou en y. C'est le guide qui
  // évite les murs décalés de 4 cm qu'on ne voit qu'à l'impression.
  for (const q of sommets) {
    if (Math.abs(p.x - q.x) <= portee('axe')) candidats.push({ x: q.x, y: p.y, genre: 'axe' });
    if (Math.abs(p.y - q.y) <= portee('axe')) candidats.push({ x: p.x, y: q.y, genre: 'axe' });
  }
  let meilleur = null;
  for (const c of candidats) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d > portee(c.genre)) continue;
    const rang = ACCROCHES.indexOf(c.genre);
    if (!meilleur || rang < meilleur.rang || (rang === meilleur.rang && d < meilleur.d)) {
      meilleur = { ...c, rang, d };
    }
  }
  if (!meilleur) return { ...p, accroche: false, genre: null };
  return {
    x: Math.round(meilleur.x * 100) / 100,
    y: Math.round(meilleur.y * 100) / 100,
    accroche: true,
    genre: meilleur.genre,
  };
}

function pied(p, a, b) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const carre = dx * dx + dy * dy;
  const t = carre ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / carre)) : 0;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/** Le point de la face d'un mur (demi-épaisseur `demi`) du côté de `p`. */
function face(p, a, b, demi) {
  const f = pied(p, a, b);
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const nx = -(b.y - a.y) / L; const ny = (b.x - a.x) / L;
  const cote = (p.x - f.x) * nx + (p.y - f.y) * ny < 0 ? -1 : 1;
  return { x: f.x + nx * cote * demi, y: f.y + ny * cote * demi };
}

function ecartAngle(a, b) {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return Math.min(d, 360 - d);
}

/**
 * Un segment de polyligne rallongé ou raccourci à la mesure dite.
 *
 * LE SEGMENT GARDE SON CAP ET SON DÉPART ; c'est la suite du mur qui se
 * translate. Ne bouger que le point d'arrivée ferait pivoter le segment
 * suivant — on croit corriger un mur, on tord la pièce. Une polyligne fermée le
 * reste : le dernier point revient sur le premier.
 *
 * @returns {Array<[number,number]>|null}
 */
export function changerLongueur(points = [], index, cible) {
  const liste = (points || []).map(xy);
  const i = Math.floor(nombre(index, -1));
  const d = nombre(cible);
  if (i < 0 || i + 1 >= liste.length || d <= 0) return null;
  const a = liste[i];
  const b = liste[i + 1];
  if (longueur(a, b) === 0) return null;
  const arrivee = versPoint(a, d, cap(a, b));
  const dx = arrivee.x - b.x;
  const dy = arrivee.y - b.y;
  const etaitFerme = liste.length > 2
    && liste[0].x === liste[liste.length - 1].x && liste[0].y === liste[liste.length - 1].y;
  const sortie = liste.map((q, j) => (j <= i ? q : {
    x: Math.min(Math.max(q.x + dx, BORNES.min), BORNES.max),
    y: Math.min(Math.max(q.y + dy, BORNES.min), BORNES.max),
  }));
  if (etaitFerme) sortie[sortie.length - 1] = sortie[0];
  return sortie.map((q) => [Math.round(q.x * 100) / 100, Math.round(q.y * 100) / 100]);
}

/** Le segment d'une polyligne le plus proche d'un point, ou -1. */
export function segmentProche(points = [], point, options = {}) {
  const seuil = nombre(options.seuil, 6);
  const liste = (points || []).map(xy);
  const p = xy(point);
  let index = -1; let ecart = seuil;
  for (let i = 1; i < liste.length; i += 1) {
    const f = pied(p, liste[i - 1], liste[i]);
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d <= ecart) { ecart = d; index = i - 1; }
  }
  return index;
}

/** L'angle intérieur en b, entre a-b et b-c, en degrés dans [0, 180]. */
export function angleEntre(a, b, c) {
  const p = xy(a); const q = xy(b); const r = xy(c);
  const u = { x: p.x - q.x, y: p.y - q.y };
  const v = { x: r.x - q.x, y: r.y - q.y };
  const nu = Math.hypot(u.x, u.y); const nv = Math.hypot(v.x, v.y);
  if (!nu || !nv) return 0;
  const cos = Math.min(1, Math.max(-1, (u.x * v.x + u.y * v.y) / (nu * nv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Le périmètre d'une polyligne, en unités de plan. */
export function perimetre(points = []) {
  let total = 0;
  for (let i = 1; i < (points || []).length; i += 1) total += longueur(points[i - 1], points[i]);
  return total;
}

/** L'aire d'une polyligne fermée, en m². Zéro si elle ne ferme pas. */
export function aire(points = []) {
  const liste = points || [];
  if (liste.length < 3) return 0;
  let somme = 0;
  for (let i = 0; i < liste.length; i += 1) {
    const p = xy(liste[i]);
    const q = xy(liste[(i + 1) % liste.length]);
    somme += p.x * q.y - q.x * p.y;
  }
  // Unité de plan = 10 cm, donc une unité carrée vaut 0,01 m².
  return Math.abs(somme) / 2 / 100;
}

/** Vrai si le dernier point rejoint le premier — la pièce est fermée. */
export function ferme(points = [], seuil = 1) {
  const liste = points || [];
  if (liste.length < 3) return false;
  return longueur(liste[0], liste[liste.length - 1]) <= nombre(seuil, 1);
}

/** Une longueur en mètres, écrite comme on la lit : « 6,40 m ». */
export function enMetres(unites, options = {}) {
  const m = nombre(unites) / 10;
  const texte = m.toFixed(nombre(options.decimales, 2)).replace('.', ',');
  return options.unite === false ? texte : `${texte} m`;
}

/** Une saisie « 6,4 » ou « 6,4 m » en unités de plan. Null si ce n'est pas un nombre. */
export function depuisMetres(texte) {
  const brut = String(texte ?? '').replace(',', '.').replace(/[^\d.-]/g, '');
  if (!brut || !/^-?\d*\.?\d+$/.test(brut)) return null;
  const n = Number(brut);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n * 10, BORNES.max);
}

/**
 * Les cotes d'une polyligne : une étiquette par segment, au milieu, tournée
 * dans le sens du mur et toujours lisible (jamais la tête en bas).
 */
export function cotes(points = [], options = {}) {
  const liste = points || [];
  const sortie = [];
  for (let i = 1; i < liste.length; i += 1) {
    const a = xy(liste[i - 1]); const b = xy(liste[i]);
    const d = longueur(a, b);
    if (d < nombre(options.min, 3)) continue;
    let angle = cap(a, b);
    if (angle > 90 && angle < 270) angle -= 180;
    sortie.push({
      // L'index du segment voyage avec la cote : c'est par elle qu'on le
      // choisit à l'écran, et une cote sautée (trop courte) décalerait tout.
      index: i - 1,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      angle,
      longueur: d,
      texte: enMetres(d),
    });
  }
  return sortie;
}

/** Le mur le plus proche d'un point, pour le choisir d'un clic. */
export function murLePlusProche(murs = [], point, options = {}) {
  const seuil = nombre(options.seuil, 4);
  const p = xy(point);
  let index = -1; let ecart = seuil;
  (murs || []).forEach((ligne, i) => {
    for (let k = 1; k < (ligne || []).length; k += 1) {
      const d = distanceAuSegment(p, ligne[k - 1], ligne[k]);
      if (d <= ecart) { ecart = d; index = i; }
    }
  });
  return index;
}

function distanceAuSegment(p, a, b) {
  const u = xy(a); const v = xy(b);
  const dx = v.x - u.x; const dy = v.y - u.y;
  const carre = dx * dx + dy * dy;
  if (!carre) return Math.hypot(p.x - u.x, p.y - u.y);
  const t = Math.min(1, Math.max(0, ((p.x - u.x) * dx + (p.y - u.y) * dy) / carre));
  return Math.hypot(p.x - (u.x + t * dx), p.y - (u.y + t * dy));
}

/** Le rectangle d'une pièce, en quatre murs fermés — le geste « une salle carrée ». */
export function piece(rectangle) {
  const x = nombre(rectangle?.x); const y = nombre(rectangle?.y);
  const l = nombre(rectangle?.l); const h = nombre(rectangle?.h);
  if (l <= 0 || h <= 0) return null;
  return [[x, y], [x + l, y], [x + l, y + h], [x, y + h], [x, y]];
}

/**
 * Une sélection pivotée autour de son centre.
 *
 * Le pivot est celui du GROUPE, pas de chaque objet : faire tourner une banque
 * de six postes d'un quart de tour doit la faire tourner comme un meuble, pas
 * faire tourner six postes sur eux-mêmes en laissant la banque en croix.
 */
export function pivoter(objets = [], degres = 90, options = {}) {
  const liste = objets || [];
  if (!liste.length) return [];
  const pas = nombre(options.pas, PAS) || PAS;
  const centres = liste.map((o) => ({
    cx: nombre(o.x) + nombre(o.l) / 2,
    cy: nombre(o.y) + nombre(o.h) / 2,
  }));
  const pivot = options.centre || {
    x: centres.reduce((s, c) => s + c.cx, 0) / centres.length,
    y: centres.reduce((s, c) => s + c.cy, 0) / centres.length,
  };
  const a = (nombre(degres) * Math.PI) / 180;
  const cos = Math.cos(a); const sin = Math.sin(a);
  return liste.map((o, i) => {
    const { cx, cy } = centres[i];
    const dx = cx - nombre(pivot.x); const dy = cy - nombre(pivot.y);
    const nx = nombre(pivot.x) + dx * cos - dy * sin;
    const ny = nombre(pivot.y) + dx * sin + dy * cos;
    const rot = (Math.round(nombre(o.rot) + nombre(degres)) % 360 + 360) % 360;
    return {
      ...o,
      rot,
      x: Math.min(Math.max(aimanter(nx - nombre(o.l) / 2, pas), BORNES.min), BORNES.max),
      y: Math.min(Math.max(aimanter(ny - nombre(o.h) / 2, pas), BORNES.min), BORNES.max),
    };
  });
}

/**
 * Un sommet déplacé dans un mur — la retouche d'un tracé déjà posé.
 *
 * UNE PIÈCE FERMÉE RESTE FERMÉE : sa polyligne écrit son premier point deux
 * fois, et ne bouger qu'une des deux copies ouvrirait la pièce d'un côté sans
 * que rien ne le dise — la surface disparaîtrait au premier coin retouché.
 */
export function deplacerSommet(mur = [], index, point, options = {}) {
  const liste = (mur || []).map((p) => { const q = xy(p); return [q.x, q.y]; });
  if (!liste.length || index < 0 || index >= liste.length) return null;
  const pas = nombre(options.pas, PAS) || PAS;
  const p = xy(point);
  // Un point déjà accroché à un mur (`libre`) ne repasse pas par le cran : la
  // grille le décollerait du mur qu'on vient d'atteindre.
  const cale = (v) => (options.libre ? Math.round(v * 100) / 100 : aimanter(v, pas));
  const place = [
    Math.min(Math.max(cale(p.x), BORNES.min), BORNES.max),
    Math.min(Math.max(cale(p.y), BORNES.min), BORNES.max),
  ];
  const dernier = liste.length - 1;
  const boucle = liste.length > 2
    && liste[0][0] === liste[dernier][0] && liste[0][1] === liste[dernier][1];
  liste[index] = place;
  if (boucle && index === 0) liste[dernier] = [...place];
  if (boucle && index === dernier) liste[0] = [...place];
  return liste;
}

/**
 * Ce qu'un sommet tiré peut viser : les autres murs, et le sien privé du
 * sommet. SES VOISINS NE SE VISENT PAS : un mur court se recollait sinon à son
 * propre coin — le bout d'une cloison de 45 cm revenait sur sa base. Ils
 * restent `reperes` (alignement, qui remet un coin d'équerre, et `exclus` des
 * sommets visés) et `origine` (équerre sur les autres murs) ; les épaisseurs
 * suivent les tronçons.
 *
 * @returns {{traces:Array, epaisseurs:Array, reperes:Array, origine:Array|null}}
 */
export function ciblesDuSommet(murs = [], index, sommet, epaisseurs = []) {
  const traces = []; const eps = []; const reperes = [];
  let origine = null;
  (murs || []).forEach((m, i) => {
    const pts = (m || []).map((q) => { const r = xy(q); return [r.x, r.y]; });
    const ep = epaisseurDe(epaisseurs, i);
    if (i !== index) { traces.push(pts); eps.push(ep); return; }
    const dernier = pts.length - 1;
    const boucle = pts.length > 2
      && pts[0][0] === pts[dernier][0] && pts[0][1] === pts[dernier][1];
    // Les indices voisins, en tenant la boucle : son premier et son dernier
    // point sont le même sommet.
    const autour = new Set([sommet]);
    const pas = (k, d) => {
      let n = k + d;
      if (boucle && n < 0) n = dernier - 1;
      if (boucle && n > dernier) n = 1;
      return n;
    };
    if (boucle && (sommet === 0 || sommet === dernier)) { autour.add(0); autour.add(dernier); }
    for (const k of [...autour]) {
      for (const d of [-1, 1]) {
        const n = pas(k, d);
        if (n < 0 || n > dernier || autour.has(n)) continue;
        reperes.push(pts[n]);
        if (!origine) origine = pts[n];
      }
    }
    let troncon = [];
    const couper = () => { if (troncon.length >= 2) { traces.push(troncon); eps.push(ep); } troncon = []; };
    pts.forEach((q, k) => {
      if (autour.has(k)) { couper(); return; }
      troncon.push(q);
    });
    couper();
  });
  return { traces, epaisseurs: eps, reperes, origine };
}

/**
 * Deux murs bout à bout n'en font plus qu'un.
 *
 * DEUX BANDES QUI SE TOUCHENT NE SONT PAS UN ANGLE : chacune garde son cerne, et
 * le coin montre un trait en travers et une encoche. Un seul tracé, lui, tourne
 * en onglet — c'est ce qu'on attend en collant le bout d'un mur au bout d'un
 * autre. Le mur `index` absorbe l'autre et garde son épaisseur ; les ouvertures
 * ne tiennent pas aux indices, elles ne bougent pas.
 *
 * @returns {{murs:Array, epaisseurs:Array, joint:boolean}}
 */
export function joindreMurs(murs = [], epaisseurs = [], index, sommet) {
  const rien = { murs, epaisseurs, joint: false };
  const mur = murs?.[index];
  if (!Array.isArray(mur) || mur.length < 2) return rien;
  const dernier = mur.length - 1;
  const meme = (a, b) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
  if (meme(mur[0], mur[dernier])) return rien;
  if (sommet !== 0 && sommet !== dernier) return rien;
  const bout = mur[sommet];
  const j = murs.findIndex((m, k) => k !== index && Array.isArray(m) && m.length >= 2
    && !meme(m[0], m[m.length - 1]) && (meme(m[0], bout) || meme(m[m.length - 1], bout)));
  if (j < 0) return rien;
  const a = sommet === dernier ? mur : [...mur].reverse();
  const b = meme(murs[j][0], bout) ? murs[j] : [...murs[j]].reverse();
  const uni = [...a, ...b.slice(1)].map((q) => [...q]);
  return {
    murs: murs.map((m, k) => (k === index ? uni : m)).filter((_, k) => k !== j),
    epaisseurs: (epaisseurs || []).filter((_, k) => k !== j),
    joint: true,
  };
}

/**
 * Le décalage d'un lot de murs qui touche un autre mur : un de ses sommets
 * tombe sur un sommet fixe (d'abord) ou sur un segment — sur sa FACE, si
 * `epaisseurs` est donné. C'est ce que l'aimant
 * par axes ne sait pas faire : poser un bout de mur SUR un autre, en biais.
 *
 * @param {Array} mobiles sommets du lot, avant décalage.
 * @param {Array} murs les tracés fixes.
 * @returns {{dx:number, dy:number, point:object|null}}
 */
export function aimanterSommets(mobiles = [], murs = [], d = {}, seuil = 0, epaisseurs = null) {
  const dx = nombre(d.dx); const dy = nombre(d.dy);
  const s = Math.max(0, nombre(seuil));
  if (!s) return { dx, dy, point: null };
  let mieux = null;
  const essayer = (p, c, rang) => {
    const e = Math.hypot(c.x - p.x, c.y - p.y);
    const portee = rang ? s * 0.6 : s;
    if (e > portee) return;
    if (!mieux || rang < mieux.rang || (rang === mieux.rang && e < mieux.e)) {
      mieux = { e, rang, ecart: { x: c.x - p.x, y: c.y - p.y }, point: c };
    }
  };
  for (const q of mobiles || []) {
    const p = { x: nombre(q?.[0] ?? q?.x) + dx, y: nombre(q?.[1] ?? q?.y) + dy };
    (murs || []).forEach((ligne, k) => {
      const pts = (ligne || []).map(xy);
      const demi = Array.isArray(epaisseurs) ? epaisseurDe(epaisseurs, k) / 2 : 0;
      pts.forEach((c) => essayer(p, c, 0));
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1]; const b = pts[i];
        if (a.x === b.x && a.y === b.y) continue;
        essayer(p, demi > 0 ? face(p, a, b, demi) : pied(p, a, b), 1);
      }
    });
  }
  if (!mieux) return { dx, dy, point: null };
  const r = (v) => Math.round(v * 100) / 100;
  return {
    dx: r(dx + mieux.ecart.x),
    dy: r(dy + mieux.ecart.y),
    point: { x: r(mieux.point.x), y: r(mieux.point.y) },
  };
}

/**
 * Une polyligne translatée — le mur pris dans une sélection qu'on glisse.
 *
 * Le mur n'est pas un rectangle : `deplacer` ne sait pas le prendre. Il se
 * déplace donc par ses points, bornés un à un, sans aimantation : le pas de
 * grille a déjà été appliqué au vecteur, l'appliquer deux fois ferait sautiller
 * la copie d'un demi-pas à chaque geste.
 */
export function translaterTrace(points = [], d = {}) {
  const dx = nombre(d?.dx); const dy = nombre(d?.dy);
  return (points || []).map((p) => {
    const q = xy(p);
    return [
      Math.min(Math.max(Math.round((q.x + dx) * 100) / 100, BORNES.min), BORNES.max),
      Math.min(Math.max(Math.round((q.y + dy) * 100) / 100, BORNES.min), BORNES.max),
    ];
  });
}

/**
 * Une polyligne pivotée autour d'un centre — le quart de tour d'un mur.
 *
 * SANS CENTRE, C'EST LE CENTRE DE SA PROPRE BOÎTE : un mur qui pivote doit
 * rester là où on le regarde. Avec centre, plusieurs murs tournent ensemble
 * comme un seul meuble, et c'est ce qui permet de faire tourner une pièce
 * entière sans la démonter.
 */
export function pivoterTrace(points = [], degres = 90, centre = null) {
  const liste = (points || []).map(xy);
  if (!liste.length) return [];
  const xs = liste.map((p) => p.x); const ys = liste.map((p) => p.y);
  const pivot = centre ? xy(centre) : {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
  const a = (nombre(degres) * Math.PI) / 180;
  const cos = Math.cos(a); const sin = Math.sin(a);
  return liste.map((p) => {
    const dx = p.x - pivot.x; const dy = p.y - pivot.y;
    return [
      Math.min(Math.max(Math.round((pivot.x + dx * cos - dy * sin) * 100) / 100, BORNES.min), BORNES.max),
      Math.min(Math.max(Math.round((pivot.y + dx * sin + dy * cos) * 100) / 100, BORNES.min), BORNES.max),
    ];
  });
}

/** La boîte d'un ensemble de tracés et de rectangles — le pivot d'un groupe. */
export function boiteDe(traces = [], rectangles = []) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const ligne of traces || []) {
    for (const p of ligne || []) {
      const q = xy(p);
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y);
      x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
    }
  }
  for (const r of rectangles || []) {
    const x = nombre(r?.x); const y = nombre(r?.y);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + nombre(r?.l)); y1 = Math.max(y1, y + nombre(r?.h));
  }
  if (!Number.isFinite(x0)) return null;
  return { x: x0, y: y0, l: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
