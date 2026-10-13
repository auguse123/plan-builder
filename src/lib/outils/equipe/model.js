// Gestionnaire d'équipe — le noyau de calcul.
//
// Tout ce qui se calcule est ici, et rien d'autre : pas de `db`, pas de React,
// pas de `Date.now()` implicite (l'instant est toujours un paramètre, sinon rien
// n'est testable). Les écrans n'ont le droit qu'à de l'affichage.
//
// Le parti pris central : UNE présence n'est pas forcément saisie. Un membre a
// un rythme déclaré (« je suis au bureau lundi, mardi, jeudi »), et l'outil s'en
// sert comme valeur par défaut de chaque journée. Une ligne `om_presence` ne
// s'écrit que quand quelqu'un dit le contraire, ou confirme sa venue. Sans ça il
// faudrait cocher 20 personnes × 5 jours chaque semaine et l'outil serait
// abandonné en quinze jours — mais ça oblige à distinguer partout ce qui est
// SUPPOSÉ de ce qui est SU, d'où le champ `source` traîné jusqu'au tableau de
// bord sous la forme d'un taux de fiabilité.
import { nomFerie } from './feries';

export const JOURS = [
  { n: 1, label: 'Lundi', court: 'Lun' },
  { n: 2, label: 'Mardi', court: 'Mar' },
  { n: 3, label: 'Mercredi', court: 'Mer' },
  { n: 4, label: 'Jeudi', court: 'Jeu' },
  { n: 5, label: 'Vendredi', court: 'Ven' },
  { n: 6, label: 'Samedi', court: 'Sam' },
  { n: 7, label: 'Dimanche', court: 'Dim' },
];

export const JOURS_OUVRES_DEFAUT = [1, 2, 3, 4, 5];

export const STATUTS = {
  bureau: { cle: 'bureau', label: 'Au bureau', court: 'Bureau', couleur: 'var(--om-accent)' },
  teletravail: { cle: 'teletravail', label: 'Télétravail', court: 'Télé', couleur: 'var(--om-alerte)' },
  absent: { cle: 'absent', label: 'Absent', court: 'Absent', couleur: 'var(--om-encre-3)' },
};

/** L'ordre du cycle quand on clique sur une case du planning. */
export const CYCLE_STATUTS = ['bureau', 'teletravail', 'absent'];

/**
 * Le cran suivant quand on clique sur une case du planning.
 *
 * QUATRE crans, toujours les mêmes et dans cet ordre, quel que soit le rythme
 * du membre : bureau → télétravail → absent → déduit du rythme → bureau…
 * Une case déduite est donc simplement le cran qui précède « bureau », et
 * `null` veut dire « efface la ligne, rends la case au rythme ».
 *
 * C'est le point où l'outil s'est trompé une fois : le premier cran dépendait
 * du rythme affiché (déjà « bureau » → on passait en télétravail), si bien
 * qu'une journée dont le rythme dit « bureau » ne pouvait JAMAIS être confirmée
 * en vert — les trois autres crans se succédaient sans jamais repasser par un
 * bureau saisi. Or confirmer un jour CONFORME au rythme est l'information la
 * plus précieuse de l'outil : c'est la seule qui transforme une supposition en
 * fait, et donc la seule qui fasse monter la fiabilité. Le cycle ne saute plus
 * aucun statut : faire dépendre son départ de ce qu'on suppose rendait une
 * partie de la vérité inaccessible.
 */
export function statutSuivant(statut, source) {
  if (source === 'rythme') return CYCLE_STATUTS[0];
  const i = CYCLE_STATUTS.indexOf(statut);
  return i >= 0 && i < CYCLE_STATUTS.length - 1 ? CYCLE_STATUTS[i + 1] : null;
}

/**
 * Ce qui se réserve. Pas seulement une salle : une place de parking, un casier,
 * un vélo de service, un jeu de clés se prennent par la même mécanique.
 *
 * `unite` est la seule vraie différence. `'heure'` : un créneau, de 14 h à 15 h.
 * `'jour'` : la journée entière, et c'est la BASE qui réécrit les bornes
 * (`om_reservation_ecrire`) — personne ne prend une place de parking de 9 h 12
 * à 9 h 47, et deux bornes bricolées côté front finiraient par se croiser d'une
 * heure au changement d'heure. Ici, `unite` n'est qu'un défaut de formulaire.
 *
 * Miroir du `check (type in …)` d'`om_ressource` : ajouter un type sans toucher
 * la contrainte donne un `type_invalide` à la première création.
 */
