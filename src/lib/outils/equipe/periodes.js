// Gestionnaire d'équipe — les périodes d'observation.
//
// Un seul endroit décide ce que veut dire « ce mois-ci » ou « le trimestre ».
// Tout est en heure LOCALE et en clés `YYYY-MM-DD`, comme le reste de l'outil :
// `toISOString()` est banni ici aussi, il ferait commencer octobre le 30
// septembre à 22 h.
//
// DEUX BORNES, PAS UNE LISTE DE JOURS. Le reste de l'outil demande ses données
// par liste de clés (`filterIn('jour', …)`) parce qu'une semaine fait cinq clés.
// Un historique ne peut pas : un trimestre en fait quatre-vingt-dix, « tout le
// temps » n'en a aucune. La façade sait pourtant filtrer un intervalle — pas par
// `filter()`, mais par `listAll({ advFilters: [{ op: 'between' }] })`, qui
// traverse le même chemin PostgREST que les filtres de `DataView`. C'est cette
// porte-là qu'on emprunte, aucune n'a été ouverte pour l'occasion.
//
// « Tout le temps » ne rend PAS de bornes : il rend `null`, et la couche de
// données se contente alors d'un `filter({ espace_id })` sans condition de date.
// Une date plancher inventée (« depuis 1970 ») aurait marché aussi, et aurait
// menti dans l'index dès qu'une ligne aurait porté une date aberrante.

import { ajouterJours, cleJour, JOURS, jourDepuisCle, JOURS_OUVRES_DEFAUT, lundiDe, raisonFermeture } from './model';

export const PERIODES = [
  { cle: 'semaine', label: 'Semaine', navigable: true, feminin: true },
  { cle: 'mois', label: 'Mois', navigable: true },
  { cle: 'trimestre', label: 'Trimestre', navigable: true },
  { cle: 'annee', label: 'Année', navigable: true, feminin: true },
  { cle: 'tout', label: 'Tout', navigable: false },
  { cle: 'intervalle', label: 'Intervalle', navigable: false },
];

// Le plafond serveur, en dur, parce qu'il n'est pas négociable : `om_espace_vue`
// lève `periode_trop_longue` au-delà de 400 jours. Il vaut mieux qu'un écran
// refuse poliment une fenêtre de trois ans plutôt que de la demander et
// d'afficher un message d'erreur technique à un office manager.
export const PLAFOND_FENETRE_JOURS = 400;

// Le groupe a le sien, plus court : `om_groupe_vue` rend les présences de SIX
// espaces d'un coup, et 400 jours × six sites, c'est un téléchargement qu'on
// n'ose pas envoyer à un navigateur. Miroir de `periode_trop_longue` dans
// `2026-09-25-om-groupes.sql`.
export const PLAFOND_FENETRE_GROUPE = 120;

// « Tout » n'a pas de bornes, et l'usage se calcule TOUJOURS sur une fenêtre
// bornée : le dimensionnement compare un pic à un nombre de postes, or un pic
// « depuis toujours » ne dit plus rien de l'occupation d'aujourd'hui. Les cinq
// autres suffisent, la dernière laissant choisir n'importe quel créneau.
export const PERIODES_USAGE = PERIODES.filter((p) => p.cle !== 'tout');

/**
 * Est-ce que ces bornes peuvent être demandées à la base ?
 *
 * Trois refus possibles : pas de bornes du tout, un intervalle à moitié saisi,
 * et une fenêtre plus longue que ce que le serveur accepte. Les trois se
 * répondent avant l'aller-retour, pas après.
 */
export function fenetreInterrogeable(bornes = {}, plafond = PLAFOND_FENETRE_JOURS) {
  if (!bornes.debut || !bornes.fin || bornes.partielle) return false;
  return joursEntre(bornes.debut, bornes.fin) <= plafond;
}

/**
 * Le nom d'une fenêtre, tel qu'il se lit dans une phrase.
 *
 * Les bornes portent déjà leur libellé, mais « 8 – 14 sept. 2026 » seul ne dit
 * pas qu'il s'agit d'une semaine. Le mois, le trimestre et l'année se nomment
 * eux-mêmes ; la semaine et l'intervalle ont besoin qu'on le dise.
 */
export function libelleFenetre(cle, bornes = {}) {
  if (!bornes.label) return '—';
  if (cle === 'semaine') return `Semaine du ${bornes.label}`;
  return bornes.label;
}

