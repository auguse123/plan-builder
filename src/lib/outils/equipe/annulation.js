// Le plan — la pile d'annulation et le cache qu'on devance.
//
// UNE ENTRÉE = UN GESTE. Glisser à la fois trois murs, un bench et une zone
// écrit trois fois (le plan, les postes, les zones) ; si chaque écriture
// empilait sa propre entrée, Ctrl+Z ne défaisait qu'un tiers du geste. On
// ouvre donc un lot le temps du geste, et `fusionner` rassemble ce qui s'y
// mémorise — en gardant, pour chaque objet, l'état le plus ANCIEN.
//
// L'ÉTAT D'AVANT, PAS L'ACTION. Rejouer un état se trompe moins qu'inverser
// une action dès qu'un autre onglet a écrit entre-temps. Seule exception :
// `crees` (postes, salles) et `zonesCreees`, des ids qu'on vient de faire
// naître — les défaire, c'est les supprimer. C'est sans danger parce qu'ils sont neufs : la base refuse
// (`poste_occupe`) si quelqu'un a eu le temps de les réserver.
//
// Pas de React ici : la pile et le cache se testent seuls.

export const PILE_MAX = 30;

/** Une entrée vide ne s'empile pas. */
export function entreeVide(e) {
  return !e || (!e.plan && !e.postes?.length && !e.zones?.length
    && e.calque === undefined && !e.crees?.length && !e.zonesCreees?.length);
}

/** Des lignes `{id, …}` réunies, la PREMIÈRE vue d'un id gagnant. */
function unir(a = [], b = []) {
  const vus = new Set(a.map((o) => o.id));
  return [...a, ...b.filter((o) => !vus.has(o.id))];
}

/**
 * Deux entrées d'un même geste en une.
 *
 * `a` est la plus ancienne : c'est son état qu'on veut revoir. Un plan patché
 * deux fois garde les clés de `a` et prend de `b` celles que `a` ne portait
 * pas.
 */
export function fusionner(a, b) {
  if (entreeVide(a)) return b ? { ...b } : null;
  if (entreeVide(b)) return { ...a };
  const e = { ...a };
  if (b.plan) {
    e.plan = a.plan && a.plan.id === b.plan.id
      ? { id: a.plan.id, patch: { ...b.plan.patch, ...a.plan.patch } }
      : (a.plan || b.plan);
  }
  if (b.postes?.length) e.postes = unir(a.postes, b.postes);
  if (b.zones?.length) e.zones = unir(a.zones, b.zones);
  if (a.calque === undefined && b.calque !== undefined) e.calque = b.calque;
  if (b.crees?.length) e.crees = [...new Set([...(a.crees || []), ...b.crees])];
  if (b.zonesCreees?.length) {
    e.zonesCreees = [...new Set([...(a.zonesCreees || []), ...b.zonesCreees])];
  }
  return e;
}

/** La pile, une entrée de plus, bornée à `max`. */
export function empiler(pile = [], entree, max = PILE_MAX) {
  if (entreeVide(entree)) return pile;
  return [...pile, entree].slice(-max);
}

/**
 * Ce qu'il faudrait rejouer pour REFAIRE ce qu'une entrée défait.
 *
 * On relit l'état courant des mêmes objets, avant de rejouer l'entrée. Une
 * création défaite ne se refait pas : ses ids sont morts, et en semer de
 * nouveaux ferait mentir toute entrée plus récente qui les nomme — d'où
 * `null`, qui vide la pile de rétablissement.
 *
 * `etat` : `{ plan, postes, zones, calque }` — le plan courant, les postes ET
 * salles courants (géométrie), les zones courantes.
 */
export function inverse(entree, etat = {}) {
  if (entreeVide(entree) || entree.crees?.length || entree.zonesCreees?.length) return null;
  const e = {};
  if (entree.plan) {
    const patch = {};
    for (const cle of Object.keys(entree.plan.patch || {})) patch[cle] = etat.plan?.[cle];
    e.plan = { id: entree.plan.id, patch };
  }
  const releve = (lignes, source) => lignes
    .map((l) => {
      const s = (source || []).find((o) => o.id === l.id);
      if (!s) return null;
      const r = { id: s.id };
      for (const cle of Object.keys(l)) if (cle !== 'id') r[cle] = s[cle];
      return r;
    })
    .filter(Boolean);
  if (entree.postes?.length) e.postes = releve(entree.postes, etat.postes);
  if (entree.zones?.length) e.zones = releve(entree.zones, etat.zones);
  if (entree.calque !== undefined) e.calque = etat.calque ?? null;
  return entreeVide(e) ? null : e;
}

/**
 * La vue des postes (`om_postes_vue`) avec des géométries déjà posées.
 *
 * Sans ça, le poste lâché revenait à sa place d'avant le temps d'un aller-
 * retour réseau, puis sautait à la nouvelle. `lignes` : `{id, x, y, l, h, rot,
 * plan_id?}` — postes ET salles, qui passent par la même écriture.
 */
export function vueAvecGeometries(vue, lignes = []) {
  if (!vue || !lignes.length) return vue;
  const parId = new Map(lignes.map((g) => [g.id, g]));
  const poser = (liste) => (Array.isArray(liste)
    ? liste.map((o) => (parId.has(o.id) ? { ...o, ...parId.get(o.id) } : o))
    : liste);
  return { ...vue, postes: poser(vue.postes), salles: poser(vue.salles) };
}

/** La même chose pour les rectangles de zone. */
export function vueAvecZones(vue, lignes = []) {
  if (!vue || !lignes.length || !Array.isArray(vue.zones)) return vue;
  const parId = new Map(lignes.map((g) => [g.id, g]));
  return {
    ...vue,
    zones: vue.zones.map((z) => (parId.has(z.id) ? { ...z, ...parId.get(z.id) } : z)),
  };
}

/** Et pour un patch de plan : murs, portes, meubles, taille. */
export function vueAvecPatchPlan(vue, planId, patch = {}) {
  if (!vue || !planId || !Array.isArray(vue.plans)) return vue;
  return {
    ...vue,
    plans: vue.plans.map((p) => (p.id === planId ? { ...p, ...patch } : p)),
  };
}
