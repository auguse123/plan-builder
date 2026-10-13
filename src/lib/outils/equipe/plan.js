/**
 * La géométrie du plan des postes — quatre gestes, aucun pixel.
 *
 * Tout ce module compte en UNITÉS DE PLAN : 1 unité = 10 cm. Un poste fait
 * 14 × 8 (140 × 80 cm), un pas de grille 20 cm. Le pixel n'entre qu'une fois,
 * dans `versPlan`, qui traduit la position d'un doigt ; partout ailleurs un
 * zoom, un écran plus large ou une impression ne déplacent rien.
 *
 * Les quatre gestes de l'éditeur tiennent ici, en JS pur :
 *
 *   * SEMER — `semerGrille` pose N postes en grille au centre. C'est le geste
 *     qui rend un plan utilisable avant le moindre dessin.
 *   * ÎLOT — `ilot` aligne une banque de N postes, dos à dos par défaut :
 *     l'objet exact des plans qu'on nous montre, et celui qu'on dessinerait
 *     poste par poste pendant dix minutes sinon.
 *   * GLISSER — `aimanter` colle au pas, `deplacer` bouge une sélection entière
 *     et la garde DANS le plan. Le lot part au relâcher, pas à chaque frame.
 *   * GENRE — pas de géométrie, donc pas ici (`postes.js`).
 *
 * Ce module ne parle ni de React ni de la base : il rend des nombres. Le refus
 * reste à la base (`geometrie_invalide`), et l'aimantation d'ici n'est qu'un
 * confort — le serveur arrondit de son côté.
 */

/** Le pas de la grille, en unités de plan. 2 = 20 cm. */
export const PAS = 2;

/** La taille d'un poste, en unités de plan. 14 × 8 = 140 × 80 cm. */
export const POSTE = { l: 14, h: 8 };

/**
 * Les gabarits de bureau courants, en unités de plan (1 unité = 10 cm).
 *
 * UN BENCH N'EST PAS UNE TAILLE UNIQUE. 120×60 est la limite basse du Code du
 * travail en flex, 160×80 le poste double écran, 180×80 le bureau de direction.
 * Semer tout un plateau au mauvais gabarit se voit à l'impression et se corrige
 * poste par poste : le choix se fait avant de semer, pas après.
 *
 * `POSTE` reste le standard — c'est lui qui sert de défaut partout ailleurs.
 */
export const TAILLES_POSTE = [
  { cle: 'compact', nom: 'Compact', l: 12, h: 6 },
  { cle: 'standard', nom: 'Standard', l: 14, h: 8 },
  { cle: 'confort', nom: 'Confort', l: 16, h: 8 },
  { cle: 'direction', nom: 'Direction', l: 18, h: 9 },
];

/** Le gabarit demandé, ou le standard : jamais `undefined` au semis. */
export function taillePoste(cle) {
  return TAILLES_POSTE.find((t) => t.cle === cle) || TAILLES_POSTE[1];
}

/** L'écart entre deux postes semés : le poste, plus la circulation. */
export const ECART = { x: 18, y: 12 };

/** Le plan par défaut : 30 m × 20 m. Assez pour un plateau, pas pour un campus. */
export const PLAN = { largeur: 300, hauteur: 200 };

/** Les bornes dures, miroir du check `om_ressource_geometrie_check`. */
export const BORNES = { min: 0, max: 2000, taille: 200 };

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

function planDe(plan) {
  const p = { ...PLAN, ...(plan || {}) };
  const largeur = Math.min(Math.max(nombre(p.largeur, PLAN.largeur), 20), BORNES.max);
  const hauteur = Math.min(Math.max(nombre(p.hauteur, PLAN.hauteur), 20), BORNES.max);
  return { largeur, hauteur };
}

/**
 * Les bornes du zoom. 1 = la feuille entière tient dans la vue.
 *
 * ON DÉZOOME BIEN AU-DELÀ DE LA FEUILLE : un plateau se dessine en regardant
 * autour de lui — le couloir voisin, la trame de façade, la place qu'on
 * gardera pour la seconde rangée. Sous ×1 la vue devient plus grande que la
 * feuille, qui se pose alors au milieu du vide.
 *
 * C'EST `vueMini` QUI PLAFONNE, PAS `maxi` : la seule limite qui veuille dire
 * quelque chose est « combien de mètres tiennent à l'écran ». `maxi` n'est
 * qu'une butée de sûreté au-dessus — la fixer à 8 interdisait d'approcher le
 * centimètre sur un grand plateau, donc de reprendre un angle de cloison.
 */
