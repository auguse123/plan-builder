// Le plan du bureau — l'onglet, pas un repli de réglages.
//
// UN SVG EN LIGNE, DES POINTER EVENTS, ZÉRO DÉPENDANCE. Une bibliothèque de
// canevas pèse plus que toute l'app et impose son modèle d'objets ; ici un
// poste est un `<g>` focusable, et la géométrie est celle de `plan.js`, testée
// seule. Le pixel n'entre qu'en un point : `versPlan`, sous le doigt.
//
// UNE FLÈCHE POUR TOUT, DES OUTILS POUR POSER. C'est la règle des logiciels de
// plan : on pose avec un outil, on corrige avec la flèche. Avant, chaque objet
// ne se retouchait que sous l'outil qui l'avait posé — une zone sous « Zone »,
// un mur sous « Murs » — et certains ne se supprimaient nulle part. Désormais
// la flèche choisit n'importe quoi (poste, salle, zone, mur, ouverture), montre
// ses poignées, et une seule barre le renomme, le redimensionne, le pivote et
// l'efface. `Suppr` efface ce qui est choisi, quoi que ce soit.
//
// LE LOT PART AU RELÂCHER, jamais à chaque frame : une écriture par image
// mettrait le goulot de débit (240/min) à genoux en deux secondes de
// glissement. Un `om_postes_deplacer` pour dix postes, une fois le doigt levé.
//
// LA ZONE EST UN RECTANGLE, ET C'EST ELLE QUI CLASSE. Un poste glissé dans
// « Mezzanine » devient de la mezzanine : la règle est en base
// (`om_postes_deplacer`), `zoneDuPoint` n'en est que le miroir, pour que
// l'écran annonce la même chose avant l'aller-retour.
//
// L'ÉDITION EST UN ÉCRAN ≥ 1024 px. Dessiner un plateau au pouce sur 375 px
// produit un plan faux qu'il faudra refaire ; sous cette largeur on montre le
// plan, on ne le modifie pas.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { demander } from '@/lib/outils/confirmation';
import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical,
  AlignVerticalDistributeCenter, BringToFront, CalendarDays, Check, CopyPlus, ClipboardPaste, Copy, DoorOpen, Download, Eye, EyeOff, FileImage, Flame, FlipHorizontal2, FlipVertical2, Frame,
  Grid2x2, Keyboard, Layers, Lock, LockOpen, Maximize, MousePointer2, Move, PenLine, Pentagon, Plus, Presentation, Printer, RotateCcw,
  RotateCw, Rows3, Ruler, Search, SendToBack, Sofa, Square, Trash2, Undo2, Redo2, Upload, ZoomIn, ZoomOut,
} from 'lucide-react';
import { Bouton, Etat, Etiquette } from '@/components/outils/primitives';
import ChampNombre from '@/components/outils/ChampNombre';
import { GENRES_LISTE } from '@/lib/outils/equipe/postes';
import {
  BORNES, MURS, POSTE, SALLE, ZOOM, aimanter, cadre, cadreNecessaire,
  centreDe, chevauchent, deplacer, echelleDe, geometrieDe, murNet, placerManquants, plafondZoom,
  rectangleEntre, traitDe, unitesParPixel, versEcran, versPlan, vueZoomee, zoneDuPoint,
} from '@/lib/outils/equipe/plan';
import {
  RAYONS, blocDe, blocsDuRayon, encombrement, meubleDuBloc, ouvertureDuBloc,
  formeDe, posesDuBloc, rectangleDuBloc, tailleDite,
} from '@/lib/outils/equipe/blocs';
import { FORMES_AU_SOL } from '@/components/outils/equipe/public/PlanMobilier';
import { MEUBLES_MAX, nettoyerMeuble, nettoyerMeubles } from '@/lib/outils/equipe/meubles';
import {
  aimanterLot, aimanterPose, boiteTournee, collerAuBiais, reperesDe, traceTouche,
} from '@/lib/outils/equipe/aimant';
import { alignerBoites, repartirBoites, reseau } from '@/lib/outils/equipe/alignement';
import { metresDuPlan, piecesDuPlan } from '@/lib/outils/equipe/pieces';
import { glisserSegment, insererSommet, poigneeDeSegment } from '@/lib/outils/equipe/segments';
import {
  COUCHES, basculerCouche, couchesNettes, couchesTouchees, prenable,
} from '@/lib/outils/equipe/couches';
import {
  EPAISSEURS, TRAITS, TRAIT_DEFAUT, contourDeMur, epaisseurCommune, epaisseurDe, epaisseurSous,
  libelleEpaisseur,
  nettoyerEpaisseurs, traitNet,
} from '@/lib/outils/equipe/epaisseurs';
import { PILE_MAX, empiler, fusionner, inverse } from '@/lib/outils/equipe/annulation';
import {
  ANGLES, accrocher, aimanterSommets, aire, boiteDe, cap, changerLongueur, ciblesDuSommet,
  contraindre, deplacerSommet, depuisMetres, enMetres, finesseDe, joindreMurs, longueur,
  perimetre, piece, pivoter, pivoterTrace, translaterTrace, versPoint,
} from '@/lib/outils/equipe/trace';
import {
  etirerCalque, glisserCalque, nomNet, redimensionner,
} from '@/lib/outils/equipe/edition';
import { facteurEchelle, mettreAEchelle } from '@/lib/outils/equipe/echelle';
import {
  LARGEUR, OUVERTURES_MAX, TYPES_OUVERTURE, deplacerOuverture, etirerOuverture,
  nettoyerOuvertures, retournerOuverture, typeOuverture,
} from '@/lib/outils/equipe/ouvertures';
import {
  FORMATS_IMPORT, ajusterAuPlan, lireTrace,
} from '@/lib/outils/equipe/importPlan';
import {
  omErreurMessage, useCreerPlan, useDeplacerPostes, useDessinerZones,
  useEcrireRessourcePublique, useEcrireZonePublic, useGenrePostes, usePatchPlan,
  useEspacePublic, usePoserSalle, usePostes, useRenommerPlan, useSemerPostes, useSupprimerPlan,
} from '@/lib/outils/equipe/publicApi';
import {
  JOURS_OUVRES_DEFAUT, cleJour, indexerPresences, initiales, jourDetaille,
} from '@/lib/outils/equipe/model';
import { joursOuvresEntre } from '@/lib/outils/equipe/periodes';
import {
  PALIERS, palier, planDuJour, syntheseDuJour, syntheseOccupation, tauxOccupation,
} from '@/lib/outils/equipe/occupation';
import { telechargerBlob, telechargerFichier } from '@/lib/outils/fichier';
import { boiteImprimee } from '@/lib/outils/equipe/feuille';
import { chercherSurPlan, vueSur } from '@/lib/outils/equipe/recherche';
import { mesureSurface, poserPointSurface } from '@/lib/outils/equipe/surface';
import PlanImpression from '@/components/outils/equipe/public/PlanImpression';
import PlanMiniCarte from '@/components/outils/equipe/public/PlanMiniCarte';
import {
  BoutsDOuverture, CotesDeMur, EchelleEcran, Meuble, Ouverture, Poignees, Poste, Salle,
  MursSoudes, ZoneDessinee,
} from '@/components/outils/equipe/public/PlanFormes';

/**
 * Une zone pivotée autour d'un point.
 *
 * Une zone n'a pas d'angle en base : au quart de tour ses côtés s'échangent,
 * entre deux elle garde les siens et ne fait que suivre le pivot. C'est la
 * seule nature du plan qui ne sait pas pencher, et c'est assumé : une zone est
 * une étiquette de surface, pas un meuble.
 */
/** L'angle pris contre un mur de biais, posé sur l'aperçu du glissement. */
function avecAngle(liste, rot) {
  return rot == null ? liste : liste.map((o) => ({ ...o, rot }));
}

function zonePivotee(z, degres, centre) {
  const a = (degres * Math.PI) / 180;
  const cx = z.x + z.l / 2;
  const cy = z.y + z.h / 2;
  const nx = centre.x + (cx - centre.x) * Math.cos(a) - (cy - centre.y) * Math.sin(a);
  const ny = centre.y + (cx - centre.x) * Math.sin(a) + (cy - centre.y) * Math.cos(a);
  const droit = Math.abs(Math.round(degres / 90)) % 2 === 1;
  const l = droit ? z.h : z.l;
  const h = droit ? z.l : z.h;
  return {
    id: z.id, l, h,
    x: Math.max(0, Math.round(nx - l / 2)),
    y: Math.max(0, Math.round(ny - h / 2)),
  };
}

const CHAMP = 'h-9 rounded-controle border px-2.5 text-corps bg-surface border-ligne text-encre transition-colors duration-court ease-om focus:border-accent';

/** La couche d'où vient chaque nature d'objet de la sélection. */
const COUCHE_DE = {
  postes: 'postes', salles: 'postes', zones: 'zones', murs: 'murs', portes: 'murs', meubles: 'mobilier',
};

/** Le clavier du plan, dit une fois : le panneau « ? » ne l'invente pas. */
const RACCOURCIS = [
  ['Ctrl+Z', 'Annuler — en traçant un mur, défaire le dernier point'],
  ['Ctrl+Maj+Z · Ctrl+Y', 'Rétablir'],
  ['Ctrl+C · Ctrl+V', 'Copier, coller ce qui est choisi'],
  ['Ctrl+D', 'Dupliquer'],
  ['Suppr', 'Effacer ce qui est choisi'],
  ['Échap', 'Tout lâcher'],
  ['Entrée · Retour arrière', 'Terminer le mur · défaire son dernier point'],
  ['Maj+clic', 'Ajouter à la sélection, ou en retirer'],
  ['Maj en tournant', 'Tourner par pas de 15°'],
  ['Alt', 'Couper l’aimant et l’accroche'],
  ['Flèches · R', 'Poste pris au clavier : avancer d’un cran · pivoter'],
  ['Double-clic sur un mur', 'Ajouter un point'],
  ['Bande vers la gauche', 'Prendre ce qu’elle touche'],
  ['Règle + Maj', 'Mesurer à 45° près'],
  ['Ctrl+F', 'Chercher une personne, un poste, une salle'],
  ['?', 'Cette aide'],
];

const virgule = (v, n = 1) => Number(v).toFixed(n).replace('.', ',');

// Six outils, pas un de plus. La flèche d'abord : c'est le mode où l'on passe
// le plus de temps, et le seul qui ne pose rien. « Bureau seul » est un bench
// de un : le même geste, le même code, et personne n'a à comprendre qu'un
// bureau isolé serait un cas particulier.
//
// LA PORTE N'A PLUS SON OUTIL : elle est un rayon de la bibliothèque. Un
// septième bouton pour poser une porte simple, alors qu'un canapé et une table
// ronde se prennent dans une vignette, c'était deux gestes pour une seule
// idée — « je prends un objet, je le pose ». Le rayon « Portes et fenêtres »
// dit la même chose et montre les largeurs.
const OUTILS = [
  { cle: 'choisir', label: 'Sélection', icone: MousePointer2, aide: 'Cliquez n’importe quoi — poste, salle, zone, mur, porte. Tirez pour déplacer, prenez les poignées pour la taille, la barre donne le nom, les dimensions et l’angle. Suppr efface ce qui est choisi. Maj pour prendre plusieurs postes, les flèches pour ajuster, R pour pivoter.' },
  { cle: 'mur', label: 'Murs', icone: PenLine, aide: 'Cliquez, ou tapez la longueur et l’angle. Retour arrière défait le dernier point, Entrée termine, Échap abandonne.' },
  { cle: 'piece', label: 'Pièce', icone: Frame, aide: 'Tirez un rectangle : ses quatre murs se posent d’un coup, cotés. Reprenez-les ensuite par leurs sommets, avec la flèche.' },
  { cle: 'zone', label: 'Zone', icone: Square, aide: 'Tirez un rectangle : il délimite la zone choisie, et classe les postes qui y tombent.' },
  { cle: 'bloc', label: 'Blocs', icone: Rows3, aide: 'Prenez un objet dans la bibliothèque — bureau, table de réunion, canapé, armoire, porte — puis cliquez : il se pose à sa vraie taille, centré sous le doigt. Une porte ou une fenêtre ne se pose que sur un mur, dont elle prend le cap.' },
  { cle: 'salle', label: 'Salle', icone: Presentation, aide: 'Tirez le rectangle de la salle de réunion.' },
  { cle: 'regle', label: 'Règle', icone: Ruler, aide: 'Tirez d’un point à un autre : la distance s’affiche, accrochée aux murs. Maj garde l’angle rond, Alt coupe l’accroche, Échap efface.' },
  { cle: 'surface', label: 'Surface', icone: Pentagon, aide: 'Cliquez les coins d’une surface, puis revenez sur le premier point : l’aire et le périmètre s’affichent. Rien n’est dessiné, Échap efface.' },
];

// LE PLAN QUI SAIT QUI VIENT. Cinq aplats pour cinq paliers d'occupation, et
// une teinte par état du jour : l'œil compare des crans, pas un dégradé.
const OPACITE_PALIER = [0.06, 0.2, 0.35, 0.5, 0.7];
const TEINTE_JOUR = {
  reserve: ['fill-accent', 0.45, 'réservé'],
  titulaire: ['fill-accent', 0.45, 'titulaire présent'],
  libere: ['fill-alerte', 0.4, 'libéré — titulaire absent'],
  libre: ['fill-accent-doux', 0.5, 'libre'],
  bloque: ['fill-encre-3', 0.15, 'bloqué'],
};
// Le nom d'un fichier d'export : sans accent ni espace, qu'aucun système ne
// refuse.
const nomDeFichier = (nom) => `plan-${String(nom || 'bureau').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'bureau'}`;
// Ce que l'export recopie du style calculé : les classes Tailwind ne
// voyagent pas avec le fichier, les couleurs résolues oui.
const STYLES_EXPORT = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray',
  'opacity', 'visibility', 'font-family', 'font-size', 'font-weight', 'paint-order',
];

// Ce qu'un rectangle accepte comme côté : le miroir d'
// `om_ressource_geometrie_check`, qui borne `l` et `h` à 200 unités.
const COTE = { mini: 0.4, maxi: 20 };

// La teinte d'une vignette dit ce qu'on pose : un bloc accent se réservera, un
// bloc sourd est du décor, un bloc au trait seul perce un mur.
const TEINTE_BLOC = {
  salle: 'fill-accent-doux stroke-accent',
  poste: 'fill-fond stroke-encre-2',
  meuble: 'fill-surface-2 stroke-encre-3',
  ouverture: 'fill-surface stroke-encre',
};

// Ce qu'une accroche dit d'elle-même. Un point qui saute sans raison visible
// passe pour un bug : le mot sous le curseur dit POURQUOI il a sauté.
const NOMS_ACCROCHE = {
  sommet: 'extrémité', face: 'contre le mur', milieu: 'milieu', segment: 'sur le mur',
  equerre: 'équerre', axe: 'alignement',
};

// Un mètre de décalage pour une copie : assez pour la voir, assez peu pour la
// remettre en place d'un glissement.
const DECALAGE_COPIE = 10;

/**
 * Une image de plan réduite en `dataURL`, prête à servir de calque.
 *
 * ELLE NE MONTE PAS EN BASE. Un scan de plan est un document d'immeuble, pas
 * une donnée d'espace : il reste dans le navigateur de qui l'importe
 * (`localStorage`), le temps de redessiner par-dessus. Pas de seau, pas de RPC,
 * pas de lien à faire fuir. La contrepartie est dite à l'écran : le calque ne
 * suit pas l'utilisateur d'une machine à l'autre.
 */
