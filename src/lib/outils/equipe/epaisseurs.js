/**
 * L'épaisseur des murs d'un plan : une façade n'est pas une cloison.
 *
 * UNE LISTE À CÔTÉ, PAS DANS LE TRAIT. `murs` est une liste de polylignes
 * `[[x,y], …]` que tout le code sait lire — plan, vue du membre, import. Y
 * glisser un nombre aurait cassé chaque lecteur. `epaisseurs` est donc une
 * liste parallèle sur `om_plan`, alignée par index sur `murs` : l'élément `i`
 * dit l'épaisseur du trait `i`, en unités de plan (1 = 10 cm).
 *
 * NULL VEUT DIRE « COMME AVANT ». Un plan dessiné avant l'épaisseur n'a pas de
 * liste ; ses murs gardent le trait fin d'origine (`EPAISSEUR_TRAIT`) au lieu
 * de grossir d'un coup chez tout le monde.
 *
 * QUI RETIRE UN MUR RETIRE SON ÉPAISSEUR. L'alignement par index ne tient que
 * si chaque écriture de `murs` qui décale les index réécrit `epaisseurs` dans
 * le même patch. `nettoyerEpaisseurs` rattrape le reste : trop court, on
 * complète de null ; trop long, on coupe.
 *
 * Miroir du bloc `epaisseurs` d'`om_plan_patch` : mêmes bornes.
 */

/**
 * Les épaisseurs qu'on propose, en mètres comme dans un logiciel d'architecte.
 * Quatre portent un nom : on sait qu'on trace une façade avant d'en savoir la
 * cote.
 */
export const EPAISSEURS = [
  { ep: 0.5, nom: '' },
  { ep: 1, nom: 'cloison' },
  { ep: 1.5, nom: '' },
  { ep: 2, nom: 'intérieur' },
  { ep: 2.5, nom: '' },
  { ep: 3, nom: 'extérieur' },
  { ep: 4, nom: '' },
  { ep: 5, nom: 'façade' },
];

/** « 0.10 m — cloison » : la cote d'abord, le mot s'il y en a un. */
export function libelleEpaisseur(ep) {
  const e = EPAISSEURS.find((x) => x.ep === ep);
  const m = `${(ep / 10).toFixed(2)} m`;
  return e?.nom ? `${m} — ${e.nom}` : m;
}

/** Le trait d'un mur sans épaisseur choisie — celui d'avant. */
export const EPAISSEUR_TRAIT = 1.2;

/** Bornes acceptées, en unités de plan : 5 cm à 1 m. */
export const EPAISSEUR = { mini: 0.5, maxi: 10 };

/** Une épaisseur propre, ou null. */
export function epaisseurNette(v) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (n < EPAISSEUR.mini || n > EPAISSEUR.maxi) return null;
  return Math.round(n * 10) / 10;
}

/** La liste alignée sur `n` murs : complétée de null, ou coupée. */
export function nettoyerEpaisseurs(liste, n) {
  const src = Array.isArray(liste) ? liste : [];
  return Array.from({ length: Math.max(0, n | 0) }, (_, i) => epaisseurNette(src[i]));
}

/** L'épaisseur dessinée du mur `i`. */
export function epaisseurDe(liste, i) {
  return (Array.isArray(liste) ? epaisseurNette(liste[i]) : null) ?? EPAISSEUR_TRAIT;
}

/** L'épaisseur commune aux murs `indices`, ou null s'ils diffèrent. */
export function epaisseurCommune(liste, indices = []) {
  if (!indices.length) return null;
  const vus = new Set(indices.map((i) => (Array.isArray(liste) ? epaisseurNette(liste[i]) : null)));
  return vus.size === 1 ? [...vus][0] : null;
}

/**
 * L'épaisseur du mur qui porte une ouverture : celle du segment le plus
 * proche de son centre. Une porte ne connaît pas l'index de son mur — elle
 * s'y colle par projection (`ouvertures.js`) et survit à un mur retracé.
 */
