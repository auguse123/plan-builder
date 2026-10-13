/**
 * La mise à l'échelle d'un plan entier, depuis un segment dont on sait la
 * mesure. JS pur, unités de plan (1 unité = 10 cm), ni React ni Supabase.
 *
 * UN PLAN RELEVÉ N'EST JAMAIS À L'ÉCHELLE. On trace au jugé sur un calque, ou
 * on importe un SVG dont personne ne connaît l'unité ; le plan est juste de
 * forme et faux de taille. Corriger mur par mur, c'est vingt saisies et vingt
 * occasions de déformer la pièce.
 *
 * ON DÉCLARE UNE SEULE LONGUEUR, TOUT SUIT. « Ce segment fait 12 m » donne un
 * facteur, et ce facteur s'applique à tout — murs, portes, postes, salles,
 * zones — d'un seul geste. Les proportions sont conservées : c'est la seule
 * correction qui ne rende pas le plan plus faux qu'avant.
 *
 * ON HOMOTHÉTIE AUTOUR DU COIN HAUT-GAUCHE DE CE QUI EXISTE, puis on recolle
 * dans le cadre. Autour de l'origine, un plan dessiné au milieu partirait vers
 * le bas à droite et sortirait ; autour du centre du cadre, il dériverait à
 * chaque correction. Le coin du dessin est le seul repère stable.
 *
 * RIEN NE SORT DU CADRE, OU RIEN NE BOUGE. Un facteur trop grand écrêterait
 * les murs contre la bordure et déformerait la pièce sans le dire : on refuse
 * (`null`), l'écran propose d'agrandir le plan d'abord.
 *
 * SAUF EN MODE SOUPLE, OÙ LE DESSIN PRIME SUR LES MEUBLES. La feuille suit
 * désormais le crayon (`cadreNecessaire`) : refuser une mise à l'échelle parce
 * qu'un bureau dépasserait 20 m ou qu'un rectangle sortirait d'un bord, c'était
 * refuser presque toutes — et l'écran ne disait que « hors de portée ». En
 * souple, les murs commandent : le dessin recolle contre le bord, et ce qui
 * bute sur une borne de table (`l`, `h`, largeur de porte) s'y arrête sans
 * emporter le reste. Seul un plan qui ne tiendrait plus du tout est refusé.
 */
import { BORNES, PLAN } from '@/lib/outils/equipe/plan';
import { LARGEUR } from '@/lib/outils/equipe/ouvertures';

/** Les facteurs qu'on accepte : au-delà, c'est une faute de frappe. */
export const FACTEUR = { mini: 0.02, maxi: 50 };

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

function xy(p) {
  if (Array.isArray(p)) return { x: nombre(p[0]), y: nombre(p[1]) };
  return { x: nombre(p?.x), y: nombre(p?.y) };
}

function planDe(plan) {
  return {
    largeur: Math.min(Math.max(nombre(plan?.largeur, PLAN.largeur), 20), BORNES.max),
    hauteur: Math.min(Math.max(nombre(plan?.hauteur, PLAN.hauteur), 20), BORNES.max),
  };
}

/** Deux décimales : un dixième de millimètre n'existe pas sur un plan. */
function net(v) {
  return Math.round(nombre(v) * 100) / 100;
}

/**
 * Le facteur qui amène `actuelle` sur `cible`, ou `null`.
 *
 * Les deux longueurs sont en unités de plan. Un segment de longueur nulle n'a
 * pas d'échelle : on ne divise pas par lui.
 */
export function facteurEchelle(actuelle, cible) {
  const a = nombre(actuelle);
  const c = nombre(cible);
  if (a <= 0 || c <= 0) return null;
  const k = c / a;
  if (k < FACTEUR.mini || k > FACTEUR.maxi) return null;
  return k;
}

/**
 * Tout le plan multiplié par `k`, ou `null` s'il n'entre plus.
 *
 * LE CALQUE SUIT, SINON IL MENT. Une image de fond n'est pas un objet du plan
 * — on ne la déplace pas, on ne la coche pas — mais elle porte la même échelle
 * que le tracé qu'on a relevé dessus. La laisser en place pendant que tout le
 * reste double, c'est décoller le dessin de son modèle sans le dire. Elle
 * passe donc par la même transformation, sans être écrêtée : elle n'a pas de
 * bornes de table à tenir.
 *
 * @param {{murs?:Array, portes?:Array, boites?:Array, calque?:object}} plan ce
 *   qu'il y a à l'écran : les lignes de murs (`[[x,y], …]`), les ouvertures
 *   (`x,y,a,l,k`), les rectangles (postes, salles, zones : `id,x,y,l,h`) et
 *   l'image de fond (`x,y,l,h`), s'il y en a une.
 * @param {number} k le facteur, de `facteurEchelle`.
 * @param {{plan?:{largeur:number,hauteur:number}, souple?:boolean}} options le
 *   cadre à tenir, et `souple` pour écrêter les meubles plutôt que tout refuser.
 * @returns {{murs:Array, portes:Array, boites:Array, calque:object|null}|null}
 */