export const TYPES_RESSOURCE = {
  poste: { cle: 'poste', label: 'Poste flex', pluriel: 'Postes flex', dureeDefaut: 480, unite: 'demi' },
  phonebox: { cle: 'phonebox', label: 'Phone box', pluriel: 'Phone box', dureeDefaut: 30, unite: 'heure' },
  salle: { cle: 'salle', label: 'Salle', pluriel: 'Salles', dureeDefaut: 60, unite: 'heure' },
  place: { cle: 'place', label: 'Place de parking', pluriel: 'Places de parking', dureeDefaut: 480, unite: 'jour', quotaDefaut: 2 },
  casier: { cle: 'casier', label: 'Casier', pluriel: 'Casiers', dureeDefaut: 480, unite: 'jour' },
  velo: { cle: 'velo', label: 'Vélo', pluriel: 'Vélos', dureeDefaut: 480, unite: 'jour' },
  vehicule: { cle: 'vehicule', label: 'Voiture de service', pluriel: 'Voitures de service', dureeDefaut: 480, unite: 'jour', quotaDefaut: 1 },
  cle: { cle: 'cle', label: 'Jeu de clés', pluriel: 'Jeux de clés', dureeDefaut: 480, unite: 'jour' },
  ecran: { cle: 'ecran', label: 'Écran', pluriel: 'Écrans', dureeDefaut: 480, unite: 'jour' },
  autre: { cle: 'autre', label: 'Autre', pluriel: 'Autres', dureeDefaut: 60, unite: 'heure' },
};

export const TYPES_RESSOURCE_LISTE = Object.values(TYPES_RESSOURCE);

/** Durées proposées en un clic, par type. Une phonebox se prend pour un appel,
 *  pas pour l'après-midi ; un poste volant, c'est l'inverse. */
export const DUREES_RAPIDES = {
  phonebox: [15, 30, 60],
  salle: [30, 60, 120],
  poste: [240, 480],
};

/** Durées offertes au formulaire. La liste n'est qu'un raccourci : une heure de
 *  fin libre existe à côté, parce qu'une réunion de 14 h à 15 h 45 n'entre dans
 *  aucune liste qu'on aurait le courage d'écrire. */
export const DUREES_FORMULAIRE = [15, 30, 45, 60, 90, 120, 180, 240, 480];

/** Motifs suggérés, jamais imposés : ce sont des propositions de `datalist`, le
 *  champ reste libre. Une liste fermée obligerait à deviner le vocabulaire de
 *  chaque équipe, et produirait dix réservations « Autre ». */
export const MOTIFS_COURANTS = [
  'Call de sales',
  'Weekly meeting',
  'Point client',
  'Entretien',
  'Visio',
  'Démo produit',
  'Formation',
  'Travail au calme',
];

// ── Dates ────────────────────────────────────────────────────────────────────
// Tout est en heure LOCALE et en `YYYY-MM-DD`. `toISOString()` est évité
// partout : il bascule en UTC, et un lundi à Paris y devient un dimanche soir
// d'octobre à mars. C'est le bug classique de ce genre d'outil.