export const ZOOM = { mini: 0.05, maxi: 64, pas: 1.25, vueMini: 20 };

/** Un pixel CSS vaut 25,4/96 mm : la seule constante qui relie l'écran au réel. */
const MM_PAR_PIXEL = 25.4 / 96;

/**
 * L'échelle affichée, à partir de la largeur RENDUE du dessin.
 *
 * UN POURCENTAGE NE VEUT RIEN DIRE SUR UN PLAN : « 140 % » ne se mesure pas
 * avec une règle, « 1:50 » si. Le dénominateur se lit « un centimètre sur
 * l'écran vaut cinquante centimètres au sol », et il change au zoom parce que
 * c'est la vue, pas la feuille, qui rétrécit.
 *
 * L'arrondi vise les échelles de planche (20, 50, 100, 200…) : un 1:87 exact
 * serait juste et illisible.
 */
export function echelleDe(largeurPixels, largeurVue) {
  const px = nombre(largeurPixels);
  const vue = nombre(largeurVue);
  if (px <= 0 || vue <= 0) return { denominateur: 0, texte: '—' };
  // Une unité de plan = 10 cm = 100 mm.
  const brut = (vue * 100) / (px * MM_PAR_PIXEL);
  const pas = brut < 25 ? 1 : (brut < 100 ? 5 : (brut < 1000 ? 10 : 50));
  const arrondi = Math.max(1, Math.round(brut / pas) * pas);
  return { denominateur: arrondi, texte: `1:${arrondi}` };
}

/**
 * La fenêtre regardée : un plan, plus un coin.
 *
 * `versPlan`, `versEcran` et `cadre` ne travaillent plus sur la feuille mais
 * sur ce qu'on en voit. Sans zoom, `x` et `y` valent 0 et la vue EST la
 * feuille : c'est le même calcul qu'avant, à un décalage nul près.
 */
function vueDe(vue) {
  const { largeur, hauteur } = planDe(vue);
  return { x: nombre(vue?.x), y: nombre(vue?.y), largeur, hauteur };
}

/**
 * Le zoom le plus fort qu'un plan accepte : celui qui ne laisse plus que
 * `vueMini` (2 m) à l'écran.
 *
 * Il dépend de la FEUILLE, pas d'une constante : une grande feuille se zoome
 * plus loin qu'une petite pour montrer les mêmes deux mètres. Les boutons de
 * zoom s'y bornent comme la vue, sinon l'état montait dans le vide et il
 * fallait dix clics pour redescendre.
 */
export function plafondZoom(plan) {
  const p = planDe(plan);
  return Math.max(1, Math.min(
    ZOOM.maxi, p.largeur / ZOOM.vueMini, p.hauteur / ZOOM.vueMini,
  ));
}

/**
 * La fenêtre d'un plan à un zoom donné, autour d'un centre.
 *
 * UNE SEULE ÉCHELLE POUR TOUT : le zoom ne touche que la fenêtre, jamais les
 * objets. Un bench posé à ×4 fait les mêmes 140 cm qu'à ×1 — il est seulement
 * regardé de plus près. La vue ne sort pas de la feuille : sinon on zoome et
 * le plan part hors champ sans qu'aucun geste ne le ramène.
 */
export function vueZoomee(plan, options = {}) {
  const p = planDe(plan);
  const plafond = plafondZoom(p);
  const zoom = Math.min(Math.max(nombre(options.zoom, 1), ZOOM.mini), plafond);
  const largeur = p.largeur / zoom;
  const hauteur = p.hauteur / zoom;
  const cx = nombre(options.centre?.x, p.largeur / 2);
  const cy = nombre(options.centre?.y, p.hauteur / 2);
  // Sous ×1 la vue est plus grande que la feuille : la borner « dedans » la
  // collerait au coin haut-gauche et le plan partirait de travers. On centre.
  const cale = (centre, taille, etendue) => (taille >= etendue
    ? (etendue - taille) / 2
    : borner(centre - taille / 2, 0, etendue - taille));
  return {
    x: cale(cx, largeur, p.largeur),
    y: cale(cy, hauteur, p.hauteur),
    largeur,
    hauteur,
    zoom,
  };
}