export function epaisseurSous(murs = [], liste = [], point = {}, seuil = 3) {
  const px = Number(point.x);
  const py = Number(point.y);
  let mieux = null;
  (Array.isArray(murs) ? murs : []).forEach((mur, i) => {
    const pts = Array.isArray(mur) ? mur : [];
    for (let j = 0; j < pts.length - 1; j += 1) {
      const [ax, ay] = pts[j];
      const [bx, by] = pts[j + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const carre = dx * dx + dy * dy;
      if (carre <= 0) continue;
      const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / carre));
      const d = Math.hypot(ax + t * dx - px, ay + t * dy - py);
      if (d <= seuil && (!mieux || d < mieux.d)) mieux = { d, i };
    }
  });
  return epaisseurDe(liste, mieux ? mieux.i : -1);
}

/**
 * LE CONTOUR D'UN MUR ÉPAIS : une bande, pas un gros trait.
 *
 * Comme dans un logiciel d'architecte, le mur se dessine d'un fond cerné
 * d'une plume fine. On décale la polyligne de ±ep/2 ; aux coudes, l'onglet
 * (borné à 4 demi-épaisseurs, sinon un angle aigu pointerait au loin). Un
 * tracé fermé (premier point = dernier) rend deux anneaux, à remplir en
 * `evenodd` : la pièce reste vide au milieu.
 */
export function contourDeMur(points = [], ep = EPAISSEUR_TRAIT) {
  let pts = (Array.isArray(points) ? points : []).filter((p, i, a) => (
    i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]
  ));
  const ferme = pts.length > 3
    && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
  if (ferme) pts = pts.slice(0, -1);
  if (pts.length < 2) return '';
  const h = ep / 2;
  const n = pts.length;
  const normale = (a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  const decale = (i) => {
    const avant = ferme || i > 0 ? normale(pts[(i - 1 + n) % n], pts[i]) : null;
    const apres = ferme || i < n - 1 ? normale(pts[i], pts[(i + 1) % n]) : null;
    if (!avant || !apres) {
      const [nx, ny] = avant || apres;
      return [nx * h, ny * h];
    }
    const mx = avant[0] + apres[0];
    const my = avant[1] + apres[1];
    const ml = Math.hypot(mx, my);
    if (ml < 1e-9) return [avant[0] * h, avant[1] * h];
    const cos = (mx * avant[0] + my * avant[1]) / ml;
    const long = Math.min(h / Math.max(cos, 1e-9), 4 * h);
    return [(mx / ml) * long, (my / ml) * long];
  };
  const d = pts.map((_, i) => decale(i));
  const r = (v) => Math.round(v * 100) / 100;
  const gauche = pts.map((p, i) => [r(p[0] + d[i][0]), r(p[1] + d[i][1])]);
  const droite = pts.map((p, i) => [r(p[0] - d[i][0]), r(p[1] - d[i][1])]);
  const anneau = (l) => `M${l.map((q) => q.join(' ')).join('L')}Z`;
  return ferme ? anneau(gauche) + anneau(droite) : anneau([...gauche, ...droite.reverse()]);
}

/**
 * LA PLUME DU CONTOUR, en millimètres, une par plan : un dessin lisible tient
 * ses murs d'une seule plume. Elle ne grossit pas au zoom — c'est un trait
 * d'encre, pas une longueur du plan. Miroir du bloc `trait_mur` d'`om_plan_patch`.
 */
export const TRAITS = [0.13, 0.18, 0.25, 0.35, 0.5, 0.7];
export const TRAIT_DEFAUT = 0.25;

/** Une plume propre (0,1 à 1 mm, au centième), ou null. */
export function traitNet(v) {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0.1 || n > 1) return null;
  return Math.round(n * 100) / 100;
}

/** La plume en pixels d'écran (96 ppp), jamais sous le pixel. */
export function pixelsDuTrait(mm) {
  return Math.max(1, ((traitNet(mm) ?? TRAIT_DEFAUT) * 96) / 25.4);
}