export function mettreAEchelle(plan, k, options = {}) {
  const f = nombre(k);
  if (f <= 0 || f < FACTEUR.mini || f > FACTEUR.maxi) return null;
  const cadre = planDe(options.plan);
  const murs = (plan?.murs || []).map((ligne) => (ligne || []).map(xy));
  const portes = (plan?.portes || []).map((o) => ({ ...o, ...xy(o) }));
  const boites = (plan?.boites || []).map((b) => ({
    ...b, ...xy(b), l: nombre(b?.l), h: nombre(b?.h),
  }));
  const calque = plan?.calque
    ? { ...plan.calque, ...xy(plan.calque), l: nombre(plan.calque.l), h: nombre(plan.calque.h) }
    : null;

  // Le coin haut-gauche de ce qui existe : le point qui ne bouge pas.
  let x0 = Infinity; let y0 = Infinity;
  const vus = [
    ...murs.flat(),
    ...portes,
    ...boites,
  ];
  for (const p of vus) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); }
  if (!Number.isFinite(x0)) return null;

  const mise = (p) => ({ x: net(x0 + (p.x - x0) * f), y: net(y0 + (p.y - y0) * f) });

  const apresMurs = murs.map((ligne) => ligne.map((p) => {
    const q = mise(p);
    return [q.x, q.y];
  }));
  const apresPortes = portes.map((o) => ({ ...o, ...mise(o), l: net(nombre(o.l) * f) }));
  const apresBoites = boites.map((b) => ({
    ...b, ...mise(b), l: net(b.l * f), h: net(b.h * f),
  }));
  // Le calque ne pèse pas sur `x0` — il n'est pas du dessin, il est dessous —
  // mais il subit le même `mise` : c'est ce qui garde le tracé SUR son modèle.
  const apresCalque = calque
    ? { ...calque, ...mise(calque), l: net(calque.l * f), h: net(calque.h * f) }
    : null;

  // Les refus : dehors, trop grand, trop petit. Un plan à moitié écrêté serait
  // faux sans le dire — mieux vaut ne rien écrire.
  const dansLeCadre = (p, l = 0, h = 0) => p.x >= 0 && p.y >= 0
    && p.x + l <= cadre.largeur && p.y + h <= cadre.hauteur;
  if (!options.souple) {
    for (const ligne of apresMurs) {
      for (const [x, y] of ligne) if (!dansLeCadre({ x, y })) return null;
    }
    for (const o of apresPortes) {
      if (!dansLeCadre(o)) return null;
      if (o.l < LARGEUR.mini || o.l > LARGEUR.maxi) return null;
    }
    for (const b of apresBoites) {
      if (!dansLeCadre(b, b.l, b.h)) return null;
      if (b.l <= 0 || b.h <= 0 || b.l > BORNES.taille || b.h > BORNES.taille) return null;
    }
    return {
      murs: apresMurs, portes: apresPortes, boites: apresBoites, calque: apresCalque,
    };
  }

  // En souple, on écrête les bornes de table plutôt que de refuser le geste.
  const borne = (v, mini, maxi) => Math.min(Math.max(net(v), mini), maxi);
  const portesNettes = apresPortes.map((o) => ({ ...o, l: borne(o.l, LARGEUR.mini, LARGEUR.maxi) }));
  const boitesNettes = apresBoites.map((b) => ({
    ...b, l: borne(b.l, 0.1, BORNES.taille), h: borne(b.h, 0.1, BORNES.taille),
  }));

  // Ce qui dépasse le bord se recolle EN BLOC : décaler tout le plan garde les
  // proportions, écrêter les seuls points fautifs les casserait.
  let dx = 0; let dy = 0;
  let maxX = -Infinity; let maxY = -Infinity;
  const tous = [
    ...apresMurs.flat().map(([x, y]) => ({ x, y, l: 0, h: 0 })),
    ...portesNettes.map((o) => ({ x: o.x, y: o.y, l: 0, h: 0 })),
    ...boitesNettes.map((b) => ({ x: b.x, y: b.y, l: b.l, h: b.h })),
  ];
  for (const p of tous) {
    maxX = Math.max(maxX, p.x + p.l);
    maxY = Math.max(maxY, p.y + p.h);
  }
  if (maxX > cadre.largeur) dx = cadre.largeur - maxX;
  if (maxY > cadre.hauteur) dy = cadre.hauteur - maxY;
  // Un dessin plus large que le cadre entier ne se recolle nulle part.
  if (x0 + dx < 0 || y0 + dy < 0) return null;
  const glisser = (p) => ({ x: net(p.x + dx), y: net(p.y + dy) });
  return {
    murs: apresMurs.map((ligne) => ligne.map(([x, y]) => {
      const q = glisser({ x, y });
      return [q.x, q.y];
    })),
    portes: portesNettes.map((o) => ({ ...o, ...glisser(o) })),
    boites: boitesNettes.map((b) => ({ ...b, ...glisser(b) })),
    calque: apresCalque ? { ...apresCalque, ...glisser(apresCalque) } : null,
  };
}