/**
 * La valeur collée au pas de grille.
 *
 * Arrondi au plus proche, pas au plancher : glisser d'un demi-pas vers la
 * droite doit avancer, sinon le poste semble coller au doigt puis reculer.
 */
export function aimanter(valeur, pas = PAS) {
  const p = nombre(pas, PAS) || PAS;
  return Math.round(nombre(valeur) / p) * p;
}

/** Une valeur ramenée entre deux bornes. */
export function borner(valeur, min, max) {
  const v = nombre(valeur);
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}

/** Un objet ramené entièrement dans le plan — jamais à moitié dehors. */
export function poserDans(objet, plan) {
  const { largeur, hauteur } = planDe(plan);
  const l = Math.min(nombre(objet?.l, POSTE.l), largeur);
  const h = Math.min(nombre(objet?.h, POSTE.h), hauteur);
  return {
    ...objet,
    l,
    h,
    x: borner(objet?.x, 0, largeur - l),
    y: borner(objet?.y, 0, hauteur - h),
  };
}

/** Deux rectangles se recouvrent-ils ? Le contact bord à bord ne compte pas. */
export function chevauchent(a, b) {
  if (!a || !b) return false;
  const ax = nombre(a.x); const ay = nombre(a.y);
  const bx = nombre(b.x); const by = nombre(b.y);
  const al = nombre(a.l, POSTE.l); const ah = nombre(a.h, POSTE.h);
  const bl = nombre(b.l, POSTE.l); const bh = nombre(b.h, POSTE.h);
  return ax < bx + bl && bx < ax + al && ay < by + bh && by < ay + ah;
}

/**
 * La boîte qui contient tout — `null` si rien n'est posé.
 *
 * Sert à cadrer la vue sur ce qui existe : un plan à trois postes dans un coin
 * se lit mal à l'échelle d'un plateau de 30 m.
 */
export function boite(objets = []) {
  const poses = (objets || []).filter((o) => Number.isFinite(Number(o?.x)) && Number.isFinite(Number(o?.y)));
  if (!poses.length) return null;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const o of poses) {
    const x = nombre(o.x); const y = nombre(o.y);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + nombre(o.l, POSTE.l));
    y1 = Math.max(y1, y + nombre(o.h, POSTE.h));
  }
  return { x: x0, y: y0, l: x1 - x0, h: y1 - y0 };
}

/**
 * Le cadre que le dessin réclame — le plan suit le tracé, jamais l'inverse.
 *
 * PERSONNE NE TAPE LA TAILLE DE SON PLATEAU. On la tapait : deux champs
 * « largeur / profondeur » sous le plan, et un mur qui butait sur une bordure
 * invisible dès qu'on dépassait. Un éditeur de plan n'a pas de bord — la
 * feuille s'agrandit sous le crayon.
 *
 * TOUJOURS UNE MARGE DE BLANC : le cadre dépasse ce qui existe de `marge`
 * (6 m par défaut), donc il reste toujours de la place devant le crayon. Elle
 * est reprise quand le dessin rétrécit, mais seulement au-delà d'une marge de
 * jeu : sans ça, chaque poste glissé réécrirait le plan.
 *
 * Plancher à `PLAN`, plafond à `BORNES.max` (miroir du `check` SQL
 * `om_plan_cadre_check`, 20..2000) : au-delà, la base refuserait.
 *
 * @param {{murs?:Array, portes?:Array, boites?:Array}} contenu ce qui est posé.
 * @param {{plan?:object, marge?:number}} options le cadre actuel.
 * @returns {{largeur:number, hauteur:number}}
 */
