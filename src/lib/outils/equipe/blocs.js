/**
 * La bibliothèque de blocs : du mobilier tout fait, aux vraies dimensions.
 *
 * DESSINER UN PLATEAU N'EST PAS DESSINER DES RECTANGLES. Personne ne connaît
 * par cœur la profondeur d'un bureau ni l'encombrement d'une table de huit ;
 * les taper à la main donne un plan faux qui se découvre au montage. Un bloc
 * porte la mesure du catalogue — 140 × 80 pour un bureau, 320 × 210 pour une
 * table de huit — et se pose d'un clic à l'échelle du plan.
 *
 * QUATRE FAMILLES, PARCE QUE QUATRE CHOSES DIFFÉRENTES ARRIVENT À LA POSE :
 *
 * - `poste` se sème (`om_postes_semer`) : un poste réservable par place ;
 * - `salle` se pose (`om_salle_poser`) : une ressource à l'heure ;
 * - `meuble` s'écrit dans le plan (`om_plan_patch.meubles`) : du décor, qui ne
 *   se réserve pas et ne compte dans aucun quota (voir `meubles.js`) ;
 * - `ouverture` perce un mur (`om_plan_patch.portes`) : une porte, une fenêtre.
 *
 * LES DEUX DERNIÈRES NE SONT PAS DES RESSOURCES, et c'est tout l'intérêt : un
 * canapé ou une porte dans `om_ressource` aurait gonflé la capacité de l'espace
 * de places que personne ne peut occuper. Ce qui se réserve est une ressource ;
 * ce qui se regarde est du plan.
 *
 * `forme` ne dit QUE le dessin — jamais l'encombrement, qui reste `l × h`. Un
 * plan annonce la place prise, pas la silhouette du meuble : une table ronde de
 * 1,60 m tient dans son carré de 1,60 m, qu'on la dessine en disque ou non.
 *
 * Les tailles sont en unités de plan — 1 unité = 10 cm, comme partout ici.
 */

import { aimanter, ECART, ilot, PAS, POSTE } from './plan.js';
import { nettoyerMeuble } from './meubles.js';
import { poserOuverture, typeOuverture } from './ouvertures.js';

/** Les rayons de la bibliothèque, dans l'ordre où on les parcourt. */
export const RAYONS = [
  { cle: 'bureau', nom: 'Bureaux' },
  { cle: 'bench', nom: 'Benchs' },
  { cle: 'reunion', nom: 'Réunion' },
  { cle: 'bulle', nom: 'Bulles et cabines' },
  { cle: 'tables', nom: 'Tables et assises' },
  { cle: 'detente', nom: 'Détente' },
  { cle: 'rangement', nom: 'Rangement' },
  { cle: 'service', nom: 'Services et verdure' },
  { cle: 'piece', nom: 'Pièces et circulations' },
  { cle: 'sanitaire', nom: 'Sanitaires' },
  { cle: 'ouverture', nom: 'Portes et fenêtres' },
];

/**
 * Le catalogue.
 *
 * `postes` dit combien de places un bloc `poste` crée ; `dos` les monte en deux
 * rangs collés, `sens` les aligne en profondeur plutôt qu'en largeur. Un bloc
 * `salle` porte une `capacite` et son nom par défaut. Un bloc `ouverture` porte
 * le `type` de `TYPES_OUVERTURE` et la largeur du trou dans `l`.
 */
