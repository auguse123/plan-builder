/**
 * Le mobilier d'un plan : ce qui meuble, et qui ne se réserve pas.
 *
 * UN MEUBLE N'EST PAS UNE RESSOURCE. Les deux familles de blocs posées jusqu'ici
 * — le poste qu'on sème, la salle qu'on pose — se réservent : elles entrent dans
 * les compteurs d'occupation, dans les quotas, dans le dimensionnement. Un
 * canapé, une bibliothèque, une plante n'accueillent personne. En faire des
 * ressources aurait gonflé la capacité de l'espace d'une dizaine de places
 * imaginaires, et le rapport d'usage aurait menti.
 *
 * LE DÉCOR EST DONC DU PLAN, comme les murs et les portes : une liste jsonb sur
 * `om_plan`, écrite par le même `om_plan_patch`, rendue par les mêmes vues. Il
 * se déplace, se tourne, se redimensionne avec les mêmes gestes que le reste —
 * `deplacer`, `pivoter`, `redimensionner` de `plan.js` — parce que ce n'est
 * qu'un rectangle orienté de plus.
 *
 * LA CLÉ DIT LE DESSIN, LA BASE N'EN GARDE QUE LE GRAIN. `k` renvoie au
 * catalogue de `blocs.js` : c'est lui qui sait qu'un `canape-3` se dessine en
 * canapé et qu'une `table-ronde-6` est un disque. La base ne valide que la forme
 * de la clé, jamais la liste — sinon chaque nouveau meuble au catalogue serait
 * une migration. Le prix : une clé peut devenir inconnue si on renomme chez
 * nous. D'où `n`, le nom gardé avec le meuble : une clé inconnue se dessine en
 * rectangle nommé, elle ne DISPARAÎT PAS du plan de quelqu'un.
 *
 * Miroir du bloc `meubles` d'`om_plan_patch` : mêmes bornes, mêmes plafonds.
 *
 * Unités de plan (1 unité = 10 cm), aucun pixel, aucun React.
 */
import { BORNES, borner } from '@/lib/outils/equipe/plan';

/** Combien de meubles un plan accepte — même plafond qu'en base. */
export const MEUBLES_MAX = 400;

/** Les côtés possibles d'un meuble, en unités de plan : 10 cm à 40 m. */
export const COTE_MEUBLE = { mini: 1, maxi: 400 };

/** Ce qu'une clé de catalogue a le droit d'être — miroir du `!~` SQL. */
const CLE = /^[a-z0-9-]{1,40}$/;

/** Le nom gardé au meuble ne dépasse pas ce que la base accepte. */
const NOM_MAX = 60;

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

const net = (n) => Math.round(n * 100) / 100;

/**
 * Un meuble propre, ou `null`.
 *
 * `rot` est TOUJOURS ÉCRIT, même à zéro : contrairement au miroir `m` d'une
 * ouverture, il n'y a pas de plans déjà en base à ménager, et un angle absent
 * obligerait chaque lecteur à le deviner.
 */
export function nettoyerMeuble(brut) {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null;
  const k = typeof brut.k === 'string' ? brut.k.trim() : '';
  if (!CLE.test(k)) return null;
  const x = nombre(brut.x, -1);
  const y = nombre(brut.y, -1);
  if (x < BORNES.min || x > BORNES.max || y < BORNES.min || y > BORNES.max) return null;
  const l = borner(nombre(brut.l, 0), COTE_MEUBLE.mini, COTE_MEUBLE.maxi);
  const h = borner(nombre(brut.h, 0), COTE_MEUBLE.mini, COTE_MEUBLE.maxi);
  const n = typeof brut.n === 'string' ? brut.n.trim().slice(0, NOM_MAX) : '';
  return {
    k,
    x: net(x),
    y: net(y),
    l: net(l),
    h: net(h),
    rot: ((Math.round(nombre(brut.rot)) % 360) + 360) % 360,
    ...(n ? { n } : {}),
  };
}

/** La liste qu'on écrit : les meubles lisibles, dans la limite de la base. */
export function nettoyerMeubles(liste = []) {
  return (Array.isArray(liste) ? liste : [])
    .map(nettoyerMeuble)
    .filter(Boolean)
    .slice(0, MEUBLES_MAX);
}