export function cadreNecessaire(contenu = {}, options = {}) {
  const marge = Math.max(0, nombre(options.marge, 60));
  const actuel = planDe(options.plan);
  let x1 = 0; let y1 = 0;
  for (const ligne of contenu.murs || []) {
    for (const p of ligne || []) {
      const x = Array.isArray(p) ? nombre(p[0]) : nombre(p?.x);
      const y = Array.isArray(p) ? nombre(p[1]) : nombre(p?.y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  for (const o of contenu.portes || []) {
    x1 = Math.max(x1, nombre(o?.x) + nombre(o?.l) / 2);
    y1 = Math.max(y1, nombre(o?.y) + nombre(o?.l) / 2);
  }
  for (const b of contenu.boites || []) {
    if (!Number.isFinite(Number(b?.x))) continue;
    x1 = Math.max(x1, nombre(b.x) + nombre(b.l, POSTE.l));
    y1 = Math.max(y1, nombre(b.y) + nombre(b.h, POSTE.h));
  }
  const monte = (v, mini) => Math.min(
    BORNES.max,
    Math.max(mini, Math.ceil((v + marge) / 10) * 10),
  );
  const besoin = {
    largeur: monte(x1, PLAN.largeur),
    hauteur: monte(y1, PLAN.hauteur),
  };
  const tenir = (b, a) => (b > a || a - b > marge ? b : a);
  return {
    largeur: tenir(besoin.largeur, actuel.largeur),
    hauteur: tenir(besoin.hauteur, actuel.hauteur),
  };
}

/**
 * N postes en grille, centrés dans le plan.
 *
 * Le nombre de colonnes suit la largeur disponible, puis la racine : semer 24
 * postes doit donner 6 × 4, pas une file de 24 qui sort du plateau.
 */
export function semerGrille(nombrePostes, options = {}) {
  const n = Math.max(0, Math.floor(nombre(nombrePostes)));
  if (!n) return [];
  const plan = planDe(options.plan);
  const taille = { l: nombre(options.l, POSTE.l), h: nombre(options.h, POSTE.h) };
  const ecart = { x: nombre(options.ecartX, ECART.x), y: nombre(options.ecartY, ECART.y) };
  const tenables = Math.max(1, Math.floor(plan.largeur / ecart.x));
  const colonnes = Math.max(1, Math.min(nombre(options.colonnes, 0) || Math.ceil(Math.sqrt(n)), tenables, n));
  const lignes = Math.ceil(n / colonnes);
  const largeur = (colonnes - 1) * ecart.x + taille.l;
  const hauteur = (lignes - 1) * ecart.y + taille.h;
  const ox = aimanter(Math.max(0, (plan.largeur - largeur) / 2));
  const oy = aimanter(Math.max(0, (plan.hauteur - hauteur) / 2));
  const sortie = [];
  for (let i = 0; i < n; i += 1) {
    sortie.push(poserDans({
      x: ox + (i % colonnes) * ecart.x,
      y: oy + Math.floor(i / colonnes) * ecart.y,
      l: taille.l,
      h: taille.h,
      rot: 0,
    }, plan));
  }
  return sortie;
}

/**
 * Une banque de N postes à partir d'un point — le geste « îlot ».
 *
 * Dos à dos par défaut (`dos`), parce que c'est ainsi que sont montés les
 * plateaux : deux rangs collés, une seule circulation pour six personnes. En
 * `dos: false`, une simple file.
 */
export function ilot(depart, nombrePostes, options = {}) {
  const n = Math.max(0, Math.floor(nombre(nombrePostes)));
  if (!n) return [];
  const plan = planDe(options.plan);
  const taille = { l: nombre(options.l, POSTE.l), h: nombre(options.h, POSTE.h) };
  const dos = options.dos !== false;
  const vertical = options.sens === 'vertical';
  const pasLong = nombre(options.ecart, vertical ? ECART.y : ECART.x);
  const rangs = dos ? 2 : 1;
  const parRang = Math.ceil(n / rangs);
  const x0 = aimanter(nombre(depart?.x));
  const y0 = aimanter(nombre(depart?.y));
  const sortie = [];
  for (let i = 0; i < n; i += 1) {
    const rang = rangs === 1 ? 0 : Math.floor(i / parRang);
    const rangee = rangs === 1 ? i : i % parRang;
    // Le second rang est collé au premier, sans circulation entre eux : c'est
    // exactement ce que « dos à dos » veut dire, et ce qui fait tenir six
    // personnes dans la largeur d'un bureau et demi.
    const ecartRang = vertical ? taille.l : taille.h;
    sortie.push(poserDans({
      x: vertical ? x0 + rang * ecartRang : x0 + rangee * pasLong,
      y: vertical ? y0 + rangee * pasLong : y0 + rang * ecartRang,
      l: taille.l,
      h: taille.h,
      rot: 0,
    }, plan));
  }
  return sortie;
}

/**
 * Une sélection déplacée d'un même vecteur, aimantée et gardée dans le plan.
 *
 * Le décalage est aimanté UNE fois, sur le coin du lot, pas objet par objet :
 * sinon deux postes voisins à un pas impair se retrouveraient l'un sur l'autre
 * au relâcher, et un îlot dessiné avec soin se déferait au premier glissement.
 */
export function deplacer(objets = [], decalage = {}, options = {}) {
  const plan = planDe(options.plan);
  const pas = nombre(options.pas, PAS) || PAS;
  if (!objets.length) return [];
  // C'EST LE COIN DU LOT QUI TOMBE SUR LE CRAN, PAS CHAQUE POSTE. Aimanter
  // chaque objet déformait un bench posé zoomé (cran de 1 cm) puis glissé
  // dézoomé (cran de 20 cm) : chaque poste sautait vers SON cran, les écarts
  // se refermaient, et un bench tourné perdait sa forme. Le lot se déplace
  // donc d'un seul vecteur, choisi pour que le coin de sa boîte s'aligne.
  const b = boite(objets) || { x: 0, y: 0, l: 0, h: 0 };
  // Un axe qui a pris l'aimant d'un voisin (`libre`) ne repasse PAS par le
  // cran : la grille défairait le contact qu'on vient de trouver.
  const libre = options.libre || {};
  const dx = libre.x ? nombre(decalage.dx) : aimanter(b.x + nombre(decalage.dx), pas) - b.x;
  const dy = libre.y ? nombre(decalage.dy) : aimanter(b.y + nombre(decalage.dy), pas) - b.y;
  // Le lot bute ensemble : on borne le décalage sur la boîte, pas sur chaque
  // poste, sinon le bord du plan écraserait l'îlot contre la paroi.
  const dxOk = borner(dx, -b.x, Math.max(0, plan.largeur - (b.x + b.l)));
  const dyOk = borner(dy, -b.y, Math.max(0, plan.hauteur - (b.y + b.h)));
  // Deux décimales : 0,1 × 3 ne fait pas 0,3 en flottant, et le bruit finirait
  // par écarter deux postes qu'on voit collés.
  const net = (v) => Math.round(v * 100) / 100;
  return objets.map((o) => poserDans({
    ...o,
    x: net(nombre(o.x) + dxOk),
    y: net(nombre(o.y) + dyOk),
  }, plan));
}

/**
 * Le point du plan sous un pointeur.
 *
 * Le SVG est rendu en `xMidYMid meet` : l'échelle est la même en x et en y, et
 * le reste est du vide centré. On refait ce calcul plutôt que d'appeler
 * `getScreenCTM()`, qui n'existe ni en test ni à l'impression.
 */
export function versPlan(point, rect, plan) {
  const p = vueDe(plan);
  const largeurVue = nombre(rect?.width);
  const hauteurVue = nombre(rect?.height);
  if (largeurVue <= 0 || hauteurVue <= 0) return { x: 0, y: 0 };
  const echelle = Math.min(largeurVue / p.largeur, hauteurVue / p.hauteur);
  const margeX = (largeurVue - p.largeur * echelle) / 2;
  const margeY = (hauteurVue - p.hauteur * echelle) / 2;
  return {
    x: p.x + (nombre(point?.x) - nombre(rect?.left) - margeX) / echelle,
    y: p.y + (nombre(point?.y) - nombre(rect?.top) - margeY) / echelle,
  };
}

/**
 * L'inverse de `versPlan` : où tombe un point du plan sur l'écran.
 *
 * UNE ÉTIQUETTE QUI SE TAPE NE PEUT PAS VIVRE DANS LE SVG : le `viewBox` met
 * aussi les polices à l'échelle, et un champ de saisie deviendrait illisible
 * dès que le plateau grandit. Elle se pose donc en HTML par-dessus, en pixels,
 * et c'est cette fonction qui lui dit où.
 */
export function versEcran(point, rect, plan) {
  const p = vueDe(plan);
  const largeurVue = nombre(rect?.width);
  const hauteurVue = nombre(rect?.height);
  if (largeurVue <= 0 || hauteurVue <= 0) return { x: 0, y: 0 };
  const echelle = Math.min(largeurVue / p.largeur, hauteurVue / p.hauteur);
  return {
    x: (largeurVue - p.largeur * echelle) / 2 + (nombre(point?.x) - p.x) * echelle,
    y: (hauteurVue - p.hauteur * echelle) / 2 + (nombre(point?.y) - p.y) * echelle,
  };
}

/**
 * Combien d'unités de plan vaut UN PIXEL de l'écran.
 *
 * C'est la mesure qui manquait à l'éditeur. Tout ce qui sert à viser — un
 * sommet à prendre, un cran de grille, la distance d'accroche — se juge en
 * pixels, pas en mètres : une poignée de 1,7 unité fait 5 px de large sur un
 * plateau entier et couvre un bureau à fort zoom. En divisant par ce nombre,
 * une taille d'écran redevient une taille de plan, quel que soit le zoom.
 *
 * Même calcul que `versPlan` (le SVG est rendu en `xMidYMid meet`, donc c'est
 * le côté le plus contraint qui commande), mais pris à l'envers. Rend 0 tant
 * que rien n'est mesuré : l'appelant garde alors ses valeurs de repli.
 */
export function unitesParPixel(rect, plan) {
  const p = vueDe(plan);
  const largeurVue = nombre(rect?.width);
  const hauteurVue = nombre(rect?.height);
  if (largeurVue <= 0 || hauteurVue <= 0) return 0;
  return Math.max(p.largeur / largeurVue, p.hauteur / hauteurVue);
}

/** Le `viewBox` d'un plan. Une seule source, pour l'écran comme pour le papier. */
export function cadre(plan) {
  const p = vueDe(plan);
  return `${p.x} ${p.y} ${p.largeur} ${p.hauteur}`;
}

/**
 * Les postes sans géométrie, posés en grille sous les autres.
 *
 * `x` et `y` sont nullables exprès : une zone devient réservable sans dessin.
 * Le jour où l'éditeur s'ouvre, ces postes-là doivent apparaître quelque part
 * plutôt que nulle part — sous le plan existant, prêts à être rangés.
 */
export function placerManquants(postes = [], options = {}) {
  const plan = planDe(options.plan);
  const orphelins = postes.filter((p) => !Number.isFinite(Number(p?.x)) || !Number.isFinite(Number(p?.y)));
  if (!orphelins.length) return [];
  const poses = postes.filter((p) => !orphelins.includes(p));
  const b = boite(poses);
  const cases = semerGrille(orphelins.length, { ...options, plan });
  // On descend la grille entière sous ce qui existe déjà, en un seul décalage :
  // les nouveaux venus arrivent rangés, jamais par-dessus un îlot en place.
  const chute = b ? Math.max(0, aimanter(b.y + b.h + ECART.y) - cases[0].y) : 0;
  return orphelins.map((p, i) => ({ ...p, ...poserDans({ ...cases[i], y: cases[i].y + chute }, plan) }));
}

/**
 * Une dimension que la base accepte : strictement positive, sous 200, sans
 * notation exponentielle.
 *
 * `0.0000001` s'écrit `1e-7` en JSON, et le cast SQL le refuse (`22P02`) après
 * avoir perdu son `e` au nettoyage — une mise à l'échelle un peu brutale
 * suffisait à rendre le plan inécrivable. Deux décimales : le millimètre.
 */
function taillePropre(valeur, defaut) {
  const v = nombre(valeur, defaut);
  const arrondi = Math.round(v * 100) / 100;
  return Math.min(Math.max(arrondi, 0.1), BORNES.taille);
}

/**
 * Une coordonnée que la base accepte — ET QUI NE S'AIMANTE PAS ICI.
 *
 * Elle tombait au pas par défaut (20 cm) juste avant l'envoi : zoomé, le geste
 * posait au centimètre, l'écriture ramenait au cran du plan dézoomé, et le
 * bloc SAUTAIT AU LÂCHER. L'aimantation appartient au geste — `deplacer`,
 * `redimensionner`, `pivoter`, qui reçoivent le pas de l'œil — pas à
 * l'écriture, qui n'a qu'à rendre un nombre propre et dans le plan.
 */
function coordonneePropre(valeur) {
  return borner(Math.round(nombre(valeur) * 100) / 100, BORNES.min, BORNES.max);
}

/** La géométrie qu'on envoie à la base : quatre nombres et un angle, rien d'autre. */
export function geometrieDe(objet) {
  return {
    x: coordonneePropre(objet?.x),
    y: coordonneePropre(objet?.y),
    l: taillePropre(objet?.l, POSTE.l),
    h: taillePropre(objet?.h, POSTE.h),
    // MODULO POSITIF, TOUJOURS : le check de la base exige `rot >= 0`, et
    // tourner une sélection vers la gauche produit des angles négatifs.
    rot: ((Math.round(nombre(objet?.rot)) % 360) + 360) % 360,
  };
}

/** La taille d'une salle de réunion par défaut : 40 × 30 = 4 m × 3 m. */
export const SALLE = { l: 40, h: 30 };

/** Les plafonds des murs, miroir d'`om_plan_ecrire`. */
export const MURS = { lignes: 40, points: 100, total: 800 };

/**
 * Le rectangle entre deux points — le geste « je trace une zone ».
 *
 * On normalise : tirer vers le haut à gauche doit dessiner le même rectangle
 * que tirer vers le bas à droite. Un rectangle plus petit qu'un pas n'existe
 * pas (`null`) : un clic mal assuré ne crée pas une zone d'un centimètre.
 */
export function rectangleEntre(a, b, options = {}) {
  const plan = planDe(options.plan);
  const pas = nombre(options.pas, PAS) || PAS;
  const x0 = aimanter(borner(a?.x, 0, plan.largeur), pas);
  const y0 = aimanter(borner(a?.y, 0, plan.hauteur), pas);
  const x1 = aimanter(borner(b?.x, 0, plan.largeur), pas);
  const y1 = aimanter(borner(b?.y, 0, plan.hauteur), pas);
  const l = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  if (l < pas || h < pas) return null;
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), l, h };
}

/**
 * La zone qui contient un point — MIROIR de `om_postes_deplacer`.
 *
 * La base décide, mais l'écran doit annoncer la même chose avant l'aller-retour,
 * sinon le poste changerait d'étiquette une demi-seconde après qu'on l'a lâché.
 * Même règle des deux côtés : la PLUS PETITE zone qui contient le point, pour
 * qu'une salle dessinée dans un open space l'emporte sur l'open space.
 */
export function zoneDuPoint(point, zones = []) {
  const x = Number(point?.x); const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  let gagnante = null;
  for (const z of zones || []) {
    if (!Number.isFinite(Number(z?.x)) || !Number.isFinite(Number(z?.l))) continue;
    const zx = nombre(z.x); const zy = nombre(z.y);
    const zl = nombre(z.l); const zh = nombre(z.h);
    if (x < zx || x > zx + zl || y < zy || y > zy + zh) continue;
    if (!gagnante || zl * zh < nombre(gagnante.l) * nombre(gagnante.h)) gagnante = z;
  }
  return gagnante;
}

/** Le centre d'un objet posé — ce que la base regarde pour lui donner sa zone. */
export function centreDe(objet) {
  return {
    x: nombre(objet?.x) + nombre(objet?.l, POSTE.l) / 2,
    y: nombre(objet?.y) + nombre(objet?.h, POSTE.h) / 2,
  };
}

/**
 * Une polyligne nettoyée avant d'aller en base.
 *
 * Les points sont aimantés, les doublons consécutifs tombent — le tracé à main
 * levée d'un mur droit produit sinon quarante points identiques, et le plafond
 * des 800 sommets serait atteint par trois cloisons.
 */
export function murNet(points = [], options = {}) {
  const plan = planDe(options.plan);
  const pas = nombre(options.pas, PAS) || PAS;
  const sortie = [];
  for (const p of points || []) {
    const x = aimanter(borner(Array.isArray(p) ? p[0] : p?.x, 0, plan.largeur), pas);
    const y = aimanter(borner(Array.isArray(p) ? p[1] : p?.y, 0, plan.hauteur), pas);
    const dernier = sortie[sortie.length - 1];
    if (dernier && dernier[0] === x && dernier[1] === y) continue;
    sortie.push([x, y]);
    if (sortie.length >= MURS.points) break;
  }
  return sortie.length >= 2 ? sortie : null;
}

/** Le tracé SVG d'une polyligne de mur. */
export function traitDe(points = []) {
  if (!points || points.length < 2) return '';
  return points.map((p, i) => `${i ? 'L' : 'M'} ${p[0]} ${p[1]}`).join(' ');
}