function reduireImage(fichier, max = 1400) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error('lecture'));
    lecteur.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('image'));
      img.onload = () => {
        const f = Math.min(1, max / Math.max(img.width, img.height));
        const toile = document.createElement('canvas');
        toile.width = Math.max(1, Math.round(img.width * f));
        toile.height = Math.max(1, Math.round(img.height * f));
        toile.getContext('2d').drawImage(img, 0, 0, toile.width, toile.height);
        resolve({ src: toile.toDataURL('image/jpeg', 0.72), ratio: toile.width / toile.height });
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

/**
 * LE CALQUE A SA PROPRE GÉOMÉTRIE, EN UNITÉS DE PLAN — c'est tout le point.
 *
 * Tant qu'il était rendu à la taille de la FEUILLE, chaque mur tracé un peu
 * plus loin agrandissait `cadreNecessaire`, donc réétirait le scan : on traçait
 * par-dessus une image qui glissait sous le crayon. Posé une fois, centré, à
 * son rapport d'image, il ne bouge plus que par une mise à l'échelle explicite
 * (`mettreAEchelle`), où il suit le dessin.
 */
function calqueCentre(src, ratio, feuille) {
  const r = Number(ratio) > 0 ? Number(ratio) : 1;
  const net = (n) => Math.round(n * 100) / 100;
  const h = Math.max(1, net(Math.min(feuille.hauteur, feuille.largeur / r)));
  const l = Math.max(1, net(h * r));
  // Posé DERRIÈRE : un scan qu'on relève se trace par-dessus. Le passer devant
  // est un geste, pas un état de départ.
  return {
    src, x: net((feuille.largeur - l) / 2), y: net((feuille.hauteur - h) / 2), l, h, devant: false,
  };
}

/** Ce que le navigateur a gardé. Une `dataURL` nue est un calque d'avant la
 *  géométrie : il valait la feuille, on le fige à la feuille d'aujourd'hui. */
function lireCalque(brut, feuille) {
  if (!brut) return null;
  if (brut.startsWith('data:')) {
    return { src: brut, x: 0, y: 0, l: feuille.largeur, h: feuille.hauteur, devant: false };
  }
  try {
    const o = JSON.parse(brut);
    if (!o?.src || !(Number(o.l) > 0) || !(Number(o.h) > 0)) return null;
    return {
      src: o.src, x: Number(o.x) || 0, y: Number(o.y) || 0, l: Number(o.l), h: Number(o.h),
      devant: o.devant === true,
    };
  } catch { return null; }
}

/**
 * LE STYLE D'UN MUR, COMME CHEZ L'ARCHITECTE : deux lignes, un libellé à
 * gauche, une valeur à droite. L'épaisseur est celle des murs choisis (et du
 * prochain tracé) ; `epaisseur` null — murs d'épaisseurs mêlées — n'en montre
 * aucune. Le trait est la plume du plan entier, en millimètres.
 */
function StyleDeMur({ epaisseur, trait, onEpaisseur, onTrait, disabled = false }) {
  return (
    <div role="group" aria-label="Style des murs" className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5">
      <span className="text-micro text-encre-2">Épaisseur</span>
      <select
        value={epaisseur ?? ''} disabled={disabled}
        onChange={(e) => onEpaisseur(Number(e.target.value))}
        className={CHAMP} aria-label="Épaisseur du mur"
      >
        {epaisseur == null && <option value="" disabled>Mêlées</option>}
        {EPAISSEURS.map((e) => <option key={e.ep} value={e.ep}>{libelleEpaisseur(e.ep)}</option>)}
      </select>
      <span className="text-micro text-encre-2">Trait</span>
      <select
        value={trait} disabled={disabled}
        onChange={(e) => onTrait(Number(e.target.value))}
        className={CHAMP} aria-label="Trait des murs, pour tout le plan"
        title="La plume du contour, pour tous les murs du plan"
      >
        {TRAITS.map((t) => <option key={t} value={t}>{`${t.toFixed(2)} mm`}</option>)}
      </select>
    </div>
  );
}

/**
 * UN PLAN TIENT À L'ESPACE, PAS À UNE ZONE.
 *
 * Un espace porte plusieurs plans — un étage, un plateau, un entrepôt — et
 * c'est SUR un plan qu'on découpe des zones, jamais l'inverse. Un bureau se
 * pose donc sans zone : la zone lui vient du rectangle où il tombe, ou de
 * nulle part, et il reste réservable.
 *
 * @param {{ jeton: string, zones: Array, membres: Array, postes: Array,
 *          salles: Array, plan: object, plans: Array,
 *          onChoisirPlan: Function }} props
 */
export default function PlanPostes({
  jeton, zones = [], membres = [], postes = [], salles = [], plan,
  plans = [], onChoisirPlan = () => {}, onTerminer = null, titre = 'Modifier le plan',
}) {
  const svgRef = useRef(null);
  const champCote = useRef(null);
  const [outil, setOutil] = useState('choisir');
  const [choix, setChoix] = useState([]);
  const [glisse, setGlisse] = useState(null);
  const [trace, setTrace] = useState(null);
  const [mur, setMur] = useState(null);
  const [curseur, setCurseur] = useState(null);
  const [sansAccroche, setSansAccroche] = useState(false);
  // Ce qu'on regarde : le dessin nu, qui est où aujourd'hui, ou l'usage des
  // quatre dernières semaines.
  const [regard, setRegard] = useState('dessin');
  const [regle, setRegle] = useState(null);
  // La règle de surface : des coins posés au clic, fermée sur le premier.
  const [poly, setPoly] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [motEchelle, setMotEchelle] = useState('');
  const [etapeCote, setEtapeCote] = useState('saisie');
  const [vueSvg, setVueSvg] = useState({ width: 0, height: 0 });
  const [grain, setGrain] = useState(0);
  const [cotesVues, setCotesVues] = useState(true);
  // L'épaisseur du prochain mur tracé : la cloison, le cas le plus courant.
  const [epaisseurMur, setEpaisseurMur] = useState(EPAISSEURS[0].ep);
  const [choixMurs, setChoixMurs] = useState([]);
  const [saisieL, setSaisieL] = useState('');
  const [saisieA, setSaisieA] = useState('0');
  const [rayon, setRayon] = useState(RAYONS[0].cle);
  const [blocCle, setBlocCle] = useState('bureau-standard');
  const [zoneCible, setZoneCible] = useState('');
  const [nomSalle, setNomSalle] = useState('');
  const [capaciteSalle, setCapaciteSalle] = useState(6);
  const [choixSalles, setChoixSalles] = useState([]);
  const [choixZones, setChoixZones] = useState([]);
  const [choixPortes, setChoixPortes] = useState([]);
  const [choixMeubles, setChoixMeubles] = useState([]);
  const [retouche, setRetouche] = useState(null);
  const [renommage, setRenommage] = useState('');
  const [segmentChoisi, setSegmentChoisi] = useState(-1);
  const [saisieSegment, setSaisieSegment] = useState('');
  const [calque, setCalque] = useState(null);
  // La photo ne se choisit pas au clic : elle couvre la feuille, et tout clic
  // dessus volerait la bande élastique. Un bouton la prend, Échap la lâche.
  const [calqueChoisi, setCalqueChoisi] = useState(false);
  const [fondOpacite, setFondOpacite] = useState(0.45);
  const [motImport, setMotImport] = useState('');
  const [pile, setPile] = useState([]);
  const [refaits, setRefaits] = useState([]);
  // Le lot du geste en cours : tant qu'il est ouvert, `memoriser` y fusionne
  // au lieu d'empiler (voir `enLot`).
  const lot = useRef(null);
  // Un numéro par geste qui crée : les ids reviennent de la base après coup,
  // et doivent rejoindre l'entrée du geste qui les a demandés.
  const numeroGeste = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [centreVue, setCentreVue] = useState(null);
  const [rotation, setRotation] = useState(null);
  const [presse, setPresse] = useState(null);
  const [enReseau, setEnReseau] = useState({ n: 3, sens: 'x', pas: '' });

  /*
   * TOUT SE CHOISIT PAR LOT — murs, portes, zones, salles, postes.
   * La sélection vit en tableaux ; les noms au singulier restent, dérivés, pour
   * les endroits où un seul objet a un sens (poignées, champs de la barre).
   */
  const murChoisi = choixMurs.length === 1 ? choixMurs[0] : -1;
  const porteChoisie = choixPortes.length === 1 ? choixPortes[0] : -1;
  const salleChoisie = choixSalles.length === 1 ? choixSalles[0] : '';
  const meubleChoisi = choixMeubles.length === 1 ? choixMeubles[0] : -1;
  const zoneChoisie = choixZones.length === 1 ? choixZones[0] : '';
  const setMurChoisi = (i) => setChoixMurs(i >= 0 ? [i] : []);

  const bouger = useDeplacerPostes(jeton);
  const genrer = useGenrePostes(jeton);
  const semer = useSemerPostes(jeton);
  const dessiner = useDessinerZones(jeton);
  const patcherPlan = usePatchPlan(jeton);
  const creerPlan = useCreerPlan(jeton);
  const renommerPlan = useRenommerPlan(jeton);
  const supprimerPlan = useSupprimerPlan(jeton);
  const ecrireZone = useEcrireZonePublic(jeton);
  const poserSalle = usePoserSalle(jeton);
  const ecrireRessource = useEcrireRessourcePublique(jeton);

  const planId = plan?.id || '';
  // LES COUCHES SONT UNE PRÉFÉRENCE DE QUI DESSINE, gardée par plan dans ce
  // navigateur : masquer les cloisons ne les efface pour personne.
  const cleCouches = `om-plan-couches-${planId}`;
  const [couches, setCouches] = useState(() => couchesNettes(null));
  const [panneau, setPanneau] = useState(null);
  useEffect(() => {
    try {
      setCouches(couchesNettes(JSON.parse(window.localStorage.getItem(cleCouches) || 'null')));
    } catch { setCouches(couchesNettes(null)); }
  }, [cleCouches]);
  const coucheVue = (cle) => couches[cle]?.vu !== false;
  const couchePrise = (cle) => prenable(couches, cle);
  const changerCouche = (cle, drapeau) => {
    const c = basculerCouche(couches, cle, drapeau);
    setCouches(c);
    try { window.localStorage.setItem(cleCouches, JSON.stringify(c)); } catch { /* navigation privée */ }
    // Ce qui vient d'être masqué ou verrouillé ne reste pas choisi en dessous.
    rienDeChoisi();
  };
  const dernierClicMur = useRef({ i: -1, t: 0 });
  const murs = Array.isArray(plan?.murs) ? plan.murs : [];
  /**
   * Le plan d'appartenance voyage DANS la géométrie, jamais en paramètre :
   * un paramètre de plus sur `om_postes_deplacer` et consorts ferait une
   * surcharge ambiguë (`PGRST203`) de six fonctions déjà publiques.
   */
  const avecPlan = (g) => (planId ? { ...g, plan_id: planId } : g);
  // Le calque vit dans CE navigateur, indexé par le début du jeton : deux
  // espaces ouverts sur la même machine ne se prêtent pas leur fond.
  const cleFond = `om-plan-fond-${String(jeton || '').slice(0, 8)}`;
  /** Poser (ou retirer) le calque : l'écran et le navigateur ensemble. */
  const poserCalque = (c) => {
    setCalque(c);
    try {
      if (c) window.localStorage.setItem(cleFond, JSON.stringify(c));
      else window.localStorage.removeItem(cleFond);
    } catch { /* quota : le calque ne survivra pas au rechargement */ }
  };
  const portes = useMemo(() => nettoyerOuvertures(plan?.portes), [plan]);
  /**
   * LE DÉCOR EST DU PLAN, PAS UNE RESSOURCE. Canapés, armoires, plantes ne se
   * réservent pas : en faire des `om_ressource` gonflerait la capacité de
   * l'espace de places que personne ne peut occuper, et ferait mentir le
   * dimensionnement. Ils vivent donc dans `om_plan.meubles`, comme les murs.
   */
  const meubles = useMemo(() => nettoyerMeubles(plan?.meubles), [plan]);
  /**
   * UNE ÉPAISSEUR PAR MUR, ALIGNÉE PAR INDEX. La base refuse une liste qui ne
   * fait pas la longueur des murs : toute écriture qui ajoute ou retire un mur
   * réécrit les deux dans le même patch (`ecrireMurs(liste, eps)`).
   */
  const traitMur = traitNet(plan?.trait_mur) ?? TRAIT_DEFAUT;
  const epaisseurs = useMemo(
    () => nettoyerEpaisseurs(plan?.epaisseurs, murs.length), [plan, murs.length],
  );
  const zonesActives = zones.filter((z) => z.actif !== false);

  /**
   * LE CADRE SUIT LE DESSIN — il ne se tape plus.
   *
   * Deux champs « largeur / profondeur du plan » demandaient la mesure d'un
   * plateau avant de l'avoir relevé, et tout butait dessus : un mur s'arrêtait
   * sur une bordure invisible, une mise à l'échelle était refusée. La feuille
   * s'agrandit sous le crayon, marge de blanc comprise (`cadreNecessaire`), et
   * ce qui a grandi est reposté au plan — la base garde le plafond (2000).
   */
  const cadrePlan = useMemo(() => cadreNecessaire({
    murs,
    portes,
    boites: [...postes, ...salles, ...zones, ...meubles],
  }, { plan: { largeur: Number(plan?.largeur), hauteur: Number(plan?.hauteur) } }),
  [plan, murs, portes, meubles, postes, salles, zones]);

  /**
   * CE QU'ON REGARDE N'EST PAS CE QU'ON DESSINE.
   *
   * Le zoom ne touche QUE la fenêtre : un bench posé à ×4 fait les mêmes
   * 140 cm qu'à ×1, une cote lue est la même. Tout le plan garde donc une
   * échelle unique, et zoomer ne fait que s'en approcher. `cadrePlan` reste la
   * feuille — c'est lui qui borne ce qu'on pose, jamais la fenêtre.
   */
  const vuePlan = useMemo(
    () => vueZoomee(cadrePlan, { zoom, centre: centreVue }),
    [cadrePlan.largeur, cadrePlan.hauteur, zoom, centreVue],
  );

  // L'ÉCHELLE SE MESURE, ELLE NE SE DÉDUIT PAS DU ZOOM : le SVG est rendu en
  // `xMidYMid meet`, donc c'est la largeur RENDUE qui dit combien de pixels
  // vaut un mètre. Une fenêtre étroite change l'échelle sans qu'on ait zoomé.
  const echelle = useMemo(() => {
    const echelleX = vueSvg.width / (vuePlan.largeur || 1);
    const echelleY = vueSvg.height / (vuePlan.hauteur || 1);
    const rendue = Math.min(echelleX, echelleY) * vuePlan.largeur;
    return echelleDe(rendue, vuePlan.largeur);
  }, [vueSvg.width, vueSvg.height, vuePlan.largeur, vuePlan.hauteur]);

  /**
   * LA PRÉCISION SUIT L'ŒIL — un pas fixe ment dès qu'on zoome.
   *
   * À ×1, 20 cm font trois pixels : coller à la grille aide. Zoomé sur un
   * angle de cloison, ces mêmes 20 cm font un centimètre d'écran, et le point
   * qu'on VOIT est refusé par un aimant devenu énorme. `unitesParPixel` dit ce
   * que vaut un pixel ici et maintenant ; `finesseDe` en tire un cran (~7 px)
   * et une accroche (~16 px), tous deux plafonnés au pas de 20 cm.
   */
  const uParPx = useMemo(
    () => unitesParPixel(vueSvg, vuePlan),
    [vueSvg.width, vueSvg.height, vuePlan.largeur, vuePlan.hauteur],
  );
  const finesse = useMemo(() => finesseDe(uParPx), [uParPx]);
  // Ce qui se vise (pastilles, cotes, aperçus) se dit en PIXELS d'écran. Avant
  // la première mesure du SVG, on suppose une fenêtre de 900 px, le temps d'un
  // rendu : sans ça les poignées naîtraient à zéro.
  const auPixel = (n) => n * (uParPx || vuePlan.largeur / 900);

  // Une seule écriture par taille atteinte : la clé garde la trace de ce qui a
  // déjà été posté, sinon un refus de la base relancerait la boucle à chaque
  // rendu.
  const cadrePoste = useRef('');
  useEffect(() => {
    if (!planId) return;
    const cle = `${planId}:${cadrePlan.largeur}x${cadrePlan.hauteur}`;
    if (cadrePoste.current === cle) return;
    if (cadrePlan.largeur === Number(plan?.largeur) && cadrePlan.hauteur === Number(plan?.hauteur)) {
      cadrePoste.current = cle;
      return;
    }
    cadrePoste.current = cle;
    patcherPlan.mutate({
      planId,
      patch: { largeur: String(cadrePlan.largeur), hauteur: String(cadrePlan.hauteur) },
    });
  }, [planId, cadrePlan.largeur, cadrePlan.hauteur, plan?.largeur, plan?.hauteur]);
  // La molette zoome autour du pointeur. React pose ses `onWheel` en passif :
  // le `preventDefault` y serait ignoré et la page défilerait sous le plan.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const surMolette = (e) => {
      e.preventDefault();
      zoomer(e.deltaY < 0 ? ZOOM.pas : 1 / ZOOM.pas, pointDe(e));
    };
    svg.addEventListener('wheel', surMolette, { passive: false });
    return () => svg.removeEventListener('wheel', surMolette);
  });

  const zoneCiblee = zonesActives.some((z) => z.id === zoneCible)
    ? zoneCible : (zonesActives[0]?.id || '');
  const erreur = bouger.error || genrer.error || semer.error || dessiner.error
    || patcherPlan.error || ecrireZone.error || poserSalle.error || ecrireRessource.error
    || creerPlan.error || renommerPlan.error || supprimerPlan.error;

  /** Un patch de plan : taille, murs, ouvertures. Rien d'autre n'y entre. */
  const ecrirePlan = (patch) => { if (planId) patcherPlan.mutate({ planId, patch }); };

  /** Tout lâcher : un clic dans le vide, un changement d'outil, Échap. */
  const rienDeChoisi = () => {
    setChoix([]);
    setChoixSalles([]);
    setChoixZones([]);
    setChoixMurs([]);
    setChoixPortes([]);
    setChoixMeubles([]);
    setSegmentChoisi(-1);
    setCalqueChoisi(false);
  };

  // Les postes sans place existent : une zone devient réservable sans dessin.
  // On les montre rangés sous le plan plutôt que nulle part.
  const orphelins = useMemo(
    () => placerManquants(postes.filter((p) => p.actif !== false), { plan: cadrePlan }),
    [postes, cadrePlan.largeur, cadrePlan.hauteur],
  );

  // LES DONNÉES DU REGARD NE PARTENT QU'À LA DEMANDE : dessiner n'a pas besoin
  // des présences, et quatre semaines de réservations pèsent. Le jeton vide
  // éteint la requête (`enabled`).
  const aujourdhui = cleJour(new Date());
  const debutRegard = useMemo(() => {
    if (regard !== 'mois') return aujourdhui;
    const d = new Date();
    d.setDate(d.getDate() - 27);
    return cleJour(d);
  }, [regard, aujourdhui]);
  const vecuQ = useEspacePublic(regard === 'dessin' ? '' : jeton, debutRegard, aujourdhui);
  const vecu = vecuQ.data;
  const lu = useMemo(() => {
    if (regard === 'dessin' || !vecu) return null;
    const esp = vecu.espace || {};
    const ouvres = esp.jours_ouvres?.length ? esp.jours_ouvres : JOURS_OUVRES_DEFAUT;
    const fermetures = esp.fermetures || {};
    const base = {
      postes, salles, reservations: vecu.reservations || [],
      membres: vecu.membres?.length ? vecu.membres : membres,
      index: indexerPresences(vecu.presences || []),
    };
    if (regard === 'jour') {
      const jour = jourDetaille(new Date(), ouvres, fermetures);
      const etats = planDuJour({ ...base, jour });
      return { regard, jour, etats, resume: syntheseDuJour(etats, postes) };
    }
    // Les jours passés seulement, fériés et fermetures écartés : un 15 août
    // vide ne dit rien d'un poste.
    const jours = joursOuvresEntre(debutRegard, aujourdhui, ouvres, fermetures).filter((j) => !j.ferie);
    const taux = tauxOccupation({ ...base, jours });
    return { regard, jours, taux, resume: syntheseOccupation(taux, postes) };
  }, [regard, vecu, postes, salles, membres, debutRegard, aujourdhui]);

  const dessines = useMemo(() => {
    const vus = postes
      .filter((p) => p.actif !== false && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y)))
      .map((p) => ({ ...p, ...geometrieDe(p) }));
    // Le bureau se tire par un coin comme une salle : un plan n'est jamais tout
    // à fait à l'échelle, et un bench de 1,40 m dessiné sur un fond de 1,60 se
    // corrige à la poignée avant de se taper au centimètre.
    // L'aperçu de la rotation passe par LA MÊME fonction que l'écriture : ce
    // qui tourne sous le doigt est ce que la base recevra au relâcher.
    if (rotation?.angle && choix.length) {
      const tournes = pivoter(vus.filter((p) => choix.includes(p.id)), rotation.angle, { centre: rotation.centre, pas: 1 });
      const parId = new Map(tournes.map((p) => [p.id, p]));
      return vus.map((p) => parId.get(p.id) || p);
    }
    if (retouche?.quoi === 'poste') {
      return vus.map((p) => (p.id === retouche.id
        ? { ...p, ...(redimensionner(p, retouche.cle, retouche.point, { plan: cadrePlan, pas: finesse.pas }) || {}) }
        : p));
    }
    if (!glisse?.ids?.length) return vus;
    // L'aperçu du glissement passe par la MÊME fonction que l'envoi : ce qu'on
    // voit sous le doigt est exactement ce que la base recevra au relâcher.
    const pris = vus.filter((p) => choix.includes(p.id));
    const apres = avecAngle(deplacer(pris, glisse.d, { plan: cadrePlan, pas: finesse.pas, libre: glisse.libre }), glisse.rot);
    const parId = new Map(apres.map((p) => [p.id, p]));
    return vus.map((p) => parId.get(p.id) || p);
  }, [postes, glisse, retouche, rotation, choix, cadrePlan.largeur, cadrePlan.hauteur]);

  // Les salles se glissent et se tirent comme les postes, par les mêmes
  // fonctions : `deplacer` pour le corps, `redimensionner` pour un coin.
  const sallesVues = useMemo(() => {
    const vues = salles
      .filter((s) => s.actif !== false && Number.isFinite(Number(s.x)))
      .map((s) => ({ ...s, ...geometrieDe(s) }));
    if (rotation?.angle && choixSalles.length) {
      const tournes = pivoter(vues.filter((sa) => choixSalles.includes(sa.id)), rotation.angle, { centre: rotation.centre, pas: 1 });
      const parId = new Map(tournes.map((sa) => [sa.id, sa]));
      return vues.map((sa) => parId.get(sa.id) || sa);
    }
    if (glisse?.salles?.length) {
      const apres = avecAngle(deplacer(vues.filter((s) => glisse.salles.includes(s.id)), glisse.d, { plan: cadrePlan, pas: finesse.pas, libre: glisse.libre }), glisse.rot);
      const apresId = new Map(apres.map((s) => [s.id, s]));
      return vues.map((s) => apresId.get(s.id) || s);
    }
    if (retouche?.quoi === 'salle') {
      return vues.map((s) => (s.id === retouche.id
        ? { ...s, ...(redimensionner(s, retouche.cle, retouche.point, { plan: cadrePlan, pas: finesse.pas }) || {}) }
        : s));
    }
    return vues;
  }, [salles, glisse, retouche, rotation, choixSalles, cadrePlan.largeur, cadrePlan.hauteur]);

  const zonesDessinees = useMemo(() => {
    const vues = zonesActives.filter((z) => Number.isFinite(Number(z.x)));
    if (rotation?.angle && choixZones.length) {
      return vues.map((z) => (choixZones.includes(z.id)
        ? { ...z, ...zonePivotee(z, rotation.angle, rotation.centre) } : z));
    }
    if (glisse?.zones?.length) {
      const apres = deplacer(vues.filter((z) => glisse.zones.includes(z.id)), glisse.d, { plan: cadrePlan, pas: finesse.pas, libre: glisse.libre });
      const apresId = new Map(apres.map((z) => [z.id, z]));
      return vues.map((z) => apresId.get(z.id) || z);
    }
    if (retouche?.quoi !== 'zone') return vues;
    return vues.map((z) => (z.id === retouche.id
      ? { ...z, ...(redimensionner(z, retouche.cle, retouche.point, { plan: cadrePlan, pas: finesse.pas }) || {}) }
      : z));
  }, [zones, glisse, retouche, rotation, choixZones, cadrePlan.largeur, cadrePlan.hauteur]);

  const mursVus = useMemo(() => {
    if (rotation?.angle && choixMurs.length) {
      return murs.map((m, i) => (choixMurs.includes(i)
        ? pivoterTrace(m, rotation.angle, rotation.centre) : m));
    }
    if (retouche?.quoi === 'segment') {
      const d = { dx: retouche.point.x - retouche.depart.x, dy: retouche.point.y - retouche.depart.y };
      return murs.map((m, i) => (i === retouche.mur
        ? (glisserSegment(m, retouche.segment, d, { pas: finesse.pas }) || m) : m));
    }
    if (retouche?.quoi === 'sommet') {
      return murs.map((m, i) => (i === retouche.mur
        ? (deplacerSommet(m, retouche.sommet, retouche.point, {
          pas: finesse.pas, libre: Boolean(retouche.colle),
        }) || m)
        : m));
    }
    // Un mur glissé ne s'aimante pas en route : la polyligne garde sa forme,
    // sinon chaque point retomberait sur la grille et le mur se déformerait.
    if (glisse?.murs?.length && glisse.d) {
      return murs.map((m, i) => (glisse.murs.includes(i) ? translaterTrace(m, glisse.d) : m));
    }
    return murs;
  }, [plan, retouche, glisse, rotation, choixMurs]);

  // Recalculées sur l'APERÇU : la surface suit le mur pendant qu'on le tire.
  const piecesFermees = useMemo(
    () => piecesDuPlan(mursVus, epaisseurs),
    [mursVus, epaisseurs],
  );
  const metresPlan = useMemo(
    () => metresDuPlan(mursVus, piecesFermees, dessines.length),
    [mursVus, piecesFermees, dessines.length],
  );

  // L'ouverture glissée reste sur un mur, l'ouverture tirée garde son cap :
  // c'est `ouvertures.js` qui tranche, ici on ne fait que montrer.
  const portesVues = useMemo(() => {
    if (glisse && glisse.porte >= 0 && glisse.point) {
      return portes.map((o, i) => (i === glisse.porte
        ? (deplacerOuverture(o, murs, glisse.point) || o) : o));
    }
    if (retouche?.quoi === 'porte') {
      return portes.map((o, i) => (i === retouche.index
        ? (etirerOuverture(o, retouche.bout, retouche.point) || o) : o));
    }
    // Dans un lot, l'ouverture suit son mur : elle se translate du même
    // vecteur, sans chercher de mur d'accueil sous le doigt.
    if (glisse?.portes?.length && glisse.d) {
      return portes.map((o, i) => (glisse.portes.includes(i)
        ? { ...o, x: o.x + glisse.d.dx, y: o.y + glisse.d.dy } : o));
    }
    return portes;
  }, [portes, plan, glisse, retouche]);

  // Le décor se glisse, se tire et tourne comme une salle — par LES MÊMES
  // fonctions. Il n'a pas d'identifiant en base : son rang dans la liste le
  // désigne, comme pour les murs et les ouvertures.
  const meublesVus = useMemo(() => {
    if (rotation?.angle && choixMeubles.length) {
      const pris = meubles.filter((_, i) => choixMeubles.includes(i));
      const tournes = pivoter(pris, rotation.angle, { centre: rotation.centre, pas: 1 });
      let k = 0;
      return meubles.map((m, i) => (choixMeubles.includes(i) ? tournes[k++] || m : m));
    }
    if (retouche?.quoi === 'meuble') {
      return meubles.map((m, i) => (i === retouche.id
        ? { ...m, ...(redimensionner(m, retouche.cle, retouche.point, { plan: cadrePlan, pas: finesse.pas }) || {}) }
        : m));
    }
    if (glisse?.meubles?.length && glisse.d) {
      const pris = meubles.filter((_, i) => glisse.meubles.includes(i));
      const apres = avecAngle(deplacer(pris, glisse.d, { plan: cadrePlan, pas: finesse.pas, libre: glisse.libre }), glisse.rot);
      let k = 0;
      return meubles.map((m, i) => (glisse.meubles.includes(i) ? apres[k++] || m : m));
    }
    return meubles;
  }, [meubles, glisse, retouche, rotation, choixMeubles, cadrePlan.largeur, cadrePlan.hauteur]);

  const comptes = useMemo(() => {
    const m = new Map();
    for (const p of dessines) {
      const z = zoneDuPoint(centreDe(p), zonesDessinees);
      if (z) m.set(z.id, (m.get(z.id) || 0) + 1);
    }
    return m;
  }, [dessines, zonesDessinees]);

  const pointDe = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return versPlan({ x: e.clientX, y: e.clientY }, rect, vuePlan);
  };

  /**
   * Zoomer AUTOUR d'un point, pas autour du centre.
   *
   * Sous la molette, le point visé doit rester sous le doigt : un zoom qui
   * recentre sur la feuille éloigne de ce qu'on regardait, et il faut alors
   * rechercher son bench à chaque cran.
   */
  const zoomer = (facteur, ancre) => {
    const v = vuePlan;
    // LE MÊME PLAFOND QUE LA VUE : borner à `ZOOM.maxi` pendant que
    // `vueZoomee` borne à `plafondZoom`, c'était laisser l'état grimper sans
    // que rien ne bouge à l'écran, puis dézoomer dans le vide au retour.
    const z = Math.min(Math.max(zoom * facteur, ZOOM.mini), plafondZoom(cadrePlan));
    if (z === v.zoom) return;
    const l = cadrePlan.largeur / z;
    const h = cadrePlan.hauteur / z;
    const p = ancre || { x: v.x + v.largeur / 2, y: v.y + v.hauteur / 2 };
    const rx = v.largeur ? (p.x - v.x) / v.largeur : 0.5;
    const ry = v.hauteur ? (p.y - v.y) / v.hauteur : 0.5;
    setZoom(z);
    setCentreVue({ x: p.x + (0.5 - rx) * l, y: p.y + (0.5 - ry) * h });
  };

  const ajusterVue = () => { setZoom(1); setCentreVue(null); };

  /**
   * La pile d'annulation : l'état d'AVANT, pas l'action — `annulation.js`.
   *
   * UN GESTE, UNE ENTRÉE : `enLot` ouvre le lot, les écritures du geste y
   * fusionnent, et Ctrl+Z défait tout le glissement d'un coup. `geste` relie
   * à son entrée ce qui revient plus tard de la base (ids créés). Toute
   * nouvelle entrée vide la pile de rétablissement : refaire après avoir fait
   * autre chose, c'est rejouer un monde qui n'existe plus.
   */
  const memoriser = (entree, geste) => {
    if (lot.current) { lot.current.entree = fusionner(lot.current.entree, entree); return; }
    setRefaits([]);
    setPile((p) => {
      const dernier = p[p.length - 1];
      if (geste && dernier?.geste === geste) {
        return [...p.slice(0, -1), { ...fusionner(dernier, entree), geste }];
      }
      return empiler(p, geste ? { ...entree, geste } : entree, PILE_MAX);
    });
  };

  const enLot = (fn) => {
    lot.current = { entree: null };
    try { fn(); } finally {
      const { entree } = lot.current;
      lot.current = null;
      if (entree) memoriser(entree);
    }
  };

  /** Ce qu'on crée se défait en le supprimant : l'id rejoint le geste. */
  const nouveauGeste = () => { numeroGeste.current += 1; return numeroGeste.current; };
  const surCree = (geste, cle = 'crees') => ({
    onSuccess: (r) => {
      const ids = (Array.isArray(r?.ids) ? r.ids : [r?.id]).filter(Boolean);
      if (ids.length) memoriser({ [cle]: ids }, geste);
    },
  });

  /** L'état courant, relu pour construire ce que « Rétablir » rejouera. */
  const etatCourant = () => ({
    plan: plan ? { ...plan, epaisseurs } : {},
    postes: [...postes, ...salles].map((p) => avecPlan({ id: p.id, ...geometrieDe(p) })),
    zones: zonesActives,
    calque,
  });

  /**
   * Rejouer une entrée — HORS de tout `setState` : un updater React peut
   * tourner deux fois (StrictMode), et chaque passage renverrait les RPC.
   */
  const rejouer = (e) => {
    if (e.plan?.id) patcherPlan.mutate({ planId: e.plan.id, patch: e.plan.patch });
    if (e.postes?.length) bouger.mutate(e.postes);
    if (e.zones?.length) dessiner.mutate(e.zones);
    // Le calque a suivi la mise à l'échelle : sans ça, Ctrl+Z rendrait les
    // murs et laisserait le scan au double.
    if (e.calque !== undefined) poserCalque(e.calque);
    for (const id of e.crees || []) ecrireRessource.mutate({ id, supprimer: true });
    for (const id of e.zonesCreees || []) ecrireZone.mutate({ id, supprimer: true });
  };

  const annuler = () => {
    const e = pile[pile.length - 1];
    if (!e) return;
    const r = inverse(e, etatCourant());
    setPile(pile.slice(0, -1));
    setRefaits(r ? [...refaits, r] : []);
    rejouer(e);
  };

  const retablir = () => {
    const e = refaits[refaits.length - 1];
    if (!e) return;
    const r = inverse(e, etatCourant());
    setRefaits(refaits.slice(0, -1));
    if (r) setPile(empiler(pile, r, PILE_MAX));
    rejouer(e);
  };

  /** Ce qui bouge : postes et salles passent par là, donc par la pile. */
  const envoyer = (liste) => {
    const charge = liste.map((p) => avecPlan({ id: p.id, ...geometrieDe(p) }));
    if (!charge.length) return;
    const sources = [...postes, ...salles];
    const avant = charge
      .map((c) => {
        const src = sources.find((p) => p.id === c.id);
        return src && Number.isFinite(Number(src.x))
          ? avecPlan({ id: c.id, ...geometrieDe(src) }) : null;
      })
      .filter(Boolean);
    if (avant.length) memoriser({ postes: avant });
    bouger.mutate(charge);
  };

  const ecrirePortes = (liste) => {
    memoriser({ plan: { id: planId, patch: { portes } } });
    ecrirePlan({ portes: nettoyerOuvertures(liste) });
  };

  const ecrireMeubles = (liste) => {
    memoriser({ plan: { id: planId, patch: { meubles } } });
    ecrirePlan({ meubles: nettoyerMeubles(liste) });
  };

  /** `eps` dès que la liste change de longueur : sinon les index glissent. */
  const ecrireMurs = (liste, eps) => {
    if (eps) {
      memoriser({ plan: { id: planId, patch: { murs, epaisseurs } } });
      ecrirePlan({ murs: liste, epaisseurs: nettoyerEpaisseurs(eps, liste.length) });
      return;
    }
    memoriser({ plan: { id: planId, patch: { murs } } });
    ecrirePlan({ murs: liste });
  };

  /** Changer l'épaisseur : celle des murs choisis, et celle du prochain. */
  const epaissir = (ep) => {
    setEpaisseurMur(ep);
    if (!choixMurs.length) return;
    memoriser({ plan: { id: planId, patch: { epaisseurs } } });
    ecrirePlan({ epaisseurs: epaisseurs.map((e, i) => (choixMurs.includes(i) ? ep : e)) });
  };

  /** La plume : tout le plan d'un coup. */
  const plumer = (t) => {
    if (t === traitMur) return;
    memoriser({ plan: { id: planId, patch: { trait_mur: traitMur } } });
    ecrirePlan({ trait_mur: t });
  };

  /** Les rectangles de zone : même porte, donc même pile. */
  const ecrireZonesGeo = (liste) => {
    const avant = liste
      .map((g) => zonesActives.find((z) => z.id === g.id))
      .filter((z) => z && Number.isFinite(Number(z.x)))
      .map((z) => avecPlan({ id: z.id, x: z.x, y: z.y, l: z.l, h: z.h }));
    if (avant.length) memoriser({ zones: avant });
    dessiner.mutate(liste.map(avecPlan));
  };

  /** Ce qui est choisi, toutes natures confondues. */
  const selection = {
    postes: choix, salles: choixSalles, zones: choixZones, murs: choixMurs, portes: choixPortes,
    meubles: choixMeubles,
  };
  const totalChoisi = choix.length + choixSalles.length + choixZones.length
    + choixMurs.length + choixPortes.length + choixMeubles.length;

  const poserSelection = (sel) => {
    setChoix(sel.postes || []);
    setChoixSalles(sel.salles || []);
    setChoixZones(sel.zones || []);
    setChoixMurs(sel.murs || []);
    setChoixPortes(sel.portes || []);
    setChoixMeubles(sel.meubles || []);
  };

  /**
   * Ce que la bande élastique ramasse : TOUTES les natures.
   *
   * Un rectangle qui ne prendrait que les postes obligerait à cliquer les murs
   * un par un. Le centre décide pour un rectangle (un poste effleuré par le
   * bord n'entre pas), et un mur n'entre qu'entier : prendre la moitié d'une
   * polyligne la déchirerait au premier déplacement.
   *
   * TIRÉE DE DROITE À GAUCHE, la bande PREND CE QU'ELLE TOUCHE (`croise`),
   * comme dans les logiciels d'architecte : un trait en travers des cloisons
   * les ramasse toutes sans avoir à les englober.
   */
  const ramasser = (r, croise = false) => {
    const dedans = (x, y) => x >= r.x && x <= r.x + r.l && y >= r.y && y <= r.y + r.h;
    const centre = (o) => (croise ? chevauchent(o, r) : dedans(centreDe(o).x, centreDe(o).y));
    const pris = {
      postes: dessines.filter(centre).map((p) => p.id),
      salles: sallesVues.filter(centre).map((sa) => sa.id),
      zones: zonesDessinees.filter((z) => centre({ ...z, rot: 0 })).map((z) => z.id),
      murs: mursVus
        .map((m, i) => ((croise ? traceTouche(m, r) : m.every(([x, y]) => dedans(x, y))) ? i : -1))
        .filter((i) => i >= 0),
      portes: portesVues
        .map((o, i) => (dedans(o.x, o.y) ? i : -1))
        .filter((i) => i >= 0),
      meubles: meublesVus
        .map((m, i) => (centre({ ...m, rot: m.rot || 0 }) ? i : -1))
        .filter((i) => i >= 0),
    };
    // Une couche masquée ou verrouillée ne se ramasse pas : la bande passe dessus.
    return Object.fromEntries(Object.entries(pris)
      .map(([k, l]) => [k, couchePrise(COUCHE_DE[k]) ? l : []]));
  };

  /**
   * Un glissement porte TOUTE la sélection.
   *
   * Prendre un objet déjà choisi déplace le lot ; prendre un autre objet
   * recommence une sélection à un seul élément. C'est le geste de tout éditeur
   * de plan, et sans lui une bande élastique ne servirait qu'à regarder.
   */
  const glisserTout = (e, sel) => {
    svgRef.current?.setPointerCapture?.(e.pointerId);
    setGlisse({
      depart: pointDe(e), d: { dx: 0, dy: 0 }, porte: -1,
      ids: sel.postes || [], salles: sel.salles || [],
      zones: sel.zones || [], murs: sel.murs || [], portes: sel.portes || [],
      meubles: sel.meubles || [],
      // Les repères se figent à la prise : ce qui reste en place ne bouge pas
      // pendant le geste, inutile de les recompter à chaque pixel.
      mobiles: reperesDuLot(sel, true), fixes: reperesDuLot(sel, false),
      // Les murs du lot se posent aussi PAR LEURS BOUTS sur les autres murs,
      // en biais compris : les axes seuls ne joignent pas deux tracés.
      sommets: mursVus.filter((_, i) => (sel.murs || []).includes(i)).flat(),
      traces: mursVus.filter((_, i) => !(sel.murs || []).includes(i)),
      epTraces: mursVus.map((_, i) => epaisseurDe(epaisseurs, i))
        .filter((_, i) => !(sel.murs || []).includes(i)),
      seul: objetSeul(sel),
    });
  };

  /**
   * L'objet du lot quand il est seul — poste, salle ou meuble. Lui seul pivote
   * contre un mur de biais : tourner un lot entier casserait son rangement.
   */
  const objetSeul = (sel) => {
    const n = (k) => (sel[k] || []).length;
    if (n('postes') + n('salles') + n('meubles') !== 1 || n('murs') || n('zones') || n('portes')) return null;
    const o = n('postes') ? dessines.find((p) => p.id === sel.postes[0])
      : n('salles') ? sallesVues.find((sa) => sa.id === sel.salles[0])
        : meublesVus[sel.meubles[0]];
    return o ? { x: o.x, y: o.y, l: o.l, h: o.h, rot: o.rot || 0 } : null;
  };

  /**
   * Les repères de l'aimant : ceux du lot (`dedans`) ou de tout le reste.
   * Un mur hors du côté voulu devient un tracé vide, pour garder l'index de
   * son épaisseur.
   */
  const reperesDuLot = (sel, dedans) => {
    const garde = (liste, cle) => (liste || []).includes(cle) === dedans;
    return reperesDe({
      rectangles: [
        ...dessines.filter((p) => garde(sel.postes, p.id)),
        ...sallesVues.filter((sa) => garde(sel.salles, sa.id)),
        ...zonesDessinees.filter((z) => garde(sel.zones, z.id)),
        ...meublesVus.filter((_, i) => garde(sel.meubles, i)),
      ],
      murs: mursVus.map((m, i) => (garde(sel.murs, i) ? m : [])),
      epaisseurs,
    });
  };

  /** Le lot à glisser : celui déjà choisi si l'objet en fait partie, sinon lui seul. */
  const lotPour = (nature, cle) => {
    if ((selection[nature] || []).includes(cle)) return selection;
    return {
      postes: [], salles: [], zones: [], murs: [], portes: [], meubles: [], [nature]: [cle],
    };
  };

  /** Maj+clic : l'objet entre dans la sélection, ou en sort. */
  const basculer = (nature, cle) => {
    const l = selection[nature] || [];
    return { ...selection, [nature]: l.includes(cle) ? l.filter((x) => x !== cle) : [...l, cle] };
  };

  const prendre = (poste, e) => {
    if (outil !== 'choisir' || !couchePrise('postes')) return;
    e.preventDefault();
    e.stopPropagation();
    const sel = e.shiftKey
      ? {
        ...selection,
        postes: choix.includes(poste.id)
          ? choix.filter((id) => id !== poste.id) : [...choix, poste.id],
      }
      : lotPour('postes', poste.id);
    poserSelection(sel);
    glisserTout(e, sel);
  };

  const prendreSalle = (salle, e) => {
    if (outil !== 'choisir' || !couchePrise('postes')) return;
    e.preventDefault();
    e.stopPropagation();
    const sel = e.shiftKey ? basculer('salles', salle.id) : lotPour('salles', salle.id);
    poserSelection(sel);
    glisserTout(e, sel);
  };

  const prendreZone = (zone, e) => {
    if (outil !== 'choisir' || !couchePrise('zones')) return;
    e.preventDefault();
    e.stopPropagation();
    const sel = e.shiftKey ? basculer('zones', zone.id) : lotPour('zones', zone.id);
    poserSelection(sel);
    glisserTout(e, sel);
  };

  const prendrePorte = (index, e) => {
    if (outil !== 'choisir' || !couchePrise('murs')) return;
    e.preventDefault();
    e.stopPropagation();
    // Seule, une ouverture coulisse LE LONG des murs : c'est sa liberté propre.
    // Dans un lot, elle se translate comme le reste.
    if (e.shiftKey) { const sel = basculer('portes', index); poserSelection(sel); glisserTout(e, sel); return; }
    if (totalChoisi > 1 && choixPortes.includes(index)) { glisserTout(e, selection); return; }
    poserSelection({ portes: [index] });
    svgRef.current?.setPointerCapture?.(e.pointerId);
    setGlisse({ depart: pointDe(e), d: { dx: 0, dy: 0 }, ids: [], porte: index });
  };

  const prendreMeuble = (index, e) => {
    if (outil !== 'choisir' || !couchePrise('mobilier')) return;
    e.preventDefault();
    e.stopPropagation();
    if (totalChoisi > 1 && choixMeubles.includes(index)) { glisserTout(e, selection); return; }
    const sel = e.shiftKey
      ? {
        ...selection,
        meubles: choixMeubles.includes(index)
          ? choixMeubles.filter((i) => i !== index) : [...choixMeubles, index],
      }
      : lotPour('meubles', index);
    poserSelection(sel);
    glisserTout(e, sel);
  };

  /**
   * Prendre un mur le CHOISIT, il ne l'ouvre pas.
   *
   * Cliquer le trait ouvrait le champ de longueur du segment le plus proche :
   * on ne pouvait plus déplacer un mur sans qu'une saisie s'ouvre sous le
   * doigt. La cote se retape en cliquant la cote — le nombre, pas le trait.
   */
  const prendreMur = (index, m, e) => {
    if (outil !== 'choisir' || !couchePrise('murs')) return;
    e.stopPropagation();
    // LE DOUBLE-CLIC SE COMPTE ICI, pas par `onDoubleClick` : le premier clic
    // capture le pointeur sur la feuille, et le second n'arriverait jamais au mur.
    const avant = dernierClicMur.current;
    dernierClicMur.current = { i: index, t: e.timeStamp };
    if (!e.shiftKey && avant.i === index && e.timeStamp - avant.t < 350) {
      dernierClicMur.current = { i: -1, t: 0 };
      couperMur(index, e);
      return;
    }
    if (e.shiftKey) { const sel = basculer('murs', index); poserSelection(sel); glisserTout(e, sel); return; }
    if (totalChoisi > 1 && choixMurs.includes(index)) { glisserTout(e, selection); return; }
    const sel = lotPour('murs', index);
    poserSelection(sel);
    setSegmentChoisi(-1);
    glisserTout(e, sel);
  };

  /** Le cap d'un point vu du pivot, en degrés. */
  const capDe = (centre, p) => (Math.atan2(p.y - centre.y, p.x - centre.x) * 180) / Math.PI;

  /**
   * La poignée d'angle : on prend un coin, on tourne.
   *
   * La boîte est FIGÉE au moment de la prise : la recalculer pendant le geste
   * la ferait grandir à chaque degré (une boîte droite autour d'un contenu
   * penché est plus large), et l'ensemble dériverait sous le doigt.
   */
  const prendreRotation = (e) => {
    const b = boiteChoisie;
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture?.(e.pointerId);
    const centre = { x: b.cx, y: b.cy };
    setRotation({ centre, boite: b, depart: capDe(centre, pointDe(e)), angle: 0 });
  };

  /** La photo choisie se glisse comme un objet ; sinon elle laisse passer. */
  const prendreCalque = (e) => {
    if (outil !== 'choisir' || !calque || !calqueChoisi) return;
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture?.(e.pointerId);
    setGlisse({ depart: pointDe(e), d: { dx: 0, dy: 0 }, porte: -1, ids: [], calque: true });
  };

  const prendrePoignee = (quoi, id, cle, e) => {
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture?.(e.pointerId);
    setRetouche({ quoi, id, cle, point: pointDe(e) });
  };

  const prendreSommet = (index, sommet, e) => {
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture?.(e.pointerId);
    setRetouche({ quoi: 'sommet', mur: index, sommet, point: pointDe(e) });
  };

  /** La poignée du milieu pousse tout le segment, parallèle à lui-même. */
  const prendreSegment = (index, segment, e) => {
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture?.(e.pointerId);
    const p = pointDe(e);
    setRetouche({ quoi: 'segment', mur: index, segment, depart: p, point: p });
  };

  /** Un point de plus dans le mur, au pied du clic : de quoi faire un décroché. */
  const couperMur = (index, e) => {
    const r = insererSommet(murs[index], pointDe(e));
    if (!r) return;
    ecrireMurs(murs.map((m, i) => (i === index ? r.mur : m)));
    setMotEchelle('Point ajouté : tirez-le pour faire un décroché.');
  };

  const prendreBout = (index, bout, e) => {
    e.preventDefault();
    e.stopPropagation();
    svgRef.current?.setPointerCapture?.(e.pointerId);
    setRetouche({ quoi: 'porte', index, bout, point: pointDe(e) });
  };

  const suivre = (e) => {
    if (outil === 'surface' && poly && !poly.ferme) {
      setPoly({ ...poly, vise: pointRegle(pointDe(e), e.altKey) });
      return;
    }
    if (regle && !regle.fige) {
      const brut = pointDe(e);
      const c = e.shiftKey ? contraindre(regle.a, brut, { angle: 45, pas: finesse.pas }) : null;
      setRegle({ ...regle, b: c ? { x: c.x, y: c.y } : pointRegle(brut, e.altKey, regle.a) });
      return;
    }
    if (rotation) {
      const brut = capDe(rotation.centre, pointDe(e)) - rotation.depart;
      // Au degré près par défaut, au quart de tour d'un plan droit avec Maj :
      // un mur remis d'aplomb ne se vise pas à la souris.
      const angle = e.shiftKey ? Math.round(brut / 15) * 15 : Math.round(brut);
      if (angle !== rotation.angle) setRotation({ ...rotation, angle });
      return;
    }
    if (retouche?.quoi === 'sommet') {
      // LE BOUT TIRÉ VISE LES AUTRES MURS, comme le tracé : sommet, milieu,
      // segment, alignement. Sans ça, deux murs ne se rejoignaient jamais
      // qu'au hasard de la grille. Alt coupe.
      const p = pointDe(e);
      // Les murs épais se visent par leur FACE, et les voisins du bout tiré ne
      // l'attirent plus : un bout de 50 cm se recollait à son propre coin.
      const c = ciblesDuSommet(murs, retouche.mur, retouche.sommet, epaisseurs);
      const acc = e.altKey ? null : accrocher(p, c.traces, {
        seuil: finesse.accroche, epaisseurs: c.epaisseurs, reperes: c.reperes,
        ...(c.origine ? { origine: c.origine } : {}),
      });
      setRetouche({
        ...retouche,
        point: acc?.accroche ? { x: acc.x, y: acc.y } : p,
        colle: acc?.accroche ? { x: acc.x, y: acc.y, genre: acc.genre } : null,
      });
      return;
    }
    if (retouche) { setRetouche({ ...retouche, point: pointDe(e) }); return; }
    if (glisse) {
      const p = pointDe(e);
      const brut = { dx: p.x - glisse.depart.x, dy: p.y - glisse.depart.y };
      // L'AIMANT DES VOISINS : à 10 pixels d'un bord, d'une face de mur ou d'un
      // axe, le lot s'y arrête ; Alt le coupe, comme l'accroche du tracé.
      let a = glisse.mobiles && !e.altKey
        ? aimanterLot(glisse.mobiles, glisse.fixes, brut, auPixel(10))
        : { ...brut, x: false, y: false, guides: [] };
      // Un bout de mur posé SUR un autre mur prime sur l'alignement.
      const t = glisse.sommets?.length && !e.altKey
        ? aimanterSommets(glisse.sommets, glisse.traces, brut, auPixel(14), glisse.epTraces) : null;
      if (t?.point) a = { dx: t.dx, dy: t.dy, x: true, y: true, guides: [] };
      // Un objet seul contre un mur de biais en prend l'angle et s'y pose à plat.
      const b = glisse.seul && !e.altKey
        ? collerAuBiais(glisse.seul, glisse.traces, glisse.epTraces, brut, auPixel(14)) : null;
      if (b) a = { dx: b.dx, dy: b.dy, x: true, y: true, guides: [b.guide] };
      setGlisse({
        ...glisse, point: p, d: { dx: a.dx, dy: a.dy }, libre: { x: a.x, y: a.y },
        guides: a.guides, colle: t?.point || null, rot: b ? b.rot : null,
      });
      return;
    }
    if (trace) { setTrace({ ...trace, fin: pointDe(e) }); return; }
    // Tout bloc suit le curseur, pas seulement la porte : on voit où il
    // tombera, et contre quoi il s'aimante, avant de cliquer.
    if (outil === 'mur' || outil === 'bloc') setCurseur(pointDe(e));
    // Alt enfoncée coupe l'accroche : le seul moyen honnête de poser un point
    // là où un mur en attire un autre. L'état suit la souris ET le clavier,
    // sinon lâcher Alt hors du plan laisserait l'accroche morte.
    if (e.altKey !== sansAccroche) setSansAccroche(e.altKey);
  };

  /**
   * Les formes du bloc choisi, centrées sur `p` et aimantées à tout le plan
   * (`aimanterPose`) — sauf `libre` (Alt). L'aperçu et le clic passent ici :
   * ce qu'on voit sous le curseur est ce qui se pose.
   */
  const poseDuBloc = (p, libre = false) => {
    const b = blocDe(blocCle);
    const une = (f) => (f ? [f] : []);
    const formes = b.famille === 'poste' ? posesDuBloc(b, p, { plan: cadrePlan })
      : b.famille === 'salle' ? une(rectangleDuBloc(b, p, { plan: cadrePlan }))
        : b.famille === 'meuble' ? une(meubleDuBloc(b, p, { plan: cadrePlan })) : [];
    if (libre) return { formes, guides: [] };
    return aimanterPose(formes, {
      fixes: reperesDe({
        rectangles: [...dessines, ...sallesVues, ...zonesDessinees, ...meublesVus],
        murs: mursVus, epaisseurs,
      }),
      murs: mursVus, epaisseurs, seuil: auPixel(10), biais: auPixel(14),
    });
  };

  /** Le rectangle tiré devient une zone, une pièce, ou une salle. */
  const finirTrace = () => {
    if (!trace) return;
    const r = rectangleEntre(trace.depart, trace.fin, { plan: cadrePlan });
    setTrace(null);
    if (!r) return;
    // La bande élastique ne pose rien : elle ramasse. Tout poste dont le
    // centre tombe dedans est pris — le centre, pas le coin, sinon un poste
    // effleuré par le bord entrerait dans la sélection.
    if (trace.outil === 'choix') {
      const pris = ramasser(r, trace.fin.x < trace.depart.x);
      // Maj ajoute à ce qui était choisi, sans doublon.
      const avant = trace.ajoute;
      poserSelection(avant
        ? Object.fromEntries(Object.entries(pris).map(([k, l]) => [k, [...new Set([...(avant[k] || []), ...l])]]))
        : pris);
      return;
    }
    if (trace.outil === 'zone') {
      if (!zoneCiblee) {
        nommerZone((zr) => {
          if (!zr?.id) return;
          setZoneCible(zr.id);
          ecrireZonesGeo([{ id: zr.id, ...r }]);
        });
        return;
      }
      ecrireZonesGeo([{ id: zoneCiblee, ...r }]);
      // Le rectangle vient d'être posé : les postes qui y tombent doivent
      // changer de zone tout de suite, sinon le compteur mentirait jusqu'au
      // prochain glissement. La base refait le calcul, c'est elle qui tranche.
      const dedans = dessines.filter((p) => {
        const c = centreDe(p);
        return c.x >= r.x && c.x <= r.x + r.l && c.y >= r.y && c.y <= r.y + r.h;
      });
      if (dedans.length) envoyer(dedans);
      return;
    }
    if (trace.outil === 'piece') {
      const quatre = piece(r);
      if (quatre && murs.length < MURS.lignes) ecrireMurs([...murs, quatre], [...epaisseurs, epaisseurMur]);
      return;
    }
    if (trace.outil === 'salle') {
      const nom = nomSalle.trim() || `Salle ${salles.length + 1}`;
      poserSalle.mutate(
        { nom, capacite: capaciteSalle, geometrie: avecPlan({ ...r, rot: 0 }) },
        surCree(nouveauGeste()),
      );
      setNomSalle('');
    }
  };

  /**
   * La retouche relâchée part en base, une écriture pour tout le geste.
   *
   * On repart de la source, pas de l'aperçu : l'aperçu a déjà subi
   * `redimensionner`, le réappliquer ferait glisser le rectangle d'un coin à
   * chaque image.
   */
  const finirRetouche = () => {
    const r = retouche;
    setRetouche(null);
    if (!r) return;
    if (r.quoi === 'segment') {
      const d = { dx: r.point.x - r.depart.x, dy: r.point.y - r.depart.y };
      const pts = glisserSegment(murs[r.mur], r.segment, d, { pas: finesse.pas });
      if (pts) ecrireMurs(murs.map((m, i) => (i === r.mur ? pts : m)));
      return;
    }
    if (r.quoi === 'sommet') {
      const pts = deplacerSommet(murs[r.mur], r.sommet, r.point, {
        pas: finesse.pas, libre: Boolean(r.colle),
      });
      if (!pts) return;
      const liste = murs.map((m, i) => (i === r.mur ? pts : m));
      // Bout posé sur le bout d'un autre mur : les deux n'en font plus qu'un,
      // et l'angle tourne en onglet au lieu de montrer deux cernes croisés.
      const j = r.colle?.genre === 'sommet' ? joindreMurs(liste, epaisseurs, r.mur, r.sommet) : null;
      if (j?.joint) { rienDeChoisi(); ecrireMurs(j.murs, j.epaisseurs); return; }
      ecrireMurs(liste);
      return;
    }
    if (r.quoi === 'porte') {
      const tiree = etirerOuverture(portes[r.index], r.bout, r.point);
      if (tiree) ecrirePortes(portes.map((o, i) => (i === r.index ? tiree : o)));
      return;
    }
    if (r.quoi === 'meuble') {
      const g = redimensionner(meubles[r.id], r.cle, r.point, { plan: cadrePlan, pas: finesse.pas });
      if (g) ecrireMeubles(meubles.map((m, i) => (i === r.id ? { ...m, ...g } : m)));
      return;
    }
    if (r.quoi === 'calque') {
      const c = etirerCalque(calque, r.cle, r.point, { plan: cadrePlan });
      if (c) { memoriser({ calque }); poserCalque(c); }
      return;
    }
    const source = r.quoi === 'zone'
      ? zonesActives.find((z) => z.id === r.id)
      : (r.quoi === 'salle' ? salles : postes).find((s) => s.id === r.id);
    if (!source) return;
    const base = r.quoi === 'zone' ? source : { ...source, ...geometrieDe(source) };
    const g = redimensionner(base, r.cle, r.point, { plan: cadrePlan, pas: finesse.pas });
    if (!g) return;
    if (r.quoi === 'zone') ecrireZonesGeo([{ id: r.id, ...g }]);
    else envoyer([{ ...base, ...g }]);
  };

  const lacher = () => enLot(lacherSansLot);

  const lacherSansLot = () => {
    if (regle && !regle.fige) { setRegle({ ...regle, fige: true }); return; }
    if (rotation) {
      const r = rotation;
      setRotation(null);
      appliquerTour(r.angle, r.centre);
      return;
    }
    if (retouche) { finirRetouche(); return; }
    if (trace) { finirTrace(); return; }
    if (!glisse) return;
    const g = glisse;
    setGlisse(null);
    // La photo ne vit pas en base : elle se pose ici et nulle part ailleurs.
    if (g.calque) {
      const c = glisserCalque(calque, g.d, { plan: cadrePlan });
      if (c && (c.x !== calque.x || c.y !== calque.y)) { memoriser({ calque }); poserCalque(c); }
      return;
    }
    if (g.porte >= 0) {
      const o = g.point ? deplacerOuverture(portes[g.porte], murs, g.point) : null;
      if (o) ecrirePortes(portes.map((x, i) => (i === g.porte ? o : x)));
      return;
    }
    // Un clic net n'est pas un glissement : sans ce garde-fou, choisir un mur
    // écrirait le plan à chaque fois, pour rien, et remplirait la pile.
    const bouge = Math.abs(g.d?.dx || 0) > 0.4 || Math.abs(g.d?.dy || 0) > 0.4 || g.rot != null;
    if (!bouge) return;
    // Murs et ouvertures vivent dans le même patch : une seule écriture, donc
    // une seule entrée dans la pile pour tout le geste.
    if (g.murs?.length || g.portes?.length || g.meubles?.length) {
      memoriser({ plan: { id: planId, patch: { murs, epaisseurs, portes, meubles } } });
      let suite = { murs: murs.map((m, i) => (g.murs.includes(i) ? translaterTrace(m, g.d) : m)), epaisseurs };
      // Un mur seul posé bout à bout sur un autre s'y soude, comme à la retouche.
      if (g.colle && g.murs.length === 1) {
        const i = g.murs[0];
        for (const k of [0, suite.murs[i].length - 1]) {
          const j = joindreMurs(suite.murs, suite.epaisseurs, i, k);
          if (j.joint) { suite = j; rienDeChoisi(); break; }
        }
      }
      ecrirePlan({
        murs: suite.murs,
        epaisseurs: nettoyerEpaisseurs(suite.epaisseurs, suite.murs.length),
        portes: nettoyerOuvertures(portes.map((o, i) => (g.portes.includes(i)
          ? { ...o, x: o.x + g.d.dx, y: o.y + g.d.dy } : o))),
        meubles: nettoyerMeubles(meublesVus),
      });
    }
    const rectangles = [
      ...dessines.filter((p) => g.ids.includes(p.id)),
      ...sallesVues.filter((sa) => g.salles?.includes(sa.id)),
    ];
    if (rectangles.length) envoyer(rectangles);
    const zonesBougees = zonesDessinees.filter((z) => g.zones?.includes(z.id));
    if (zonesBougees.length) {
      ecrireZonesGeo(zonesBougees.map((z) => ({ id: z.id, x: z.x, y: z.y, l: z.l, h: z.h })));
    }
  };

  // Les flèches déplacent d'UN CRAN — celui du zoom courant, comme la souris.
  // C'est la seule façon de poser un poste au centimètre : dézoomé on avance
  // de 20 cm, zoomé sur le coin d'un bureau on avance de un.
  const auClavier = (poste, e) => {
    const cran = finesse.pas;
    const vecteurs = {
      ArrowLeft: { dx: -cran, dy: 0 }, ArrowRight: { dx: cran, dy: 0 },
      ArrowUp: { dx: 0, dy: -cran }, ArrowDown: { dx: 0, dy: cran },
    };
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      const ids = choix.includes(poste.id) ? choix : [poste.id];
      envoyer(pivoter(dessines.filter((p) => ids.includes(p.id)), e.shiftKey ? -90 : 90));
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setChoix(choix.includes(poste.id) ? choix.filter((id) => id !== poste.id) : [...choix, poste.id]);
      return;
    }
    const v = vecteurs[e.key];
    if (!v) return;
    e.preventDefault();
    const ids = choix.includes(poste.id) ? choix : [poste.id];
    envoyer(deplacer(dessines.filter((p) => ids.includes(p.id)), v, { plan: cadrePlan, pas: cran }));
  };

  const dernierPoint = mur && mur.length ? mur[mur.length - 1] : null;

  /**
   * Le point que le mur prendrait vraiment.
   *
   * UN SEUL CALCUL POUR L'APERÇU ET POUR LE CLIC. Deux calculs, et le trait
   * posé n'est pas celui qu'on regardait — c'est exactement ce qui rendait le
   * tracé précédent impossible à viser. L'accroche prime sur la contrainte :
   * rejoindre un mur existant compte plus que garder l'angle rond.
   */
  /** Le bout d'une règle : accroché aux murs comme un tracé, sinon au cran. */
  const pointRegle = (brut, sans, depuis = null) => {
    const acc = sans ? null : accrocher(brut, murs, {
      epaisseurs: murs.map((_, i) => epaisseurDe(epaisseurs, i)),
      ...(depuis ? { origine: depuis } : {}),
      seuil: finesse.accroche,
    });
    if (acc?.accroche) return { x: acc.x, y: acc.y };
    return { x: aimanter(brut.x, finesse.pas), y: aimanter(brut.y, finesse.pas) };
  };

  const pointMur = (brut) => {
    const acc = accrocher(brut, [...murs, mur || []], {
      epaisseurs: [...murs.map((_, i) => epaisseurDe(epaisseurs, i)), epaisseurMur],
      ...(dernierPoint ? { origine: dernierPoint } : {}),
      // L'accroche se mesure à l'écran : zoomé, une portée de 50 cm happerait
      // tout ce qu'on cherche justement à distinguer. Alt la coupe toujours.
      seuil: sansAccroche ? 0 : finesse.accroche,
    });
    if (acc.accroche) return { x: acc.x, y: acc.y, accroche: true, genre: acc.genre };
    if (!dernierPoint) {
      return {
        x: aimanter(brut.x, finesse.pas), y: aimanter(brut.y, finesse.pas),
        accroche: false, genre: null,
      };
    }
    const c = contraindre(dernierPoint, brut, { angle: grain, pas: finesse.pas });
    return { x: c.x, y: c.y, accroche: false, genre: null };
  };

  // Le pas de 10 cm, pas celui de la grille : une longueur tapée « 6,5 m » doit
  // rester 6,5 m. La souris, elle, tombe déjà sur la grille par `contraindre`.
  const fermerMur = (liste = mur) => {
    const net = murNet(liste, { plan: cadrePlan, pas: 1 });
    setMur(null);
    setCurseur(null);
    if (!net || murs.length >= MURS.lignes) return;
    ecrireMurs([...murs, net], [...epaisseurs, epaisseurMur]);
  };

  /** La mesure tapée : longueur et cap, la porte des plans justes. */
  const poserMesure = (e) => {
    e.preventDefault();
    const d = depuisMetres(saisieL);
    if (!d || !dernierPoint) return;
    const a = Number(String(saisieA).replace(',', '.'));
    const p = versPoint(dernierPoint, d, Number.isFinite(a) ? a : 0);
    setMur([...mur, [p.x, p.y]]);
    setSaisieL('');
  };

  /**
   * LE PLAN SORT EN FICHIER, tel qu'on le voit — regard compris : une carte
   * d'occupation s'imprime pour la réunion d'aménagement.
   *
   * Le SVG est cloné, pas redessiné : un seul dessin. Mais ses couleurs sont
   * des classes, qui ne voyagent pas ; on recopie donc le style CALCULÉ de
   * chaque nœud, et la fenêtre s'élargit à toute la feuille, zoom oublié. Le
   * PNG passe par une URL `data:` — pas d'objet URL hors de `fichier.js`.
   */
  /**
   * CHERCHER, C'EST ALLER Y : le premier trouvé se choisit, et la vue zoome
   * dessus. La vue du jour prête ses réservants — « tom » trouve le poste que
   * Tom a pris ce matin.
   */
  const trouves = useMemo(() => chercherSurPlan(recherche, {
    postes: dessines, salles: sallesVues, zones: zonesDessinees, membres,
    etats: lu?.regard === 'jour' ? lu.etats : null,
  }), [recherche, dessines, sallesVues, zonesDessinees, membres, lu]);
  const allerA = (r) => {
    const v = vueSur(r.boite, cadrePlan);
    if (!v) return;
    setOutil('choisir');
    setPoly(null);
    rienDeChoisi();
    if (r.genre === 'poste') setChoix([r.id]);
    else if (r.genre === 'salle') setChoixSalles([r.id]);
    else setChoixZones([r.id]);
    setZoom(v.zoom);
    setCentreVue(v.centre);
    setPanneau(null);
  };

  // Le papier cadre sur ce qui est DESSINÉ, pas sur la feuille : la marge de
  // blanc de `cadreNecessaire` ferait refuser le 1:50 à un plateau qui y tient.
  const boitePapier = useMemo(() => boiteImprimee(boiteDe(mursVus, [
    ...dessines, ...sallesVues, ...zonesDessinees, ...meubles,
  ])), [mursVus, dessines, sallesVues, zonesDessinees, meubles]);
  const preparerPapier = async () => {
    rienDeChoisi();
    setCurseur(null);
    setPoly(null);
    // Deux images : le temps que les poignées de la sélection disparaissent.
    await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); });
  };

  const exporterPlan = async (format) => {
    const svg = svgRef.current;
    if (!svg || typeof window === 'undefined') return;
    rienDeChoisi();
    setCurseur(null);
    // Deux images : le temps que les poignées de la sélection disparaissent.
    await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); });
    const clone = svg.cloneNode(true);
    const sources = svg.querySelectorAll('*');
    const copies = clone.querySelectorAll('*');
    sources.forEach((n, i) => {
      const calcule = window.getComputedStyle(n);
      const d = copies[i];
      STYLES_EXPORT.forEach((p) => {
        const v = calcule.getPropertyValue(p);
        if (v) d.style.setProperty(p, v);
      });
      d.removeAttribute('class');
    });
    const fondPage = window.getComputedStyle(document.body).backgroundColor;
    const fond = !fondPage || fondPage === 'transparent' || fondPage.startsWith('rgba(0, 0, 0, 0') ? '#ffffff' : fondPage;
    const k = Math.min(3000 / (cadrePlan.largeur || 1), 3000 / (cadrePlan.hauteur || 1), 10);
    const w = Math.round(cadrePlan.largeur * k);
    const h = Math.round(cadrePlan.hauteur * k);
    clone.removeAttribute('class');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', cadre(cadrePlan));
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    const aplat = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    ['x', 'y'].forEach((a) => aplat.setAttribute(a, '-100000'));
    ['width', 'height'].forEach((a) => aplat.setAttribute(a, '200000'));
    aplat.setAttribute('fill', fond);
    clone.insertBefore(aplat, clone.firstChild);
    const texte = new XMLSerializer().serializeToString(clone);
    const nom = nomDeFichier(plan?.nom);
    if (format === 'svg') {
      telechargerFichier(`${nom}.svg`, texte, 'image/svg+xml');
      return;
    }
    try {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(texte)}`;
      await image.decode();
      const toile = document.createElement('canvas');
      toile.width = w;
      toile.height = h;
      toile.getContext('2d').drawImage(image, 0, 0, w, h);
      const blob = await new Promise((r) => { toile.toBlob(r, 'image/png'); });
      if (!blob) throw new Error('png');
      telechargerBlob(`${nom}.png`, blob);
    } catch {
      setMotEchelle('Ce navigateur refuse de faire le PNG : prenez le SVG, il s’ouvre partout.');
    }
  };

  /** Le fond : chaque outil y a sa réponse, une seule. */
  const surLeFond = (e) => {
    // Un clic net dans le vide désélectionne ; un clic tiré ramasse. Les deux
    // partent du même geste : `rectangleEntre` rend `null` sous quelques
    // unités, et le clic redevient un simple « rien de choisi ».
    if (outil === 'choisir') {
      if (!e.shiftKey) rienDeChoisi();
      svgRef.current?.setPointerCapture?.(e.pointerId);
      const depart = pointDe(e);
      setTrace({ outil: 'choix', depart, fin: depart, ajoute: e.shiftKey ? selection : null });
      return;
    }
    const p = pointDe(e);
    if (outil === 'surface') {
      // Une surface fermée se mesure ; le clic suivant en commence une autre.
      const base = poly && !poly.ferme ? poly.points : [];
      setPoly(poserPointSurface(base, pointRegle(p, e.altKey), finesse.accroche));
      return;
    }
    if (outil === 'regle') {
      svgRef.current?.setPointerCapture?.(e.pointerId);
      const a = pointRegle(p, e.altKey);
      setRegle({ a, b: a, fige: false });
      return;
    }
    if (outil === 'mur') {
      const v = pointMur(p);
      const suite = [...(mur || []), [v.x, v.y]];
      // Revenir sur le premier point ferme la pièce : c'est le geste attendu,
      // et une pièce fermée est la seule qui porte une surface.
      if (mur && mur.length >= 2 && v.x === mur[0][0] && v.y === mur[0][1]) { fermerMur(suite); return; }
      setMur(suite);
      return;
    }
    if (outil === 'zone' || outil === 'salle' || outil === 'piece') {
      svgRef.current?.setPointerCapture?.(e.pointerId);
      setTrace({ outil, depart: p, fin: p });
      return;
    }
    if (outil === 'bloc') {
      const b = blocDe(blocCle);
      // UNE VIGNETTE, QUATRE DESTINS. Le même clic écrit dans quatre endroits
      // différents selon la famille du bloc : une porte perce le mur visé, un
      // canapé se range dans le plan, une salle et un bench naissent
      // ressources. C'est la famille qui tranche, jamais l'outil.
      if (b.famille === 'ouverture') {
        if (portes.length >= OUVERTURES_MAX) return;
        const o = ouvertureDuBloc(b, murs, p);
        if (o) ecrirePortes([...portes, o]);
        return;
      }
      // Le clic pose ce que l'aperçu montrait : aimanté, sauf Alt.
      const [pose, ...reste] = poseDuBloc(p, e.altKey).formes;
      if (b.famille === 'meuble') {
        if (meubles.length >= MEUBLES_MAX) return;
        const m = pose ? nettoyerMeuble(pose) : null;
        if (m) ecrireMeubles([...meubles, m]);
        return;
      }
      if (b.famille === 'salle') {
        const r = pose || null;
        if (r) {
          poserSalle.mutate({
            nom: b.nom, capacite: b.capacite || 4, geometrie: avecPlan(geometrieDe(r)),
          }, surCree(nouveauGeste()));
        }
        return;
      }
      const places = pose ? [pose, ...reste] : [];
      // UN LOT VIDE NE PART PAS : `om_postes_semer` refuse `nombre = 0`
      // (`nombre_invalide`), et le refus se lirait comme une panne.
      if (!places.length) return;
      // SANS ZONE AUSSI : un bureau posé sur le plan est réservable tel quel.
      // La zone lui viendra du rectangle qu'on dessinera par-dessus, ou de
      // rien du tout — ce n'est pas elle qui autorise le geste.
      semer.mutate({
        zoneId: zoneCible || null,
        nombre: places.length,
        geometrie: places.map((pl) => avecPlan(geometrieDe(pl))),
      }, surCree(nouveauGeste()));
    }
  };

  /**
   * Un plan importé : redessinable s'il est vectoriel, calque sinon.
   *
   * UN SVG OU UN DXF PORTE DES TRAITS — on les reprend comme murs, et tout
   * reste modifiable. UN SCAN NE PORTE QUE DES PIXELS : aucune relecture
   * honnête n'en tire des murs, donc il passe DERRIÈRE le plan, et on trace
   * par-dessus. Le PDF n'est ni l'un ni l'autre ici : le lire demanderait une
   * neuvième dépendance de prod — l'exporter en SVG ou en image le rend.
   */
  const importer = async (e) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setMotImport('');
    const nom = fichier.name.toLowerCase();
    try {
      if (FORMATS_IMPORT.traces.some((x) => nom.endsWith(x))) {
        const lignes = lireTrace(await fichier.text(), fichier.name);
        const { murs: pris, tombes } = ajusterAuPlan(lignes, { plan: cadrePlan });
        if (!pris.length) { setMotImport('Aucun trait lisible dans ce fichier.'); return; }
        // Remplacer efface un tracé qu'on ne sait pas refaire : on demande.
        if (murs.length && !(await demander({
          titre: 'Remplacer le tracé ?', texte: `Les ${murs.length} murs actuels laissent place aux ${pris.length} murs importés.`,
          oui: 'Remplacer', danger: true,
        }))) return;
        ecrireMurs(pris, []);
        setMotImport(`${pris.length} mur${pris.length > 1 ? 's' : ''} importé${pris.length > 1 ? 's' : ''}${tombes ? `, ${tombes} écarté${tombes > 1 ? 's' : ''} (plafond du plan)` : ''}. Réglez la taille du plan en mètres pour l’échelle.`);
        return;
      }
      if (!FORMATS_IMPORT.fonds.some((x) => nom.endsWith(x))) {
        setMotImport('Formats acceptés : SVG, DXF (redessinables), PNG, JPG, WEBP, GIF (calque).');
        return;
      }
      const { src, ratio } = await reduireImage(fichier);
      poserCalque(calqueCentre(src, ratio, cadrePlan));
      setMotImport('Calque posé. Il reste dans ce navigateur : tracez les murs par-dessus.');
    } catch {
      setMotImport('Fichier illisible.');
    }
  };

  /** Devant ou derrière : une photo qu'on retourne, pas un objet du plan. */
  const basculerDevant = () => {
    if (!calque) return;
    memoriser({ calque });
    poserCalque({ ...calque, devant: !calque.devant });
  };

  const choisirCalque = () => {
    if (calqueChoisi) { setCalqueChoisi(false); setMotImport(''); return; }
    rienDeChoisi();
    setOutil('choisir');
    setCalqueChoisi(true);
    setMotImport('Glissez la photo, tirez un coin pour la redimensionner — '
      + 'son rapport tient. Échap pour la lâcher.');
  };

  const retirerFond = () => {
    poserCalque(null);
    setCalqueChoisi(false);
    setMotImport('');
  };

  const changerGenre = (genre) => {
    if (!choix.length) return;
    const membreId = genre === 'attitre' ? membres[0]?.id ?? null : null;
    genrer.mutate({ ids: choix, genre, membreId });
  };

  /**
   * Une zone se nomme quand on la trace, pas dans un formulaire à part.
   *
   * Le rectangle suit la création dans la foulée (`om_zone_ecrire` rend l'id) :
   * autrement la zone naîtrait sans forme et il faudrait la redessiner.
   */
  const nommerZone = (surSucces) => {
    const nom = nomNet(window.prompt('Nom de la zone (Open space, Mezzanine…)', '') || '');
    if (!nom) return;
    ecrireZone.mutate({ nom, places: 0 }, surSucces ? { onSuccess: surSucces } : undefined);
  };

  const parId = new Map(membres.map((m) => [m.id, m]));
  const posteSeul = choix.length === 1 ? dessines.find((p) => p.id === choix[0]) : null;
  const salleSeule = salleChoisie ? sallesVues.find((s) => s.id === salleChoisie) : null;
  const zoneSeule = zoneChoisie ? zonesDessinees.find((z) => z.id === zoneChoisie) : null;
  const porteSeule = porteChoisie >= 0 ? portesVues[porteChoisie] : null;
  const murSeul = murChoisi >= 0 ? mursVus[murChoisi] : null;
  const meubleSeul = meubleChoisi >= 0 ? meublesVus[meubleChoisi] : null;
  const occupe = dessines.some((p) => choix.includes(p.id) && p.occupe);

  /**
   * Ce qui est choisi, décrit une bonne fois.
   *
   * UNE SEULE BARRE POUR CINQ NATURES D'OBJET. Cinq barres, c'était cinq
   * endroits où chercher « Supprimer » — et deux où il manquait. Le descripteur
   * dit ce que l'objet accepte (nom, taille, angle), la barre s'y plie.
   */
  const elu = useMemo(() => {
    // Un lot mixte n'a ni nom ni cote commune : il se déplace, il pivote, il
    // se copie, il s'efface. C'est déjà tout ce qu'on lui demande.
    if (totalChoisi > 1) {
      return { genre: 'lot', icone: Move, titre: `${totalChoisi} éléments choisis`, angle: true };
    }
    if (porteSeule) {
      return { genre: 'porte', icone: DoorOpen, titre: typeOuverture(porteSeule.k).nom, forme: porteSeule };
    }
    if (murSeul) {
      const i = segmentChoisi;
      const segment = i >= 0 && i < murSeul.length - 1
        ? {
          index: i,
          l: longueur(murSeul[i], murSeul[i + 1]),
          // Le milieu du segment : c'est là que l'étiquette se pose, donc là
          // que le champ s'ouvre. La cote et le champ au même endroit, sinon
          // l'œil quitte le mur pour aller chercher son nombre ailleurs.
          milieu: {
            x: (murSeul[i][0] + murSeul[i + 1][0]) / 2,
            y: (murSeul[i][1] + murSeul[i + 1][1]) / 2,
          },
        }
        : null;
      return {
        genre: 'mur', icone: PenLine, segment, angle: true,
        titre: `Mur · ${enMetres(perimetre(murSeul))}`,
      };
    }
    if (zoneSeule) {
      return {
        genre: 'zone', icone: Square, titre: zoneSeule.nom, forme: zoneSeule,
        nom: zoneSeule.nom, taille: true, angle: true,
      };
    }
    if (salleSeule) {
      return {
        genre: 'salle', icone: Presentation, titre: salleSeule.nom, forme: salleSeule,
        nom: salleSeule.nom, taille: true, angle: true,
      };
    }
    if (meubleSeul) {
      return {
        genre: 'meuble', icone: Sofa, titre: meubleSeul.n || 'Meuble', forme: meubleSeul,
        nom: meubleSeul.n || '', index: meubleChoisi, taille: true, angle: true,
      };
    }
    if (posteSeul) {
      return {
        genre: 'poste', icone: Move, titre: posteSeul.nom, forme: posteSeul,
        nom: posteSeul.nom, taille: true, angle: true,
      };
    }
    return null;
  }, [porteSeule, murSeul, segmentChoisi, zoneSeule, salleSeule, meubleSeul, meubleChoisi,
    posteSeul, choix, totalChoisi]);

  /**
   * La boîte commune de ce qui est choisi : le pivot du lot, et l'endroit où
   * se posent les quatre poignées d'angle. Pendant un tour, c'est celle qui a
   * été figée à la prise.
   */
  const boiteChoisie = useMemo(() => {
    if (outil !== 'choisir' || !elu?.angle) return null;
    if (rotation) return rotation.boite;
    return boiteDe(choixMurs.map((i) => mursVus[i]).filter(Boolean), [
      ...dessines.filter((p) => choix.includes(p.id)),
      ...sallesVues.filter((sa) => choixSalles.includes(sa.id)),
      ...zonesDessinees.filter((z) => choixZones.includes(z.id)),
      ...meublesVus.filter((_, i) => choixMeubles.includes(i)),
    ]);
  }, [outil, elu, rotation, mursVus, choixMurs, dessines, choix,
    sallesVues, choixSalles, zonesDessinees, choixZones, meublesVus, choixMeubles]);

  const renommer = (e) => {
    e.preventDefault();
    const nom = nomNet(renommage);
    if (!nom || !elu?.nom) return;
    if (elu.genre === 'meuble') {
      ecrireMeubles(meubles.map((m, i) => (i === elu.index ? { ...m, n: nom } : m)));
      return;
    }
    if (elu.genre === 'zone') ecrireZone.mutate({ id: elu.forme.id, nom });
    else ecrireRessource.mutate({ id: elu.forme.id, nom });
  };

  /**
   * Un côté retapé dans la barre.
   *
   * La poignée sert à l'œil, le champ sert au mètre : un plan relevé au
   * décamètre se tape, il ne se tire pas à trois pixels près.
   */
  const changerCote = (champ, metres) => {
    if (!elu?.taille) return;
    const v = Math.round(Math.min(COTE.maxi, Math.max(COTE.mini, metres)) * 10);
    const f = elu.forme;
    if (elu.genre === 'meuble') {
      ecrireMeubles(meubles.map((m, i) => (i === elu.index ? { ...m, [champ]: v } : m)));
      return;
    }
    if (elu.genre === 'zone') {
      ecrireZonesGeo([{ id: f.id, x: f.x, y: f.y, l: f.l, h: f.h, [champ]: v }]);
      return;
    }
    envoyer([{ ...f, [champ]: v }]);
  };

  /**
   * La longueur d'un segment, tapée SUR la cote, pas dans une barre.
   *
   * ON GARDE LE DÉPART ET LE CAP, on translate la suite : bouger le seul point
   * d'arrivée ferait pivoter le segment suivant, et un plan relevé au
   * décamètre deviendrait faux d'un mur à l'autre. L'écriture part du bouton,
   * jamais de la frappe : une écriture par chiffre saturerait le goulot.
   */
  const poserLongueur = () => {
    const d = depuisMetres(saisieSegment);
    if (!d || murChoisi < 0 || segmentChoisi < 0) return;
    const pts = changerLongueur(murs[murChoisi], segmentChoisi, d);
    if (!pts) {
      setMotEchelle(`Longueur refusée : un segment tient entre ${COTE.mini} m et ${BORNES.max / 10} m.`);
      return;
    }
    ecrireMurs(murs.map((m, i) => (i === murChoisi ? pts : m)));
    setEtapeCote('saisie');
    setMotEchelle(`Segment ${segmentChoisi + 1} posé à ${enMetres(d)}.`);
  };

  const ajouterPlan = () => {
    const nom = window.prompt('Nom du plan (Rez-de-chaussée, 2e étage…)', `Plan ${plans.length + 1}`);
    if (nom === null) return;
    creerPlan.mutate(nomNet(nom) || `Plan ${plans.length + 1}`, {
      onSuccess: (r) => { if (r?.id) onChoisirPlan(r.id); },
    });
  };

  const renommerCePlan = () => {
    if (!planId) return;
    const nom = window.prompt('Nouveau nom du plan', plan?.nom || '');
    if (nom === null || !nomNet(nom)) return;
    renommerPlan.mutate({ planId, nom: nomNet(nom) });
  };

  /**
   * Supprimer un plan emporte ses murs ; zones et postes y survivent, la base
   * les détache (`on delete set null`). Le dernier plan ne part pas : un
   * espace sans plan n'aurait plus où poser quoi que ce soit.
   */
  const supprimerCePlan = async () => {
    if (!planId || plans.length < 2) return;
    const ok = await demander({
      titre: `Supprimer « ${plan?.nom || 'ce plan'} » ?`,
      texte: 'Son tracé part avec lui ; les zones et les postes restent dans l’espace.', oui: 'Supprimer', danger: true,
    });
    if (!ok) return;
    supprimerPlan.mutate(planId, {
      onSuccess: () => onChoisirPlan(plans.find((x) => x.id !== planId)?.id || ''),
    });
  };

  /**
   * L'échelle du plan, déclarée sur un segment.
   *
   * UN PLAN RELEVÉ AU JUGÉ EST JUSTE DE FORME ET FAUX DE TAILLE. Corriger mur
   * par mur, c'est vingt saisies et vingt occasions de déformer la pièce ; une
   * seule longueur connue suffit à remettre tout le reste d'aplomb.
   *
   * TOUT BOUGE, DONC ON DEMANDE. Et tout passe par un SEUL état d'avant : sans
   * ça, Ctrl+Z ne rendrait que les murs et laisserait les postes au double.
   */
  const poserEchelle = () => {
    const cible = depuisMetres(saisieSegment);
    if (!cible || !elu?.segment) return;
    const k = facteurEchelle(elu.segment.l, cible);
    if (!k) {
      setMotEchelle(`Échelle impossible : ce segment passerait de ${enMetres(elu.segment.l)} à ${enMetres(cible)}, plus de cinquante fois sa taille.`);
      return;
    }
    const boites = [
      ...dessines.map((p) => ({ ...p, quoi: 'poste' })),
      ...sallesVues.map((sa) => ({ ...sa, quoi: 'poste' })),
      ...zonesDessinees.map((z) => ({ ...z, quoi: 'zone' })),
      ...meublesVus.map((m) => ({ ...m, quoi: 'meuble' })),
    ];
    // RIEN NE BLOQUE UN AGRANDISSEMENT : on met à l'échelle dans le cadre le
    // plus large que la base accepte, et la feuille suit ensuite le dessin
    // (`cadreNecessaire`). Refuser au nom d'un cadre qu'on calcule soi-même
    // serait un mur inventé.
    // EN SOUPLE : le dessin commande, les meubles s'écrêtent. Refuser tout le
    // geste parce qu'un bureau dépasserait 20 m, c'était refuser presque
    // toutes les mises à l'échelle sans jamais dire laquelle.
    const libre = { largeur: BORNES.max, hauteur: BORNES.max };
    const apres = mettreAEchelle({ murs, portes, boites, calque }, k, { plan: libre, souple: true });
    if (!apres) {
      setMotEchelle(`Échelle impossible : à cette taille le plan dépasserait ${BORNES.max / 10} m de côté.`);
      return;
    }
    const avantPostes = [...postes, ...salles]
      .filter((p) => Number.isFinite(Number(p.x)))
      .map((p) => avecPlan({ id: p.id, ...geometrieDe(p) }));
    const avantZones = zonesActives
      .filter((z) => Number.isFinite(Number(z.x)))
      .map((z) => avecPlan({ id: z.id, x: z.x, y: z.y, l: z.l, h: z.h }));
    memoriser({
      plan: { id: planId, patch: { murs, portes, meubles } },
      ...(avantPostes.length ? { postes: avantPostes } : {}),
      ...(avantZones.length ? { zones: avantZones } : {}),
      ...(calque ? { calque } : {}),
    });
    // LE CALQUE SUIT LE DESSIN, SINON IL LE TRAHIT : mettre les murs au double
    // en laissant le scan dessous, c'est perdre le repère qui a servi à tracer.
    if (calque) poserCalque(apres.calque);
    ecrirePlan({
      murs: apres.murs,
      portes: nettoyerOuvertures(apres.portes),
      meubles: nettoyerMeubles(apres.boites.filter((b) => b.quoi === 'meuble')),
    });
    const rectangles = apres.boites.filter((b) => b.quoi === 'poste');
    if (rectangles.length) {
      bouger.mutate(rectangles.map((b) => avecPlan({ id: b.id, ...geometrieDe(b) })));
    }
    const zonesMises = apres.boites.filter((b) => b.quoi === 'zone');
    if (zonesMises.length) {
      dessiner.mutate(zonesMises.map((z) => avecPlan({
        id: z.id, x: z.x, y: z.y, l: z.l, h: z.h,
      })));
    }
    // LA SÉLECTION RESTE : la feuille s'ajuste au dessin, donc à l'écran le
    // plan garde sa taille et seules les cotes changent. Effacer la sélection
    // ici, c'était enlever la seule preuve que quelque chose s'est passé.
    setEtapeCote('saisie');
    setMotEchelle(`Tout le plan × ${Math.round(k * 100) / 100} : ce segment fait ${enMetres(cible)}, les autres cotes ont suivi. Le dessin garde sa taille à l’écran, la feuille s’ajuste.`);
  };

  const changerAngle = (deg) => {
    if (!elu?.forme) return;
    const rot = ((deg % 360) + 360) % 360;
    if (elu.genre === 'meuble') {
      ecrireMeubles(meubles.map((m, i) => (i === elu.index ? { ...m, rot } : m)));
      return;
    }
    envoyer([{ ...elu.forme, rot }]);
  };

  const changerPorte = (patch) => {
    if (porteChoisie < 0) return;
    ecrirePortes(portes.map((o, i) => (i === porteChoisie ? { ...o, ...patch } : o)));
  };

  /**
   * La porte retournée : le battant passe de l'autre côté, ou change de gond.
   *
   * On ne repose pas la porte pour la corriger : le trou est au bon endroit,
   * c'est le sens d'ouverture qui était faux. Deux boutons, quatre poses.
   */
  const retournerPorte = (quoi) => {
    if (porteChoisie < 0) return;
    const o = retournerOuverture(portes[porteChoisie], quoi);
    if (o) ecrirePortes(portes.map((x, i) => (i === porteChoisie ? o : x)));
  };

  /**
   * Le quart de tour, sur tout ce qui est choisi.
   *
   * UN SEUL PIVOT POUR LE LOT : la boîte commune. Faire tourner chaque objet
   * sur lui-même laisserait le bench en place et ne ferait tourner que les
   * meubles ; ici l'ensemble tourne comme une feuille de calque. Les zones
   * n'ont pas d'angle en base : à 90°, leurs côtés s'échangent.
   */
  const appliquerTour = (degres, centre) => {
    const tour = Math.round(degres || 0);
    if (!tour || !centre) return;
    const mursPris = choixMurs.map((i) => murs[i]).filter(Boolean);
    // On repart des SOURCES, pas des aperçus : ceux-ci portent déjà le tour en
    // cours, et l'écriture le compterait deux fois.
    const rectangles = [
      ...postes.filter((p) => choix.includes(p.id) && Number.isFinite(Number(p.x)))
        .map((p) => ({ ...p, ...geometrieDe(p) })),
      ...salles.filter((sa) => choixSalles.includes(sa.id) && Number.isFinite(Number(sa.x)))
        .map((sa) => ({ ...sa, ...geometrieDe(sa) })),
    ];
    const zonesPrises = zonesActives
      .filter((z) => choixZones.includes(z.id) && Number.isFinite(Number(z.x)));
    // Murs et décor partagent le patch de plan : deux écritures, ce serait
    // deux requêtes concurrentes sur la même ligne, et la dernière gagnerait.
    if (mursPris.length || choixMeubles.length) {
      const prisM = meubles.filter((_, i) => choixMeubles.includes(i));
      const tournes = choixMeubles.length ? pivoter(prisM, tour, { centre }) : [];
      let k = 0;
      memoriser({ plan: { id: planId, patch: { murs, meubles } } });
      ecrirePlan({
        murs: murs.map((m, i) => (choixMurs.includes(i) ? pivoterTrace(m, tour, centre) : m)),
        meubles: nettoyerMeubles(meubles.map((m, i) => (choixMeubles.includes(i)
          ? tournes[k++] || m : m))),
      });
    }
    if (rectangles.length) envoyer(pivoter(rectangles, tour, { centre }));
    if (zonesPrises.length) {
      ecrireZonesGeo(zonesPrises.map((z) => ({ id: z.id, ...zonePivotee(z, tour, centre) })));
    }
  };

  const tourner = (sens) => {
    if (!boiteChoisie) return;
    appliquerTour(sens, { x: boiteChoisie.cx, y: boiteChoisie.cy });
  };

  /**
   * Copier, coller : le lot repart décalé d'un mètre.
   *
   * Les copies sont de NOUVEAUX objets, pas des clones d'identifiant : un
   * poste collé naît vierge de réservation, une salle collée prend « (copie) »
   * dans son nom. Le décalage évite la superposition parfaite, où l'on croirait
   * que rien ne s'est passé.
   */
  /** Ce qui est choisi, figé tel qu'on le voit : la matière d'une copie. */
  const capturer = () => ({
    postes: dessines.filter((p) => choix.includes(p.id)),
    salles: sallesVues.filter((sa) => choixSalles.includes(sa.id)),
    zones: zonesDessinees.filter((z) => choixZones.includes(z.id)),
    murs: choixMurs.map((i) => mursVus[i]).filter(Boolean),
    epaisseurs: choixMurs.filter((i) => mursVus[i]).map((i) => epaisseurs[i]),
    portes: choixPortes.map((i) => portesVues[i]).filter(Boolean),
    meubles: choixMeubles.map((i) => meublesVus[i]).filter(Boolean),
  });

  const copier = () => {
    if (!totalChoisi) return;
    setPresse(capturer());
    setMotEchelle(`${totalChoisi} élément${totalChoisi > 1 ? 's' : ''} copié${totalChoisi > 1 ? 's' : ''} · Ctrl+V pour coller.`);
  };

  /**
   * Poser `source` une fois par décalage — coller, dupliquer, réseau.
   *
   * Un collage est UN geste : le plan patché et les ids qui reviennent de la
   * base rejoignent la même entrée, un seul Ctrl+Z défait tout le réseau.
   */
  const collerLot = (source, decalages) => {
    if (!source || !decalages.length) return 0;
    const geste = nouveauGeste();
    const k = decalages.length;
    const decale = (d) => (o) => ({ ...o, x: o.x + d.dx, y: o.y + d.dy });
    const partout = (liste) => decalages.flatMap((d) => (liste || []).map(decale(d)));
    // Le presse-papier d'avant le décor n'a pas de `meubles` : on le lit mou.
    const copies = partout(source.meubles).slice(0, Math.max(0, MEUBLES_MAX - meubles.length));
    const tracesCopiees = decalages.flatMap((d) => source.murs.map((m) => translaterTrace(m, d)));
    const place = murs.length + tracesCopiees.length <= MURS.lignes;
    if (tracesCopiees.length || source.portes.length || copies.length) {
      const suite = place ? [...murs, ...tracesCopiees] : murs;
      // Le presse-papier d'avant l'épaisseur n'en a pas : null, le trait fin.
      const eps = place
        ? [...epaisseurs, ...decalages.flatMap(() => source.epaisseurs || [])] : epaisseurs;
      memoriser({ plan: { id: planId, patch: { murs, epaisseurs, portes, meubles } } }, geste);
      ecrirePlan({
        murs: suite,
        epaisseurs: nettoyerEpaisseurs(eps, suite.length),
        portes: nettoyerOuvertures([...portes, ...partout(source.portes)]),
        meubles: nettoyerMeubles([...meubles, ...copies]),
      });
    }
    if (source.postes.length) {
      semer.mutate({
        zoneId: null,
        nombre: source.postes.length * k,
        geometrie: partout(source.postes).map((p) => avecPlan(geometrieDe(p))),
      }, surCree(geste));
    }
    for (const d of decalages) {
      for (const sa of source.salles) {
        poserSalle.mutate({
          nom: nomNet(`${sa.nom} (copie)`) || 'Salle',
          capacite: Number(sa.capacite) || 1,
          geometrie: avecPlan(geometrieDe(decale(d)(sa))),
        }, surCree(geste));
      }
      for (const z of source.zones) {
        const g = decale(d)(z);
        ecrireZone.mutate({ nom: nomNet(`${z.nom} (copie)`) || 'Zone', places: 0 }, {
          onSuccess: (zr) => {
            if (!zr?.id) return;
            memoriser({ zonesCreees: [zr.id] }, geste);
            dessiner.mutate([avecPlan({ id: zr.id, x: g.x, y: g.y, l: z.l, h: z.h })]);
          },
        });
      }
    }
    return (source.postes.length + source.salles.length + source.zones.length
      + source.portes.length) * k + (place ? tracesCopiees.length : 0) + copies.length;
  };

  const coller = () => {
    const n = collerLot(presse, [{ dx: DECALAGE_COPIE, dy: DECALAGE_COPIE }]);
    if (n) setMotEchelle(`${n} élément${n > 1 ? 's' : ''} collé${n > 1 ? 's' : ''}, décalé${n > 1 ? 's' : ''} d’un mètre.`);
  };

  /** Ctrl+D : la sélection doublée sur place, décalée d'un mètre, sans presse-papier. */
  const dupliquer = () => {
    if (!totalChoisi) return;
    const n = collerLot(capturer(), [{ dx: DECALAGE_COPIE, dy: DECALAGE_COPIE }]);
    if (n) setMotEchelle(`${n} élément${n > 1 ? 's' : ''} dupliqué${n > 1 ? 's' : ''}.`);
  };

  /**
   * Le réseau : N copies en rangée ou en colonne. Sans pas tapé, le pas est la
   * boîte du lot — les copies se touchent, comme un bench qu'on prolonge.
   */
  const poserReseau = () => {
    const b = boiteDe(choixMurs.map((i) => mursVus[i]).filter(Boolean), [
      ...dessines.filter((p) => choix.includes(p.id)).map(geometrieDe),
      ...sallesVues.filter((sa) => choixSalles.includes(sa.id)).map(geometrieDe),
      ...zonesDessinees.filter((z) => choixZones.includes(z.id)),
      ...meublesVus.filter((_, i) => choixMeubles.includes(i)),
    ]);
    if (!b) return;
    const tape = Number(String(enReseau.pas).replace(',', '.'));
    const pas = tape > 0 ? tape * 10 : (enReseau.sens === 'y' ? b.h : b.l);
    const n = collerLot(capturer(), reseau(enReseau.n, enReseau.sens === 'y' ? { dy: pas } : { dx: pas }));
    if (n) setMotEchelle(`${n} élément${n > 1 ? 's' : ''} posé${n > 1 ? 's' : ''} en réseau.`);
  };

  /**
   * Aligner, répartir : chaque objet reçoit SON décalage, calculé sur sa
   * boîte droite (tournée comprise). Les portes restent sur leur mur.
   * Un seul lot d'annulation pour toutes les écritures.
   */
  const ranger = (calcul) => {
    const items = [
      ...dessines.filter((p) => choix.includes(p.id)).map((p) => ({ q: 'r', o: p, b: boiteTournee(p) })),
      ...sallesVues.filter((sa) => choixSalles.includes(sa.id)).map((sa) => ({ q: 'r', o: sa, b: boiteTournee(sa) })),
      ...zonesDessinees.filter((z) => choixZones.includes(z.id))
        .map((z) => ({ q: 'z', o: z, b: { x0: z.x, y0: z.y, x1: z.x + z.l, y1: z.y + z.h } })),
      ...choixMurs.filter((i) => mursVus[i]).map((i) => {
        const bm = boiteDe([mursVus[i]]);
        return { q: 'm', i, b: { x0: bm.x, y0: bm.y, x1: bm.x + bm.l, y1: bm.y + bm.h } };
      }),
      ...choixMeubles.filter((i) => meublesVus[i]).map((i) => ({ q: 'd', i, b: boiteTournee(meublesVus[i]) })),
    ];
    if (items.length < 2) return;
    const ds = calcul(items.map((it) => it.b));
    const pris = items.map((it, k) => ({ ...it, d: ds[k] })).filter((it) => it.d.dx || it.d.dy);
    if (!pris.length) return;
    const dMur = new Map(pris.filter((it) => it.q === 'm').map((it) => [it.i, it.d]));
    const dMeuble = new Map(pris.filter((it) => it.q === 'd').map((it) => [it.i, it.d]));
    enLot(() => {
      if (dMur.size || dMeuble.size) {
        memoriser({ plan: { id: planId, patch: { murs, meubles } } });
        ecrirePlan({
          murs: murs.map((m, i) => (dMur.has(i) ? translaterTrace(m, dMur.get(i)) : m)),
          meubles: nettoyerMeubles(meubles.map((m, i) => (dMeuble.has(i)
            ? { ...m, x: m.x + dMeuble.get(i).dx, y: m.y + dMeuble.get(i).dy } : m))),
        });
      }
      const rect = pris.filter((it) => it.q === 'r')
        .map((it) => ({ ...it.o, x: it.o.x + it.d.dx, y: it.o.y + it.d.dy }));
      if (rect.length) envoyer(rect);
      const zs = pris.filter((it) => it.q === 'z')
        .map(({ o, d }) => ({ id: o.id, x: o.x + d.dx, y: o.y + d.dy, l: o.l, h: o.h }));
      if (zs.length) ecrireZonesGeo(zs);
    });
  };

  /**
   * Supprimer ce qui est choisi, quoi que ce soit.
   *
   * MÊME GESTE POUR TOUT — c'est là que l'éditeur précédent trahissait : un mur
   * s'effaçait, une zone dessinée non, une porte n'existait pas. La base garde
   * le dernier mot : un poste réservé revient en `poste_occupe`, et le bouton
   * le dit avant même l'aller-retour.
   */
  const supprimer = () => {
    if (choixMurs.length || choixPortes.length || choixMeubles.length) {
      memoriser({ plan: { id: planId, patch: { murs, epaisseurs, portes, meubles } } });
      ecrirePlan({
        murs: murs.filter((_, i) => !choixMurs.includes(i)),
        epaisseurs: epaisseurs.filter((_, i) => !choixMurs.includes(i)),
        portes: nettoyerOuvertures(portes.filter((_, i) => !choixPortes.includes(i))),
        meubles: nettoyerMeubles(meubles.filter((_, i) => !choixMeubles.includes(i))),
      });
    }
    for (const id of choixZones) ecrireZone.mutate({ id, supprimer: true });
    for (const id of choixSalles) ecrireRessource.mutate({ id, supprimer: true });
    // Un poste réservé résiste : la base le refuse, autant ne pas l'envoyer.
    if (choix.length && !occupe) {
      for (const id of choix) ecrireRessource.mutate({ id, supprimer: true });
    }
    rienDeChoisi();
  };

  // Le clavier tient le tracé ET la sélection : la souris pose, le clavier
  // défait, termine et efface. `Suppr` vaut pour tout ce qui est choisi — un
  // objet qu'on voit sélectionné et qui résiste à la touche est un bug de plus.
  useEffect(() => {
    const surTouche = (e) => {
      const cible = e.target?.tagName || '';
      if (cible === 'INPUT' || cible === 'SELECT' || cible === 'TEXTAREA') return;
      // Ctrl+Z défait le dernier point tant qu'un mur est en cours — c'est ce
      // qu'on attend le stylo à la main — et sinon rejoue l'état d'avant.
      // Ctrl+Maj+Z ou Ctrl+Y : rétablir, comme partout ailleurs.
      if ((e.ctrlKey || e.metaKey)
        && (((e.key === 'z' || e.key === 'Z') && e.shiftKey) || e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        retablir();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (outil === 'mur' && mur) { setMur(mur.length > 1 ? mur.slice(0, -1) : null); return; }
        annuler();
        return;
      }
      if (outil === 'mur' && mur) {
        if (e.key === 'Enter') { e.preventDefault(); fermerMur(); return; }
        if (e.key === 'Backspace') {
          e.preventDefault();
          setMur(mur.length > 1 ? mur.slice(0, -1) : null);
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        copier();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        coller();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        dupliquer();
        return;
      }
      if (e.key === '?') { e.preventDefault(); setPanneau((p) => (p === 'aide' ? null : 'aide')); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setPanneau('chercher');
        return;
      }
      if (e.key === 'Alt') setSansAccroche(true);
      if (e.key === 'Escape') { setMur(null); setTrace(null); setRegle(null); setPoly(null); setPanneau(null); rienDeChoisi(); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && elu) {
        e.preventDefault();
        supprimer();
      }
    };
    const surRelache = (e) => { if (e.key === 'Alt') setSansAccroche(false); };
    window.addEventListener('keydown', surTouche);
    window.addEventListener('keyup', surRelache);
    return () => {
      window.removeEventListener('keydown', surTouche);
      window.removeEventListener('keyup', surRelache);
    };
  }, [outil, mur, murs, portes, elu, choix, occupe, choixSalles, choixZones, choixMurs,
    choixPortes, choixMeubles, meubles, presse, dessines, sallesVues, zonesDessinees, pile, refaits,
    postes, salles, zones, plan, calque, epaisseurs, mursVus, portesVues, meublesVus]);

  // Le champ de renommage suit ce qui est choisi : sinon on renomme la salle
  // avec le nom du poste d'avant.
  useEffect(() => { setRenommage(elu?.nom || ''); }, [elu?.genre, elu?.forme?.id]);

  // Le champ de longueur montre la mesure actuelle du segment : on corrige un
  // nombre qu'on lit, on ne le devine pas.
  useEffect(() => {
    setSaisieSegment(elu?.segment ? enMetres(elu.segment.l, { unite: false }) : '');
    setEtapeCote('saisie');
  }, [murChoisi, segmentChoisi, elu?.segment?.l]);

  // L'étiquette d'édition vit en HTML par-dessus le SVG : il lui faut la
  // taille de la vue en pixels pour savoir où se poser. Elle change à chaque
  // fenêtre redimensionnée, donc on la suit au lieu de la mesurer une fois.
  useEffect(() => {
    const noeud = svgRef.current;
    if (!noeud || typeof ResizeObserver === 'undefined') return undefined;
    const suivre = () => {
      const r = noeud.getBoundingClientRect();
      setVueSvg({ width: r.width, height: r.height });
    };
    suivre();
    const o = new ResizeObserver(suivre);
    o.observe(noeud);
    return () => o.disconnect();
  }, []);

  // Choisir un segment, c'est vouloir taper sa longueur : le champ prend la
  // main et se présélectionne, sinon il faudrait viser deux fois.
  useEffect(() => {
    if (etapeCote !== 'saisie') return;
    champCote.current?.focus();
    champCote.current?.select();
  }, [etapeCote, murChoisi, segmentChoisi]);

  useEffect(() => {
    let brut = '';
    try { brut = window.localStorage.getItem(cleFond) || ''; } catch { brut = ''; }
    const c = lireCalque(brut, cadrePlan);
    setCalque(c);
    // Un calque d'avant la géométrie se fige ici, une fois : relu à chaque
    // agrandissement de la feuille, il repartirait à la dérive.
    if (c && brut.startsWith('data:')) {
      try { window.localStorage.setItem(cleFond, JSON.stringify(c)); } catch { /* quota */ }
    }
  }, [cleFond]);

  /**
   * La photo suit le geste sans rien écrire : ce qu'on voit sous le curseur
   * pendant le glissé est déjà ce qui sera posé au lâcher.
   */
  const calqueVu = !calque ? null
    : (glisse?.calque ? glisserCalque(calque, glisse.d, { plan: cadrePlan })
      : retouche?.quoi === 'calque'
        ? etirerCalque(calque, retouche.cle, retouche.point, { plan: cadrePlan })
        : calque) || calque;

  const fondDessine = calqueVu ? (
    <image
      href={calqueVu.src} x={calqueVu.x} y={calqueVu.y}
      width={calqueVu.l} height={calqueVu.h}
      opacity={fondOpacite} preserveAspectRatio="xMidYMid meet"
      className={calqueChoisi && outil === 'choisir' ? 'cursor-move' : 'pointer-events-none'}
      onPointerDown={prendreCalque}
    />
  ) : null;

  const apercu = trace ? rectangleEntre(trace.depart, trace.fin, { plan: cadrePlan }) : null;
  const prisDansLaBande = apercu && trace?.outil === 'choix'
    ? Object.values(ramasser(apercu, trace.fin.x < trace.depart.x)).reduce((n, l) => n + l.length, 0)
    : 0;
  const visee = outil === 'mur' && curseur ? pointMur(curseur) : null;
  const poseVue = outil === 'bloc' && curseur && blocDe(blocCle).famille !== 'ouverture'
    ? poseDuBloc(curseur, sansAccroche) : null;
  const viseePorte = outil === 'bloc' && curseur
    ? ouvertureDuBloc(blocDe(blocCle), murs, curseur) : null;
  const zoneEnCible = zonesActives.find((z) => z.id === zoneCiblee) || null;

  /**
   * L'étiquette d'édition, en pixels au-dessus du milieu du segment choisi.
   *
   * Elle ne peut pas vivre dans le SVG : le `viewBox` mettrait sa police à
   * l'échelle du plateau. Elle se pose donc en HTML par-dessus, à l'endroit
   * que `versEcran` calcule.
   */
  const coteEditee = outil === 'choisir' && elu?.genre === 'mur' && elu.segment
    ? versEcran(elu.segment.milieu, vueSvg, vuePlan)
    : null;

  const choisirCote = (i, index) => {
    if (outil !== 'choisir') return;
    rienDeChoisi();
    setMurChoisi(i);
    setSegmentChoisi(index);
    setMotEchelle('');
  };

  return (
    // L'ATELIER TIENT DANS L'ÉCRAN. Au-dessus de 1024 px — le seuil où les
    // outils d'édition apparaissent — la carte prend toute la hauteur offerte
    // par `Coque pleinEcran` : une ligne pour le plan et l'import, la
    // feuille avale le reste — outils compris, qui flottent dessus.
    <div className="space-y-4 lg:h-full lg:min-h-0 lg:space-y-0 lg:flex lg:flex-col">
      <section
        className="rounded-surface border p-4 bg-surface border-ligne
          lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:p-3 lg:overflow-hidden"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-section font-semibold truncate max-w-[40ch]">{titre}</h2>
          {onTerminer && (
            <Bouton
              variante="neutre" taille="md" icone={Check} className="order-last ml-auto"
              title="Chaque changement est déjà enregistré : revenir aux projets"
              onClick={onTerminer}
            >
              Mes projets
            </Bouton>
          )}
          {onTerminer && (
            <span className="order-last text-micro text-encre-3 hidden sm:inline">Enregistré au fil de l’eau</span>
          )}
          <span className="text-micro text-encre-3">
            {dessines.length} poste{dessines.length > 1 ? 's' : ''}
            {salles.length ? ` · ${salles.length} salle${salles.length > 1 ? 's' : ''}` : ''}
            {portes.length ? ` · ${portes.length} ouverture${portes.length > 1 ? 's' : ''}` : ''}
            {meubles.length ? ` · ${meubles.length} meuble${meubles.length > 1 ? 's' : ''}` : ''}
            {orphelins.length ? ` · ${orphelins.length} sans place` : ''}
          </span>
        </div>
        <p className="mt-1 text-micro text-encre-3 lg:hidden">
          Murs, portes, zones, meubles. Un poste posé dans une zone en fait partie.
        </p>

        {erreur && <p role="alert" className="mt-2 text-micro text-alerte">{omErreurMessage(erreur)}</p>}

        <p className="mt-2 text-micro text-encre-3 lg:hidden">
          Le plan se dessine sur un écran large. Ici, il se regarde.
        </p>

        {/* LE PLAN VIENT AVANT LES OUTILS : on choisit l'étage, puis on y
            trace. Chaque plan porte ses propres murs, zones et postes. Une
            seule ligne : les outils de dessin, eux, vivent sur la feuille. */}
        <div className="mt-2 hidden lg:flex items-center gap-2 flex-wrap">
          <label className="text-micro text-encre-2">
            Plan
            <select
              value={planId}
              onChange={(e) => onChoisirPlan(e.target.value)}
              className={`${CHAMP} ml-2`}
              aria-label="Plan affiché"
            >
              {plans.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </label>
          <Bouton
            variante="discret" taille="md" iconeSeule icone={Plus}
            aria-label="Nouveau plan" title="Nouveau plan"
            onClick={ajouterPlan} disabled={creerPlan.isPending}
          />
          <Bouton
            variante="discret" taille="md" iconeSeule icone={PenLine}
            aria-label="Renommer ce plan" title="Renommer ce plan"
            onClick={renommerCePlan} disabled={!planId || renommerPlan.isPending}
          />
          <Bouton
            variante="discret" taille="md" iconeSeule icone={Trash2}
            aria-label="Supprimer ce plan"
            title={plans.length < 2 ? 'Un espace garde au moins un plan.' : 'Supprimer ce plan'}
            onClick={supprimerCePlan}
            disabled={plans.length < 2 || supprimerPlan.isPending}
          />
          <span className="mx-1 h-6 w-px bg-ligne" aria-hidden="true" />
          {/* L'import : un fichier, deux issues. Vectoriel, il devient des murs
              qu'on reprend ; image, il passe en calque et on trace par-dessus. */}
          <label className="inline-flex items-center gap-2 text-micro text-encre-2">
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            Importer un plan
            <input
              type="file"
              accept={[...FORMATS_IMPORT.traces, ...FORMATS_IMPORT.fonds].join(',')}
              onChange={importer}
              aria-label="Importer un plan (SVG, DXF, ou image en calque)"
              className="text-micro text-encre-3 file:mr-2 file:h-8 file:rounded-controle file:border file:border-ligne file:bg-surface file:px-2.5 file:text-corps file:text-encre"
            />
          </label>
          {calque && (
            <>
              <label className="inline-flex items-center gap-2 text-micro text-encre-2 h-9">
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                Calque
                <input
                  type="range" min="0.1" max="1" step="0.05" value={fondOpacite}
                  onChange={(e) => setFondOpacite(Number(e.target.value))}
                  aria-label="Opacité du calque de fond"
                />
              </label>
              <Bouton
                variante="discret" taille="md" icone={Move} enfonce={calqueChoisi}
                onClick={choisirCalque}
                title="Prendre la photo pour la déplacer ou l'agrandir par un coin"
              >
                {calqueChoisi ? 'Photo prise' : 'Déplacer / agrandir'}
              </Bouton>
              <Bouton
                variante="discret" taille="md"
                icone={calque.devant ? SendToBack : BringToFront}
                onClick={basculerDevant}
              >
                {calque.devant ? 'Passer derrière' : 'Passer devant'}
              </Bouton>
              <Bouton variante="discret" taille="md" icone={Trash2} onClick={retirerFond}>
                Retirer le calque
              </Bouton>
            </>
          )}
          {motImport && <span className="text-micro text-encre-3">{motImport}</span>}
        </div>

        <div className="mt-3 relative rounded-controle border border-ligne bg-fond overflow-hidden
          lg:mt-2 lg:flex-1 lg:min-h-0">
          {coteEditee && (
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-controle border border-ligne bg-surface px-1.5 py-1"
              style={{ left: `${coteEditee.x}px`, top: `${coteEditee.y}px` }}
            >
              {etapeCote === 'saisie' ? (
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (depuisMetres(saisieSegment)) setEtapeCote('choix');
                  }}
                >
                  <input
                    ref={champCote}
                    value={saisieSegment}
                    onChange={(e) => setSaisieSegment(e.target.value)}
                    inputMode="decimal"
                    aria-label="Longueur de ce segment, en mètres"
                    className={`${CHAMP} w-20`}
                  />
                  <span className="text-micro text-encre-3">m</span>
                  <Bouton
                    type="submit" variante="discret" taille="md"
                    disabled={!depuisMetres(saisieSegment)}
                  >
                    Enregistrer
                  </Bouton>
                </form>
              ) : (
                /* UNE LONGUEUR CORRIGE UN MUR, UNE ÉCHELLE LES CORRIGE TOUS :
                   la question se pose au moment d'enregistrer, pas avant. */
                <>
                  <span className="text-micro text-encre-2">Appliquer à</span>
                  <Bouton
                    variante="discret" taille="md" onClick={poserLongueur}
                    disabled={patcherPlan.isPending}
                  >
                    Ce segment
                  </Bouton>
                  <Bouton
                    variante="discret" taille="md" icone={Ruler} onClick={poserEchelle}
                    disabled={patcherPlan.isPending}
                  >
                    Tout le plan
                  </Bouton>
                  <Bouton
                    variante="discret" iconeSeule icone={Undo2} taille="md"
                    aria-label="Revenir à la saisie"
                    onClick={() => setEtapeCote('saisie')}
                  />
                </>
              )}
            </div>
          )}
          <EchelleEcran unitesParPixel={uParPx || vuePlan.largeur / 900}>
            <svg
              ref={svgRef}
              viewBox={cadre(vuePlan)}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Plan du bureau"
              tabIndex={-1}
              className="w-full lg:h-full touch-none select-none focus:outline-none"
              onPointerMove={suivre}
              onPointerUp={lacher}
              onPointerCancel={lacher}
              onPointerDown={surLeFond}
              onPointerLeave={() => setCurseur(null)}
            >
              <defs>
                {/* La grille montre le cran où l'on tombe : elle se resserre avec
                    le zoom, sinon elle annoncerait 20 cm quand on pose au cm. */}
                <pattern
                  id="om-grille" width={finesse.pas * 5} height={finesse.pas * 5}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${finesse.pas * 5} 0 L 0 0 0 ${finesse.pas * 5}`} fill="none"
                    strokeWidth={auPixel(0.6)} className="stroke-ligne-fine"
                  />
                </pattern>
              </defs>
              <rect x="0" y="0" width={cadrePlan.largeur} height={cadrePlan.hauteur} fill="url(#om-grille)" />
              {/* LA PHOTO EST UN OBJET À PART, PAS UN DÉCOR FIGÉ. Derrière par
                  défaut — un scan se trace par-dessus —, devant sur demande, et
                  cliquable seulement une fois prise dans la barre : elle couvre
                  la feuille, toujours cliquable elle mangerait la bande. */}
              {!calque?.devant && fondDessine}
              {/* LES PIÈCES SE DÉDUISENT DES MURS : une teinte à peine, et la
                  surface nette au sol, qui suit le mur qu'on déplace. */}
              {coucheVue('pieces') && piecesFermees.map((pc, i) => (
                <g key={`piece-${i}`} className="pointer-events-none">
                  <polygon
                    points={pc.contour.map((p) => p.join(',')).join(' ')}
                    className="fill-accent-doux" fillOpacity={0.35}
                  />
                  <text
                    x={pc.centre.x} y={pc.centre.y} textAnchor="middle" dominantBaseline="middle"
                    fontSize={auPixel(10)} className="fill-encre-3"
                  >
                    {`${pc.aire.toFixed(1).replace('.', ',')} m²`}
                  </text>
                  {/* Une pièce droite dit aussi ses cotes intérieures, nettes. */}
                  {pc.cotes && (
                    <text
                      x={pc.centre.x} y={pc.centre.y + auPixel(12)} textAnchor="middle"
                      dominantBaseline="middle" fontSize={auPixel(9)} className="fill-encre-3"
                    >
                      {`${virgule(pc.cotes.l, 2)} × ${virgule(pc.cotes.h, 2)} m`}
                    </text>
                  )}
                </g>
              ))}
              {coucheVue('zones') && zonesDessinees.map((z) => (
                <g key={z.id}>
                  <ZoneDessinee
                    zone={z} compte={comptes.get(z.id) || 0}
                    souligne={choixZones.includes(z.id)
                      || (z.id === zoneCiblee && (outil === 'zone' || outil === 'bloc'))}
                  />
                  {/* Le cadre d'une zone est tireté : sans calque, il faudrait
                      viser le trait. Les postes se dessinent après, donc ils
                      restent au-dessus et gardent leur clic. */}
                  <rect
                    x={z.x} y={z.y} width={z.l} height={z.h} fill="transparent"
                    className={outil === 'choisir' && couchePrise('zones') ? 'cursor-move' : 'pointer-events-none'}
                    onPointerDown={(e) => prendreZone(z, e)}
                  />
                  {((outil === 'choisir' && z.id === zoneChoisie)
                    || (outil === 'zone' && z.id === zoneCiblee)) && (
                    <Poignees forme={z} onPrendre={(cle, e) => prendrePoignee('zone', z.id, cle, e)} />
                  )}
                </g>
              ))}
              {/* LA SÉLECTION SE LIT À LA COULEUR, PAS À L'ÉPAISSEUR : le
                  trait a l'épaisseur réelle du mur (façade, cloison), et le
                  grossir pour dire « choisi » mentirait sur le plan. Tous les
                  murs d'un coup, soudés aux jonctions (`MursSoudes`). */}
              {coucheVue('murs') && (
                <MursSoudes
                  murs={mursVus} epaisseurs={epaisseurs} trait={traitMur}
                  classeDe={(i) => (choixMurs.includes(i) ? 'stroke-accent-vif' : 'stroke-encre-2')}
                />
              )}
              {coucheVue('murs') && mursVus.map((m, i) => (
                <g key={`mur-${i}`}>
                  {/* Un trait de 1,2 unité ne se clique pas : on double d'un
                      calque transparent large, le seul moyen de choisir un mur
                      sans bibliothèque de sélection. */}
                  <path
                    d={traitDe(m)} fill="none" strokeWidth={auPixel(12)} stroke="transparent"
                    className={outil === 'choisir' && couchePrise('murs') ? 'cursor-move' : 'pointer-events-none'}
                    onPointerDown={(e) => prendreMur(i, m, e)}
                  />
                  {/* Le mur choisi montre ses sommets : un tracé de travers se
                      reprend par son coin, il ne se refait pas. */}
                  {outil === 'choisir' && murChoisi === i && m.map((pt, j) => (
                    <circle
                      key={`sommet-${j}`} cx={pt[0]} cy={pt[1]} r={auPixel(5)}
                      className="fill-accent-vif stroke-fond cursor-pointer" strokeWidth={auPixel(1.2)}
                      onPointerDown={(e) => prendreSommet(i, j, e)}
                    />
                  ))}
                  {/* Au milieu de chaque segment, un carré : le prendre pousse
                      le côté entier, ses deux coins ensemble. SUR UN SEGMENT
                      COURT, les deux sommets le couvraient et il disparaissait
                      (il fallait zoomer) : il sort alors du mur, sur le côté,
                      relié à son milieu par un fil (`poigneeDeSegment`). */}
                  {outil === 'choisir' && murChoisi === i && m.slice(1).map((pt, j) => {
                    const pg = poigneeDeSegment(m[j], pt, auPixel(1));
                    if (!pg) return null;
                    return (
                      <g key={`segment-${j}`}>
                        {pg.deporte && (
                          <line
                            x1={pg.milieu[0]} y1={pg.milieu[1]} x2={pg.x} y2={pg.y}
                            strokeWidth={auPixel(1)} className="stroke-accent-vif pointer-events-none"
                          />
                        )}
                        <rect
                          x={pg.x - auPixel(4)} y={pg.y - auPixel(4)}
                          width={auPixel(8)} height={auPixel(8)} strokeWidth={auPixel(1.2)}
                          className="fill-fond stroke-accent-vif cursor-move"
                          onPointerDown={(e) => prendreSegment(i, j, e)}
                        />
                      </g>
                    );
                  })}
                  {/* Le segment en cours d'édition se distingue du reste du mur
                      par un pointillé clair, toujours sans surépaisseur. */}
                  {murChoisi === i && segmentChoisi >= 0 && m[segmentChoisi + 1] && (
                    <line
                      x1={m[segmentChoisi][0]} y1={m[segmentChoisi][1]}
                      x2={m[segmentChoisi + 1][0]} y2={m[segmentChoisi + 1][1]}
                      strokeWidth={auPixel(3.5)} strokeLinecap="round"
                      strokeDasharray={`${auPixel(6)} ${auPixel(4.5)}`}
                      className="stroke-accent pointer-events-none"
                    />
                  )}
                  {cotesVues && (
                    <CotesDeMur
                      points={m} souligne={choixMurs.includes(i)}
                      choisi={murChoisi === i ? segmentChoisi : -1}
                      onChoisir={outil === 'choisir' ? (index) => choisirCote(i, index) : undefined}
                    />
                  )}
                </g>
              ))}
              {coucheVue('murs') && portesVues.map((o, i) => (
                <g key={`porte-${i}`}>
                  <Ouverture
                    ouverture={o} choisi={choixPortes.includes(i)}
                    actif={outil === 'choisir' && couchePrise('murs')}
                    epaisseur={epaisseurSous(mursVus, epaisseurs, o)}
                    onPointerDown={(e) => prendrePorte(i, e)}
                  />
                  {outil === 'choisir' && porteChoisie === i && (
                    <BoutsDOuverture ouverture={o} onPrendre={(bout, e) => prendreBout(i, bout, e)} />
                  )}
                </g>
              ))}
              {/* LE MUR EN COURS A SA VRAIE ÉPAISSEUR, en pointillé, jusqu'au
                  curseur : on voit la bande qu'on pose avant de la poser. */}
              {mur && (mur.length > 1 || visee) && (
                <path
                  d={contourDeMur(visee ? [...mur, [visee.x, visee.y]] : mur, epaisseurMur)}
                  fillRule="evenodd" fillOpacity={0.5} vectorEffect="non-scaling-stroke"
                  strokeWidth={1.2} strokeDasharray="5 4"
                  className="fill-accent-doux stroke-accent-vif pointer-events-none"
                />
              )}
              {mur && mur.length > 1 && (
                <>
                  <path
                    d={traitDe(mur)} fill="none" strokeWidth={auPixel(1)}
                    strokeDasharray={`${auPixel(3)} ${auPixel(3)}`} className="stroke-accent pointer-events-none"
                  />
                  {cotesVues && <CotesDeMur points={mur} souligne />}
                </>
              )}
              {mur && (
                <g className="pointer-events-none">
                  {mur.map((pt, i) => (
                    <circle
                      key={`pose-${i}`} cx={pt[0]} cy={pt[1]}
                      r={auPixel(i === 0 ? 4.2 : 2.7)} className="fill-accent"
                    />
                  ))}
                </g>
              )}
              {visee && dernierPoint && (
                <g className="pointer-events-none">
                  <line
                    x1={dernierPoint[0]} y1={dernierPoint[1]} x2={visee.x} y2={visee.y}
                    strokeWidth={auPixel(1)} strokeDasharray={`${auPixel(3)} ${auPixel(3)}`}
                    className="stroke-accent-vif"
                  />
                  <text
                    x={(dernierPoint[0] + visee.x) / 2}
                    y={(dernierPoint[1] + visee.y) / 2 - auPixel(6.6)}
                    textAnchor="middle" fontSize={auPixel(10)} className="fill-accent-vif"
                  >
                    {enMetres(longueur(dernierPoint, visee))} · {Math.round(cap(dernierPoint, visee))}°
                  </text>
                </g>
              )}
              {visee && (
                <circle
                  cx={visee.x} cy={visee.y} r={auPixel(visee.accroche ? 5.4 : 2.7)}
                  className={visee.accroche ? 'fill-accent-vif' : 'fill-accent'}
                  fillOpacity={visee.accroche ? 1 : 0.6}
                />
              )}
              {/* L'aperçu de la porte visée : le mur accroché se voit AVANT le
                  clic, sinon on pose au jugé et on corrige après. */}
              {visee?.genre && (
                <text
                  x={visee.x + auPixel(7.2)} y={visee.y - auPixel(7.2)} fontSize={auPixel(8.4)}
                  className="fill-accent-vif pointer-events-none"
                >
                  {NOMS_ACCROCHE[visee.genre]}
                </text>
              )}
              {/* L'APERÇU DU BLOC sous le curseur, là où le clic le posera,
                  et le guide de ce qui l'aimante. */}
              {poseVue && (
                <g className="pointer-events-none">
                  {poseVue.formes.map((f, k) => (
                    <rect
                      key={`pose-${k}`} x={f.x} y={f.y} width={f.l} height={f.h}
                      transform={f.rot ? `rotate(${f.rot} ${f.x + f.l / 2} ${f.y + f.h / 2})` : undefined}
                      fillOpacity={0.35} vectorEffect="non-scaling-stroke" strokeWidth={1.2} strokeDasharray="4 3"
                      className="fill-accent-doux stroke-accent-vif"
                    />
                  ))}
                  {poseVue.guides.map((g) => (
                    <line
                      key={`guide-pose-${g.x1}-${g.y1}-${g.x2}-${g.y2}`}
                      x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
                      vectorEffect="non-scaling-stroke" strokeWidth={1}
                      strokeDasharray="4 3" className="stroke-accent-vif"
                    />
                  ))}
                </g>
              )}
              {viseePorte && (
                <g className="pointer-events-none" opacity="0.6">
                  <Ouverture ouverture={viseePorte} choisi actif={false} epaisseur={epaisseurSous(mursVus, epaisseurs, viseePorte)} />
                </g>
              )}
              {/* LE DÉCOR PASSE DESSOUS. Un canapé qui recouvrirait un bureau
                  cacherait ce qui se réserve au profit de ce qui décore. */}
              {/* Le sol d'abord : un local ou un tapis sous le mobilier qu'on y pose. */}
              {coucheVue('mobilier') && meublesVus
                .map((m, i) => [m, i])
                .sort(([a], [b]) => FORMES_AU_SOL.has(formeDe(b.k)) - FORMES_AU_SOL.has(formeDe(a.k)))
                .map(([m, i]) => (
                <g key={`meuble-${i}`}>
                  <Meuble
                    meuble={m}
                    choisi={choixMeubles.includes(i)}
                    actif={outil === 'choisir' && couchePrise('mobilier')}
                    onPointerDown={(e) => prendreMeuble(i, e)}
                  />
                  {outil === 'choisir' && meubleChoisi === i && (
                    <Poignees forme={m} onPrendre={(cle, e) => prendrePoignee('meuble', i, cle, e)} />
                  )}
                </g>
              ))}
              {coucheVue('postes') && sallesVues.map((s) => (
                <g key={s.id}>
                  <Salle
                    salle={s}
                    choisi={choixSalles.includes(s.id)}
                    actif={outil === 'choisir' && couchePrise('postes')}
                    onPointerDown={(e) => prendreSalle(s, e)}
                  />
                  {outil === 'choisir' && salleChoisie === s.id && (
                    <Poignees forme={s} onPrendre={(cle, e) => prendrePoignee('salle', s.id, cle, e)} />
                  )}
                </g>
              ))}
              {coucheVue('postes') && dessines.map((p) => (
                <g key={p.id}>
                  <Poste
                    poste={p}
                    membre={p.genre === 'attitre' ? parId.get(p.membre_id) : null}
                    choisi={choix.includes(p.id)}
                    actif={outil === 'choisir' && couchePrise('postes')}
                    onPointerDown={(e) => prendre(p, e)}
                    onKeyDown={(e) => auClavier(p, e)}
                  />
                  {outil === 'choisir' && posteSeul?.id === p.id && (
                    <Poignees forme={p} onPrendre={(cle, e) => prendrePoignee('poste', p.id, cle, e)} />
                  )}
                </g>
              ))}
              {calque?.devant && fondDessine}
              {lu && (
                <g className="pointer-events-none" aria-hidden="true">
                  {[...sallesVues, ...dessines].map((f) => {
                    const cx = f.x + f.l / 2;
                    const cy = f.y + f.h / 2;
                    let teinte = 'fill-accent';
                    let opacite = 0;
                    let mot = '';
                    if (lu.regard === 'jour') {
                      const e = lu.etats.get(f.id);
                      if (!e) return null;
                      [teinte, opacite] = TEINTE_JOUR[e.etat] || TEINTE_JOUR.libre;
                      if (e.n > 1) mot = String(e.n);
                      else if (e.membre && e.etat !== 'libere') mot = initiales(e.membre);
                      else if (e.libelle) mot = e.libelle.slice(0, 10);
                    } else {
                      const t = lu.taux.get(f.id);
                      if (!t) return null;
                      teinte = t.jours ? 'fill-accent' : 'fill-alerte';
                      opacite = t.jours ? OPACITE_PALIER[palier(t.taux)] : 0.3;
                      mot = `${Math.round(t.taux * 100)} %`;
                    }
                    return (
                      <g key={`lu-${f.id}`}>
                        <rect
                          x={f.x} y={f.y} width={f.l} height={f.h} rx={1}
                          transform={`rotate(${f.rot || 0} ${cx} ${cy})`}
                          className={teinte} fillOpacity={opacite}
                        />
                        {mot && (
                          <text
                            x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                            fontSize={Math.max(auPixel(9), Math.min(f.l, f.h) * 0.32)}
                            strokeWidth={auPixel(3)} paintOrder="stroke"
                            className="fill-encre stroke-surface font-semibold"
                          >
                            {mot}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
              {regle && longueur(regle.a, regle.b) > 0 && (
                <g className="pointer-events-none">
                  <line
                    x1={regle.a.x} y1={regle.a.y} x2={regle.b.x} y2={regle.b.y}
                    strokeWidth={auPixel(1.5)} className="stroke-accent-vif"
                  />
                  {[regle.a, regle.b].map((q, i) => (
                    <circle key={i} cx={q.x} cy={q.y} r={auPixel(3.5)} className="fill-accent-vif" />
                  ))}
                  <text
                    x={(regle.a.x + regle.b.x) / 2}
                    y={(regle.a.y + regle.b.y) / 2 - auPixel(8)}
                    textAnchor="middle" fontSize={auPixel(12)}
                    strokeWidth={auPixel(3)} paintOrder="stroke"
                    className="fill-accent-vif stroke-surface font-semibold"
                  >
                    {enMetres(longueur(regle.a, regle.b))}
                    {' · '}Δx {enMetres(Math.abs(regle.b.x - regle.a.x))}
                    {' · '}Δy {enMetres(Math.abs(regle.b.y - regle.a.y))}
                  </text>
                </g>
              )}
              {poly && poly.points.length > 0 && (() => {
                const vus = poly.ferme || !poly.vise ? poly.points : [...poly.points, poly.vise];
                const m = mesureSurface(poly.ferme ? poly.points : vus, poly.ferme);
                const n = vus.length;
                const centre = {
                  x: vus.reduce((t, q) => t + q.x, 0) / n,
                  y: vus.reduce((t, q) => t + q.y, 0) / n,
                };
                return (
                  <g className="pointer-events-none">
                    <polygon
                      points={vus.map((q) => `${q.x},${q.y}`).join(' ')}
                      fillOpacity={poly.ferme ? 0.18 : 0.08} strokeWidth={auPixel(1.5)}
                      strokeDasharray={poly.ferme ? undefined : `${auPixel(5)} ${auPixel(3)}`}
                      className="fill-accent stroke-accent-vif"
                    />
                    {poly.points.map((q, i) => (
                      <circle
                        key={i} cx={q.x} cy={q.y} r={auPixel(i === 0 && !poly.ferme ? 5 : 3.5)}
                        className="fill-accent-vif"
                      />
                    ))}
                    <text
                      x={centre.x} y={centre.y} textAnchor="middle" fontSize={auPixel(12)}
                      strokeWidth={auPixel(3)} paintOrder="stroke"
                      className="fill-accent-vif stroke-surface font-semibold"
                    >
                      {poly.ferme ? `${virgule(m.aire)} m² · ` : ''}
                      {poly.ferme ? 'périmètre ' : ''}{enMetres(m.perimetre)}
                    </text>
                  </g>
                );
              })()}
              {calqueVu && calqueChoisi && outil === 'choisir' && (
                <g>
                  <rect
                    x={calqueVu.x} y={calqueVu.y} width={calqueVu.l} height={calqueVu.h}
                    fill="none" strokeWidth={auPixel(1.2)}
                    strokeDasharray={`${auPixel(6)} ${auPixel(4.5)}`}
                    className="stroke-accent-vif pointer-events-none"
                  />
                  <Poignees
                    forme={calqueVu}
                    onPrendre={(cle, e) => prendrePoignee('calque', '', cle, e)}
                  />
                </g>
              )}
              {/* LES QUATRE COINS FONT TOURNER LE LOT. On ne vise pas un bouton
                  de barre pour redresser un mur : on prend un angle et on tire,
                  comme dans tout éditeur de plan. Le curseur le dit d'avance. */}
              {boiteChoisie && !glisse && !retouche && (
                <g>
                  {[
                    [boiteChoisie.x, boiteChoisie.y, -1, -1],
                    [boiteChoisie.x + boiteChoisie.l, boiteChoisie.y, 1, -1],
                    [boiteChoisie.x, boiteChoisie.y + boiteChoisie.h, -1, 1],
                    [boiteChoisie.x + boiteChoisie.l, boiteChoisie.y + boiteChoisie.h, 1, 1],
                  ].map(([x, y, sx, sy]) => (
                    <circle
                      key={`tour-${sx}-${sy}`}
                      cx={x + sx * auPixel(9)} cy={y + sy * auPixel(9)} r={auPixel(6)}
                      strokeWidth={auPixel(1.5)}
                      className="fill-fond stroke-accent-vif cursor-rotation"
                      onPointerDown={prendreRotation}
                    />
                  ))}
                  {rotation && (
                    <>
                      <rect
                        x={boiteChoisie.x} y={boiteChoisie.y}
                        width={boiteChoisie.l} height={boiteChoisie.h}
                        fill="none" strokeWidth={auPixel(1.2)}
                        strokeDasharray={`${auPixel(4.5)} ${auPixel(4.5)}`}
                        className="stroke-accent pointer-events-none"
                      />
                      <text
                        x={boiteChoisie.cx} y={boiteChoisie.y - auPixel(9)} textAnchor="middle"
                        fontSize={auPixel(10)} className="fill-accent-vif pointer-events-none"
                      >
                        {rotation.angle}°
                      </text>
                    </>
                  )}
                </g>
              )}
              {(retouche?.colle || glisse?.colle) && (
                <circle
                  cx={(retouche?.colle || glisse.colle).x} cy={(retouche?.colle || glisse.colle).y}
                  r={auPixel(5.4)} className="fill-accent-vif pointer-events-none"
                />
              )}
              {glisse?.guides?.map((g) => (
                <line
                  key={`${g.x1}-${g.y1}-${g.x2}-${g.y2}`}
                  x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
                  vectorEffect="non-scaling-stroke" strokeWidth={1}
                  strokeDasharray="4 3" className="stroke-accent-vif pointer-events-none"
                />
              ))}
              {apercu && (
                <g className="pointer-events-none">
                  <rect
                    x={apercu.x} y={apercu.y} width={apercu.l} height={apercu.h} rx="1.5"
                    className="fill-accent-doux stroke-accent-vif"
                    fillOpacity={trace.outil === 'choix' ? 0.15 : 0.3}
                    strokeWidth={auPixel(1.8)} strokeDasharray={`${auPixel(6)} ${auPixel(4.5)}`}
                  />
                  {trace.outil === 'piece' && (
                    <path
                      d={contourDeMur(piece(apercu), epaisseurMur)} fillRule="evenodd" fillOpacity={0.6}
                      vectorEffect="non-scaling-stroke" strokeWidth={1.2} strokeDasharray="5 4"
                      className="fill-accent-doux stroke-accent-vif"
                    />
                  )}
                  <text
                    x={apercu.x + apercu.l / 2} y={apercu.y + apercu.h / 2 + auPixel(3.6)}
                    textAnchor="middle" fontSize={auPixel(10)} className="fill-accent-vif"
                  >
                    {trace.outil === 'choix'
                      ? `${prisDansLaBande} élément${prisDansLaBande > 1 ? 's' : ''}`
                      : `${enMetres(apercu.l)} × ${enMetres(apercu.h)} · ${aire(piece(apercu) || []).toFixed(1).replace('.', ',')} m²`}
                  </text>
                </g>
              )}
            </svg>
          </EchelleEcran>

          {/* LES OUTILS FLOTTENT SUR LA FEUILLE, comme dans Rayon : trois bandes
              au-dessus du plan lui volaient un tiers de l'écran. En bas, la
              barre des outils ; au-dessus d'elle, les réglages de l'outil pris ;
              à droite, ce qui est choisi. Le mode d'emploi d'un outil vit dans
              la bulle de son bouton : affiché en permanence, il cachait le
              dessin. Seul le mot d'une échelle posée s'affiche, le temps de
              le lire. Le conteneur du bas laisse passer le pointeur, ses
              panneaux non. */}
          {motEchelle && (
            <p className="absolute top-3 left-3 z-20 hidden lg:block max-w-md rounded-controle border border-ligne bg-surface shadow-flottant px-2.5 py-1.5 text-micro text-encre-3">
              {motEchelle}
            </p>
          )}

          {/* LES COUCHES : masquer, ou laisser voir sans laisser prendre. Et
              les métrés du plan, qui suivent le mur qu'on tire. */}
          {/* LA LÉGENDE DU REGARD, à la place des panneaux : elle dit ce que
              les aplats veulent dire, et les chiffres qu'on vient chercher. */}
          {regard !== 'dessin' && !panneau && (
            <div
              role="status" aria-label="Légende du plan"
              className="absolute top-14 left-3 z-20 hidden lg:block w-72 rounded-surface border border-ligne bg-surface shadow-flottant p-3"
            >
              {!lu ? (
                <p className="text-micro text-encre-3">
                  {vecuQ.isError ? omErreurMessage(vecuQ.error) : 'Lecture des réservations…'}
                </p>
              ) : lu.regard === 'jour' ? (
                <>
                  <p className="text-micro text-encre mb-2">
                    Aujourd’hui{lu.jour.ouvre ? '' : ` — ${lu.jour.ferie || 'jour fermé'}`}
                  </p>
                  <ul className="space-y-1">
                    {Object.entries(TEINTE_JOUR).map(([cle, [teinte, opacite, mot]]) => (
                      <li key={cle} className="flex items-center gap-2 text-micro text-encre-2">
                        <svg viewBox="0 0 10 10" className="h-3 w-3 shrink-0" aria-hidden="true">
                          <rect width="10" height="10" rx="1.5" className={teinte} fillOpacity={opacite} />
                        </svg>
                        {mot}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-micro text-encre tabular-nums">
                    {lu.resume.pris} pris · {lu.resume.libres} libres · {lu.resume.liberes} libérés
                  </p>
                </>
              ) : (
                <>
                  <p className="text-micro text-encre mb-2">
                    Occupation · {lu.jours.length} jours ouvrés
                  </p>
                  <ul className="space-y-1">
                    {PALIERS.map((pa, i) => (
                      <li key={pa.min} className="flex items-center gap-2 text-micro text-encre-2">
                        <svg viewBox="0 0 10 10" className="h-3 w-3 shrink-0" aria-hidden="true">
                          <rect width="10" height="10" rx="1.5" className="fill-accent" fillOpacity={OPACITE_PALIER[i]} />
                        </svg>
                        {pa.label}
                      </li>
                    ))}
                    <li className="flex items-center gap-2 text-micro text-encre-2">
                      <svg viewBox="0 0 10 10" className="h-3 w-3 shrink-0" aria-hidden="true">
                        <rect width="10" height="10" rx="1.5" className="fill-alerte" fillOpacity={0.3} />
                      </svg>
                      jamais pris
                    </li>
                  </ul>
                  <p className="mt-2 text-micro text-encre tabular-nums">
                    {lu.resume.moyenne === null
                      ? 'Aucun poste offert sur la période.'
                      : `${Math.round(lu.resume.moyenne * 100)} % en moyenne · ${lu.resume.jamais} jamais pris · ${lu.resume.pleins} pleins`}
                  </p>
                  {lu.resume.jamais > 0 && (
                    <p className="mt-1 text-micro text-encre-3">
                      Un poste jamais pris en quatre semaines est un poste à rendre, ou à déplacer.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {panneau === 'couches' && (
            <div
              role="dialog" aria-label="Couches et métrés"
              className="absolute top-14 left-3 z-20 w-72 rounded-surface border border-ligne bg-surface shadow-flottant p-3"
            >
              <p className="text-micro text-encre mb-2">Couches</p>
              <ul className="space-y-1">
                {COUCHES.map((c) => {
                  const etat = couches[c.cle];
                  return (
                    <li key={c.cle} className="flex items-center gap-1">
                      <span className={`flex-1 text-micro ${etat.vu ? 'text-encre-2' : 'text-encre-3 line-through'}`}>
                        {c.nom}
                      </span>
                      <Bouton
                        variante="discret" taille="sm" iconeSeule icone={etat.vu ? Eye : EyeOff}
                        aria-label={`${etat.vu ? 'Masquer' : 'Montrer'} : ${c.nom}`}
                        aria-pressed={!etat.vu}
                        onClick={() => changerCouche(c.cle, 'vu')}
                      />
                      <Bouton
                        variante={etat.verrou ? 'primaire' : 'discret'} taille="sm" iconeSeule
                        icone={etat.verrou ? Lock : LockOpen}
                        aria-label={`${etat.verrou ? 'Déverrouiller' : 'Verrouiller'} : ${c.nom}`}
                        aria-pressed={etat.verrou}
                        onClick={() => changerCouche(c.cle, 'verrou')}
                      />
                    </li>
                  );
                })}
              </ul>
              <p className="text-micro text-encre mt-3 mb-1">Métrés</p>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-micro text-encre-2">
                <dt>Pièces fermées</dt>
                <dd className="text-right tabular-nums">
                  {piecesFermees.length} · {virgule(metresPlan.surface)} m²
                </dd>
                <dt>Murs</dt>
                <dd className="text-right tabular-nums">{virgule(metresPlan.lineaire)} m</dd>
                <dt>Par poste</dt>
                <dd className="text-right tabular-nums">
                  {metresPlan.parPoste ? `${virgule(metresPlan.parPoste)} m²` : '—'}
                </dd>
              </dl>
            </div>
          )}
          {panneau === 'chercher' && (
            <div
              role="dialog" aria-label="Chercher sur le plan"
              className="absolute top-14 left-3 z-20 w-72 rounded-surface border border-ligne bg-surface shadow-flottant p-3"
            >
              <input
                autoFocus type="search" value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && trouves[0]) { e.preventDefault(); allerA(trouves[0]); }
                  if (e.key === 'Escape') setPanneau(null);
                }}
                placeholder="Une personne, un poste, une salle…"
                aria-label="Chercher sur le plan"
                className={`${CHAMP} w-full`}
              />
              {recherche.trim() && (
                trouves.length ? (
                  <ul className="mt-2 space-y-0.5">
                    {trouves.map((r) => (
                      <li key={`${r.genre}-${r.id}`}>
                        <button
                          type="button" onClick={() => allerA(r)}
                          className="w-full text-left rounded-controle px-2 py-1 hover:bg-surface-2 focus:bg-surface-2 focus:outline-none"
                        >
                          <span className="text-micro text-encre">{r.libelle || '—'}</span>
                          <span className="ml-1.5 text-micro text-encre-3">
                            {r.detail || (r.genre === 'poste' ? 'poste' : r.genre)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-micro text-encre-3">Rien de posé sur ce plan ne répond à « {recherche.trim()} ».</p>
                )
              )}
            </div>
          )}
          {panneau === 'imprimer' && (
            <div
              role="dialog" aria-label="Imprimer à l’échelle"
              className="absolute top-14 left-3 z-20 w-72 rounded-surface border border-ligne bg-surface shadow-flottant p-3"
            >
              <PlanImpression
                svgRef={svgRef} boite={boitePapier} nomPlan={plan?.nom}
                avantImpression={preparerPapier}
              />
            </div>
          )}
          {/* LA MINI-CARTE N'EXISTE QU'AU ZOOM : à ×1, l'écran est déjà la feuille. */}
          {vuePlan.zoom > 1 && (
            <div className="absolute bottom-16 right-3 z-20 hidden lg:block rounded-surface border border-ligne bg-surface shadow-flottant p-1">
              <PlanMiniCarte
                plan={cadrePlan} vue={vuePlan} murs={mursVus}
                boites={[...sallesVues, ...dessines, ...meubles]}
                onCentrer={setCentreVue}
              />
            </div>
          )}
          {panneau === 'aide' && (
            <div
              role="dialog" aria-label="Raccourcis clavier"
              className="absolute top-14 left-3 z-20 w-80 max-w-[calc(100%-1.5rem)] rounded-surface border border-ligne bg-surface shadow-flottant p-3"
            >
              <p className="text-micro text-encre mb-2">Raccourcis</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-micro">
                {RACCOURCIS.map(([touche, effet]) => (
                  <React.Fragment key={touche}>
                    <dt className="text-encre whitespace-nowrap">{touche}</dt>
                    <dd className="text-encre-3">{effet}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}

          {/* LE STYLE ACTIF : l'outil mur ou pièce en main et rien de choisi,
              le panneau de droite dit avec quoi on trace — comme Rayon. */}
          {!elu && (outil === 'mur' || outil === 'piece') && (
            <div className="absolute top-3 right-3 z-20 hidden lg:block w-72 rounded-surface border border-ligne bg-surface shadow-flottant p-3">
              <p className="text-micro text-encre mb-2">Mur</p>
              <StyleDeMur
                epaisseur={epaisseurMur} trait={traitMur}
                onEpaisseur={epaissir} onTrait={plumer}
              />
            </div>
          )}

          {/* L'inspecteur : un seul endroit, quelle que soit la nature de ce
              qui est choisi. Nom, taille, angle, épaisseur, suppression. */}
          {elu && (
            <div className="absolute top-3 right-3 z-20 hidden lg:block w-80 max-h-[calc(100%-5.5rem)] overflow-y-auto rounded-surface border border-ligne bg-surface shadow-flottant p-3">
              <div className="flex items-end gap-2 flex-wrap">
                <Etiquette className="inline-flex items-center gap-1">
                  <elu.icone className="w-3 h-3" aria-hidden="true" />
                  {elu.titre}
                </Etiquette>

                {elu.nom && (
                  <form className="flex items-end gap-1.5" onSubmit={renommer}>
                    <input
                      value={renommage}
                      onChange={(e) => setRenommage(e.target.value)}
                      aria-label={`Nouveau nom de ${elu.titre}`}
                      className={`${CHAMP} max-w-[170px]`}
                    />
                    <Bouton
                      type="submit" variante="discret" taille="md"
                      disabled={ecrireRessource.isPending || ecrireZone.isPending || !nomNet(renommage)}
                    >
                      Renommer
                    </Bouton>
                  </form>
                )}

                {/* La cote se retape SUR le mur, dans l'étiquette du plan : la
                    longueur se lit et se corrige au même endroit. La barre ne
                    garde que le reste. */}
                {elu.genre === 'mur' && !elu.segment && (
                  <span className="text-micro text-encre-3 h-9 inline-flex items-center">
                    Cliquez un segment du mur, ou sa cote, pour la retaper.
                  </span>
                )}

                {elu.taille && (
                  <>
                    <ChampNombre
                      label="Largeur" unite="m" valeur={elu.forme.l / 10}
                      min={COTE.mini} max={COTE.maxi} pas={0.1}
                      onChange={(v) => changerCote('l', v)}
                    />
                    <ChampNombre
                      label="Profondeur" unite="m" valeur={elu.forme.h / 10}
                      min={COTE.mini} max={COTE.maxi} pas={0.1}
                      onChange={(v) => changerCote('h', v)}
                    />
                  </>
                )}

                {elu.angle && (
                  <>
                    <Bouton
                      variante="discret" iconeSeule icone={RotateCcw} taille="md"
                      aria-label="Pivoter d’un quart de tour à gauche"
                      onClick={() => tourner(-90)}
                    />
                    <Bouton
                      variante="discret" iconeSeule icone={RotateCw} taille="md"
                      aria-label="Pivoter d’un quart de tour à droite"
                      onClick={() => tourner(90)}
                    />
                    {elu.forme && (elu.genre === 'poste' || elu.genre === 'salle') && (
                      <ChampNombre
                        label="Angle" unite="°" valeur={Number(elu.forme.rot) || 0}
                        min={0} max={355} pas={5}
                        onChange={(v) => changerAngle(Math.round(v))}
                      />
                    )}
                  </>
                )}

                <Bouton
                  variante="discret" taille="md" icone={Copy}
                  aria-label="Copier la sélection"
                  onClick={copier}
                >
                  Copier
                </Bouton>
                {presse && (
                  <Bouton
                    variante="discret" taille="md" icone={ClipboardPaste}
                    aria-label="Coller la copie"
                    onClick={coller}
                  >
                    Coller
                  </Bouton>
                )}
                <Bouton
                  variante="discret" taille="md" icone={CopyPlus}
                  aria-label="Dupliquer la sélection (Ctrl+D)"
                  onClick={dupliquer}
                >
                  Dupliquer
                </Bouton>
                <span className="inline-flex items-center gap-1">
                  <ChampNombre
                    label="Réseau" unite="×" valeur={enReseau.n} min={1} max={50} pas={1}
                    onChange={(v) => setEnReseau((r) => ({ ...r, n: Math.round(v) || 1 }))}
                  />
                  <select
                    value={enReseau.sens}
                    onChange={(e) => setEnReseau((r) => ({ ...r, sens: e.target.value }))}
                    aria-label="Sens du réseau"
                    className={CHAMP}
                  >
                    <option value="x">→</option>
                    <option value="y">↓</option>
                  </select>
                  <input
                    value={enReseau.pas} inputMode="decimal" placeholder="pas auto"
                    onChange={(e) => setEnReseau((r) => ({ ...r, pas: e.target.value }))}
                    aria-label="Pas du réseau, en mètres (vide : copies bord à bord)"
                    className={`${CHAMP} w-20`}
                  />
                  <Bouton variante="discret" taille="md" onClick={poserReseau}>Poser</Bouton>
                </span>
                {totalChoisi > 1 && (
                  <span className="inline-flex items-center" role="group" aria-label="Aligner et répartir">
                    {[
                      ['gauche', AlignStartVertical, 'Aligner à gauche'],
                      ['centreX', AlignCenterVertical, 'Centrer horizontalement'],
                      ['droite', AlignEndVertical, 'Aligner à droite'],
                      ['haut', AlignStartHorizontal, 'Aligner en haut'],
                      ['centreY', AlignCenterHorizontal, 'Centrer verticalement'],
                      ['bas', AlignEndHorizontal, 'Aligner en bas'],
                    ].map(([mode, Icone, nom]) => (
                      <Bouton
                        key={mode} variante="discret" iconeSeule icone={Icone} taille="md"
                        aria-label={nom} onClick={() => ranger((b) => alignerBoites(b, mode))}
                      />
                    ))}
                    {totalChoisi > 2 && (
                      <>
                        <Bouton
                          variante="discret" iconeSeule icone={AlignHorizontalDistributeCenter} taille="md"
                          aria-label="Répartir horizontalement, vides égaux"
                          onClick={() => ranger((b) => repartirBoites(b, 'x'))}
                        />
                        <Bouton
                          variante="discret" iconeSeule icone={AlignVerticalDistributeCenter} taille="md"
                          aria-label="Répartir verticalement, vides égaux"
                          onClick={() => ranger((b) => repartirBoites(b, 'y'))}
                        />
                      </>
                    )}
                  </span>
                )}

                {elu.genre === 'salle' && (
                  <ChampNombre
                    label="Capacité" unite="pers." valeur={Number(elu.forme.capacite) || 1}
                    min={1} max={99} pas={1}
                    onChange={(v) => ecrireRessource.mutate({
                      id: elu.forme.id, capacite: Math.min(99, Math.max(1, Math.round(v) || 1)),
                    })}
                  />
                )}

                {elu.genre === 'porte' && (
                  <>
                    <label className="text-micro text-encre-2">
                      Type
                      <select
                        value={elu.forme.k}
                        onChange={(e) => changerPorte({ k: e.target.value })}
                        className={`${CHAMP} ml-2`}
                        aria-label="Type de cette ouverture"
                      >
                        {TYPES_OUVERTURE.map((t) => <option key={t.cle} value={t.cle}>{t.nom}</option>)}
                      </select>
                    </label>
                    <ChampNombre
                      label="Largeur" unite="m" valeur={elu.forme.l / 10}
                      min={LARGEUR.mini / 10} max={LARGEUR.maxi / 10} pas={0.1}
                      onChange={(v) => changerPorte({ l: Math.round(v * 10) })}
                    />
                    <Bouton
                      variante="discret" taille="md" icone={FlipHorizontal2}
                      onClick={() => retournerPorte('cote')}
                    >
                      Autre côté du mur
                    </Bouton>
                    <Bouton
                      variante="discret" taille="md" icone={FlipVertical2}
                      onClick={() => retournerPorte('charniere')}
                    >
                      Autre gond
                    </Bouton>
                    <span className="text-micro text-encre-3 h-9 inline-flex items-center">
                      Cap {Math.round(elu.forme.a)}° — celui du mur.
                    </span>
                  </>
                )}

                {(elu.genre === 'poste' || elu.genre === 'postes') && GENRES_LISTE.map((g) => (
                  <Bouton
                    key={g.cle} variante="discret" taille="md"
                    // Dix postes attitrés à la même personne n'existent pas : la base
                    // refuse (`nombre_invalide`), le bouton ne le propose donc pas.
                    disabled={genrer.isPending || (g.cle === 'attitre' && choix.length > 1)}
                    onClick={() => changerGenre(g.cle)}
                    icone={posteSeul?.genre === g.cle ? Check : undefined}
                  >
                    {g.label}
                  </Bouton>
                ))}
                {posteSeul?.genre === 'attitre' && (
                  <select
                    value={posteSeul.membre_id || ''}
                    onChange={(e) => genrer.mutate({ ids: [posteSeul.id], genre: 'attitre', membreId: e.target.value })}
                    className={CHAMP}
                    aria-label={`Titulaire du poste ${posteSeul.nom}`}
                  >
                    {membres.map((m) => <option key={m.id} value={m.id}>{m.prenom} {m.nom}</option>)}
                  </select>
                )}

                {choixMurs.length > 0 && (
                  <div className="basis-full">
                    <StyleDeMur
                      epaisseur={epaisseurCommune(epaisseurs, choixMurs)} trait={traitMur}
                      onEpaisseur={epaissir} onTrait={plumer}
                      disabled={patcherPlan.isPending}
                    />
                    {/* Tous les murs de la même épaisseur d'un clic : on règle
                        les cloisons d'un plan sans les viser une à une. */}
                    <Bouton
                      variante="discret" taille="md" icone={Layers}
                      onClick={() => {
                        const ep = epaisseurDe(epaisseurs, choixMurs[0]);
                        poserSelection({ murs: mursVus.map((_, i) => i).filter((i) => epaisseurDe(epaisseurs, i) === ep) });
                      }}
                    >
                      Tous les murs de cette épaisseur
                    </Bouton>
                  </div>
                )}

                <Bouton
                  variante="discret" taille="md" icone={Trash2}
                  // La base refuse déjà un poste réservé ; le dire avant évite
                  // d'envoyer un geste dont on connaît le refus.
                  disabled={ecrireRessource.isPending || (elu.genre === 'poste' || elu.genre === 'postes' ? occupe : false)}
                  title={occupe ? 'Ce poste porte des réservations à venir' : 'Suppr'}
                  onClick={supprimer}
                >
                  Supprimer
                </Bouton>
              </div>
            </div>
          )}

          <div className="absolute inset-x-3 bottom-3 z-20 hidden lg:flex flex-col items-center gap-2 pointer-events-none">
          {/* LA BIBLIOTHÈQUE DE BLOCS. Un plan se dessine en reconnaissant des
              meubles, pas en tapant des millimètres : chaque vignette porte son
              nom et sa mesure, et se pose d'un clic à l'échelle du plan. */}
          {outil === 'bloc' && (
            <div className="pointer-events-auto max-w-full rounded-surface border border-ligne bg-surface shadow-flottant p-2">
              <div className="flex items-center gap-1 flex-wrap">
                {RAYONS.map((r) => (
                  <Bouton
                    key={r.cle} taille="md"
                    variante={r.cle === rayon ? 'primaire' : 'discret'}
                    onClick={() => setRayon(r.cle)}
                  >
                    {r.nom}
                  </Bouton>
                ))}
              </div>
              <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {blocsDuRayon(rayon).map((b) => {
                  const enc = encombrement(b);
                  const cote = Math.max(enc.l, enc.h) || 1;
                  const pris = b.cle === blocCle;
                  return (
                    <li key={b.cle}>
                      <button
                        type="button"
                        onClick={() => setBlocCle(b.cle)}
                        aria-pressed={pris}
                        className={`w-28 shrink-0 p-2 border text-left bg-fond rounded-controle ${pris ? 'border-accent-vif' : 'border-ligne'}`}
                      >
                        <svg viewBox="0 0 40 24" className="w-full h-10" aria-hidden="true">
                          {/* LA VIGNETTE MONTRE CE QU'ON VA POSER : une table ronde
                              s'y dessine ronde, sinon on choisit un mot, pas un
                              meuble. La teinte dit la famille — une salle se
                              réserve, un canapé décore. */}
                          {b.famille === 'meuble' || b.famille === 'salle' ? (
                            <g transform={`translate(${20 - (enc.l * 10) / cote} ${12 - (enc.h * 10) / cote}) scale(${20 / cote})`}>
                              {b.famille === 'meuble' ? (
                                <Meuble meuble={{ k: b.cle, n: '', x: 0, y: 0, l: b.l, h: b.h, rot: 0 }} />
                              ) : (
                                <Salle salle={{ nom: b.nom, capacite: b.capacite, x: 0, y: 0, l: b.l, h: b.h }} sansNom />
                              )}
                            </g>
                          ) : b.forme === 'rond' ? (
                            <ellipse
                              cx="20" cy="12"
                              rx={(enc.l / cote) * 18} ry={(enc.h / cote) * 10}
                              className={TEINTE_BLOC[b.famille] || TEINTE_BLOC.meuble}
                              strokeWidth="1"
                            />
                          ) : (
                            <rect
                              x={20 - (enc.l / cote) * 18} y={12 - (enc.h / cote) * 10}
                              width={(enc.l / cote) * 36} height={(enc.h / cote) * 20}
                              rx={b.forme === 'arrondi' ? 5 : 1}
                              className={TEINTE_BLOC[b.famille] || TEINTE_BLOC.meuble}
                              strokeWidth="1"
                            />
                          )}
                        </svg>
                        <span className="block text-micro text-encre leading-tight">{b.nom}</span>
                        {/* LA MESURE DU LOT, PAS CELLE D'UN PLATEAU : un bench de six
                            annonce ses 5 m de long, sinon on croit poser 1,40 m. */}
                        <span className="block text-micro text-encre-3">
                          {(b.postes || 1) > 1 ? `${b.postes} postes · ${tailleDite(enc)}` : tailleDite(b)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
            {outil !== 'choisir' && (
              <div className="pointer-events-auto max-w-full flex items-end justify-center gap-2 flex-wrap rounded-surface border border-ligne bg-surface shadow-flottant p-2">
                {(outil === 'bloc' || outil === 'zone') && zonesActives.length > 0 && (
                  <label className="text-micro text-encre-2">
                    Zone
                    <select
                      value={outil === 'bloc' ? zoneCible : zoneCiblee}
                      onChange={(e) => setZoneCible(e.target.value)}
                      className={`${CHAMP} ml-2`}
                      aria-label="Zone visée"
                    >
                      {/* Poser un bureau ne demande pas de zone : le plan porte les
                          postes, la zone n'est qu'un rectangle tracé par-dessus. */}
                      {outil === 'bloc' && <option value="">Sans zone</option>}
                      {zonesActives.map((z) => <option key={z.id} value={z.id}>{z.nom}</option>)}
                    </select>
                  </label>
                )}
                {outil === 'bloc' && (
                  <span className="text-micro text-encre-3 h-9 inline-flex items-center">
                    {blocDe(blocCle).nom} · {tailleDite(blocDe(blocCle))}
                  </span>
                )}
                {outil === 'salle' && (
                  <>
                    <input
                      value={nomSalle}
                      onChange={(e) => setNomSalle(e.target.value)}
                      placeholder="Nom de la salle"
                      aria-label="Nom de la salle de réunion"
                      className={`${CHAMP} max-w-[180px]`}
                    />
                    <ChampNombre
                      label="Capacité" unite="pers." valeur={capaciteSalle} min={1} max={99} pas={1}
                      onChange={(v) => setCapaciteSalle(Math.min(99, Math.max(1, Math.round(v) || 1)))}
                    />
                  </>
                )}
                {(outil === 'mur' || outil === 'piece') && (
                  <>
                    <label className="text-micro text-encre-2">
                      Angles
                      <select
                        value={grain}
                        onChange={(e) => setGrain(Number(e.target.value))}
                        className={`${CHAMP} ml-2`}
                        aria-label="Contrainte d’angle du tracé"
                      >
                        {ANGLES.map((a) => (
                          <option key={a} value={a}>{a ? `Multiples de ${a}°` : 'Libre'}</option>
                        ))}
                      </select>
                    </label>
                    <Bouton
                      variante={cotesVues ? 'primaire' : 'discret'} taille="md" icone={Ruler}
                      onClick={() => setCotesVues(!cotesVues)}
                    >
                      Cotes
                    </Bouton>
                  </>
                )}
                {outil === 'mur' && (
                  <form className="flex items-end gap-1.5" onSubmit={poserMesure}>
                    <label className="text-micro text-encre-2">
                      Longueur
                      <input
                        value={saisieL}
                        onChange={(e) => setSaisieL(e.target.value)}
                        placeholder="6,40"
                        inputMode="decimal"
                        aria-label="Longueur du mur en mètres"
                        className={`${CHAMP} ml-2 w-20`}
                      />
                    </label>
                    <label className="text-micro text-encre-2">
                      Cap
                      <select
                        value={saisieA}
                        onChange={(e) => setSaisieA(e.target.value)}
                        className={`${CHAMP} ml-2`}
                        aria-label="Cap du mur en degrés"
                      >
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                          <option key={a} value={String(a)}>{a}°</option>
                        ))}
                      </select>
                    </label>
                    <Bouton type="submit" variante="discret" taille="md" disabled={!dernierPoint || !depuisMetres(saisieL)}>
                      Poser
                    </Bouton>
                  </form>
                )}
                {outil === 'mur' && mur?.length >= 2 && (
                  <Bouton variante="discret" taille="md" icone={Check} onClick={() => fermerMur()}>
                    Terminer ce mur
                  </Bouton>
                )}
                {outil === 'mur' && mur && (
                  <Bouton
                    variante="discret" taille="md" icone={Undo2}
                    onClick={() => setMur(mur.length > 1 ? mur.slice(0, -1) : null)}
                  >
                    Défaire le point
                  </Bouton>
                )}
                {outil === 'zone' && (
                  <Bouton
                    variante="discret" taille="md" icone={Square}
                    disabled={ecrireZone.isPending}
                    onClick={() => nommerZone((zr) => zr?.id && setZoneCible(zr.id))}
                  >
                    Nouvelle zone
                  </Bouton>
                )}
                {outil === 'zone' && zoneEnCible && !Number.isFinite(Number(zoneEnCible.x)) && (
                  <span className="text-micro text-encre-3 h-9 inline-flex items-center">
                    « {zoneEnCible.nom} » n’a pas encore de rectangle.
                  </span>
                )}
              </div>
            )}

            <div className="pointer-events-auto flex items-center gap-1 rounded-surface border border-ligne bg-surface shadow-flottant p-1">
              {OUTILS.map((o) => (
                <Bouton
                  key={o.cle}
                  variante={outil === o.cle ? 'primaire' : 'discret'}
                  taille="md" iconeSeule icone={o.icone}
                  aria-label={o.label} title={`${o.label} — ${o.aide}`}
                  onClick={() => {
                    setOutil(o.cle); setMur(null); setTrace(null); setRegle(null); setPoly(null);
                    setCurseur(null); setRetouche(null); rienDeChoisi();
                  }}
                />
              ))}
              <span className="mx-1 h-6 w-px bg-ligne" aria-hidden="true" />
              <Bouton
                variante="discret" taille="md" iconeSeule icone={Undo2}
                aria-label="Annuler" title="Annuler — Ctrl+Z"
                onClick={annuler} disabled={!pile.length}
              />
              <Bouton
                variante="discret" taille="md" iconeSeule icone={Redo2}
                aria-label="Rétablir" title="Rétablir — Ctrl+Maj+Z"
                onClick={retablir} disabled={!refaits.length}
              />
              <span className="mx-1 h-6 w-px bg-ligne" aria-hidden="true" />
              {/* LE ZOOM NE TOUCHE QUE LA VUE. La feuille garde ses mètres : un bench
                  posé à 400 % fait les mêmes 140 cm qu'à 100 %, seule la fenêtre
                  rétrécit. Une seule échelle pour tout le plan, toujours. */}
              <Bouton
                variante="discret" taille="md" iconeSeule icone={ZoomOut}
                aria-label="Dézoomer" title="Dézoomer"
                onClick={() => zoomer(1 / ZOOM.pas)} disabled={vuePlan.zoom <= ZOOM.mini}
              />
              {/* L'ÉCHELLE, PAS UN POURCENTAGE : « 1:50 » se vérifie avec une
                  règle sur la feuille imprimée, « 140 % » ne veut rien dire. */}
              <span className="text-micro text-encre-3 w-14 text-center tabular-nums">
                {echelle.texte}
              </span>
              <Bouton
                variante="discret" taille="md" iconeSeule icone={ZoomIn}
                aria-label="Zoomer" title="Zoomer"
                onClick={() => zoomer(ZOOM.pas)}
              />
              <Bouton
                variante="discret" taille="md" iconeSeule icone={Maximize}
                aria-label="Ajuster la vue" title="Ajuster la vue"
                onClick={ajusterVue} disabled={vuePlan.zoom === 1 && !centreVue}
              />
              <span className="mx-1 h-6 w-px bg-ligne" aria-hidden="true" />
              <Bouton
                variante={panneau === 'couches' || couchesTouchees(couches) ? 'primaire' : 'discret'}
                taille="md" iconeSeule icone={Layers}
                aria-label="Couches et métrés" title="Couches et métrés"
                onClick={() => setPanneau(panneau === 'couches' ? null : 'couches')}
              />
              <Bouton
                variante={panneau === 'chercher' ? 'primaire' : 'discret'}
                taille="md" iconeSeule icone={Search}
                aria-label="Chercher sur le plan" title="Chercher une personne, un poste, une salle — Ctrl+F"
                onClick={() => setPanneau(panneau === 'chercher' ? null : 'chercher')}
              />
              <Bouton
                variante={panneau === 'aide' ? 'primaire' : 'discret'}
                taille="md" iconeSeule icone={Keyboard}
                aria-label="Raccourcis clavier" title="Raccourcis clavier — ?"
                onClick={() => setPanneau(panneau === 'aide' ? null : 'aide')}
              />
              <span className="mx-1 h-6 w-px bg-ligne" aria-hidden="true" />
              <Bouton
                variante="discret" taille="md" iconeSeule icone={Download}
                aria-label="Exporter en SVG" title="Exporter le plan en SVG — vectoriel, pour un architecte"
                onClick={() => exporterPlan('svg')}
              />
              <Bouton
                variante="discret" taille="md" iconeSeule icone={FileImage}
                aria-label="Exporter en PNG" title="Exporter le plan en PNG — une image, pour un e-mail"
                onClick={() => exporterPlan('png')}
              />
              <Bouton
                variante={panneau === 'imprimer' ? 'primaire' : 'discret'}
                taille="md" iconeSeule icone={Printer}
                aria-label="Imprimer à l’échelle" title="Imprimer à l’échelle — A4 ou A3, 1:50 à 1:200"
                onClick={() => setPanneau(panneau === 'imprimer' ? null : 'imprimer')}
              />
              {orphelins.length > 0 && (
                <>
                  <span className="mx-1 h-6 w-px bg-ligne" aria-hidden="true" />
                  <Bouton
                    variante="discret" taille="md" icone={Grid2x2}
                    onClick={() => envoyer(orphelins)}
                    disabled={bouger.isPending}
                  >
                    Ranger les {orphelins.length} sans place
                  </Bouton>
                </>
              )}
            </div>
          </div>
        </div>

        <details className="mt-2 text-micro text-encre-3 lg:shrink-0">
          <summary className="cursor-pointer text-encre-3">Comment ça marche</summary>
          {/* Une liste de gestes, pas un paragraphe : on la parcourt du regard
              pour retrouver UN raccourci (audit du 2026-10-05). */}
          <ul className="mt-1 space-y-0.5 list-disc pl-4">
            <li>Meubles à leur vraie taille : bureau {POSTE.l * 10} × {POSTE.h * 10} cm, salle {SALLE.l * 10} × {SALLE.h * 10} cm.</li>
            <li>La grille suit le zoom ({Math.round(finesse.pas * 100) / 10} cm à ce cran) ; molette = zoom autour du pointeur.</li>
            <li>Une cote se clique pour être retapée, au centimètre.</li>
            <li>Un coin de la sélection la fait pivoter ; Maj = pas de 15°.</li>
            <li>Ctrl+Z reprend un déplacement, un mur, une zone ou une porte — pas une suppression.</li>
            <li>Un plan importé en image reste sur ce navigateur ; il se recale depuis la barre.</li>
          </ul>
        </details>
      </section>

    </div>
  );
}
