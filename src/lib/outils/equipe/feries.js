// Gestionnaire d'équipe — les jours fériés français.
//
// POURQUOI ÇA EXISTE. Le seul chiffre que l'outil produit est le PIC : combien
// de personnes au bureau le jour le plus chargé. Un lundi de Pentecôte compte
// zéro présent — pas parce que l'équipe télétravaille, mais parce que le bureau
// est fermé. Laissé dans la série, il tire la moyenne vers le bas, fabrique un
// « creux » qui n'en est pas un, et le dimensionnement conseille de rendre des
// postes sur la foi d'un jour où personne ne pouvait venir. Mai en fait quatre
// d'affilée certaines années : l'erreur n'est pas marginale.
//
// MIROIR SQL ↔ JS. `om_feries_fr(annee)` et `om_est_ferie_fr(jour)` (migration
// `2026-09-14-om-feries.sql`) refont exactement ce calcul côté base, parce que
// `om_espace_dimensionnement` compose le verdict écrit dans le lead. Les deux
// versions se modifient ENSEMBLE : sinon le chiffre affiché à l'écran et le
// chiffre reçu par le commercial divergent, et c'est le genre d'écart qu'on ne
// voit que devant le client.
//
// Heure LOCALE et clés `YYYY-MM-DD`, comme partout ici : `toISOString()` est
// banni, il ferait tomber le 1er janvier le 31 décembre à 23 h.
//
// Aucun import de `model.js` : c'est lui qui importe ce fichier, et un cycle
// entre les deux marcherait par chance (hoisting) jusqu'au jour où l'un des
// deux gagnerait une constante calculée au chargement. La clé de jour est donc
// refaite ici, en trois lignes.

const cle = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Dimanche de Pâques, algorithme de Meeus/Butcher (calendrier grégorien).
 *
 * Valable de 1583 à 4099 ; on ne borne pas, un espace ne remonte pas au XVIe
 * siècle. Rendu en date LOCALE à minuit, pas en UTC.
 */
export function paquesDe(annee) {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31); // 3 = mars, 4 = avril
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}

// Les huit dates fixes. Pas de jour férié local (Alsace-Moselle, outre-mer) :
// un espace n'a pas de région, et en inventer une pour deux départements
// coûterait un réglage de plus à l'écran le plus dépouillé de l'outil.
const FIXES = [
  [1, 1, 'Jour de l’an'],
  [5, 1, 'Fête du Travail'],
  [5, 8, 'Victoire 1945'],
  [7, 14, 'Fête nationale'],
  [8, 15, 'Assomption'],
  [11, 1, 'Toussaint'],
  [11, 11, 'Armistice'],
  [12, 25, 'Noël'],
];

// Décalages depuis le dimanche de Pâques. Le Vendredi saint n'y est pas : il
// n'est férié qu'en Alsace-Moselle.
const MOBILES = [
  [1, 'Lundi de Pâques'],
  [39, 'Ascension'],
  [50, 'Lundi de Pentecôte'],
];

const cache = new Map();

/**
 * Les onze fériés d'une année : `Map<'YYYY-MM-DD', nom>`.
 *
 * Mémoïsé par année — la fonction est appelée une fois par jour affiché, et un
 * historique « tout le temps » en affiche des centaines.
 */
export function feriesDe(annee) {
  const an = Number(annee);
  if (!Number.isFinite(an)) return new Map();
  const connu = cache.get(an);
  if (connu) return connu;
  const table = new Map();
  for (const [mois, jour, nom] of FIXES) {
    table.set(`${an}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`, nom);
  }
  const paques = paquesDe(an);
  for (const [decalage, nom] of MOBILES) {
    const d = new Date(paques.getFullYear(), paques.getMonth(), paques.getDate() + decalage);
    table.set(cle(d), nom);
  }
  cache.set(an, table);
  return table;
}

/**
 * Le nom du férié, ou `null`. Accepte une clé `YYYY-MM-DD` ou une `Date`.
 *
 * Rendre le NOM et pas un booléen : la colonne du planning l'affiche (« fermé —
 * Ascension »), et une case grise sans explication passe pour un bug.
 */
export function nomFerie(jour) {
  if (!jour) return null;
  const k = typeof jour === 'string' ? jour : cle(new Date(jour));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return null;
  return feriesDe(Number(k.slice(0, 4))).get(k) || null;
}

/** Vrai si le jour est férié. */
export function estFerie(jour) {
  return nomFerie(jour) !== null;
}
