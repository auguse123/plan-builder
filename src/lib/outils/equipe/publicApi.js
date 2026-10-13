// La porte vers les données — ici, le navigateur.
//
// MÊMES NOMS, MÊMES FORMES que `publicApi.js` de « Qui vient au bureau » :
// l'éditeur copié (`PlanPostes.jsx`) appelle `usePatchPlan(jeton)`,
// `useSemerPostes(jeton)`… sans savoir qu'il n'y a plus de base. Le `jeton` est
// l'id du projet ouvert. Chaque écriture passe par `depot.js` (le miroir des
// fonctions SQL, mêmes refus), puis s'enregistre (`stockage.js`) et pose la
// nouvelle vue dans le cache : l'écran suit sans aller-retour.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as depot from '@/lib/local/depot';
import { ecrireProjet, lireProjet } from '@/lib/local/stockage';

let stockage = typeof window !== 'undefined' ? window.localStorage : null;
/** Pour les tests : un autre stockage que `localStorage`. */
export function utiliserStockage(s) { stockage = s; }
export const stockageCourant = () => stockage;

export const cles = {
  projets: ['atelier', 'projets'],
  postes: (id) => ['atelier', 'postes', id],
};

function projet(id) {
  const p = lireProjet(stockage, id);
  if (!p) throw new Error('projet_inconnu');
  return p;
}

/** Une écriture du dépôt, enregistrée puis posée dans le cache. */
function useEcriture(jeton, operation) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => {
      const { projet: neuf, retour } = operation(projet(jeton), args);
      ecrireProjet(stockage, neuf);
      qc.setQueryData(cles.postes(jeton), depot.vueDuProjet(neuf));
      qc.invalidateQueries({ queryKey: cles.projets });
      return retour;
    },
  });
}