export const BLOCS = [
  // Les bureaux — un poste, une place.
  { cle: 'bureau-compact', nom: 'Bureau compact', rayon: 'bureau', famille: 'poste', l: 12, h: 6, postes: 1 },
  { cle: 'bureau-standard', nom: 'Bureau standard', rayon: 'bureau', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 1 },
  { cle: 'bureau-confort', nom: 'Bureau confort', rayon: 'bureau', famille: 'poste', l: 16, h: 8, postes: 1 },
  { cle: 'bureau-direction', nom: 'Bureau direction', rayon: 'bureau', famille: 'poste', l: 18, h: 9, postes: 1 },
  { cle: 'bureau-assis-debout', nom: 'Assis-debout', rayon: 'bureau', famille: 'poste', l: 16, h: 8, postes: 1 },
  // Le retour d'angle encombre un carré : c'est son encombrement qu'on pose,
  // pas sa forme en L — un plan dit la place prise, pas le dessin du meuble.
  { cle: 'bureau-angle', nom: 'Bureau en L', rayon: 'bureau', famille: 'poste', l: 20, h: 21, postes: 1 },
  { cle: 'bureau-accueil', nom: 'Banque d’accueil', rayon: 'bureau', famille: 'poste', l: 20, h: 9, postes: 1 },
  { cle: 'bureau-face', nom: 'Bureaux face à face', rayon: 'bureau', famille: 'poste', l: 16, h: 8, postes: 2, dos: true },

  // Les benchs — une banque de places d'un seul geste.
  { cle: 'bench-2', nom: 'Bench 2 places', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 2, dos: true },
  { cle: 'bench-4', nom: 'Bench 4 places', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 4, dos: true },
  { cle: 'bench-6', nom: 'Bench 6 places', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 6, dos: true },
  { cle: 'bench-8', nom: 'Bench 8 places', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 8, dos: true },
  { cle: 'bench-10', nom: 'Bench 10 places', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 10, dos: true },
  { cle: 'bench-12', nom: 'Bench 12 places', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 12, dos: true },
  { cle: 'bench-8-large', nom: 'Bench 8 confort', rayon: 'bench', famille: 'poste', l: 16, h: 8, postes: 8, dos: true },
  { cle: 'file-2', nom: 'Rangée de 2', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 2, dos: false },
  { cle: 'file-3', nom: 'Rangée de 3', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 3, dos: false },
  { cle: 'file-6', nom: 'Rangée de 6', rayon: 'bench', famille: 'poste', l: POSTE.l, h: POSTE.h, postes: 6, dos: false },
  { cle: 'file-4-mur', nom: 'Rangée de 4 le long d’un mur', rayon: 'bench', famille: 'poste', l: 12, h: 6, postes: 4, dos: false, sens: 'vertical' },
  { cle: 'file-6-mur', nom: 'Rangée de 6 le long d’un mur', rayon: 'bench', famille: 'poste', l: 12, h: 6, postes: 6, dos: false, sens: 'vertical' },

  // La réunion — des salles, réservables à l'heure.
  { cle: 'table-4-ronde', nom: 'Table ronde 4 pers.', rayon: 'reunion', famille: 'salle', l: 17, h: 17, capacite: 4, forme: 'rond' },
  { cle: 'table-ronde-6', nom: 'Table ronde 6 pers.', rayon: 'reunion', famille: 'salle', l: 22, h: 22, capacite: 6, forme: 'rond' },
  { cle: 'table-ronde-8', nom: 'Table ronde 8 pers.', rayon: 'reunion', famille: 'salle', l: 26, h: 26, capacite: 8, forme: 'rond' },
  { cle: 'table-4', nom: 'Table 4 pers.', rayon: 'reunion', famille: 'salle', l: 18, h: 12, capacite: 4 },
  { cle: 'table-6', nom: 'Table 6 pers.', rayon: 'reunion', famille: 'salle', l: 24, h: 12, capacite: 6 },
  { cle: 'table-8', nom: 'Table 8 pers.', rayon: 'reunion', famille: 'salle', l: 32, h: 21, capacite: 8 },
  { cle: 'table-10', nom: 'Table 10 pers.', rayon: 'reunion', famille: 'salle', l: 38, h: 14, capacite: 10 },
  { cle: 'table-12', nom: 'Table 12 pers.', rayon: 'reunion', famille: 'salle', l: 44, h: 14, capacite: 12 },
  { cle: 'table-16', nom: 'Table 16 pers.', rayon: 'reunion', famille: 'salle', l: 56, h: 16, capacite: 16 },
  { cle: 'table-conseil', nom: 'Conseil 20 pers.', rayon: 'reunion', famille: 'salle', l: 68, h: 20, capacite: 20 },
  { cle: 'salle-projet', nom: 'Salle de projet', rayon: 'reunion', famille: 'salle', l: 40, h: 30, capacite: 10 },
  { cle: 'salle-formation', nom: 'Salle de formation', rayon: 'reunion', famille: 'salle', l: 60, h: 40, capacite: 16 },
  { cle: 'salle-creative', nom: 'Salle créative', rayon: 'reunion', famille: 'salle', l: 50, h: 40, capacite: 12 },

  // Les bulles — une place au calme, comptée comme une ressource à l'heure.
  { cle: 'phonebox', nom: 'Phone box', rayon: 'bulle', famille: 'salle', l: 10, h: 10, capacite: 1 },
  { cle: 'phonebox-duo', nom: 'Phone box 2 pers.', rayon: 'bulle', famille: 'salle', l: 14, h: 10, capacite: 2 },
  { cle: 'booth-2', nom: 'Cabine 2 pers.', rayon: 'bulle', famille: 'salle', l: 16, h: 12, capacite: 2 },
  { cle: 'booth-4', nom: 'Cabine 4 pers.', rayon: 'bulle', famille: 'salle', l: 23, h: 14, capacite: 4 },
  { cle: 'booth-6', nom: 'Cabine 6 pers.', rayon: 'bulle', famille: 'salle', l: 28, h: 16, capacite: 6 },
  { cle: 'booth-ronde', nom: 'Bulle ronde 6 pers.', rayon: 'bulle', famille: 'salle', l: 48, h: 24, capacite: 6, forme: 'arrondi' },

  // Les tables et assises — du décor : rien ici ne se réserve.
  { cle: 'chaise', nom: 'Chaise', rayon: 'tables', famille: 'meuble', l: 5, h: 5, forme: 'siege' },
  { cle: 'chaise-visiteur', nom: 'Chaise visiteur', rayon: 'tables', famille: 'meuble', l: 6, h: 6, forme: 'siege' },
  { cle: 'siege-bureau', nom: 'Siège de bureau', rayon: 'tables', famille: 'meuble', l: 6, h: 6, forme: 'siege-bureau' },
  { cle: 'tabouret', nom: 'Tabouret', rayon: 'tables', famille: 'meuble', l: 4, h: 4, forme: 'rond' },
  { cle: 'tabouret-haut', nom: 'Tabouret haut', rayon: 'tables', famille: 'meuble', l: 4, h: 4, forme: 'rond' },
  { cle: 'mange-debout', nom: 'Mange-debout Ø 0,80 m', rayon: 'tables', famille: 'meuble', l: 8, h: 8, forme: 'rond' },
  { cle: 'table-ronde-120', nom: 'Table ronde Ø 1,20 m', rayon: 'tables', famille: 'meuble', l: 12, h: 12, forme: 'rond' },
  { cle: 'table-ronde-160', nom: 'Table ronde Ø 1,60 m', rayon: 'tables', famille: 'meuble', l: 16, h: 16, forme: 'rond' },
  { cle: 'table-carree-4', nom: 'Table carrée 4 pers.', rayon: 'tables', famille: 'meuble', l: 10, h: 10 },
  { cle: 'table-repas-6', nom: 'Table repas 6 pers.', rayon: 'tables', famille: 'meuble', l: 18, h: 9 },
  { cle: 'table-haute-4', nom: 'Table haute 4 pers.', rayon: 'tables', famille: 'meuble', l: 14, h: 8 },
  { cle: 'table-haute-8', nom: 'Table haute 8 pers.', rayon: 'tables', famille: 'meuble', l: 24, h: 9 },
  { cle: 'banc', nom: 'Banc', rayon: 'tables', famille: 'meuble', l: 16, h: 4 },
  // Tables dressées : l'emprise compte les chaises, le dessin les montre.
  { cle: 'repas-ronde-4', nom: 'Table ronde et 4 chaises', rayon: 'tables', famille: 'meuble', l: 16, h: 16, forme: 'ronde-chaises', places: 4 },
  { cle: 'repas-ronde-6', nom: 'Table ronde et 6 chaises', rayon: 'tables', famille: 'meuble', l: 20, h: 20, forme: 'ronde-chaises', places: 6 },
  { cle: 'repas-4', nom: 'Table et 4 chaises', rayon: 'tables', famille: 'meuble', l: 16, h: 14, forme: 'table-chaises', places: 4 },
  { cle: 'repas-6', nom: 'Table et 6 chaises', rayon: 'tables', famille: 'meuble', l: 22, h: 15, forme: 'table-chaises', places: 6 },
  { cle: 'repas-8', nom: 'Table et 8 chaises', rayon: 'tables', famille: 'meuble', l: 30, h: 16, forme: 'table-chaises', places: 8 },
  { cle: 'reunion-10', nom: 'Table de réunion 10 pl.', rayon: 'tables', famille: 'meuble', l: 36, h: 17, forme: 'table-chaises', places: 10 },
  { cle: 'reunion-ronde-8', nom: 'Réunion ronde 8 pl.', rayon: 'tables', famille: 'meuble', l: 24, h: 24, forme: 'ronde-chaises', places: 8 },

  // La détente — canapés, fauteuils, tables basses.
  { cle: 'canape-2', nom: 'Canapé 2 places', rayon: 'detente', famille: 'meuble', l: 16, h: 9, forme: 'canape' },
  { cle: 'canape-3', nom: 'Canapé 3 places', rayon: 'detente', famille: 'meuble', l: 21, h: 9, forme: 'canape' },
  { cle: 'canape-4', nom: 'Canapé 4 places', rayon: 'detente', famille: 'meuble', l: 26, h: 9, forme: 'canape' },
  { cle: 'canape-angle', nom: 'Canapé d’angle', rayon: 'detente', famille: 'meuble', l: 24, h: 16, forme: 'canape-angle' },
  { cle: 'banquette', nom: 'Banquette', rayon: 'detente', famille: 'meuble', l: 18, h: 6, forme: 'canape' },
  { cle: 'fauteuil', nom: 'Fauteuil', rayon: 'detente', famille: 'meuble', l: 8, h: 8, forme: 'fauteuil' },
  { cle: 'fauteuil-cocon', nom: 'Fauteuil cocon', rayon: 'detente', famille: 'meuble', l: 10, h: 10, forme: 'rond' },
  { cle: 'pouf', nom: 'Pouf', rayon: 'detente', famille: 'meuble', l: 6, h: 6, forme: 'rond' },
  { cle: 'pouf-long', nom: 'Pouf long', rayon: 'detente', famille: 'meuble', l: 12, h: 6, forme: 'arrondi' },
  { cle: 'table-basse', nom: 'Table basse', rayon: 'detente', famille: 'meuble', l: 11, h: 6 },
  { cle: 'table-basse-ronde', nom: 'Table basse ronde Ø 0,70 m', rayon: 'detente', famille: 'meuble', l: 7, h: 7, forme: 'rond' },
  { cle: 'tapis', nom: 'Tapis 3 × 2 m', rayon: 'detente', famille: 'meuble', l: 30, h: 20, forme: 'tapis' },
  { cle: 'tapis-rond', nom: 'Tapis rond Ø 2 m', rayon: 'detente', famille: 'meuble', l: 20, h: 20, forme: 'rond' },

  // Le rangement — ce qui longe les murs.
  { cle: 'caisson', nom: 'Caisson à roulettes', rayon: 'rangement', famille: 'meuble', l: 4, h: 6 },
  { cle: 'armoire-basse', nom: 'Armoire basse', rayon: 'rangement', famille: 'meuble', l: 12, h: 5, forme: 'armoire' },
  { cle: 'armoire-haute', nom: 'Armoire haute', rayon: 'rangement', famille: 'meuble', l: 10, h: 5, forme: 'armoire' },
  { cle: 'bibliotheque', nom: 'Bibliothèque', rayon: 'rangement', famille: 'meuble', l: 8, h: 4, forme: 'etagere' },
  { cle: 'etagere', nom: 'Étagère 2 m', rayon: 'rangement', famille: 'meuble', l: 20, h: 4, forme: 'etagere' },
  { cle: 'credence', nom: 'Crédence', rayon: 'rangement', famille: 'meuble', l: 16, h: 5, forme: 'armoire' },
  { cle: 'casiers', nom: 'Casiers 12 portes', rayon: 'rangement', famille: 'meuble', l: 9, h: 5, forme: 'casiers' },
  { cle: 'vestiaire', nom: 'Vestiaire', rayon: 'rangement', famille: 'meuble', l: 10, h: 6, forme: 'casiers' },
  { cle: 'casier-colis', nom: 'Casier à colis', rayon: 'rangement', famille: 'meuble', l: 12, h: 6, forme: 'casiers' },
  { cle: 'cloison', nom: 'Cloison mobile', rayon: 'rangement', famille: 'meuble', l: 14, h: 3 },
  { cle: 'cloison-vegetale', nom: 'Cloison végétale', rayon: 'rangement', famille: 'meuble', l: 16, h: 4, forme: 'vegetal' },
  { cle: 'coffre', nom: 'Coffre de rangement', rayon: 'rangement', famille: 'meuble', l: 8, h: 5, forme: 'armoire' },

  // Les services et la verdure — ce qui fait vivre un plateau.
  { cle: 'kitchenette', nom: 'Kitchenette', rayon: 'service', famille: 'meuble', l: 24, h: 6, forme: 'cuisine' },
  { cle: 'ilot-cuisine', nom: 'Îlot de cuisine', rayon: 'service', famille: 'meuble', l: 18, h: 9, forme: 'cuisine' },
  { cle: 'point-cafe', nom: 'Point café', rayon: 'service', famille: 'meuble', l: 8, h: 6, forme: 'appareil' },
  { cle: 'frigo', nom: 'Réfrigérateur', rayon: 'service', famille: 'meuble', l: 7, h: 7, forme: 'appareil' },
  { cle: 'distributeur', nom: 'Distributeur', rayon: 'service', famille: 'meuble', l: 9, h: 8, forme: 'appareil' },
  { cle: 'imprimante', nom: 'Imprimante', rayon: 'service', famille: 'meuble', l: 7, h: 6, forme: 'appareil' },
  { cle: 'corbeille-tri', nom: 'Corbeille de tri', rayon: 'service', famille: 'meuble', l: 6, h: 4, forme: 'casiers' },
  { cle: 'ecran-tv', nom: 'Écran sur pied', rayon: 'service', famille: 'meuble', l: 14, h: 4, forme: 'ecran' },
  { cle: 'paperboard', nom: 'Paperboard', rayon: 'service', famille: 'meuble', l: 8, h: 6, forme: 'ecran' },
  { cle: 'borne-badge', nom: 'Borne de badge', rayon: 'service', famille: 'meuble', l: 4, h: 4, forme: 'appareil' },
  { cle: 'plante', nom: 'Plante', rayon: 'service', famille: 'meuble', l: 5, h: 5, forme: 'vegetal' },
  { cle: 'plante-haute', nom: 'Plante haute', rayon: 'service', famille: 'meuble', l: 7, h: 7, forme: 'vegetal' },
  { cle: 'jardiniere', nom: 'Jardinière', rayon: 'service', famille: 'meuble', l: 12, h: 4, forme: 'vegetal' },

  // Les pièces — du décor au sol : on nomme un local, on ne le réserve pas.
  { cle: 'accueil', nom: 'Accueil', rayon: 'piece', famille: 'meuble', l: 50, h: 35, forme: 'local' },
  { cle: 'banque-accueil', nom: 'Comptoir d’accueil', rayon: 'piece', famille: 'meuble', l: 24, h: 12, forme: 'accueil' },
  { cle: 'couloir', nom: 'Couloir', rayon: 'piece', famille: 'meuble', l: 60, h: 14, forme: 'couloir' },
  { cle: 'local-technique', nom: 'Local technique', rayon: 'piece', famille: 'meuble', l: 25, h: 20, forme: 'local' },
  { cle: 'salle-serveur', nom: 'Salle serveur', rayon: 'piece', famille: 'meuble', l: 30, h: 25, forme: 'local' },
  { cle: 'stockage', nom: 'Stockage', rayon: 'piece', famille: 'meuble', l: 30, h: 20, forme: 'local' },
  { cle: 'archives', nom: 'Archives', rayon: 'piece', famille: 'meuble', l: 30, h: 25, forme: 'local' },
  { cle: 'local-menage', nom: 'Local ménage', rayon: 'piece', famille: 'meuble', l: 15, h: 12, forme: 'local' },
  { cle: 'vestiaires', nom: 'Vestiaires', rayon: 'piece', famille: 'meuble', l: 30, h: 20, forme: 'local' },
  { cle: 'office', nom: 'Office', rayon: 'piece', famille: 'meuble', l: 35, h: 25, forme: 'local' },
  { cle: 'sanitaires', nom: 'Sanitaires', rayon: 'piece', famille: 'meuble', l: 35, h: 25, forme: 'local' },
  { cle: 'escalier', nom: 'Escalier', rayon: 'piece', famille: 'meuble', l: 30, h: 12, forme: 'escalier' },
  { cle: 'ascenseur', nom: 'Ascenseur', rayon: 'piece', famille: 'meuble', l: 16, h: 16, forme: 'ascenseur' },
  { cle: 'gaine', nom: 'Gaine technique', rayon: 'piece', famille: 'meuble', l: 8, h: 8, forme: 'gaine' },
  { cle: 'poteau', nom: 'Poteau', rayon: 'piece', famille: 'meuble', l: 4, h: 4, forme: 'poteau' },

  // Les sanitaires — aux cotes d'usage, pour vérifier qu'un local les contient.
  { cle: 'cabine-wc', nom: 'Cabine WC', rayon: 'sanitaire', famille: 'meuble', l: 9, h: 15, forme: 'cabine-wc' },
  { cle: 'wc', nom: 'WC', rayon: 'sanitaire', famille: 'meuble', l: 4, h: 7, forme: 'wc' },
  { cle: 'urinoir', nom: 'Urinoir', rayon: 'sanitaire', famille: 'meuble', l: 4, h: 4, forme: 'urinoir' },
  { cle: 'lavabo', nom: 'Lavabo', rayon: 'sanitaire', famille: 'meuble', l: 6, h: 5, forme: 'lavabo' },
  { cle: 'lavabo-double', nom: 'Plan double vasque', rayon: 'sanitaire', famille: 'meuble', l: 14, h: 5, forme: 'lavabo' },
  { cle: 'douche', nom: 'Douche', rayon: 'sanitaire', famille: 'meuble', l: 9, h: 9, forme: 'douche' },

  // Les percements — une ouverture se pose SUR un mur, jamais dans le vide.
  { cle: 'porte-simple', nom: 'Porte simple', rayon: 'ouverture', famille: 'ouverture', type: 'simple', l: 9, h: 2 },
  { cle: 'porte-double', nom: 'Porte double', rayon: 'ouverture', famille: 'ouverture', type: 'double', l: 16, h: 2 },
  { cle: 'porte-coulissante', nom: 'Porte coulissante', rayon: 'ouverture', famille: 'ouverture', type: 'coulissante', l: 12, h: 2 },
  { cle: 'porte-large', nom: 'Porte large', rayon: 'ouverture', famille: 'ouverture', type: 'simple', l: 12, h: 2 },
  { cle: 'passage', nom: 'Passage libre', rayon: 'ouverture', famille: 'ouverture', type: 'passage', l: 12, h: 2 },
  { cle: 'passage-large', nom: 'Passage large', rayon: 'ouverture', famille: 'ouverture', type: 'passage', l: 20, h: 2 },
  { cle: 'fenetre', nom: 'Fenêtre', rayon: 'ouverture', famille: 'ouverture', type: 'fenetre', l: 14, h: 2 },
  { cle: 'fenetre-baie', nom: 'Baie vitrée', rayon: 'ouverture', famille: 'ouverture', type: 'fenetre', l: 30, h: 2 },
];

