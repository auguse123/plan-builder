/**
 * La règle de surface : un polygone posé point par point. JS pur.
 *
 * ON REFERME SUR LE PREMIER POINT, comme un mur : c'est le geste qu'on connaît
 * déjà. Tant qu'il est ouvert, le polygone ne dit que sa longueur ; fermé, il
 * dit son aire et son périmètre — un open space mesuré sans poser un mur.
 */
import { aire, longueur, perimetre } from '@/lib/outils/equipe/trace';

/** Le nombre de points au-delà duquel on ne pose plus : une faute de clic. */
export const SURFACE_POINTS_MAX = 60;

/**
 * Ajouter `point` au polygone. Un clic à moins de `seuil` du premier point
 * (dès trois points) referme ; un clic sur le dernier est ignoré.
 *
 * @returns {{points: Array<{x,y}>, ferme: boolean}}
 */
export function poserPointSurface(points = [], point, seuil = 1) {
  const liste = Array.isArray(points) ? points : [];
  if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
    return { points: liste, ferme: false };
  }
  const p = { x: Number(point.x), y: Number(point.y) };
  if (liste.length >= 3 && longueur(liste[0], p) <= Math.max(0, Number(seuil) || 0)) {
    return { points: liste, ferme: true };
  }
  const dernier = liste[liste.length - 1];
  if ((dernier && longueur(dernier, p) === 0) || liste.length >= SURFACE_POINTS_MAX) {
    return { points: liste, ferme: false };
  }
  return { points: [...liste, p], ferme: false };
}

/**
 * Ce que la règle affiche : l'aire en m² (fermé seulement) et le tour en
 * unités de plan — le retour au premier point compté quand c'est fermé.
 */
export function mesureSurface(points = [], ferme = false) {
  const liste = Array.isArray(points) ? points : [];
  const tour = ferme && liste.length >= 3 ? [...liste, liste[0]] : liste;
  return {
    aire: ferme ? aire(liste) : 0,
    perimetre: perimetre(tour),
  };
}