/** Nombre de jours entre deux clés, bornes incluses. */
export function joursEntre(debutCle, finCle) {
  const a = jourDepuisCle(debutCle);
  const b = jourDepuisCle(finCle);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

const MOIS_LONGS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Dernier jour du mois de `date`, en local (le 0 du mois suivant). */
function finDeMois(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** Numéro de trimestre civil, 1 à 4. Un « trimestre » en français des affaires
 *  est celui du calendrier, pas trois mois glissants. */
export function numeroTrimestre(date) {
  return Math.floor(new Date(date).getMonth() / 3) + 1;
}

/**
 * Bornes d'une période, en clés `YYYY-MM-DD` incluses des deux côtés.
 *
 * `ancre` est n'importe quel jour DANS la période voulue — c'est ce qui permet
 * aux flèches de ne déplacer qu'une date au lieu de recalculer deux bornes.
 * Rend `{ debut: null, fin: null }` pour « tout », qui n'a pas de bornes.
 */
export function bornesPeriode(cle, ancre = new Date(), intervalle = {}) {
  const d = new Date(ancre);

  if (cle === 'tout') {
    return { cle, debut: null, fin: null, label: 'Depuis le début' };
  }

  if (cle === 'intervalle') {
    // Deux dates saisies à la main arrivent dans n'importe quel ordre : on les
    // remet à l'endroit plutôt que de rendre une période vide sans le dire.
    const a = intervalle.debut || '';
    const b = intervalle.fin || '';
    // `partielle` est ce que les bornes seules ne peuvent pas dire. Un intervalle
    // vide rend deux `null`, exactement comme « tout » ; un intervalle à moitié
    // saisi recopie la date connue des deux côtés pour rester cohérent. Sans ce
    // drapeau, le premier affichait TOUT l'historique et le second une journée,
    // l'un comme l'autre sous un libellé qui annonce le contraire.
    if (!a || !b) {
      return { cle, debut: a || b || null, fin: b || a || null, label: 'Intervalle à choisir', partielle: true };
    }
    const [debut, fin] = a <= b ? [a, b] : [b, a];
    return { cle, debut, fin, label: `${libelleJour(debut)} – ${libelleJour(fin)}` };
  }

  if (cle === 'annee') {
    const premier = new Date(d.getFullYear(), 0, 1);
    const dernier = new Date(d.getFullYear(), 11, 31);
    return {
      cle,
      debut: cleJour(premier),
      fin: cleJour(dernier),
      label: String(premier.getFullYear()),
    };
  }

  if (cle === 'mois') {
    const premier = new Date(d.getFullYear(), d.getMonth(), 1);
    return {
      cle,
      debut: cleJour(premier),
      fin: cleJour(finDeMois(premier)),
      label: `${MOIS_LONGS[premier.getMonth()]} ${premier.getFullYear()}`,
    };
  }

  if (cle === 'trimestre') {
    const t = numeroTrimestre(d);
    const premier = new Date(d.getFullYear(), (t - 1) * 3, 1);
    const dernier = finDeMois(new Date(d.getFullYear(), (t - 1) * 3 + 2, 1));
    return {
      cle,
      debut: cleJour(premier),
      fin: cleJour(dernier),
      label: `T${t} ${premier.getFullYear()} · ${MOIS_COURTS[premier.getMonth()]} – ${MOIS_COURTS[dernier.getMonth()]}`,
    };
  }

  // Défaut : la semaine, du lundi au dimanche. On borne sur la semaine ENTIÈRE
  // et non sur les seuls jours ouvrés — une réunion posée un samedi existe, et
  // la masquer ferait mentir le total d'heures.
  const lundi = lundiDe(d);
  const dimanche = ajouterJours(lundi, 6);
  return {
    cle: 'semaine',
    debut: cleJour(lundi),
    fin: cleJour(dimanche),
    label: libelleEtendue(lundi, dimanche),
  };
}

/** « 8 – 14 sept. 2026 », sans répéter le mois quand il est le même. */
function libelleEtendue(a, b) {
  const memeMois = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (memeMois) return `${a.getDate()} – ${b.getDate()} ${MOIS_COURTS[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()} ${MOIS_COURTS[a.getMonth()]} – ${b.getDate()} ${MOIS_COURTS[b.getMonth()]} ${b.getFullYear()}`;
}

/**
 * « 14 sept. 2026 » depuis une clé.
 *
 * Le test de forme n'est pas de la coquetterie : `jourDepuisCle('')` ne rend pas
 * une date invalide mais le 1er janvier 1900 (les `Number('')` valent zéro).
 * Sans lui, une réservation dont `jour` manque s'afficherait dans le journal
 * avec une date parfaitement plausible et parfaitement fausse.
 */
export function libelleJour(cle) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(cle || ''))) return '—';
  const d = jourDepuisCle(cle);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Déplace l'ancre d'une période dans un sens (-1 = précédent, +1 = suivant).
 *
 * Un mois se décale par le 1er et un trimestre par son premier mois : partir du
 * jour courant ferait sauter le 31 mars au 1er mai. Les périodes non navigables
 * rendent l'ancre inchangée, ce qui laisse les flèches sans effet plutôt que de
 * les faire disparaître de l'écran au changement de période.
 */
