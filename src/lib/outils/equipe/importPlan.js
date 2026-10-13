/**
 * Importer un plan existant : SVG vectoriel, DXF, ou rien.
 *
 * PERSONNE NE REDESSINE SON PLATEAU. Le plan existe déjà — chez l'architecte,
 * dans le bail, dans un export du logiciel du bailleur. Le retaper au mur près
 * est le moment où l'outil se fait abandonner.
 *
 * DEUX FORMATS SEULEMENT, ET C'EST UN CHOIX. SVG et DXF sont du texte : des
 * segments qu'on relit et qu'on peut ensuite corriger comme un tracé maison.
 * Le PDF ne l'est pas — il demanderait une neuvième dépendance de prod
 * (`pdf.js`), que `interdits.test.js` refuse ; une image non plus. Ces deux-là
 * passent par le calque de fond de `PlanPostes` : on décalque, on ne convertit
 * pas. Mieux vaut un fond honnête qu'un vectoriel inventé.
 *
 * AUCUN `DOMParser` ICI. Les tests tournent en `environment: 'node'` : le
 * métier se lit à la chaîne et à la regex, sinon il n'est pas testable, donc
 * il n'existe pas. On ne lit pas non plus les `transform` d'un SVG — un plan
 * d'architecte n'en porte pas sur ses murs, et l'aperçu montre tout de suite
 * si l'import est de travers.
 *
 * L'ÉCHELLE NE SE DEVINE PAS : le fichier ne dit pas ses mètres. Par défaut le
 * tracé est ramené dans le cadre du plan (`ajusterAuPlan`) ; l'utilisateur
 * règle ensuite la taille du plan en mètres, et tout suit.
 *
 * Unités de plan en sortie (1 unité = 10 cm), aucun pixel, aucun React.
 */
import { BORNES, MURS, PLAN } from '@/lib/outils/equipe/plan';

/** Ce qu'on sait relire, et ce qu'on ne sait que poser en fond. */
export const FORMATS_IMPORT = {
  traces: ['.svg', '.dxf'],
  fonds: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
};

function nombres(texte) {
  return (String(texte).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []).map(Number);
}

function attribut(balise, nom) {
  const m = balise.match(new RegExp(`\\b${nom}\\s*=\\s*"([^"]*)"|\\b${nom}\\s*=\\s*'([^']*)'`, 'i'));
  return m ? (m[1] ?? m[2]) : null;
}

function paires(liste) {
  const points = [];
  for (let i = 0; i + 1 < liste.length; i += 2) points.push([liste[i], liste[i + 1]]);
  return points;
}

function net(points, ferme = false) {
  const propres = [];
  for (const p of points) {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
    const dernier = propres[propres.length - 1];
    if (dernier && dernier[0] === p[0] && dernier[1] === p[1]) continue;
    propres.push([p[0], p[1]]);
  }
  if (ferme && propres.length > 2) propres.push([propres[0][0], propres[0][1]]);
  return propres.length >= 2 ? propres : null;
}

/**
 * Le `d` d'un `<path>` en polylignes.
 *
 * Les courbes ne sont pas approchées : on saute à leur point d'arrivée. Un plan
 * d'architecte n'a pas de mur en courbe de Bézier, et une arrivée droite vaut
 * mieux qu'un arc faux.
 */
export function lireChemin(d) {
  const lignes = [];
  let courante = [];
  let x = 0; let y = 0; let departX = 0; let departY = 0;
  const jetons = String(d || '').match(/[a-z][^a-z]*/gi) || [];
  const finir = (ferme) => {
    const l = net(courante, ferme);
    if (l) lignes.push(l);
    courante = [];
  };
  for (const jeton of jetons) {
    const lettre = jeton[0];
    const relatif = lettre === lettre.toLowerCase();
    const n = nombres(jeton.slice(1));
    const cle = lettre.toUpperCase();
    if (cle === 'Z') { finir(true); courante = [[departX, departY]]; x = departX; y = departY; continue; }
    if (cle === 'M') {
      finir(false);
      for (let i = 0; i + 1 < n.length; i += 2) {
        x = relatif ? x + n[i] : n[i];
        y = relatif ? y + n[i + 1] : n[i + 1];
        if (i === 0) { departX = x; departY = y; }
        courante.push([x, y]);
      }
      continue;
    }
    if (cle === 'H' || cle === 'V') {
      for (const v of n) {
        if (cle === 'H') x = relatif ? x + v : v; else y = relatif ? y + v : v;
        courante.push([x, y]);
      }
      continue;
    }
    if (cle === 'L') {
      for (let i = 0; i + 1 < n.length; i += 2) {
        x = relatif ? x + n[i] : n[i];
        y = relatif ? y + n[i + 1] : n[i + 1];
        courante.push([x, y]);
      }
      continue;
    }
    if (n.length >= 2) {
      x = relatif ? x + n[n.length - 2] : n[n.length - 2];
      y = relatif ? y + n[n.length - 1] : n[n.length - 1];
      courante.push([x, y]);
    }
  }
  finir(false);
  return lignes;
}

/** Les traits d'un SVG : `line`, `polyline`, `polygon`, `rect`, `path`. */
export function lireSvg(texte) {
  const src = String(texte || '');
  const lignes = [];
  for (const b of src.match(/<line\b[^>]*>/gi) || []) {
    const l = net([
      [Number(attribut(b, 'x1')), Number(attribut(b, 'y1'))],
      [Number(attribut(b, 'x2')), Number(attribut(b, 'y2'))],
    ]);
    if (l) lignes.push(l);
  }
  for (const b of src.match(/<(polyline|polygon)\b[^>]*>/gi) || []) {
    const l = net(paires(nombres(attribut(b, 'points') || '')), /polygon/i.test(b));
    if (l) lignes.push(l);
  }
  for (const b of src.match(/<rect\b[^>]*>/gi) || []) {
    const x = Number(attribut(b, 'x') || 0);
    const y = Number(attribut(b, 'y') || 0);
    const w = Number(attribut(b, 'width'));
    const h = Number(attribut(b, 'height'));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) continue;
    lignes.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]]);
  }
  for (const b of src.match(/<path\b[^>]*>/gi) || []) {
    lignes.push(...lireChemin(attribut(b, 'd') || ''));
  }
  return lignes;
}

