/**
 * Le poste de travail, qui n'est qu'une ressource.
 *
 * « Je choisis mon bureau » n'a pas de moteur à lui : un poste est une ligne
 * d'`om_ressource` de type `poste`, sa prise une ligne d'`om_reservation`, et
 * le double-booking reste arbitré par la contrainte d'exclusion de la base.
 * Trois notions seulement lui sont propres, et ce module les tient :
 *
 *   * LE CRÉNEAU — matin, après-midi, journée. L'unité `'demi'` fait réécrire
 *     les bornes par la base sur les heures de l'espace ; ce que le front
 *     envoie ne sert qu'à DIRE LEQUEL. `bornesCreneau` doit donc tomber sur le
 *     même créneau qu'`om_creneau_bornes`, sans quoi on cliquerait « matin »
 *     pour recevoir un après-midi.
 *   * LE GENRE — `flex`, `attitre`, `bloque`. Un poste bloqué est facturé mais
 *     jamais réservable : il compte dans le coût, pas dans la capacité.
 *   * L'HORIZON — au-delà, on ne réserve pas. Sans lui, trois personnes
 *     bloquent l'open space sur un trimestre le jour de la mise en service.
 *
 * Comme `ressources.js`, ce module sert à griser un bouton et à écrire une
 * phrase juste, JAMAIS à autoriser : le refus vient de la base, en codes
 * stables (`poste_bloque`, `poste_reserve_titulaire`, `hors_horizon`).
 */

import { cleJour, jourDepuisCle, ajouterJours } from './model.js';

/** Les heures par défaut d'un espace, miroir des `default` d'`om_espace`. */
export const HEURES_DEFAUT = { heure_ouverture: 9, heure_bascule: 13, heure_fermeture: 18 };

export const CRENEAUX = {
  matin: { cle: 'matin', label: 'Matin', court: 'matin' },
  apres_midi: { cle: 'apres_midi', label: 'Après-midi', court: 'après-midi' },
  journee: { cle: 'journee', label: 'Journée', court: 'journée' },
};

export const CRENEAUX_LISTE = [CRENEAUX.matin, CRENEAUX.apres_midi, CRENEAUX.journee];

export const GENRES = {
  flex: { cle: 'flex', label: 'Flex', aide: 'Réservable par toute l’équipe.' },
  attitre: { cle: 'attitre', label: 'Attitré', aide: 'À une personne. Les autres ne le voient pas libre.' },
  bloque: { cle: 'bloque', label: 'Bloqué', aide: 'Compté dans le coût, jamais dans la capacité.' },
};

export const GENRES_LISTE = Object.values(GENRES);

function heuresDe(heures) {
  const h = { ...HEURES_DEFAUT, ...(heures || {}) };
  const o = Number.isFinite(h.heure_ouverture) ? h.heure_ouverture : HEURES_DEFAUT.heure_ouverture;
  const b = Number.isFinite(h.heure_bascule) ? h.heure_bascule : HEURES_DEFAUT.heure_bascule;
  const f = Number.isFinite(h.heure_fermeture) ? h.heure_fermeture : HEURES_DEFAUT.heure_fermeture;
  // Des heures incohérentes viendraient d'un espace mal réglé, jamais d'un
  // calcul : on retombe sur la journée par défaut plutôt que de rendre une
  // plage à l'envers, que la base refuserait avec un `periode_invalide` nu.
  if (!(o < b && b < f)) return { ...HEURES_DEFAUT };
  return { heure_ouverture: o, heure_bascule: b, heure_fermeture: f };
}

/**
 * Les bornes locales d'un créneau.
 *
 * Bornes construites en heure LOCALE (`setHours`), jamais en UTC : une journée
 * fait 23 h ou 25 h deux fois par an, et un matin fabriqué en UTC glisserait
 * d'une heure l'été — deux personnes sur le même poste, sans que la contrainte
 * d'exclusion y voie quoi que ce soit.
 */
export function bornesCreneau(jour, creneau, heures) {
  const h = heuresDe(heures);
  const d = typeof jour === 'string' ? jourDepuisCle(jour) : new Date(jour);
  const debut = new Date(d);
  const fin = new Date(d);
  debut.setHours(creneau === 'apres_midi' ? h.heure_bascule : h.heure_ouverture, 0, 0, 0);
  if (creneau === 'matin') fin.setHours(h.heure_bascule, 0, 0, 0);
  else if (h.heure_fermeture >= 24) {
    fin.setHours(0, 0, 0, 0);
    fin.setDate(fin.getDate() + 1);
  } else fin.setHours(h.heure_fermeture, 0, 0, 0);
  return { debut, fin };
}

/**
 * Le créneau d'une prise, déduit de ses bornes.
 *
 * Même règle qu'en base, au mot près : ce qui finit avant la bascule est un
 * matin, ce qui commence à la bascule ou après en est l'après-midi, le reste
 * est une journée. Aucune colonne `creneau` : un paramètre de plus serait un
 * paramètre de plus à mentir.
 */
export function creneauDe(prise, heures) {
  if (!prise?.debut || !prise?.fin) return null;
  const h = heuresDe(heures);
  const debut = new Date(prise.debut);
  const fin = new Date(prise.fin);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) return null;
  const bascule = new Date(debut);
  bascule.setHours(h.heure_bascule, 0, 0, 0);
  if (fin <= bascule) return 'matin';
  if (debut >= bascule) return 'apres_midi';
  return 'journee';
}