export const OM_ERREURS = {
  // Le stockage local.
  stockage_plein: 'Le navigateur n’a plus de place pour ce projet. Exportez-le en fichier, puis supprimez un ancien projet ou le fond de plan.',
  fichier_illisible: 'Ce fichier n’est pas un projet de l’Atelier de plans.',
  fichier_trop_recent: 'Ce fichier vient d’une version plus récente de l’Atelier. Mettez-le à jour.',
  projet_inconnu: 'Ce projet n’existe plus sur cet appareil.',
  // Les comptes (`2026-11-01-om-comptes.sql`).
  connexion_requise: 'Connectez-vous pour ouvrir cet espace.',
  acces_refuse: 'Votre compte n’a pas accès à cet espace. Demandez une invitation à son administrateur.',
  espace_deja_revendique: 'Cet espace a déjà un administrateur : demandez-lui de vous inviter.',
  reserve_admin: 'Seul un administrateur de l’espace peut gérer les comptes.',
  dernier_admin: 'Il faut au moins un administrateur : nommez-en un autre d’abord.',
  role_soi_meme: 'Vous ne pouvez pas changer votre propre accès.',
  compte_inconnu: 'Ce compte n’a déjà plus accès.',
  trop_d_invitations: 'Trop d’invitations en attente sur cet espace.',
  envoi_indisponible: 'L’envoi d’e-mails n’est pas encore configuré.',
  envoi_echoue: 'L’e-mail n’a pas pu partir. Vérifiez l’adresse et réessayez.',
  identifiants: 'Adresse ou mot de passe incorrect.',
  adresse_non_confirmee: 'Confirmez d’abord votre adresse : le lien est dans l’e-mail reçu à l’inscription.',
  mot_de_passe_court: 'Le mot de passe doit faire au moins 8 caractères.',
  creation_reservee: 'Votre compte appartient à une équipe : c’est son office manager qui gère l’espace.',
  cgu_requises: 'Acceptez les conditions d’utilisation pour créer l’espace.',
  nom_contact_requis: 'Indiquez votre nom.',
  postes_invalides: 'Indiquez le nombre de postes (un nombre entier).',
  fonction_invalide: 'Choisissez votre fonction.',
  telephone_invalide: 'Ce numéro de téléphone ne semble pas valide.',
  invitation_inconnue: 'Cette invitation n’existe plus : elle a peut-être été annulée.',
  dernier_admin_espace: 'Vous êtes le dernier administrateur d’un espace : nommez-en un autre avant de supprimer votre compte.',
  captcha_invalide: 'La vérification anti-robot a échoué. Réessayez.',
  jeton_inconnu: 'Ce lien ne correspond à personne. Demandez-en un nouveau à votre office manager.',
  membre_inactif: 'Votre accès a été désactivé. Contactez votre office manager.',
  statut_invalide: 'Statut inconnu. Rechargez la page et réessayez.',
  rythme_invalide: 'Rythme invalide. Rechargez la page et réessayez.',
  jour_hors_periode: 'Ce jour est trop loin pour être modifié ici.',
  periode_invalide: 'Période invalide.',
  periode_trop_longue: 'Période trop longue.',
  periode_vide: 'Cette période ne contient aucun jour ouvré : que des week-ends ou des jours fériés.',
  // Espace ouvert sans compte.
  nom_requis: 'Il faut un nom — deux lettres au moins.',
  rate_limited: 'Trop de demandes depuis cette connexion. Réessayez dans une heure.',
  // Plafond par minute et par jeton (`om_debit`) : le mur derrière lequel il n'y
  // a plus d'humain.
  trop_de_requetes: 'Trop de demandes en une minute. Attendez une minute et rechargez.',
  patch_invalide: 'Modification invalide. Rechargez la page et réessayez.',
  champ_interdit: 'Ce champ ne se modifie pas ici.',
  nombre_invalide: 'Entrez un nombre (deux décimales au plus).',
  // Le placard.
  article_inconnu: 'Cet article n’existe plus. Rechargez la page.',
  sens_inconnu: 'Mouvement inconnu : entrée, sortie ou inventaire.',
  quantite_invalide: 'Entrez une quantité (un nombre, 999 au plus).',
  jours_invalides: 'Gardez au moins un jour ouvré.',
  fermetures_invalides: 'Fermetures invalides : une date (AAAA-MM-JJ) et un motif par ligne.',
  fermetures_trop_nombreuses: 'Cent jours de fermeture au plus.',
  equipe_vide: 'Personne d’actif dans l’équipe.',
  membre_inconnu: 'Cette personne n’est plus dans l’équipe. Rechargez la page.',
  prenom_requis: 'Il faut au moins un prénom.',
  equipe_pleine: 'Cette équipe a atteint 500 personnes.',
  // Ressources partagées.
  ressource_inconnue: 'Cette ressource n’existe plus. Rechargez la page.',
  reservation_inconnue: 'Cette réservation n’existe plus. Rechargez la page.',
  ressources_pleines: 'Cet espace a atteint 500 ressources.',
  // Sites et zones.
  site_inconnu: 'Ce site n’existe plus. Rechargez la page.',
  zone_inconnue: 'Cette zone n’existe plus. Rechargez la page.',
  site_invalide: 'Ce site ne fait pas partie de l’espace. Rechargez la page.',
  zone_invalide: 'Cette zone n’appartient pas à ce site. Choisissez une zone du même site.',
  sites_pleins: 'Cet espace a atteint 50 sites.',
  zones_pleines: 'Cet espace a atteint 200 zones.',
  journee_pleine: 'Cette journée a atteint 500 réservations.',
  type_invalide: 'Type de ressource inconnu. Rechargez la page et réessayez.',
  unite_invalide: 'Une ressource se prend à l’heure, à la demi-journée ou à la journée.',
  ressource_inactive: 'Cette ressource est désactivée. Réactivez-la dans l’onglet Équipe.',
  quota_atteint: 'Quota de la semaine atteint pour ce type de ressource.',
  // Postes de travail.
  // Trois refus (genre de poste, de lieu, de question) portent ce code : un message
  // qui convient aux trois plutôt que le dernier écrit, qui parlait de questions.
  genre_invalide: 'Ce choix n’est pas proposé. Rechargez la page et réessayez.',
  titulaire_requis: 'Un poste attitré a besoin d’une personne. Choisissez-la.',
  poste_bloque: 'Ce poste est bloqué : il ne se réserve pas.',
  poste_reserve_titulaire: 'Ce poste est attitré. Choisissez-en un autre.',
  poste_occupe: 'Ce poste porte des réservations à venir. Désactivez-le plutôt que de le supprimer.',
  hors_horizon: 'Trop loin dans le temps. Les postes s’ouvrent au fur et à mesure.',
  jour_ferme: 'Le bureau est fermé aujourd’hui : rien à réserver.',
  // Règles d'équipe (phase 6) : le trigger `om_reservation_regles`.
  plafond_equipe: 'Votre équipe a atteint son maximum de jours au bureau cette semaine.',
  hors_horizon_equipe: 'Votre équipe ne réserve pas aussi loin : réessayez plus près de la date.',
  zone_reservee: 'Cette zone est réservée à une autre équipe jusqu’à la veille. Choisissez un poste ailleurs.',
  deja_poste: 'Vous avez déjà un poste ce jour-là.',
  serie_trop_longue: 'Soixante réservations au plus par série : raccourcissez la période.',
  reservation_passee: 'Cette réservation est terminée : elle ne se modifie plus.',
  deja_pris: 'Déjà pris sur ce créneau.',
  visibilite_invalide: 'Ce niveau de visibilité n’existe pas. Rechargez la page.',
  favoris_trop_nombreux: 'Cinquante favoris au plus : retirez-en un d’abord.',
  abonnement_invalide: 'Ce navigateur a rendu un abonnement illisible. Réessayez, ou depuis un autre navigateur.',
  push_refuse: 'Les notifications sont refusées pour ce site : autorisez-les dans les réglages du navigateur.',
  push_indisponible: 'Les notifications ne sont pas encore prêtes. Réessayez dans quelques minutes.',
  slack_absent: 'Slack n’est pas branché sur cet espace : demandez-le à l’office manager.',
  equipe_requise: 'Donnez d’abord une équipe à cette personne (fiche, champ « Équipe »).',
  responsable_requis: 'Seul un responsable d’équipe fixe les jours d’équipe.',
  slack_secret_invalide: 'Ce n’est pas un Signing Secret Slack : 32 caractères, chiffres et lettres de a à f.',
  heures_invalides: 'Ouverture, bascule et fermeture doivent se suivre dans cet ordre.',
  geometrie_invalide: 'Ce plan n’a pas pu être enregistré. Rechargez la page et réessayez.',
  plan_invalide: 'Un plan mesure entre 2 et 200 mètres de côté.',
  murs_invalides: 'Ce tracé est trop chargé. Effacez un mur avant d’en tracer un autre.',
  trait_invalide: 'Ce trait n’est pas proposé. Choisissez-en un dans la liste.',
  // Les plans d'un espace. Un plan ne dépend pas d'une zone : ce sont les
  // zones qui se dessinent dessus.
  plan_inconnu: 'Ce plan n’existe plus. Rechargez la page.',
  plans_pleins: 'Cet espace a atteint 6 plans.',
  dernier_plan: 'Un espace garde au moins un plan. Créez-en un autre avant de supprimer celui-ci.',
  // Repas du midi.
  repas_ferme: 'Le repas du midi n’est pas ouvert pour cet espace.',
  pas_au_bureau: 'On ne mange au bureau que les jours où on y est. Déclarez « bureau » d’abord.',
  note_trop_longue: 'Régime et allergies : 120 caractères au maximum.',
  // Référents et évacuation.
  role_invalide: 'Qualification inconnue. Rechargez la page et réessayez.',
  // Demande de recherche de bureau.
  contact_requis: 'Indiquez votre nom pour qu’on sache qui rappeler.',
  email_invalide: 'Cet email ne semble pas valide.',
  demande_recente: 'Une demande vient d’être envoyée pour cet espace. Nous revenons vers vous très vite.',
  // Partout où une adresse est demandée : réglage des rappels, renvoi du lien de gestion.
  email_requis: 'Indiquez une adresse email.',
  // Canal Slack / Teams.
  webhook_invalide:
    'Collez une URL de webhook Slack (hooks.slack.com), Teams (webhook.office.com, logic.azure.com, powerautomate.com) ou Discord.',
  webhook_requis: 'Collez d’abord l’URL du webhook, puis enregistrez.',
  // Signalements (« Signaler au bureau »). Même table d'erreurs : un seul
  // traducteur pour toute la maison, sinon deux écrans disent deux phrases
  // pour le même code SQL.
  titre_requis: 'Donnez un titre : quelques mots suffisent.',
  categorie_invalide: 'Catégorie inconnue. Rechargez la page et réessayez.',
  urgence_invalide: 'Niveau de gêne inconnu. Rechargez la page et réessayez.',
  panne_ou_demande: 'Panne ou demande : choisissez l’un des deux.',
  signalement_inconnu: 'Ce signalement n’existe plus. Rechargez la page.',
  espace_plein: 'Cet espace a atteint 2 000 signalements.',
  texte_requis: 'Écrivez un message avant d’envoyer.',
  fil_plein: 'Ce fil a atteint sa limite de messages.',
  // Les passages de prestataires. `zone_inconnue` et `espace_plein` servent
  // déjà ailleurs : un code SQL n'a qu'une seule phrase.
  metier_invalide: 'Métier inconnu. Rechargez la page et réessayez.',
  passage_vide: 'Cochez au moins une tâche, ou dites ce qui a manqué.',
  trop_de_taches: 'La checklist s’arrête à 20 lignes.',
  // Le classeur (échéances, contrats, vérifications, formations). Même table :
  // `titre_requis`, `statut_invalide`, `membre_inconnu`, `site_inconnu`,
  // `email_invalide`, `patch_invalide` et `champ_interdit` sont déjà au-dessus
  // et servent aux deux outils — un code SQL n'a qu'une seule phrase.
  echeance_inconnue: 'Cette échéance n’existe plus. Rechargez la page.',
  classeur_plein: 'Ce classeur a atteint 400 échéances.',
  famille_invalide: 'Famille inconnue. Rechargez la page et réessayez.',
  periodicite_invalide: 'Périodicité inconnue. Choisissez-en une dans la liste.',
  preavis_invalide: 'Le préavis se compte en jours, de 0 à 365.',
  montant_invalide: 'Entrez un montant en euros, sans espace ni symbole.',
  jalons_requis: 'Gardez au moins un rappel.',
  date_invalide: 'Date invalide. Utilisez le format JJ/MM/AAAA.',
  url_invalide: 'Collez un lien commençant par http:// ou https://.',
  pieces_pleines: 'Cette échéance a atteint 20 pièces.',
  // Les pièces déposées (bucket `om-preuves`, Edge Function `om-preuve`).
  piece_inconnue: 'Cette pièce n’existe plus. Rechargez la page.',
  fichier_requis: 'Choisissez un fichier.',
  fichier_trop_gros: 'Fichier trop lourd : 10 Mo au plus.',
  fichier_type_refuse: 'Format refusé : PDF, image, Word ou Excel.',
  journal_plein: 'Ce journal a atteint sa limite de lignes.',
  // Un seul code pour les deux lots : la pose de modèles s'arrête à 30, les
  // gestes sur une sélection à 100. La phrase ne promet donc pas de chiffre.
  lot_trop_grand: 'Trop de lignes d’un coup. Réduisez la sélection.',
  lot_vide: 'Sélectionnez au moins une ligne.',
  // L'arborescence des lieux. `nom_requis` est déjà plus haut : un code SQL
  // n'a qu'une seule phrase, quel que soit l'outil.
  lieu_inconnu: 'Ce lieu n’existe plus. Rechargez la page.',
  lieux_pleins: 'Cet espace a atteint 400 lieux.',
  lieu_trop_profond: 'Quatre niveaux au plus : bâtiment, étage, local, équipement.',
  lieu_cycle: 'Un lieu ne peut pas être rangé dans un lieu qu’il contient.',
  // Les réserves d'un PV. `date_invalide`, `url_invalide`, `montant_invalide`,
  // `membre_inconnu` et `lieu_inconnu` sont déjà au-dessus et servent ici aussi.
  reserve_inconnue: 'Cette réserve n’existe plus. Rechargez la page.',
  reserves_pleines: 'Cet espace a atteint 200 réserves ouvertes ou levées.',
  gravite_invalide: 'Gravité inconnue : critique, majeure ou mineure.',
  libelle_requis: 'Décrivez la réserve en quelques mots (trois lettres au moins).',
  // Les prestataires. `nom_requis`, `email_invalide` et `url_invalide` servent
  // ici aussi — un code SQL n'a qu'une seule phrase, quel que soit l'outil.
  fournisseur_inconnu: 'Ce prestataire n’existe plus. Rechargez la page.',
  fournisseur_existe: 'Un prestataire porte déjà ce nom. Ouvrez sa fiche plutôt que d’en créer une seconde.',
  fournisseurs_pleins: 'Cet espace a atteint 300 prestataires.',
  // Les formations et leurs titulaires. `date_invalide`, `membre_inconnu`,
  // `famille_invalide` et `echeance_inconnue` sont déjà au-dessus.
  titulaire_inconnu: 'Cette personne n’est plus rattachée à cette formation. Rechargez la page.',
  titulaires_pleins: 'Cette formation a atteint 200 titulaires.',
  membre_requis: 'Choisissez la personne concernée.',
  dates_inversees: 'La validité ne peut pas précéder l’obtention.',
  cible_invalide: 'Indiquez combien de personnes doivent être formées, de 0 à 99.',
  // Le registre. Personne ne doit voir cette phrase : le journal ne se retouche
  // pas, et aucun écran ne le propose. Elle existe pour qu'un `update` lancé à
  // la main depuis l'éditeur SQL dise POURQUOI il a été refusé.
  journal_immuable: 'Le registre ne se modifie pas : une ligne posée y reste.',
  // Le matériel confié. `nom_requis`, `site_inconnu`, `date_invalide` et
  // `membre_inconnu` sont déjà au-dessus et servent ici aussi.
  materiel_inconnu: 'Ce matériel n’existe plus. Rechargez la page.',
  pret_inconnu: 'Ce prêt n’existe plus, ou il est déjà rendu. Rechargez la page.',
  pret_ouvert: 'Cet objet est encore chez quelqu’un. Enregistrez son retour avant de le supprimer.',
  deja_confie: 'Cet objet est déjà confié à quelqu’un. Enregistrez son retour d’abord.',
  destinataire_requis: 'Indiquez à qui l’objet est confié.',
  dates_incoherentes: 'Le départ ne peut pas précéder l’arrivée.',
  // Les modifications simultanées (`lib/outils/version.js`).
  modifie_ailleurs: 'Quelqu’un a modifié cette fiche entre-temps. Vos modifications sont gardées : vérifiez puis enregistrez.',
  version_invalide: 'Version de la fiche illisible. Rechargez la page.',
  // Les arrivées et les externes.
  referent_invalide: 'Ce contact ne fait pas partie de l’espace.',
  etape_invalide: 'Étape inconnue. Rechargez la page et réessayez.',
  // Les visiteurs.
  visite_inconnue: 'Cette visite n’existe plus. Demandez un nouveau lien à votre hôte.',
  visiteur_vide: 'Il faut le nom du visiteur.',
  heure_invalide: 'Entrez une heure comme 09:30.',
  jour_invalide: 'Date invalide.',
  // `membre_inconnu` (l'hôte choisi a quitté l'équipe) est déjà au-dessus.
  // Le pouls.
  pouls_inconnu: 'Ce sondage n’existe plus. Demandez un nouveau lien.',
  pouls_ferme: 'Ce sondage est clos : les réponses ne sont plus acceptées.',
  pouls_deja_repondu: 'Ce sondage a déjà des réponses : ses questions ne se modifient plus. Clôturez-le et créez-en un autre.',
  questions_invalides: 'Questions invalides. Rechargez la page et réessayez.',
  trop_de_questions: 'Trois questions au plus — au-delà, plus personne ne répond.',
  question_vide: 'Écrivez la question, ou retirez-la.',
  reponse_invalide: 'Réponse invalide. Rechargez la page et réessayez.',
  reponse_vide: 'Répondez à une question au moins.',
  // Les justificatifs de frais. `montant_invalide`, `champ_interdit`, `fichier_requis`,
  // `categorie_invalide`, `fichier_trop_gros`, `fichier_type_refuse` et `date_invalide`
  // sont déjà au-dessus et servent ici aussi : un code, un message, partout.
  collecte_pleine: 'Cet espace a atteint 5 000 justificatifs. Exportez et archivez avant d’en déposer d’autres.',
  collecte_inconnue: 'Ce lien de collecte n’est plus valide. Demandez-en un nouveau à votre office manager.',
  justificatif_inconnu: 'Ce justificatif n’existe plus. Rechargez la page.',
  qui_requis: 'Indiquez votre nom pour qu’on sache qui a payé.',
  date_hors_periode: 'Cette date est trop lointaine. Vérifiez le jour de la dépense.',
  montant_requis: 'Indiquez le montant payé.',
  tva_invalide: 'La TVA ne peut pas dépasser le montant payé.',
  moyen_invalide: 'Moyen de paiement inconnu. Rechargez la page et réessayez.',
  // Check-in sur place.
  homonymie: 'Plusieurs personnes portent ce nom. Tapez votre prénom ET votre nom.',
};