/** Le bloc demandé, ou le bureau standard : jamais `undefined` à la pose. */
export function blocDe(cle) {
  return BLOCS.find((b) => b.cle === cle)
    || BLOCS.find((b) => b.cle === 'bureau-standard')
    || BLOCS[0];
}

/** Les blocs d'un rayon, dans l'ordre du catalogue. */
export function blocsDuRayon(cle) {
  return BLOCS.filter((b) => b.rayon === cle);
}

const PAR_CLE = new Map(BLOCS.map((b) => [b.cle, b]));

/**
 * Comment se dessine ce qu'on a posé — et `rect` pour ce qu'on ne connaît plus.
 *
 * LE PLAN NE GARDE QUE LA CLÉ, PAS LE DESSIN : un meuble rangé en base porte
 * `k`, jamais sa silhouette. Retirer une entrée du catalogue ne doit donc pas
 * effacer les meubles déjà posés — ils retombent sur un rectangle nommé, ce que
 * le `n` écrit à la pose permet de continuer à lire.
 */
export function formeDe(cle) {
  return PAR_CLE.get(cle)?.forme || 'rect';
}

/** Les chaises d'une table dressée : 0 pour tout le reste. */
export function placesDe(cle) {
  return PAR_CLE.get(cle)?.places || 0;
}

