// La question avant un geste qu'on ne rattrape pas.
//
// LE CAS (audit du 2026-10-05). Presque toutes les suppressions se rattrapent
// désormais (« Supprimé — Annuler », `annonces.js`). Restent cinq gestes qu'un
// « Annuler » ne saurait pas défaire — supprimer un plan et son tracé,
// remplacer des murs par un import, débrancher Slack, annuler une série,
// supprimer un poste réservé — et qui passaient par `window.confirm` : une
// boîte grise du navigateur, hors du dessin, qui bloque toute la page.
//
// `demander({ titre, texte, oui, non, danger })` rend une promesse de booléen ;
// l'hôte (`Confirmation.jsx`, monté dans `App.jsx`) dessine la fenêtre.
// Une seule question à la fois : une seconde répond `false` à la première.
import { useSyncExternalStore } from 'react';

let courante = null; // { id, titre, texte, oui, non, danger, repondre }
const abonnes = new Set();
const prevenir = () => abonnes.forEach((f) => f());

export function abonner(f) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

export const questionCourante = () => courante;

/** Pose la question ; la promesse rend `true` pour « oui », `false` sinon. */
export function demander({ titre, texte = '', oui = 'Confirmer', non = 'Annuler', danger = false }) {
  if (courante) courante.repondre(false);
  return new Promise((resoudre) => {
    const id = Date.now() + Math.random();
    courante = {
      id, titre, texte, oui, non, danger,
      repondre: (r) => {
        if (courante?.id !== id) return;
        courante = null;
        prevenir();
        resoudre(!!r);
      },
    };
    prevenir();
  });
}

export const useQuestion = () => useSyncExternalStore(abonner, questionCourante, questionCourante);