const OM_CODES = Object.keys(OM_ERREURS).sort((a, b) => b.length - a.length);

export function omErreurMessage(erreur) {
  const brut = String(erreur?.message || erreur || '');
  for (const code of OM_CODES) if (brut.includes(code)) return OM_ERREURS[code];
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

/** La vue du projet ouvert : plans, zones, salles, postes. */
export function usePostes(jeton) {
  return useQuery({
    queryKey: cles.postes(jeton),
    queryFn: async () => depot.vueDuProjet(projet(jeton)),
    enabled: !!jeton,
    staleTime: Infinity,
    retry: false,
  });
}

/** Sans équipe ni présences : le regard « qui est où » n'a rien à lire. */
export function useEspacePublic() {
  return useQuery({ queryKey: ['atelier', 'sans-espace'], queryFn: async () => null, enabled: false });
}

export const useDeplacerPostes = (j) => useEcriture(j, depot.deplacerPostes);
export const useGenrePostes = (j) => useEcriture(j, depot.genrerPostes);
export const useSemerPostes = (j) => useEcriture(j, depot.semerPostes);
export const useDessinerZones = (j) => useEcriture(j, depot.dessinerZones);
export const useCreerPlan = (j) => useEcriture(j, depot.creerPlan);
export const useRenommerPlan = (j) => useEcriture(j, (p, { planId, nom }) => depot.renommerPlan(p, planId, nom));
export const useSupprimerPlan = (j) => useEcriture(j, depot.supprimerPlan);
export const usePatchPlan = (j) => useEcriture(j, (p, { planId, patch }) => depot.patcherPlan(p, planId, patch));
export const useEcrireZonePublic = (j) => useEcriture(j, depot.ecrireZone);
export const usePoserSalle = (j) => useEcriture(j, depot.poserSalle);
export const useEcrireRessourcePublique = (j) => useEcriture(j, depot.ecrireRessource);