/** Deux créneaux se marchent-ils dessus ? « journée » écrase les deux autres. */
export function creneauxSeChevauchent(a, b) {
  if (!a || !b) return false;
  if (a === 'journee' || b === 'journee') return true;
  return a === b;
}

/**
 * Ce poste est-il libre pour moi, ce jour-là, sur ce créneau ?
 *
 * Rend un motif plutôt qu'un booléen : l'écran doit pouvoir écrire « réservé à
 * son titulaire » au lieu de griser sans rien dire. Les motifs portent les
 * mêmes noms que les refus de la base.
 */
export function posteLibre(poste, { prises = [], jour, creneau = 'journee', membreId, attitresLiberables = false, titulairePresent = true, heures } = {}) {
  if (!poste || poste.actif === false) return { libre: false, motif: 'ressource_inactive' };
  if (poste.genre === 'bloque') return { libre: false, motif: 'poste_bloque' };
  const mien = poste.mien === true || (membreId != null && poste.membre_id === membreId);
  if (poste.genre === 'attitre' && !mien) {
    if (!attitresLiberables || titulairePresent) return { libre: false, motif: 'poste_reserve_titulaire' };
  }
  const cle = typeof jour === 'string' ? jour : cleJour(jour);
  const dessus = prises.filter(
    (p) => p.ressource_id === poste.id && p.jour === cle && creneauxSeChevauchent(creneauDe(p, heures), creneau),
  );
  // Ma propre prise n'est pas un obstacle : c'est déjà ma place. L'écran a
  // besoin de le savoir pour écrire « poste 14 » au lieu de le griser.
  if (dessus.some((p) => p.mienne === true)) return { libre: true, motif: 'mienne' };
  if (dessus.length) return { libre: false, motif: 'occupe' };
  return { libre: true, motif: null };
}

/**
 * Combien de postes réellement offerts à l'équipe.
 *
 * Les bloqués ne comptent pas — ils sont facturés, pas disponibles. Les
 * attitrés non plus, sauf si l'espace les libère : compter la chaise de
 * quelqu'un comme une place ferait dire au rapport que l'open space respire
 * alors qu'il est plein.
 */
export function capaciteFlex(postes, { attitresLiberables = false } = {}) {
  const actifs = (postes || []).filter((p) => p.actif !== false && p.genre !== 'bloque');
  return actifs.filter((p) => p.genre !== 'attitre' || attitresLiberables).length;
}

/** Ce qu'un écran affiche sous une zone : « 3 / 12 libres ». */
export function occupationPostes(postes, prises, { jour, creneau = 'journee', attitresLiberables = false, heures } = {}) {
  const cle = typeof jour === 'string' ? jour : cleJour(jour);
  const dispo = (postes || []).filter(
    (p) => p.actif !== false && p.genre !== 'bloque' && (p.genre !== 'attitre' || attitresLiberables),
  );
  const pris = dispo.filter((p) =>
    (prises || []).some(
      (v) => v.ressource_id === p.id && v.jour === cle && creneauxSeChevauchent(creneauDe(v, heures), creneau),
    ),
  );
  return { total: dispo.length, pris: pris.length, libres: dispo.length - pris.length };
}

/**
 * Ce jour est-il encore dans l'horizon de réservation ?
 *
 * Hier reste ouvert : corriger la semaine passée n'est pas réserver d'avance,
 * et la base tolère ±60 jours pour cela. C'est le FUTUR lointain qu'on ferme.
 */
export function horizonOuvert(jour, horizon = 30, aujourdhui = new Date()) {
  const j = typeof jour === 'string' ? jourDepuisCle(jour) : new Date(jour);
  const a = new Date(aujourdhui);
  a.setHours(0, 0, 0, 0);
  j.setHours(0, 0, 0, 0);
  if (j < a) return true;
  return j <= ajouterJours(a, Math.max(1, horizon || 0));
}

/** Le dernier jour réservable, pour l'écrire en toutes lettres. */
export function dernierJourOuvert(horizon = 30, aujourdhui = new Date()) {
  const a = new Date(aujourdhui);
  a.setHours(0, 0, 0, 0);
  return ajouterJours(a, Math.max(1, horizon || 0));
}

/**
 * Le numéro du prochain poste semé dans une zone.
 *
 * Semer deux fois ne crée pas deux « Poste 1 » : sur une affichette, deux
 * postes du même nom sont deux postes qu'on ne sait pas distinguer. Miroir du
 * `max(regexp_replace(...))` d'`om_postes_semer`.
 */
export function numeroSuivant(postes, zoneId) {
  const nums = (postes || [])
    .filter((p) => (zoneId == null ? p.zone_id == null : p.zone_id === zoneId))
    .map((p) => parseInt(String(p.nom || '').replace(/\D/g, ''), 10))
    .filter((n) => Number.isFinite(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

/** Les postes d'une zone, dans l'ordre où l'écran les montre. */
export function postesDeZone(postes, zoneId) {
  return (postes || [])
    .filter((p) => (zoneId == null ? p.zone_id == null : p.zone_id === zoneId))
    .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || String(a.nom).localeCompare(String(b.nom), 'fr'));
}
