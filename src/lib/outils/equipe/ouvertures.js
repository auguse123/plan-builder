/**
 * Les ouvertures d'un plan : portes, passages, fenêtres.
 *
 * UN MUR PLEIN EST UN PLAN FAUX. Un plateau sans porte ne dit pas par où on
 * entre, et deux salles séparées d'une cloison sans ouverture se lisent comme
 * deux étages. C'est la première chose qu'un lecteur cherche sur un plan.
 *
 * UNE OUVERTURE EST POSÉE SUR UN MUR, PAS DANS UNE LISTE DE MURS. Elle porte
 * son point, son cap et sa largeur — jamais l'index du mur qui la portait : cet
 * index survivrait mal à la suppression du mur d'à côté, et l'ouverture
 * sauterait sur une cloison qu'elle n'a jamais touchée. Le mur sert à viser au
 * moment du geste (`projeter`), après quoi l'ouverture tient toute seule.
 *
 * LE CÔTÉ EST UN DRAPEAU, PAS UN AUTRE CAP. Une porte s'ouvre d'un côté du mur
 * et d'un côté du gond : quatre poses pour un même trou. `m` (miroir) retourne
 * le battant par rapport au mur, `a + 180` retourne le gond. Le trou, lui, ne
 * bouge jamais — c'est ce qui permet de corriger une porte sans la reposer.
 *
 * `m` est ABSENT quand il vaut 0 : les plans déjà écrits restent lisibles mot
 * pour mot, et la base n'a qu'une clé facultative à valider.
 *
 * LE TYPE NE CHANGE QUE LE DESSIN, jamais la géométrie : une coulissante et une
 * battante occupent le même trou. Une liste fermée, miroir du `check` SQL de
 * `om_espace.plan_portes` — un type inventé ici passerait le navigateur et
 * serait refusé par la base.
 *
 * Unités de plan (1 unité = 10 cm), aucun pixel, aucun React.
 */
import { BORNES, borner } from '@/lib/outils/equipe/plan';

/** Les types posables. `l` est la largeur par défaut, en unités de plan. */
export const TYPES_OUVERTURE = [
  { cle: 'simple', nom: 'Porte simple', l: 9 },
  { cle: 'double', nom: 'Porte double', l: 16 },
  { cle: 'coulissante', nom: 'Porte coulissante', l: 12 },
  { cle: 'passage', nom: 'Passage libre', l: 12 },
  { cle: 'fenetre', nom: 'Fenêtre', l: 14 },
];

/** Combien d'ouvertures un plan accepte — même plafond qu'en base. */
export const OUVERTURES_MAX = 120;

/** Les largeurs tenables : 40 cm à 6 m. */
export const LARGEUR = { mini: 4, maxi: 60 };

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

function xy(p) {
  if (Array.isArray(p)) return { x: nombre(p[0]), y: nombre(p[1]) };
  return { x: nombre(p?.x), y: nombre(p?.y) };
}

/** Le type demandé, ou la porte simple : jamais `undefined` au dessin. */
export function typeOuverture(cle) {
  return TYPES_OUVERTURE.find((t) => t.cle === cle) || TYPES_OUVERTURE[0];
}

function capDegres(ax, ay, bx, by) {
  const brut = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  return Math.round(((brut % 360) + 360) % 360 * 100) / 100;
}

/**
 * Le point du mur le plus proche : l'ouverture s'y colle, cap compris.
 *
 * Elle prend le cap DU SEGMENT, jamais celui de la souris : une porte de
 * travers sur un mur droit est un défaut qu'on ne rattrape qu'à la main.
 *
 * @returns {{x:number,y:number,a:number,d:number}|null}
 */
export function projeter(murs = [], point, options = {}) {
  const seuil = nombre(options.seuil, 6);
  const p = xy(point);
  let mieux = null;
  for (const mur of murs || []) {
    const pts = Array.isArray(mur) ? mur : [];
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = xy(pts[i]);
      const b = xy(pts[i + 1]);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const carre = dx * dx + dy * dy;
      if (carre <= 0) continue;
      const t = borner(((p.x - a.x) * dx + (p.y - a.y) * dy) / carre, 0, 1);
      const qx = a.x + t * dx;
      const qy = a.y + t * dy;
      const d = Math.hypot(qx - p.x, qy - p.y);
      if (d <= seuil && (!mieux || d < mieux.d)) {
        mieux = {
          x: Math.round(qx * 10) / 10,
          y: Math.round(qy * 10) / 10,
          a: capDegres(a.x, a.y, b.x, b.y),
          d,
        };
      }
    }
  }
  return mieux;
}

/**
 * L'ouverture posée sous le doigt, ou `null` si aucun mur n'est assez près.
 *
 * Poser une porte dans le vide n'a pas de sens : sans mur, pas d'ouverture, et
 * le refus est silencieux — le curseur montrait déjà qu'il n'accrochait rien.
 *
 * @returns {{x:number,y:number,a:number,l:number,k:string}|null}
 */
