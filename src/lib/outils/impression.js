// L'impression, en un seul endroit.
//
// IL Y AVAIT SIX RECETTES POUR LA MÊME CHOSE. Une globale dans `index.css`
// (`.d2d-imprimable` visible, le reste caché) et cinq blocs `@media print`
// écrits à la main dans les composants, chacun visant un `id` — plus, dans
// l'onglet des visiteurs, un `body[data-om-impression="visite"]` inventé le jour
// où deux affichettes se sont retrouvées sur le même écran. Elles divergeaient :
// marge de page à 16 mm au lieu de 14, pas de `break-inside` sur les lignes de
// tableau, pas de fond blanc forcé. Une seule recette, donc, et un mécanisme qui
// sait viser.
//
// LE CIBLAGE EST UN ATTRIBUT, PAS UN `id`. Un `id` oblige chaque écran à
// inventer un nom et à l'écrire deux fois (dans le JSX, dans le CSS) ; il
// interdit surtout deux blocs imprimables du même genre sur un écran.
// `imprimer(element)` pose `data-om-cible` sur le nœud visé et
// `data-om-impression` sur `body` le temps du dialogue : les voisins imprimables
// se taisent, le visé s'affiche. Sans argument, c'est l'impression ordinaire —
// celle d'un écran qui n'a qu'un seul bloc à sortir, et celle d'un Ctrl+P.
import { useCallback, useRef } from 'react';

/**
 * Imprime `element` seul, ou la page si aucun élément n'est donné.
 *
 * `window.print()` rend la main une fois le dialogue refermé : le `finally`
 * suffit à démarquer, sans minuterie.
 */
export function imprimer(element) {
  if (typeof document === 'undefined') return;
  const cible = element || null;
  if (cible) {
    cible.setAttribute('data-om-cible', '');
    document.body.dataset.omImpression = 'cible';
  }
  try {
    window.print();
  } finally {
    if (cible) {
      cible.removeAttribute('data-om-cible');
      delete document.body.dataset.omImpression;
    }
  }
}

/**
 * `const [papier, lancer] = useImpression()` : `papier` va sur le bloc
 * imprimable (qui porte aussi `d2d-imprimable`), `lancer` sur le bouton.
 */
export function useImpression() {
  const papier = useRef(null);
  const lancer = useCallback(() => imprimer(papier.current), []);
  return [papier, lancer];
}
