// Les annonces : « Enregistré », « Échec », « Supprimé — Annuler ».
//
// UN SEUL FIL POUR TOUTE L'APP. Avant, quatre pages sur une trentaine disaient
// qu'une écriture avait abouti ; le plan (30 gestes), Ma semaine, les postes ne
// disaient rien, et une case refusée par la base se décochait sans un mot.
// Désormais toute mutation passe par ici (`MutationCache`, `App.jsx`) : le
// succès s'annonce, l'échec aussi, partout, sans qu'un écran ait à y penser.
//
// SUPPRIMER SE RATTRAPE. `supprimerAvecAnnulation` ne supprime pas : il MASQUE
// la ligne, annonce « Supprimé — Annuler » cinq secondes, et seulement alors
// appelle la base. Annuler démasque, rien n'est parti. C'est le geste de Gmail
// et de Linear — il remplace la boîte « Êtes-vous sûr ? », qui fait peur avant
// et ne sauve rien après (on clique OK par réflexe).
//
// RIEN NE SE PERD EN FERMANT L'ONGLET. Une suppression en attente part tout de
// suite si la page se ferme (`pagehide`) : l'utilisateur l'a demandée, il n'a
// simplement pas attendu.
//
// Module sans React à la racine : un store et ses abonnés, testable seul.
import { useMemo, useSyncExternalStore } from 'react';

export const DUREE_ANNULATION = 5000;
const DUREE_OK = 1800;
const DUREE_ECHEC = 5000;

let courante = null;          // { id, texte, type, action? }
let minuterie = null;
let silenceJusqua = 0;        // l'écriture d'une suppression ne dit pas « Enregistré »
const masques = new Map();    // cle -> { faire, minuterie }
let versionMasques = 0;
const abonnes = new Set();

const prevenir = () => abonnes.forEach((f) => f());

/** S'abonner (pour `useSyncExternalStore`). */
export function abonner(f) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

export const annonceCourante = () => courante;

/**
 * Annoncer. `faible` : un « Enregistré » générique ne recouvre pas une annonce
 * plus précise encore à l'écran (« Échéance ajoutée », « Supprimé — Annuler »).
 */
export function annoncer({ texte, type = 'ok', action = null, duree, faible = false }) {
  const maintenant = Date.now();
  if (faible && (maintenant < silenceJusqua || (courante && !courante.faible))) return;
  clearTimeout(minuterie);
  courante = { id: maintenant + Math.random(), texte, type, action, faible };
  const d = duree ?? (action ? DUREE_ANNULATION : type === 'echec' ? DUREE_ECHEC : DUREE_OK);
  minuterie = setTimeout(() => { courante = null; prevenir(); }, d);
  prevenir();
}

export function fermerAnnonce() {
  clearTimeout(minuterie);
  courante = null;
  prevenir();
}

/** La ligne est-elle masquée, en attente de suppression ? */
export const estMasque = (cle) => masques.has(String(cle));
export const versionDesMasques = () => versionMasques;

/**
 * Masque `cle` (ou plusieurs, pour une suppression en lot), annonce `texte`
 * avec « Annuler », et n'appelle `faire` qu'au bout du délai. Rend une
 * fonction qui annule (utile aux tests).
 */
export function supprimerAvecAnnulation({ cle, texte, faire, delai = DUREE_ANNULATION }) {
  const cles = (Array.isArray(cle) ? cle : [cle]).map(String);
  if (!cles.length || cles.some((k) => masques.has(k))) return () => {};
  let fini = false;
  let minut = null;
  const lever = () => {
    cles.forEach((k) => masques.delete(k));
    versionMasques += 1;
    prevenir();
  };
  const executer = () => {
    if (fini) return;
    fini = true;
    clearTimeout(minut);
    lever();
    silenceJusqua = Date.now() + 2500;
    faire();
  };
  const annuler = () => {
    if (fini) return;
    fini = true;
    clearTimeout(minut);
    lever();
    annoncer({ texte: 'Restauré' });
  };
  minut = setTimeout(executer, delai);
  cles.forEach((k) => masques.set(k, { faire: executer }));
  versionMasques += 1;
  annoncer({ texte, action: { libelle: 'Annuler', faire: annuler }, duree: delai });
  return annuler;
}

/** Tout ce qui attend part maintenant (fermeture d'onglet, changement d'espace). */
export function viderSuppressions() {
  [...new Set([...masques.values()].map((m) => m.faire))].forEach((f) => f());
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', viderSuppressions);
}

/** L'annonce à l'écran, pour l'hôte (`Annonces.jsx`). */
export const useAnnonce = () => useSyncExternalStore(abonner, annonceCourante, annonceCourante);

/**
 * `const masque = useMasques()` puis `liste.filter((x) => !masque(x.id))` :
 * une ligne en attente de suppression disparaît tout de suite de l'écran.
 */
export function useMasques() {
  useSyncExternalStore(abonner, versionDesMasques, versionDesMasques);
  return estMasque;
}

/**
 * Les données d'une vue sans ce qui attend sa suppression : chaque tableau
 * d'objets à `id`, au premier niveau, perd ses lignes masquées. Une seule
 * ligne par page suffit — toutes les listes de l'écran suivent.
 */
export function sansMasques(donnees) {
  if (!donnees || typeof donnees !== 'object' || !masques.size) return donnees;
  if (Array.isArray(donnees)) return donnees.filter((x) => !(x && x.id != null && masques.has(String(x.id))));
  let change = false;
  const net = {};
  Object.entries(donnees).forEach(([k, v]) => {
    if (Array.isArray(v) && v.some((x) => x && x.id != null && masques.has(String(x.id)))) {
      net[k] = v.filter((x) => !(x && x.id != null && masques.has(String(x.id))));
      change = true;
    } else net[k] = v;
  });
  return change ? net : donnees;
}

/** `const data = useSansMasques(vue.data)` — se recalcule quand un masque bouge. */
export function useSansMasques(donnees) {
  const v = useSyncExternalStore(abonner, versionDesMasques, versionDesMasques);
  // `v` dans la clé : un masque posé ou levé rend un nouvel objet.
  return useMemo(() => sansMasques(donnees), [donnees, v]); // eslint-disable-line react-hooks/exhaustive-deps
}