/**
 * Les traits d'un DXF : `LINE`, `LWPOLYLINE`, `POLYLINE`/`VERTEX`.
 *
 * Le DXF est une liste de couples (code, valeur), une valeur par ligne. On ne
 * lit que la géométrie 2D : ni calques, ni blocs, ni cotes — un plan importé se
 * relit à l'écran, il ne se fait pas confiance.
 *
 * L'axe y d'un DXF MONTE, celui d'un SVG descend : on le retourne ici, sinon
 * tout plan importé arrive à l'envers.
 */
export function lireDxf(texte) {
  const brut = String(texte || '').split(/\r?\n/).map((l) => l.trim());
  const lignes = [];
  let courant = null;
  const poser = () => {
    if (courant) {
      const l = net(courant.points, courant.ferme);
      if (l) lignes.push(l);
    }
    courant = null;
  };
  for (let i = 0; i + 1 < brut.length; i += 2) {
    const code = brut[i];
    const valeur = brut[i + 1];
    if (code === '0') {
      // Un VERTEX appartient à la POLYLINE ouverte : il ne la ferme pas.
      if (valeur === 'VERTEX') { if (courant) courant.attente = {}; continue; }
      poser();
      if (valeur === 'LINE' || valeur === 'LWPOLYLINE' || valeur === 'POLYLINE') {
        courant = { points: [], ferme: false, attente: {} };
      }
      continue;
    }
    if (!courant) continue;
    const v = Number(valeur);
    if (!Number.isFinite(v)) continue;
    if (code === '70') { courant.ferme = (v & 1) === 1; continue; }
    if (code === '10' || code === '11') { courant.attente.x = v; continue; }
    if ((code === '20' || code === '21') && courant.attente.x !== undefined) {
      courant.points.push([courant.attente.x, -v]);
      courant.attente = {};
    }
  }
  poser();
  return lignes;
}

/** Le contenu relu selon son nom de fichier, ou selon ce qu'il contient. */
export function lireTrace(texte, nom = '') {
  const src = String(texte || '');
  const bas = String(nom).toLowerCase();
  if (bas.endsWith('.dxf')) return lireDxf(src);
  if (bas.endsWith('.svg')) return lireSvg(src);
  return /<svg[\s>]/i.test(src) ? lireSvg(src) : lireDxf(src);
}

/**
 * Le tracé importé ramené dans le cadre du plan, aux plafonds de la base.
 *
 * ON RECADRE PLUTÔT QUE D'INVENTER UNE ÉCHELLE. Un SVG ne dit pas ses mètres :
 * un « 1000 » y vaut aussi bien 10 m que 100. Le tracé est donc posé au plus
 * grand dans le cadre, et c'est la taille du plan, réglée en mètres, qui fait
 * l'échelle. `options.echelle` court-circuite ce calcul quand on la connaît.
 *
 * LES PLAFONDS SONT CEUX DE `om_plan_ecrire` : au-delà, la base refuse tout le
 * patch. Mieux vaut un plan tronqué et dit que zéro mur et un code d'erreur.
 *
 * @returns {{murs:Array, gardes:number, tombes:number}}
 */
export function ajusterAuPlan(polylignes = [], options = {}) {
  const plan = {
    largeur: Number(options.plan?.largeur) || PLAN.largeur,
    hauteur: Number(options.plan?.hauteur) || PLAN.hauteur,
  };
  const marge = Number.isFinite(options.marge) ? options.marge : 4;
  const lignes = (polylignes || []).map((l) => (l || []).filter(
    (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  )).filter((l) => l.length >= 2);
  if (!lignes.length) return { murs: [], gardes: 0, tombes: 0 };
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const l of lignes) {
    for (const [x, y] of l) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const large = maxX - minX;
  const haut = maxY - minY;
  const utile = {
    l: Math.max(1, plan.largeur - marge * 2),
    h: Math.max(1, plan.hauteur - marge * 2),
  };
  const echelle = Number(options.echelle) > 0
    ? Number(options.echelle)
    : Math.min(large > 0 ? utile.l / large : Infinity, haut > 0 ? utile.h / haut : Infinity);
  const facteur = Number.isFinite(echelle) && echelle > 0 ? echelle : 1;
  const decaleX = (plan.largeur - large * facteur) / 2 - minX * facteur;
  const decaleY = (plan.hauteur - haut * facteur) / 2 - minY * facteur;
  const borne = (v) => Math.min(Math.max(Math.round(v * 10) / 10, BORNES.min), BORNES.max);
  const murs = [];
  let total = 0;
  let tombes = 0;
  for (const l of lignes) {
    if (murs.length >= MURS.lignes || total >= MURS.total) { tombes += 1; continue; }
    const place = Math.min(MURS.points, MURS.total - total);
    const points = l.slice(0, place).map(([x, y]) => [borne(x * facteur + decaleX), borne(y * facteur + decaleY)]);
    const propre = net(points);
    if (!propre) { tombes += 1; continue; }
    if (l.length > place) tombes += 1;
    murs.push(propre);
    total += propre.length;
  }
  return { murs, gardes: murs.length, tombes };
}