/**
 * La taille annoncée d'un bloc, en mètres : « 1,4 × 0,8 m ».
 *
 * Une ouverture n'a qu'une largeur : son épaisseur est celle du mur, pas la
 * sienne. L'annoncer en deux dimensions ferait croire à un meuble.
 */
export function tailleDite(bloc) {
  const m = (u) => String(Math.round(Number(u) * 10) / 100).replace('.', ',');
  if (bloc?.famille === 'ouverture') return `${m(bloc.l)} m de large`;
  return `${m(bloc?.l)} × ${m(bloc?.h)} m`;
}

/**
 * L'encombrement total d'un bloc posé : ce que l'aperçu dessine sous le doigt.
 *
 * Un bench de six ne fait pas 1,4 m de large : il fait trois postes de front
 * et deux rangs de profond. L'aperçu doit montrer ça, sinon on pose à l'aveugle.
 */
export function encombrement(bloc) {
  const b = bloc || {};
  const n = Math.max(1, Math.floor(Number(b.postes) || 1));
  if (b.famille !== 'poste' || n === 1) return { l: Number(b.l) || POSTE.l, h: Number(b.h) || POSTE.h };
  const rangs = b.dos ? 2 : 1;
  const parRang = Math.ceil(n / rangs);
  const vertical = b.sens === 'vertical';
  const pasLong = vertical ? ECART.y : ECART.x;
  const long = (parRang - 1) * pasLong + (vertical ? b.h : b.l);
  const large = rangs * (vertical ? b.l : b.h);
  return vertical ? { l: large, h: long } : { l: long, h: large };
}