export function decalerPeriode(cle, ancre, sens) {
  const d = new Date(ancre);
  const pas = sens < 0 ? -1 : 1;
  if (cle === 'semaine') return ajouterJours(lundiDe(d), pas * 7);
  if (cle === 'mois') return new Date(d.getFullYear(), d.getMonth() + pas, 1);
  if (cle === 'trimestre') return new Date(d.getFullYear(), (numeroTrimestre(d) - 1) * 3 + pas * 3, 1);
  if (cle === 'annee') return new Date(d.getFullYear() + pas, 0, 1);
  return d;
}

// Dix ans de jours ouvrés, c'est déjà plus que l'âge de n'importe quelle société
// qui installerait cet outil. Le plafond n'est pas une limite de produit, c'est
// un garde-fou : une faute de frappe dans le champ « du » (1900 au lieu de 2026)
// fabriquerait sinon quarante mille objets de date et figerait l'onglet.
const PLAFOND_JOURS = 3660;

/**
 * Les jours ouvrés d'un intervalle, prêts à dessiner : `[{ n, label, court,
 * date, cle, ferie }]`, mêmes objets que `joursDeSemaine` — `ferie` compris :
 * les deux alimentent `syntheseUsage`, qui écarte les fériés.
 *
 * Sert à mesurer la COUVERTURE (combien de journées ont été saisies sur combien
 * de journées possibles), jamais à interroger la base : les bornes suffisent
 * pour ça.
 */
export function joursOuvresEntre(debutCle, finCle, joursOuvres = JOURS_OUVRES_DEFAUT, fermetures = {}) {
  if (!debutCle || !finCle) return [];
  const [a, b] = debutCle <= finCle ? [debutCle, finCle] : [finCle, debutCle];
  const ouverts = new Set((joursOuvres || []).map(Number));
  const parNumero = new Map(JOURS.map((j) => [j.n, j]));

  const sortie = [];
  let curseur = jourDepuisCle(a);
  const stop = jourDepuisCle(b);
  if (Number.isNaN(curseur.getTime()) || Number.isNaN(stop.getTime())) return [];

  let garde = 0;
  while (curseur <= stop && garde < PLAFOND_JOURS) {
    const n = curseur.getDay() === 0 ? 7 : curseur.getDay();
    if (ouverts.has(n)) {
      sortie.push({
        ...parNumero.get(n), date: new Date(curseur), cle: cleJour(curseur), ferie: raisonFermeture(curseur, fermetures),
      });
    }
    curseur = ajouterJours(curseur, 1);
    garde += 1;
  }
  return sortie;
}

/**
 * Bornes effectives d'un jeu de lignes, quand la période n'en donne pas.
 *
 * « Tout le temps » est la seule période dont on ne connaît pas l'étendue avant
 * d'avoir lu les données : on la déduit de ce qui existe. Sans ça, le taux de
 * couverture d'un espace créé la semaine dernière se calculerait sur toute
 * l'histoire du calendrier et afficherait 0 %.
 */
export function bornesObservees(listes = []) {
  let min = null;
  let max = null;
  listes.forEach((lignes) => {
    (lignes || []).forEach((l) => {
      const cle = typeof l?.jour === 'string' ? l.jour.slice(0, 10) : cleJour(l?.debut);
      if (!cle) return;
      if (!min || cle < min) min = cle;
      if (!max || cle > max) max = cle;
    });
  });
  return { debut: min, fin: max };
}

/**
 * L'intervalle sur lequel une couverture a un sens : borné par les données
 * quand la période ne l'est pas, et jamais au-delà d'aujourd'hui.
 *
 * Le futur est la partie délicate. Une semaine en cours contient des jours qui
 * n'ont pas eu lieu : les compter comme « non saisis » ferait chuter la
 * couverture d'un office manager parfaitement à jour, le jeudi soir, à cause du
 * vendredi. Une présence DÉCLARÉE pour demain reste une intention, pas un fait
 * observé — l'historique s'arrête donc à aujourd'hui, quoi qu'on ait annoncé.
 */
export function fenetreMesurable(bornes, listes, aujourdhui = new Date()) {
  const cleAujourdhui = cleJour(aujourdhui);
  const observees = bornesObservees(listes);
  const debut = bornes.debut || observees.debut;
  const finVoulue = bornes.fin || observees.fin || cleAujourdhui;
  if (!debut) return { debut: null, fin: null };
  const fin = finVoulue > cleAujourdhui ? cleAujourdhui : finVoulue;
  if (fin < debut) return { debut, fin: debut };
  return { debut, fin };
}
