/**
 * LES COUCHES DU PLAN : ce qu'on montre, ce qu'on peut prendre.
 *
 * Un plan chargé se retouche mal : on vise une cloison, on attrape le bureau
 * posé devant. Chaque couche se MASQUE (elle ne se dessine plus) ou se
 * VERROUILLE (elle se voit, mais ni clic ni bande élastique ne la prennent).
 *
 * Pas « calque » : le mot désigne déjà la photo de fond du plan.
 *
 * L'état est une préférence de qui dessine, pas une donnée du plan : il vit
 * dans le navigateur, et ce module ne fait que le relire sans le croire.
 */

export const COUCHES = [
  { cle: 'murs', nom: 'Murs et ouvertures' },
  { cle: 'mobilier', nom: 'Mobilier' },
  { cle: 'postes', nom: 'Postes et salles' },
  { cle: 'zones', nom: 'Zones' },
  { cle: 'pieces', nom: 'Surfaces des pièces' },
];

/** Un état relu (localStorage, JSON quelconque) : toutes les couches, des booléens. */
export function couchesNettes(brut) {
  const src = brut && typeof brut === 'object' ? brut : {};
  return Object.fromEntries(COUCHES.map(({ cle }) => {
    const c = src[cle] && typeof src[cle] === 'object' ? src[cle] : {};
    return [cle, { vu: c.vu !== false, verrou: c.verrou === true }];
  }));
}

/** Inverse `drapeau` ('vu' ou 'verrou') d'une couche. */
export function basculerCouche(etat, cle, drapeau) {
  const net = couchesNettes(etat);
  if (!net[cle] || !['vu', 'verrou'].includes(drapeau)) return net;
  return { ...net, [cle]: { ...net[cle], [drapeau]: !net[cle][drapeau] } };
}

/** Ce qu'on peut prendre : vu ET pas verrouillé. */
export function prenable(etat, cle) {
  const c = couchesNettes(etat)[cle];
  return Boolean(c && c.vu && !c.verrou);
}

/** Combien de couches s'écartent du défaut — pour le dire sur le bouton. */
export function couchesTouchees(etat) {
  const net = couchesNettes(etat);
  return COUCHES.filter(({ cle }) => !net[cle].vu || net[cle].verrou).length;
}