/**
 * Les places d'un bloc `poste`, posées à partir d'un point.
 *
 * LE POINT EST LE CENTRE, pas le coin : on pose un bench là où on le regarde.
 * `ilot` garde la banque dans la feuille, et le pas de grille garde deux blocs
 * posés côte à côte alignés.
 */
export function posesDuBloc(bloc, point, options = {}) {
  const b = blocDe(bloc?.cle || bloc);
  if (b.famille !== 'poste') return [];
  const enc = encombrement(b);
  const depart = {
    x: aimanter(Number(point?.x || 0) - enc.l / 2, PAS),
    y: aimanter(Number(point?.y || 0) - enc.h / 2, PAS),
  };
  return ilot(depart, b.postes || 1, {
    plan: options.plan,
    dos: Boolean(b.dos) && (b.postes || 1) > 1,
    sens: b.sens,
    l: b.l,
    h: b.h,
  });
}

/** Le coin haut-gauche d'un bloc centré sur un point, gardé dans la feuille. */
function coinCentre(b, point, plan = {}) {
  const largeur = Number(plan.largeur) || 0;
  const hauteur = Number(plan.hauteur) || 0;
  const borne = (v, max) => (max > 0 ? Math.min(Math.max(v, 0), Math.max(0, max)) : Math.max(v, 0));
  return {
    x: borne(aimanter(Number(point?.x || 0) - b.l / 2, PAS), largeur - b.l),
    y: borne(aimanter(Number(point?.y || 0) - b.h / 2, PAS), hauteur - b.h),
  };
}