/** Clé de jour locale, `YYYY-MM-DD`. */
export function cleJour(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/** Date locale à minuit depuis une clé `YYYY-MM-DD`. */
export function jourDepuisCle(cle) {
  const [a, m, j] = String(cle || '').split('-').map(Number);
  return new Date(a, (m || 1) - 1, j || 1);
}

/** Numéro de jour de semaine, 1 = lundi … 7 = dimanche (et non 0 = dimanche). */
export function numeroJour(date) {
  const n = new Date(date).getDay();
  return n === 0 ? 7 : n;
}

export function ajouterJours(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Lundi de la semaine contenant `date`. */
export function lundiDe(date) {
  return ajouterJours(date, -(numeroJour(date) - 1));
}

/**
 * Pourquoi l'espace est fermé ce jour-là, ou `null` s'il travaille.
 *
 * `fermetures` est l'objet `{ 'AAAA-MM-JJ': 'motif' }` porté par l'espace
 * (`om_espace.fermetures`) : le pont décidé par la direction, le séminaire, la
 * fermeture annuelle. Il prime sur le calendrier des fériés — si l'office
 * manager a écrit un motif un 11 novembre, c'est le sien qu'on affiche. Miroir
 * de `om_jour_ferme` côté SQL : les deux doivent rendre la même raison.
 */
export function raisonFermeture(date, fermetures = {}) {
  const motif = fermetures && typeof fermetures === 'object' ? fermetures[cleJour(date)] : null;
  return (typeof motif === 'string' && motif.trim()) || nomFerie(date);
}

/**
 * Les jours ouvrés d'une semaine : [{ date, cle, n, label, court, ferie }].
 *
 * `ferie` porte la RAISON de la fermeture — nom du férié ou motif propre à
 * l'espace — ou `null`. Le jour reste dans la liste — le planning garde sa
 * colonne et la marque « fermé » — mais `syntheseUsage` l'écarte avant de
 * calculer quoi que ce soit : un bureau fermé n'est pas un bureau vide. Même
 * tag dans `joursOuvresEntre` (`periodes.js`).
 */
export function joursDeSemaine(lundi, joursOuvres = JOURS_OUVRES_DEFAUT, fermetures = {}) {
  const ouverts = new Set((joursOuvres || []).map(Number));
  return JOURS.filter((j) => ouverts.has(j.n)).map((j) => {
    const date = ajouterJours(lundi, j.n - 1);
    return { ...j, date, cle: cleJour(date), ferie: raisonFermeture(date, fermetures) };
  });
}

/**
 * UN jour, avec tout ce que le planning sait d'une colonne : { n, label, court,
 * date, cle, ferie, ouvre }. `ouvre` est faux le week-end (hors `joursOuvres`),
 * les jours fériés ET les fermetures de l'espace — c'est la vue « Aujourd'hui »
 * qui s'en sert, et elle doit pouvoir dire « fermé » un samedi comme un 1er mai
 * ou un jour de séminaire, avec la raison.
 */
export function jourDetaille(date, joursOuvres = JOURS_OUVRES_DEFAUT, fermetures = {}) {
  const d = ajouterJours(date, 0);
  const n = numeroJour(d);
  const ferie = raisonFermeture(d, fermetures);
  const ouvre = (joursOuvres || []).map(Number).includes(n) && !ferie;
  return { ...JOURS[n - 1], date: d, cle: cleJour(d), ferie, ouvre };
}

/**
 * Le jour ouvré suivant (`sens` = 1) ou précédent (`sens` = -1), en sautant
 * week-ends, fériés et fermetures. Les flèches « jour ±1 » d'un téléphone ne doivent jamais
 * s'arrêter sur un samedi : la question du matin n'existe pas ce jour-là.
 * Garde-fou : si aucun jour n'ouvre dans les quatorze suivants (espace réglé
 * sans jour ouvré), on avance d'un jour quand même — une flèche qui ne fait
 * rien passe pour cassée.
 */
export function jourOuvreVoisin(date, sens, joursOuvres = JOURS_OUVRES_DEFAUT, fermetures = {}) {
  const pas = sens < 0 ? -1 : 1;
  let d = ajouterJours(date, pas);
  for (let i = 0; i < 14; i += 1) {
    if (jourDetaille(d, joursOuvres, fermetures).ouvre) return d;
    d = ajouterJours(d, pas);
  }
  return ajouterJours(date, pas);
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « 15 sept. » — assez court pour tenir dans un en-tête de colonne. */
export function dateCourte(date) {
  const d = new Date(date);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

/**
 * « mardi 15 sept. » : un jour de série (`label` + `cle` ISO) dit pour une
 * phrase. La clé se lit à la main, pas par `new Date` : une date ISO nue est
 * minuit UTC, la veille à l'ouest de Greenwich.
 */
export function jourLisible(jour) {
  if (!jour) return '';
  const [, m, d] = String(jour.cle || '').split('-').map(Number);
  const date = m && d ? ` ${d} ${MOIS_COURTS[m - 1]}` : '';
  return `${String(jour.label || '').toLowerCase()}${date}`;
}

/** « 8 – 14 sept. » : l'étendue d'une semaine, sans répéter le mois s'il est le même. */
export function libelleSemaine(jours) {
  if (!jours || !jours.length) return '';
  const a = new Date(jours[0].date);
  const b = new Date(jours[jours.length - 1].date);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${MOIS_COURTS[b.getMonth()]}`;
  return `${dateCourte(a)} – ${dateCourte(b)}`;
}

/** « 14:30 » en heure locale. */
export function heureCourte(instant) {
  const d = new Date(instant);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** « 25 min », « 1 h 10 », « 2 h ». */
export function dureeCourte(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const reste = m % 60;
  return reste ? `${h} h ${String(reste).padStart(2, '0')}` : `${h} h`;
}

export function nomMembre(membre) {
  if (!membre) return '';
  return [membre.prenom, membre.nom].filter(Boolean).join(' ').trim() || '—';
}

/** Initiales, pour les pastilles du planning. */
export function initiales(membre) {
  if (!membre) return '?';
  const a = (membre.prenom || '').trim()[0] || '';
  const b = (membre.nom || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
}

// ── Présence ─────────────────────────────────────────────────────────────────

/** Index des lignes de présence : `${membre_id}|${cle}` → ligne. */
export function indexerPresences(presences = []) {
  const map = new Map();
  presences.forEach((p) => { if (p && p.membre_id && p.jour) map.set(`${p.membre_id}|${p.jour}`, p); });
  return map;
}

/** Statut du rythme déclaré pour un jour de semaine (1..7). */
export function statutDuRythme(membre, n) {
  const brut = membre && membre.rythme ? membre.rythme[String(n)] : undefined;
  return STATUTS[brut] ? brut : 'absent';
}

/**
 * Ce rythme couvre-t-il déjà la semaine ouvrée ?
 *
 * MIROIR DE `om_rythme_couvre_semaine` (SQL) — les deux se modifient ensemble.
 * Le lundi, l'outil n'écrit qu'à ceux dont il ignore encore la semaine : quand
 * les cinq jours ouvrés sont déclarés, la question est déjà répondue, et la
 * reposer chaque semaine apprend surtout à ne plus ouvrir le mail. Le samedi et
 * le dimanche ne comptent pas : personne n'est relancé pour un week-end.
 */
export function rythmeCouvreSemaine(rythme) {
  if (!rythme || typeof rythme !== 'object') return false;
  for (let n = 1; n <= 5; n += 1) {
    if (!STATUTS[rythme[String(n)]]) return false;
  }
  return true;
}

/**
 * Statut effectif d'un membre un jour donné.
 * `source` : 'rythme' (supposé), 'declare' (saisi), 'checkin' (confirmé sur place).
 */
export function statutMembre(membre, jour, index) {
  const ligne = index.get(`${membre.id}|${jour.cle}`);
  if (ligne && STATUTS[ligne.statut]) {
    return { statut: ligne.statut, source: ligne.source === 'checkin' ? 'checkin' : 'declare', ligne };
  }
  return { statut: statutDuRythme(membre, jour.n), source: 'rythme', ligne: null };
}

/**
 * Où la personne est ce jour-là : le site saisi avec sa présence (elle est
 * venue à Lyon exceptionnellement), sinon son site de rattachement, sinon rien.
 * `null` = espace sans site, ou membre non rattaché. Miroir de
 * `coalesce(p.site_id, m.site_id)` dans `om_espace_dimensionnement`.
 */
export function siteEffectif(membre, ligne) {
  return ligne?.site_id || membre?.site_id || null;
}

/**
 * Attitré = un poste nommé, réservé à cette personne, occupé ou pas. Il n'est
 * fixe QUE sur son site : venue ailleurs, elle prend un poste volant là-bas et
 * son poste à elle reste vide chez elle. Même règle que le SQL, sinon l'écran
 * et le verdict envoyé au commercial ne comptent pas le même besoin.
 */
export function estAttitreIci(membre, ligne) {
  return !!membre?.poste_attitre && siteEffectif(membre, ligne) === (membre?.site_id || null);
}

/**
 * Comptage d'une journée : combien au bureau, en télétravail, absents, et sur
 * quoi on le sait. `volant` = au bureau sur un poste NON attitré : c'est lui,
 * pas `bureau`, qui dimensionne quand des postes sont nommés.
 *
 * Avec `siteId`, la journée est vue depuis un site : `bureau` et `volant`
 * comptent ceux qui y sont physiquement (site de la présence, sinon de
 * rattachement) ; télétravail, absents, `total` et `su` comptent les personnes
 * RATTACHÉES à ce site. Une personne de Paris venue à Lyon est donc « au
 * bureau » à Lyon et dans l'effectif de Paris — c'est ce qui fait qu'un site
 * peut afficher plus de présents que d'effectif, et c'est vrai.
 */
export function occupationJour(membres = [], jour, index, siteId = null) {
  const c = { bureau: 0, volant: 0, teletravail: 0, absent: 0, su: 0, total: 0 };
  membres.forEach((m) => {
    const { statut, source, ligne } = statutMembre(m, jour, index);
    const chezNous = !siteId || (m.site_id || null) === siteId;
    const ici = !siteId || siteEffectif(m, ligne) === siteId;
    if (statut === 'bureau') {
      if (ici) {
        c.bureau += 1;
        if (!estAttitreIci(m, ligne)) c.volant += 1;
      }
    } else if (chezNous) {
      c[statut] += 1;
    }
    if (chezNous) {
      c.total += 1;
      if (source !== 'rythme') c.su += 1;
    }
  });
  return { ...jour, ...c };
}

/** La semaine entière, prête à être dessinée. `siteId` : vue depuis un site. */
export function serieOccupation({ membres = [], presences = [], jours = [], siteId = null } = {}) {
  const index = indexerPresences(presences);
  return jours.map((j) => occupationJour(membres, j, index, siteId));
}

// ── Le tableau de bord ───────────────────────────────────────────────────────

function moyenne(nombres) {
  if (!nombres.length) return 0;
  return nombres.reduce((s, n) => s + n, 0) / nombres.length;
}

/**
 * La synthèse d'usage, c'est-à-dire la seule phrase que l'outil doit produire :
 * « vous payez 40 postes, votre pic est à 27 le mardi ».
 *
 * Le pic prime sur la moyenne : c'est lui qui dimensionne. Une moyenne de 18 sur
 * un pic de 27 ne veut pas dire qu'on peut louer 18 postes, elle veut dire qu'on
 * a neuf postes qui ne servent qu'un jour par semaine — ce qui est un argument
 * pour du flexible, pas pour du sous-dimensionnement.
 *
 * POSTES ATTITRÉS. Un poste nommé est occupé qu'on soit là ou pas : il ne se
 * partage pas. Le besoin n'est donc pas le pic des présents mais
 * `attitrés + pic des volants` — les postes réservés, plus ce qu'il faut de
 * places libres le jour où le plus de non-attitrés viennent. Sans aucun
 * attitré, `besoin = pic` et rien ne change. `dormants` et le verdict se
 * calculent sur le besoin, jamais sur le pic seul.
 *
 * `siteId` : la synthèse d'un seul site — ses postes, son effectif rattaché,
 * ses présents (y compris les visiteurs d'un autre site, cf. `occupationJour`).
 */
export function syntheseUsage({
  membres = [], presences = [], jours = [], postesFactures = 0, coutPosteMois = 0, siteId = null,
} = {}) {
  // LE point unique où les jours fermés sortent du calcul. Un bureau fermé un
  // lundi de Pentecôte ou un jour de séminaire compte zéro présent : gardé dans
  // la série, il baisse la moyenne, invente un creux, et fait conseiller de
  // rendre des postes sur la foi d'un jour où personne ne pouvait venir. Mai en
  // aligne parfois quatre. Le tag vient de `joursDeSemaine` / `joursOuvresEntre`
  // (fériés + `fermetures` de l'espace) ; `om_jour_ferme` le refait côté SQL
  // pour le verdict envoyé au commercial.
  const ouvrables = jours.filter((j) => !j.ferie);
  const serie = serieOccupation({ membres, presences, jours: ouvrables, siteId });
  const effectif = siteId ? membres.filter((m) => (m?.site_id || null) === siteId) : membres;
  // Ce qui a été écarté, nommé. Sans ça, le graphe affiche quatre barres pour
  // une semaine de cinq jours et l'écran ne peut pas dire pourquoi — l'office
  // manager croit à un bug avant de penser à l'Ascension.
  const feries = jours.filter((j) => j.ferie).map((j) => ({ cle: j.cle, nom: j.ferie }));
  const valeurs = serie.map((j) => j.bureau);
  const pic = valeurs.length ? Math.max(...valeurs) : 0;
  const creux = valeurs.length ? Math.min(...valeurs) : 0;
  const jourDePic = serie.find((j) => j.bureau === pic) || null;
  const jourDeCreux = serie.find((j) => j.bureau === creux) || null;
  const moy = moyenne(valeurs);

  const postes = Math.max(0, Math.round(Number(postesFactures) || 0));
  const cout = Math.max(0, Number(coutPosteMois) || 0);
  const attitres = effectif.filter((m) => m?.poste_attitre).length;
  const volantsSerie = serie.map((j) => j.volant || 0);
  const picVolant = volantsSerie.length ? Math.max(...volantsSerie) : 0;
  const besoin = attitres + picVolant;
  const dormants = postes ? Math.max(0, postes - besoin) : 0;

  const cellules = serie.reduce((s, j) => s + j.total, 0);
  const connues = serie.reduce((s, j) => s + j.su, 0);

  let verdict = 'inconnu';
  if (postes > 0 && valeurs.length) {
    if (besoin > postes) verdict = 'sous';
    else if (dormants >= Math.max(2, Math.round(postes * 0.15))) verdict = 'sur';
    else verdict = 'juste';
  }

  return {
    serie,
    pic,
    jourDePic,
    creux,
    jourDeCreux,
    moyenne: moy,
    effectif: effectif.length,
    postesFactures: postes,
    // Les postes nommés et ce qu'il reste pour les autres. `besoin` est LE
    // chiffre qui dimensionne ; égal au pic tant que personne n'est attitré.
    attitres,
    volants: Math.max(0, postes - attitres),
    picVolant,
    besoin,
    // Le taux qui compte : le pic rapporté à ce qu'on paie. Au-dessus de 100 %,
    // il manque des places le jour le plus chargé.
    tauxPic: postes ? pic / postes : 0,
    tauxMoyen: postes ? moy / postes : 0,
    dormants,
    economieMois: dormants * cout,
    // Part des journées réellement saisies ou confirmées. Sous 30 %, le tableau
    // de bord décrit les intentions de l'équipe, pas sa présence : l'écran doit
    // le dire au lieu d'afficher un chiffre qui a l'air mesuré.
    fiabilite: cellules ? connues / cellules : 0,
    verdict,
    feries,
  };
}

/**
 * Dimensionnement conseillé.
 *
 * `plancher` = le besoin (attitrés + pic des volants ; le pic tout court sans
 *              attitré) : en dessous, il manque des places le mardi.
 * `confort`  = les attitrés, plus le pic des volants avec une marge de 10 %
 *              (un invité, un retour imprévu). La marge ne porte que sur les
 *              volants : un poste nommé n'a pas besoin de marge, il est à lui.
 * On ne conseille jamais la moyenne : elle est vraie et inhabitable.
 */
export function dimensionnement(synthese) {
  const pic = Math.max(0, Math.round(synthese?.pic || 0));
  const attitres = Math.max(0, Math.round(synthese?.attitres || 0));
  const picVolant = Math.max(0, Math.round(synthese?.picVolant ?? pic));
  const besoin = Math.max(0, Math.round(synthese?.besoin ?? pic));
  return {
    plancher: besoin,
    confort: attitres + (picVolant ? Math.max(picVolant + 1, Math.ceil(picVolant * 1.1)) : 0),
    dormants: synthese?.dormants || 0,
    economieAn: (synthese?.economieMois || 0) * 12,
  };
}

/**
 * Le même calcul, groupe par groupe.
 *
 * ÉQUIPE ≠ SITE. L'équipe (« R&D », « Ventes ») dit QUI fait le pic ; elle se
 * remplit au collage, part dans le CSV et ne coûte rien à personne. Le site
 * (`om_site`, cf. `syntheseParSite`) dit OÙ, et lui porte des postes facturés à
 * lui : c'est la seule dimension sur laquelle un verdict par groupe a un sens.
 * On ne mélange pas les deux — une équipe peut être répartie sur deux sites.
 *
 * CE QU'ON NE RENVOIE PAS : ni postes facturés, ni coût, ni verdict. Ils sont
 * portés par l'espace ou par le site, pas par l'équipe ; les répartir par tête
 * inventerait un chiffre que personne n'a saisi.
 *
 * LES PICS NE S'ADDITIONNENT PAS. Chaque groupe a le sien, un jour qui n'est
 * pas forcément celui des autres : la somme des pics dépasse presque toujours
 * le pic de l'espace. L'écran doit le dire, sinon quelqu'un dimensionnera sur
 * une addition fausse.
 *
 * La clé de groupe est insensible à la casse, aux accents et aux espaces —
 * « R&D », « r&d » et « R & D » collés le même jour ne feront pas trois
 * colonnes. L'orthographe affichée est celle vue en premier.
 *
 * Renvoie `[]` tant qu'il n'y a pas au moins deux groupes : à un seul groupe la
 * répartition répète le tableau du dessus, et une section qui répète est une
 * section qu'on apprend à sauter.
 */
/** Sans accents, minuscules, sans espaces : « R & D » et « r&d » se retrouvent. */
export function cleEquipe(equipe) {
  const brut = String(equipe || '').trim();
  return brut
    ? brut.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '')
    : '';
}

/**
 * Les membres par équipe, dans l'ordre de leur nom d'équipe (français, accents
 * ignorés), ceux sans équipe en dernier sous « Sans groupe ». L'orthographe
 * affichée est celle vue en premier. Partagé par la répartition du tableau
 * d'usage et par le planning quand l'équipe devient trop longue pour une seule
 * liste : les deux écrans doivent découper de la même façon.
 */
export function grouperParEquipe(membres = []) {
  const groupes = new Map();
  membres.forEach((m) => {
    const brut = String(m?.equipe || '').trim();
    const cle = cleEquipe(brut);
    if (!groupes.has(cle)) groupes.set(cle, { cle, label: brut || 'Sans groupe', membres: [] });
    groupes.get(cle).membres.push(m);
  });
  return [...groupes.values()].sort((a, b) => {
    if (!a.cle !== !b.cle) return a.cle ? -1 : 1;
    return a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' });
  });
}

/**
 * Filtre par nom ou par équipe, insensible aux accents et à la casse. Une
 * recherche vide rend la liste telle quelle (même référence : pas de re-rendu).
 */
export function filtrerMembres(membres = [], recherche = '') {
  const q = cleEquipe(recherche);
  if (!q) return membres;
  return membres.filter((m) => cleEquipe(`${nomMembre(m)} ${m?.equipe || ''}`).includes(q));
}

export function syntheseParEquipe({ membres = [], presences = [], jours = [] } = {}) {
  const groupes = grouperParEquipe(membres);

  if (groupes.length < 2) return [];

  return groupes
    .map((g) => {
      const s = syntheseUsage({ membres: g.membres, presences, jours });
      return {
        cle: g.cle,
        label: g.label,
        effectif: g.membres.length,
        pic: s.pic,
        jourDePic: s.jourDePic,
        moyenne: s.moyenne,
        fiabilite: s.fiabilite,
        serie: s.serie,
      };
    })
    // Le plus chargé en premier : c'est celui qui décide de la taille du bureau.
    .sort((a, b) => b.pic - a.pic || a.label.localeCompare(b.label, 'fr'));
}

/**
 * La synthèse de chaque site, avec SES postes et SON verdict : contrairement à
 * l'équipe, le site porte des postes facturés (la somme fait ceux de l'espace,
 * tenue par trigger), donc le verdict par site est un vrai verdict.
 *
 * Renvoie `[]` sous deux sites actifs : à un seul site, la section répète le
 * tableau du dessus. L'ordre est celui des réglages (`ordre`, puis nom), pas le
 * pic : on lit ses sites dans l'ordre où on les a nommés.
 */
export function syntheseParSite({ membres = [], presences = [], jours = [], sites = [], coutPosteMois = 0 } = {}) {
  const actifs = sites.filter((s) => s && s.actif !== false);
  if (actifs.length < 2) return [];
  return actifs.map((site) => {
    const s = syntheseUsage({
      membres, presences, jours, postesFactures: site.postes, coutPosteMois, siteId: site.id,
    });
    return {
      id: site.id,
      nom: site.nom,
      postes: s.postesFactures,
      effectif: s.effectif,
      pic: s.pic,
      jourDePic: s.jourDePic,
      attitres: s.attitres,
      picVolant: s.picVolant,
      besoin: s.besoin,
      dormants: s.dormants,
      tauxPic: s.tauxPic,
      fiabilite: s.fiabilite,
      verdict: s.verdict,
      serie: s.serie,
    };
  });
}

/**
 * Le pic de chaque zone (open space, mezzanine, étage) rapporté à ses places.
 * Une zone ne compte que les membres qui lui sont rattachés et au bureau ce
 * jour-là ; un membre sans zone n'est dans aucune. `deborde` = plus de monde
 * que de places un jour au moins — c'est la zone à agrandir, ou la règle de
 * rotation à écrire. `siteId` limite aux zones de ce site.
 */
export function picsParZone({ membres = [], presences = [], jours = [], zones = [], siteId = null } = {}) {
  const index = indexerPresences(presences);
  const ouvrables = jours.filter((j) => !j.ferie);
  return zones
    .filter((z) => z && z.actif !== false && (!siteId || z.site_id === siteId))
    .map((z) => {
      const siens = membres.filter((m) => m?.zone_id === z.id);
      const parJour = ouvrables.map((j) => siens.filter((m) => statutMembre(m, j, index).statut === 'bureau').length);
      const pic = parJour.length ? Math.max(...parJour) : 0;
      const places = Math.max(0, Math.round(Number(z.places) || 0));
      return {
        id: z.id,
        site_id: z.site_id || null,
        nom: z.nom,
        places,
        effectif: siens.length,
        pic,
        taux: places ? pic / places : 0,
        deborde: places > 0 && pic > places,
      };
    });
}

// ── Ressources et réservations ───────────────────────────────────────────────

/**
 * Message lisible pour l'erreur qui compte : deux personnes prennent la même
 * ressource au même moment. La contrainte d'exclusion est en base (c'est le seul
 * endroit où ça se décide), donc l'écran ne peut pas l'anticiper — il peut
 * seulement traduire le code Postgres 23P01 en français.
 *
 * ICI et pas dans `donnees.js` : les DEUX chemins d'écriture lèvent la même
 * erreur — la façade `db` de l'écran authentifié comme la RPC
 * `om_reservation_ecrire` de l'écran public, qui laisse exprès remonter le
 * 23P01 sans le rattraper. Un seul texte, sinon les deux versions du même
 * produit se mettent à refuser un créneau avec deux phrases différentes.
 */
export function messageErreurReservation(erreur, traduire) {
  const code = erreur?.code || erreur?.details?.code;
  if (code === '23P01' || /exclusion|sans_chevauchement/i.test(erreur?.message || '')) {
    return 'Quelqu’un vient de prendre ce créneau. Rafraîchissez pour voir qui.';
  }
  // Les autres refus sont des codes stables (`quota_atteint`,
  // `ressource_inactive`, `periode_trop_longue`…) : seul `omErreurMessage` les
  // traduit, et il vit dans `publicApi.js`, que ce fichier ne peut pas importer
  // (ni React ni Supabase ici). L'écran passe donc son traducteur ; sans lui,
  // le code brut remonterait à l'utilisateur.
  if (traduire) return traduire(erreur);
  return erreur?.message || 'La réservation n’a pas pu être enregistrée.';
}

export function chevauchent(a, b) {
  return new Date(a.debut) < new Date(b.fin) && new Date(b.debut) < new Date(a.fin);
}

/** Réservations d'une ressource, triées par début. */
export function reservationsDe(ressourceId, reservations = []) {
  return reservations
    .filter((r) => r.ressource_id === ressourceId)
    .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
}

/**
 * État d'une ressource à un instant donné.
 *
 * C'est l'écran que réclame une phonebox, et c'est ce qui la distingue d'une
 * salle de réunion : un SDR ne planifie pas son appel à 15 h 30, il veut savoir
 * si la cabine est libre MAINTENANT et la prendre pour vingt minutes. Un agenda
 * hebdomadaire ne répond pas à cette question.
 */
export function etatRessource(ressource, reservations = [], instant = new Date()) {
  const t = new Date(instant);
  const liste = reservationsDe(ressource.id, reservations);
  const enCours = liste.find((r) => new Date(r.debut) <= t && t < new Date(r.fin)) || null;
  const suivante = liste.find((r) => new Date(r.debut) > t) || null;
  return {
    libre: !enCours,
    enCours,
    suivante,
    // Minutes disponibles avant la prochaine réservation : c'est ce qui doit
    // griser les boutons « 30 min » quand quelqu'un arrive dans dix minutes.
    minutesLibres: enCours
      ? 0
      : (suivante ? Math.max(0, Math.round((new Date(suivante.debut).getTime() - t.getTime()) / 60000)) : Infinity),
    minutesRestantes: enCours
      ? Math.max(0, Math.round((new Date(enCours.fin).getTime() - t.getTime()) / 60000))
      : 0,
  };
}

/** Minutes entre deux instants, arrondies, jamais négatives. */
export function minutesEntre(debut, fin) {
  const a = new Date(debut).getTime();
  const b = new Date(fin).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 60000));
}

/** Les identifiants de `avec`, nettoyés : la colonne est un tableau Postgres, et
 *  une ligne ancienne peut ne rien porter du tout. */
export function accompagnants(reservation) {
  const brut = reservation && reservation.avec;
  return Array.isArray(brut) ? brut.filter(Boolean) : [];
}

/**
 * Combien de personnes occupent la ressource.
 *
 * Le titulaire compte toujours pour un : une salle réservée est occupée même si
 * personne n'a pris la peine de dire avec qui. `invites` couvre les gens qui
 * n'auront jamais de ligne `om_membre` — un client, un candidat — mais qui
 * prennent une chaise, ce qui est tout ce qui intéresse une salle de six.
 */
export function nombreParticipants(reservation) {
  const invites = Math.max(0, Math.round(Number(reservation && reservation.invites) || 0));
  return 1 + accompagnants(reservation).length + invites;
}

/**
 * « avec Marie Dupont, Paul Martin et 2 invités » — chaîne vide si le titulaire
 * est seul. Les identifiants inconnus (membre supprimé depuis) ne sont pas
 * silencieusement perdus : ils retombent dans le compte des invités, sinon
 * l'écran afficherait une réunion à trois pour cinq personnes.
 */
export function libelleAccompagnants(reservation, parMembre) {
  const lire = (id) => (parMembre instanceof Map ? parMembre.get(id) : (parMembre || {})[id]);
  const ids = accompagnants(reservation);
  const noms = [];
  let anonymes = Math.max(0, Math.round(Number(reservation && reservation.invites) || 0));
  ids.forEach((id) => {
    const nom = nomMembre(lire(id));
    if (nom && nom !== '—') noms.push(nom);
    else anonymes += 1;
  });
  const morceaux = [];
  if (noms.length) morceaux.push(noms.join(', '));
  if (anonymes) morceaux.push(`${anonymes} invité${anonymes > 1 ? 's' : ''}`);
  if (!morceaux.length) return '';
  return `avec ${morceaux.join(' et ')}`;
}

/** Une prise immédiate est-elle possible, et pour combien de temps au plus ? */
export function creneauPossible(ressource, reservations, minutes, instant = new Date()) {
  const etat = etatRessource(ressource, reservations, instant);
  if (!etat.libre) return false;
  return etat.minutesLibres >= minutes;
}

/**
 * Minutes réservables sur une période : la seule définition de « 100 % occupé ».
 *
 * Une salle n'est pas occupable la nuit ni le dimanche ; le dénominateur est
 * donc un nombre de JOURS OUVRÉS multiplié par une amplitude d'ouverture, jamais
 * 24 h. Elle vit ici pour que l'onglet Usage et l'onglet Historique ne puissent
 * pas se mettre à répondre deux taux différents sur les mêmes réservations.
 */
export function capaciteMinutes(nombreDeJours, heuresParJour = 9) {
  return Math.max(1, Number(nombreDeJours) || 0) * Math.max(0, Number(heuresParJour) || 0) * 60;
}

/** Taux d'occupation d'une ressource sur une période, en heures réservées. */
export function usageRessource(ressource, reservations = [], jours = [], heuresParJour = 9) {
  const cles = new Set(jours.map((j) => j.cle));
  const dedans = reservationsDe(ressource.id, reservations).filter((r) => cles.has(cleJour(r.debut)));
  const minutes = dedans.reduce(
    (s, r) => s + Math.max(0, (new Date(r.fin).getTime() - new Date(r.debut).getTime()) / 60000),
    0,
  );
  const capacite = capaciteMinutes(jours.length, heuresParJour);
  return {
    ressource,
    reservations: dedans.length,
    minutes,
    taux: minutes / capacite,
    // Une phonebox utilisée par une seule personne n'est pas un succès d'usage,
    // c'est un bureau privatisé : l'écran doit pouvoir le dire.
    utilisateurs: new Set(dedans.map((r) => r.membre_id).filter(Boolean)).size,
  };
}

export function usageRessources(ressources = [], reservations = [], jours = [], heuresParJour = 9) {
  return ressources
    .map((r) => usageRessource(r, reservations, jours, heuresParJour))
    .sort((a, b) => b.minutes - a.minutes);
}

// ── Mise en forme ────────────────────────────────────────────────────────────

export function pourcent(x, decimales = 0) {
  const v = Number(x);
  if (!Number.isFinite(v)) return '—';
  return `${(v * 100).toFixed(decimales).replace('.', ',')} %`;
}

export function euro(montant) {
  const v = Number(montant);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString('fr-FR')} €`;
}