export function poserOuverture(murs = [], point, options = {}) {
  const type = typeOuverture(options.type);
  const sur = projeter(murs, point, options);
  if (!sur) return null;
  return {
    x: sur.x, y: sur.y, a: sur.a, k: type.cle, l: nombre(options.largeur, type.l) || type.l,
  };
}

/** L'ouverture glissée : elle reste sur un mur, sinon elle ne bouge pas. */
export function deplacerOuverture(ouverture, murs = [], point, options = {}) {
  const o = nettoyerOuverture(ouverture);
  if (!o) return null;
  const sur = projeter(murs, point, options);
  if (!sur) return o;
  return { ...o, x: sur.x, y: sur.y, a: sur.a };
}

/** Les deux bouts d'une ouverture : ce qui se dessine, et ce qui se clique. */
export function bornesOuverture(ouverture) {
  const o = nettoyerOuverture(ouverture);
  if (!o) return null;
  const rad = (o.a * Math.PI) / 180;
  const dx = (Math.cos(rad) * o.l) / 2;
  const dy = (Math.sin(rad) * o.l) / 2;
  return { a: { x: o.x - dx, y: o.y - dy }, b: { x: o.x + dx, y: o.y + dy } };
}

/** L'ouverture sous le doigt, ou -1. Le seuil est en unités de plan. */
export function ouvertureProche(liste = [], point, options = {}) {
  const seuil = nombre(options.seuil, 4);
  const p = xy(point);
  let index = -1;
  let mieux = Infinity;
  (liste || []).forEach((o, i) => {
    const b = bornesOuverture(o);
    if (!b) return;
    const dx = b.b.x - b.a.x;
    const dy = b.b.y - b.a.y;
    const carre = dx * dx + dy * dy;
    const t = carre > 0 ? borner(((p.x - b.a.x) * dx + (p.y - b.a.y) * dy) / carre, 0, 1) : 0;
    const d = Math.hypot(b.a.x + t * dx - p.x, b.a.y + t * dy - p.y);
    if (d <= seuil && d < mieux) { mieux = d; index = i; }
  });
  return index;
}

/**
 * Une ouverture relue : ce que la base accepterait, ou `null`.
 *
 * MIROIR DU `check` DE `om_plan_ecrire`. Le navigateur refuse d'abord pour que
 * l'erreur porte un sens ; la base refuse ensuite parce qu'elle seule tranche.
 */
export function nettoyerOuverture(brut) {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null;
  const type = TYPES_OUVERTURE.find((t) => t.cle === brut.k);
  if (!type) return null;
  const x = nombre(brut.x, -1);
  const y = nombre(brut.y, -1);
  if (x < 0 || x > BORNES.max || y < 0 || y > BORNES.max) return null;
  const a = ((nombre(brut.a) % 360) + 360) % 360;
  const l = borner(nombre(brut.l, type.l) || type.l, LARGEUR.mini, LARGEUR.maxi);
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    a: Math.round(a * 100) / 100,
    l: Math.round(l * 10) / 10,
    k: type.cle,
    ...(brut.m ? { m: 1 } : {}),
  };
}

/**
 * La porte retournée : de l'autre côté du mur, ou gond à l'autre jambage.
 *
 * `cote` bascule le miroir, `charniere` fait un demi-tour ET bascule le miroir
 * — le demi-tour seul retournerait les deux axes à la fois. Le trou ne bouge
 * pas : mêmes x, y, largeur, même mur.
 */
export function retournerOuverture(ouverture, quoi = 'cote') {
  const o = nettoyerOuverture(ouverture);
  if (!o) return null;
  const miroir = o.m ? 0 : 1;
  if (quoi === 'charniere') {
    return nettoyerOuverture({ ...o, a: (o.a + 180) % 360, m: miroir });
  }
  return nettoyerOuverture({ ...o, m: miroir });
}

/** La liste prête à partir : les intruses tombent, le plafond tient. */
export function nettoyerOuvertures(liste = []) {
  return (Array.isArray(liste) ? liste : [])
    .map(nettoyerOuverture)
    .filter(Boolean)
    .slice(0, OUVERTURES_MAX);
}

/**
 * L'ouverture tirée par un bout : sa largeur change, l'autre bout ne bouge pas.
 *
 * C'EST LE BOUT OPPOSÉ QUI SERT D'ANCRE. Tirer depuis le milieu élargirait des
 * deux côtés à la fois : on croit ajuster un jambage, on déplace la porte. Le
 * cap ne change pas — une ouverture reste dans son mur.
 */
export function etirerOuverture(ouverture, bout, point) {
  const o = nettoyerOuverture(ouverture);
  if (!o) return null;
  const b = bornesOuverture(o);
  const fixe = bout === 'a' ? b.b : b.a;
  const rad = (o.a * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const p = xy(point);
  const t = (p.x - fixe.x) * ux + (p.y - fixe.y) * uy;
  const l = borner(Math.abs(t), LARGEUR.mini, LARGEUR.maxi);
  const signe = t < 0 || (t === 0 && bout === 'b') ? -1 : 1;
  return nettoyerOuverture({
    ...o, l, x: fixe.x + (ux * signe * l) / 2, y: fixe.y + (uy * signe * l) / 2,
  }) || o;
}