/**
 * Le rectangle d'un bloc `salle`, centré sur le point, gardé dans la feuille.
 */
export function rectangleDuBloc(bloc, point, options = {}) {
  const b = blocDe(bloc?.cle || bloc);
  if (b.famille !== 'salle') return null;
  return { ...coinCentre(b, point, options.plan || {}), l: b.l, h: b.h, rot: 0 };
}

/**
 * Le meuble d'un bloc `meuble`, centré sur le point.
 *
 * LE NOM PART AVEC LE MEUBLE. La base ne garde de la clé que sa forme, pas la
 * liste du catalogue : le jour où une clé change ici, le plan de quelqu'un ne
 * doit pas se retrouver avec un rectangle anonyme.
 */
export function meubleDuBloc(bloc, point, options = {}) {
  const b = blocDe(bloc?.cle || bloc);
  if (b.famille !== 'meuble') return null;
  return nettoyerMeuble({
    k: b.cle, n: b.nom, ...coinCentre(b, point, options.plan || {}), l: b.l, h: b.h, rot: 0,
  });
}

/**
 * L'ouverture d'un bloc `ouverture`, projetée sur le mur le plus proche.
 *
 * `null` quand aucun mur n'est à portée : une porte qui flotte au milieu d'un
 * plateau ne veut rien dire, mieux vaut ne rien poser que poser à côté.
 */
export function ouvertureDuBloc(bloc, murs, point) {
  const b = blocDe(bloc?.cle || bloc);
  if (b.famille !== 'ouverture') return null;
  return poserOuverture(murs, point, { type: b.type, largeur: b.l });
}

/** Le type d'ouverture d'un bloc, pour l'afficher sans redemander au catalogue. */
export function typeDuBloc(bloc) {
  const b = blocDe(bloc?.cle || bloc);
  return b.famille === 'ouverture' ? typeOuverture(b.type) : null;
}
