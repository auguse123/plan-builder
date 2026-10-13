// Le seul endroit de l'app qui fabrique un téléchargement.
//
// IL Y EN AVAIT CINQ. `rapport.js`, `export.js`, `classeur/commun.jsx`,
// `Passages.jsx` et `Tableau.jsx` portaient chacun la même recette recopiée —
// et elles avaient divergé sur les deux points qui comptent :
//
//   - **Le BOM.** Sans un BOM (`\ufeff`) en tête, Excel lit un CSV UTF-8 en Latin-1 :
//     « Réunion » devient « RÃ©union ». Deux exports sur cinq l'oubliaient.
//   - **Le `revokeObjectURL`.** Révoqué dans la même tâche que le clic, Safari
//     annule le téléchargement. Une seule des cinq copies le différait.
//
// D'où ce module : un CSV se télécharge de la même façon depuis n'importe quel
// outil, et une correction de navigateur se fait une fois.
//
// LE TYPE PORTE TOUJOURS `charset=utf-8`. Sans lui, un `.ics` ouvert dans un
// agenda perd ses accents de la même manière qu'un CSV dans Excel.

/**
 * Pose un fichier dans les téléchargements du navigateur.
 *
 * `contenu` est du texte déjà formé : ce module ne sait rien des colonnes, des
 * points-virgules ni des guillemets — c'est l'affaire des `versCsv*` testés à
 * côté de leur modèle.
 */
export function telechargerFichier(nomFichier, contenu, type = 'text/plain') {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(new Blob([contenu], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Révoquer dans la même tâche couperait le téléchargement sur Safari.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** Un CSV, BOM compris — donc lisible par Excel sans manipulation. */
export function telechargerCsv(nomFichier, csv) {
  telechargerFichier(nomFichier, `\ufeff${csv}`, 'text/csv');
}

/** L'export d'un espace : le seul format machine de l'app. */
export function telechargerJson(nomFichier, json) {
  telechargerFichier(nomFichier, JSON.stringify(json, null, 2), 'application/json');
}

/** Un agenda (`.ics`) : même porte, autre type. */
export function telechargerIcs(nomFichier, ics) {
  telechargerFichier(nomFichier, ics, 'text/calendar');
}

/**
 * Un binaire déjà fait (le PNG d'un plan, sorti d'un `canvas.toBlob`) : même
 * porte, même délai de révocation — Safari n'a pas plus de patience pour une
 * image que pour un CSV.
 */
export function telechargerBlob(nomFichier, blob) {
  if (typeof document === 'undefined' || !blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
