import { describe, it, expect } from 'vitest';
import {
  accompagnants, ajouterJours, chevauchent, cleJour, creneauPossible, dateCourte, dimensionnement,
  dureeCourte, etatRessource, filtrerMembres, grouperParEquipe, heureCourte, indexerPresences,
  initiales, jourDetaille, jourOuvreVoisin, joursDeSemaine,
  jourDepuisCle, libelleAccompagnants, libelleSemaine, lundiDe, minutesEntre, nombreParticipants,
  nomMembre, numeroJour, rythmeCouvreSemaine, occupationJour, picsParZone, pourcent, raisonFermeture, serieOccupation, siteEffectif,
  statutDuRythme, statutMembre, statutSuivant, syntheseParEquipe, syntheseParSite, syntheseUsage, usageRessource,
} from './model';

const membre = (id, rythme, reste = {}) => ({
  id, prenom: `P${id}`, nom: `N${id}`, actif: true, rythme, ...reste,
});

// Trois personnes : une au bureau tous les jours ouvrés, une en 3 jours, une à mi-temps.
const TOUS = { 1: 'bureau', 2: 'bureau', 3: 'bureau', 4: 'bureau', 5: 'bureau' };
const TROIS = { 1: 'bureau', 2: 'bureau', 3: 'teletravail', 4: 'bureau', 5: 'teletravail' };
const MITEMPS = { 1: 'absent', 2: 'bureau', 3: 'absent', 4: 'bureau', 5: 'absent' };

describe('dates', () => {
  it('cleJour reste en heure locale (toISOString décalerait un lundi de janvier)', () => {
    expect(cleJour(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
    expect(cleJour(new Date(2026, 6, 5, 23, 30))).toBe('2026-07-05');
  });

  it('cleJour et jourDepuisCle font l’aller-retour', () => {
    const d = jourDepuisCle('2026-09-14');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(14);
    expect(cleJour(d)).toBe('2026-09-14');
  });

  it('cleJour rend une chaîne vide sur une date invalide', () => {
    expect(cleJour('pas une date')).toBe('');
  });

  it('numeroJour met le dimanche à 7, pas à 0', () => {
    expect(numeroJour(new Date(2026, 8, 14))).toBe(1); // lundi
    expect(numeroJour(new Date(2026, 8, 20))).toBe(7); // dimanche
  });

  it('lundiDe ramène au lundi, y compris depuis un dimanche', () => {
    expect(cleJour(lundiDe(new Date(2026, 8, 17)))).toBe('2026-09-14');
    expect(cleJour(lundiDe(new Date(2026, 8, 20)))).toBe('2026-09-14');
    expect(cleJour(lundiDe(new Date(2026, 8, 14)))).toBe('2026-09-14');
  });

  it('ajouterJours traverse un changement de mois', () => {
    expect(cleJour(ajouterJours(new Date(2026, 8, 30), 2))).toBe('2026-10-02');
  });

  it('joursDeSemaine ne rend que les jours ouvrés demandés, dans l’ordre', () => {
    const j = joursDeSemaine(new Date(2026, 8, 14), [1, 3, 6]);
    expect(j.map((x) => x.cle)).toEqual(['2026-09-14', '2026-09-16', '2026-09-19']);
    expect(j.map((x) => x.n)).toEqual([1, 3, 6]);
  });

  it('libelleSemaine ne répète pas le mois quand il est le même', () => {
    expect(libelleSemaine(joursDeSemaine(new Date(2026, 8, 14)))).toBe('14 – 18 sept.');
    expect(libelleSemaine(joursDeSemaine(new Date(2026, 8, 28)))).toBe('28 sept. – 2 oct.');
    expect(libelleSemaine([])).toBe('');
  });

  it('dateCourte et heureCourte', () => {
    expect(dateCourte(new Date(2026, 1, 3))).toBe('3 févr.');
    expect(heureCourte(new Date(2026, 8, 14, 9, 5))).toBe('09:05');
  });

  it('dureeCourte passe en heures au-delà de 60 minutes', () => {
    expect(dureeCourte(25)).toBe('25 min');
    expect(dureeCourte(60)).toBe('1 h');
    expect(dureeCourte(70)).toBe('1 h 10');
    expect(dureeCourte(-5)).toBe('0 min');
  });
});

describe('identité', () => {
  it('nomMembre et initiales', () => {
    expect(nomMembre({ prenom: 'Ada', nom: 'Lovelace' })).toBe('Ada Lovelace');
    expect(nomMembre({ prenom: 'Ada' })).toBe('Ada');
    expect(nomMembre(null)).toBe('');
    expect(initiales({ prenom: 'Ada', nom: 'Lovelace' })).toBe('AL');
    expect(initiales({ prenom: 'Ada' })).toBe('A');
    expect(initiales({})).toBe('?');
  });
});

describe('présence', () => {
  const jours = joursDeSemaine(new Date(2026, 8, 14));

  it('sans ligne de présence, le rythme déclaré fait foi', () => {
    const index = indexerPresences([]);
    const { statut, source } = statutMembre(membre('a', TROIS), jours[2], index);
    expect(statut).toBe('teletravail');
    expect(source).toBe('rythme');
  });

  it('un rythme incomplet ou inconnu vaut « absent », jamais une valeur hors liste', () => {
    expect(statutDuRythme(membre('a', { 1: 'bureau' }), 4)).toBe('absent');
    expect(statutDuRythme(membre('a', { 1: 'au bureau' }), 1)).toBe('absent');
    expect(statutDuRythme({ id: 'a' }, 1)).toBe('absent');
  });

  it('une ligne saisie l’emporte sur le rythme et se déclare comme telle', () => {
    const index = indexerPresences([
      { membre_id: 'a', jour: '2026-09-16', statut: 'bureau', source: 'declare' },
    ]);
    const { statut, source } = statutMembre(membre('a', TROIS), jours[2], index);
    expect(statut).toBe('bureau');
    expect(source).toBe('declare');
  });

  it('une source inconnue est ramenée à « declare », pas propagée telle quelle', () => {
    const index = indexerPresences([
      { membre_id: 'a', jour: '2026-09-14', statut: 'bureau', source: 'import-bizarre' },
    ]);
    expect(statutMembre(membre('a', TOUS), jours[0], index).source).toBe('declare');
  });

  it('une ligne au statut invalide ne casse pas le calcul : on retombe sur le rythme', () => {
    const index = indexerPresences([
      { membre_id: 'a', jour: '2026-09-14', statut: 'en congé', source: 'declare' },
    ]);
    expect(statutMembre(membre('a', TOUS), jours[0], index).statut).toBe('bureau');
  });

  it('occupationJour compte les trois statuts et ce qui est réellement su', () => {
    const membres = [membre('a', TOUS), membre('b', TROIS), membre('c', MITEMPS)];
    const index = indexerPresences([
      { membre_id: 'c', jour: '2026-09-14', statut: 'bureau', source: 'checkin' },
    ]);
    const lundi = occupationJour(membres, jours[0], index);
    expect(lundi.bureau).toBe(3);
    expect(lundi.absent).toBe(0);
    expect(lundi.total).toBe(3);
    expect(lundi.su).toBe(1);
  });

  it('serieOccupation suit la semaine jour par jour', () => {
    const membres = [membre('a', TOUS), membre('b', TROIS), membre('c', MITEMPS)];
    const serie = serieOccupation({ membres, presences: [], jours });
    expect(serie.map((j) => j.bureau)).toEqual([2, 3, 1, 3, 1]);
  });
});

describe('cycle du planning', () => {
  // Rejoue des clics successifs sur une case, comme le fait l'écran : on part
  // d'une case déduite du rythme et on rend l'état obtenu après chaque clic.
  const clics = (rythme, n) => {
    let etat = { statut: rythme, source: 'rythme' };
    return Array.from({ length: n }, () => {
      const cible = statutSuivant(etat.statut, etat.source);
      etat = cible === null
        ? { statut: rythme, source: 'rythme' }
        : { statut: cible, source: 'declare' };
      return `${etat.statut}/${etat.source === 'rythme' ? 'déduit' : 'saisi'}`;
    });
  };

  it('un jour prévu au bureau peut être CONFIRMÉ au bureau, dès le premier clic', () => {
    expect(clics('bureau', 1)).toEqual(['bureau/saisi']);
  });

  it('le cycle est le même quel que soit le rythme, et repasse par les quatre crans', () => {
    const attendu = (rythme) => ['bureau/saisi', 'teletravail/saisi', 'absent/saisi', `${rythme}/déduit`];
    expect(clics('bureau', 4)).toEqual(attendu('bureau'));
    expect(clics('teletravail', 4)).toEqual(attendu('teletravail'));
    expect(clics('absent', 4)).toEqual(attendu('absent'));
  });

  it('aucun statut n’est hors d’atteinte, quel que soit le rythme de départ', () => {
    ['bureau', 'teletravail', 'absent'].forEach((rythme) => {
      const vus = new Set(clics(rythme, 8).filter((e) => e.endsWith('/saisi')));
      expect(vus).toEqual(new Set(['bureau/saisi', 'teletravail/saisi', 'absent/saisi']));
    });
  });

  it('le cycle boucle : le cinquième clic repart sur « bureau »', () => {
    expect(clics('teletravail', 5)[4]).toBe('bureau/saisi');
  });

  it('« absent » saisi est le dernier cran : il rend la case au rythme', () => {
    expect(statutSuivant('absent', 'declare')).toBeNull();
    expect(statutSuivant('absent', 'checkin')).toBeNull();
  });

  it('un statut hors liste ne bloque pas la case : le clic suivant l’efface', () => {
    expect(statutSuivant('en congé', 'declare')).toBeNull();
  });
});

describe('synthèse d’usage', () => {
  const jours = joursDeSemaine(new Date(2026, 8, 14));
  const membres = [membre('a', TOUS), membre('b', TROIS), membre('c', MITEMPS)];

  it('le pic et son jour, pas seulement la moyenne', () => {
    const s = syntheseUsage({ membres, jours, postesFactures: 5, coutPosteMois: 400 });
    expect(s.pic).toBe(3);
    expect(s.jourDePic.n).toBe(2); // mardi
    expect(s.creux).toBe(1);
    expect(s.moyenne).toBeCloseTo(2, 5);
  });

  it('les postes dormants se comptent sur le pic, jamais sur la moyenne', () => {
    const s = syntheseUsage({ membres, jours, postesFactures: 5, coutPosteMois: 400 });
    expect(s.dormants).toBe(2); // 5 payés – 3 au pic
    expect(s.economieMois).toBe(800);
    expect(s.verdict).toBe('sur');
  });

  it('un pic au-dessus des postes payés se signale comme sous-dimensionné', () => {
    const s = syntheseUsage({ membres, jours, postesFactures: 2 });
    expect(s.verdict).toBe('sous');
    expect(s.tauxPic).toBeGreaterThan(1);
    expect(s.dormants).toBe(0);
  });

  it('sans postes facturés, aucun verdict n’est inventé', () => {
    const s = syntheseUsage({ membres, jours });
    expect(s.verdict).toBe('inconnu');
    expect(s.tauxPic).toBe(0);
    expect(s.economieMois).toBe(0);
  });

  it('la fiabilité mesure la part de journées réellement saisies', () => {
    const vide = syntheseUsage({ membres, jours, postesFactures: 5 });
    expect(vide.fiabilite).toBe(0);
    const presences = jours.map((j) => ({ membre_id: 'a', jour: j.cle, statut: 'bureau', source: 'checkin' }));
    const un = syntheseUsage({ membres, presences, jours, postesFactures: 5 });
    expect(un.fiabilite).toBeCloseTo(5 / 15, 5);
  });

  it('sans membre ni jour, tout est à zéro et rien ne plante', () => {
    const s = syntheseUsage({});
    expect(s.pic).toBe(0);
    expect(s.jourDePic).toBe(null);
    expect(s.fiabilite).toBe(0);
  });

  it('un jour de fermeture de l’espace sort du calcul et se nomme', () => {
    const fermes = joursDeSemaine(new Date(2026, 8, 14), undefined, { '2026-09-15': 'Séminaire' });
    const s = syntheseUsage({ membres, jours: fermes, postesFactures: 5 });
    // Le mardi (pic à 3) est fermé : le pic passe au jeudi.
    expect(s.jourDePic.n).toBe(4);
    expect(s.feries).toEqual([{ cle: '2026-09-15', nom: 'Séminaire' }]);
    expect(s.serie.map((j) => j.cle)).not.toContain('2026-09-15');
  });
});

describe('dimensionnement', () => {
  it('le plancher est le pic, le confort le dépasse toujours d’au moins une place', () => {
    const d = dimensionnement({ pic: 27, dormants: 13, economieMois: 5200 });
    expect(d.plancher).toBe(27);
    expect(d.confort).toBe(30);
    expect(d.economieAn).toBe(62400);
  });

  it('un petit pic gagne quand même une place de marge', () => {
    expect(dimensionnement({ pic: 4 }).confort).toBe(5);
  });

  it('un pic nul ne conseille rien', () => {
    expect(dimensionnement({}).confort).toBe(0);
  });
});

describe('sites, zones et postes attitrés', () => {
  const jours = joursDeSemaine(new Date(2026, 8, 14));
  const PARIS = 'site-paris';
  const LYON = 'site-lyon';
  const sites = [
    { id: PARIS, nom: 'Paris', postes: 6, ordre: 0, actif: true },
    { id: LYON, nom: 'Lyon', postes: 3, ordre: 1, actif: true },
  ];
  // Ana : Paris, poste attitré, là tous les jours. Bob : Paris, volant, 3 jours.
  // Chloé : Lyon, volant, tous les jours. Dan : sans site, mi-temps.
  const membres = [
    membre('ana', TOUS, { site_id: PARIS, zone_id: 'z-mezz', poste_attitre: true }),
    membre('bob', TROIS, { site_id: PARIS, zone_id: 'z-open' }),
    membre('chloe', TOUS, { site_id: LYON }),
    membre('dan', MITEMPS),
  ];

  it('le site effectif est celui de la présence, sinon celui du membre', () => {
    expect(siteEffectif(membres[0], null)).toBe(PARIS);
    expect(siteEffectif(membres[0], { site_id: LYON })).toBe(LYON);
    expect(siteEffectif(membres[3], null)).toBe(null);
  });

  it('sans filtre, `volant` compte les présents non attitrés', () => {
    const lundi = occupationJour(membres, jours[0], indexerPresences([]));
    expect(lundi.bureau).toBe(3); // ana, bob, chloé
    expect(lundi.volant).toBe(2); // ana est attitrée
    expect(lundi.total).toBe(4);
  });

  it('vu d’un site : présents par site effectif, effectif par rattachement', () => {
    const paris = occupationJour(membres, jours[0], indexerPresences([]), PARIS);
    expect(paris).toMatchObject({ bureau: 2, volant: 1, total: 2, absent: 0 });
    const lyon = occupationJour(membres, jours[0], indexerPresences([]), LYON);
    expect(lyon).toMatchObject({ bureau: 1, volant: 1, total: 1 });
  });

  it('un attitré venu sur un autre site y est volant, et son poste reste vide chez lui', () => {
    const presences = [{ membre_id: 'ana', jour: jours[0].cle, statut: 'bureau', source: 'declare', site_id: LYON }];
    const index = indexerPresences(presences);
    const lyon = occupationJour(membres, jours[0], index, LYON);
    expect(lyon).toMatchObject({ bureau: 2, volant: 2, total: 1 });
    const paris = occupationJour(membres, jours[0], index, PARIS);
    expect(paris).toMatchObject({ bureau: 1, volant: 1, total: 2 });
  });

  it('le besoin = attitrés + pic des volants, et c’est lui qui fait le verdict', () => {
    const s = syntheseUsage({ membres, jours, postesFactures: 9 });
    expect(s.pic).toBe(4); // mardi : tout le monde
    expect(s.attitres).toBe(1);
    expect(s.picVolant).toBe(3);
    expect(s.besoin).toBe(4);
    expect(s.volants).toBe(8);
    expect(s.dormants).toBe(5);
    expect(s.verdict).toBe('sur');
    // Quand l'attitrée ne vient pas, son poste compte quand même : le besoin
    // dépasse le pic des présents.
    const absente = [membre('ana', { 1: 'absent', 2: 'absent', 3: 'absent', 4: 'absent', 5: 'absent' }, { site_id: PARIS, poste_attitre: true }), ...membres.slice(1)];
    const t = syntheseUsage({ membres: absente, jours, postesFactures: 3 });
    expect(t.pic).toBe(3);
    expect(t.picVolant).toBe(3);
    expect(t.besoin).toBe(4);
    expect(t.verdict).toBe('sous');
  });

  it('sans attitré, rien ne change : besoin = pic', () => {
    const s = syntheseUsage({ membres: membres.slice(1), jours, postesFactures: 5 });
    expect(s.attitres).toBe(0);
    expect(s.besoin).toBe(s.pic);
    expect(s.dormants).toBe(5 - s.pic);
  });

  it('le dimensionnement met la marge sur les volants seulement', () => {
    const d = dimensionnement({ pic: 12, attitres: 10, picVolant: 2, besoin: 12 });
    expect(d.plancher).toBe(12);
    expect(d.confort).toBe(13); // 10 attitrés + (2 volants + 1)
    // Sans champs de site (ancienne synthèse), même résultat qu'avant.
    expect(dimensionnement({ pic: 27 })).toMatchObject({ plancher: 27, confort: 30 });
  });

  it('la synthèse par site porte ses postes et son verdict', () => {
    const parSite = syntheseParSite({ membres, jours, sites });
    expect(parSite.map((s) => s.nom)).toEqual(['Paris', 'Lyon']);
    const [paris, lyon] = parSite;
    expect(paris).toMatchObject({ postes: 6, effectif: 2, pic: 2, attitres: 1, picVolant: 1, besoin: 2, dormants: 4, verdict: 'sur' });
    expect(lyon).toMatchObject({ postes: 3, effectif: 1, pic: 1, besoin: 1, dormants: 2, verdict: 'sur' });
  });

  it('un seul site actif : pas de répartition', () => {
    expect(syntheseParSite({ membres, jours, sites: [sites[0], { ...sites[1], actif: false }] })).toEqual([]);
    expect(syntheseParSite({ membres, jours, sites: [] })).toEqual([]);
  });

  it('les zones comptent leurs membres au bureau contre leurs places', () => {
    const zones = [
      { id: 'z-mezz', site_id: PARIS, nom: 'Mezzanine', places: 2, actif: true },
      { id: 'z-open', site_id: PARIS, nom: 'Open space', places: 0, actif: true },
      { id: 'z-lyon', site_id: LYON, nom: 'Lyon RDC', places: 4, actif: true },
    ];
    const tout = picsParZone({ membres, jours, zones });
    expect(tout).toHaveLength(3);
    expect(tout[0]).toMatchObject({ nom: 'Mezzanine', effectif: 1, pic: 1, places: 2, deborde: false });
    expect(tout[0].taux).toBeCloseTo(0.5, 5);
    expect(tout[1]).toMatchObject({ pic: 1, places: 0, taux: 0, deborde: false });
    expect(picsParZone({ membres, jours, zones, siteId: LYON }).map((z) => z.nom)).toEqual(['Lyon RDC']);
    const serree = picsParZone({ membres, jours, zones: [{ ...zones[0], places: 0 }, { ...zones[1], places: 1 }] });
    expect(serree[1].deborde).toBe(false);
    const deux = [membre('e', TOUS, { zone_id: 'z-open' }), ...membres];
    expect(picsParZone({ membres: deux, jours, zones: [{ ...zones[1], places: 1 }] })[0]).toMatchObject({ pic: 2, deborde: true });
  });
});

describe('répartition par équipe', () => {
  const jours = joursDeSemaine(new Date(2026, 8, 14));
  const LUNDI = { 1: 'bureau', 2: 'absent', 3: 'absent', 4: 'absent', 5: 'absent' };
  const MARDI = { 1: 'absent', 2: 'bureau', 3: 'absent', 4: 'absent', 5: 'absent' };

  it('un seul groupe ne se répartit pas : ce serait le tableau du dessus, en double', () => {
    const memes = [membre('a', TOUS, { equipe: 'Paris' }), membre('b', TROIS, { equipe: 'Paris' })];
    expect(syntheseParEquipe({ membres: memes, jours })).toEqual([]);
    expect(syntheseParEquipe({ membres: [membre('a', TOUS)], jours })).toEqual([]);
    expect(syntheseParEquipe({})).toEqual([]);
  });

  it('casse, accents et espaces ne fabriquent pas de colonnes en plus', () => {
    const membres = [
      membre('a', TOUS, { equipe: 'R&D' }),
      membre('b', TOUS, { equipe: 'r & d' }),
      membre('c', TOUS, { equipe: 'R&D ' }),
      membre('d', TOUS, { equipe: 'Opérations' }),
      membre('e', TOUS, { equipe: 'operations' }),
    ];
    const g = syntheseParEquipe({ membres, jours });
    // L’orthographe affichée est celle vue en premier.
    expect(g.map((x) => x.label)).toEqual(['R&D', 'Opérations']);
    expect(g.map((x) => x.effectif)).toEqual([3, 2]);
  });

  it('qui n’a pas de groupe en forme un : l’effectif complet doit se retrouver', () => {
    const membres = [
      membre('a', TOUS, { equipe: 'Paris' }),
      membre('b', TOUS, { equipe: '   ' }),
      membre('c', TOUS),
    ];
    const g = syntheseParEquipe({ membres, jours });
    expect(g.map((x) => x.label)).toEqual(['Sans groupe', 'Paris']);
    expect(g.reduce((s, x) => s + x.effectif, 0)).toBe(3);
  });

  it('à pic égal, l’ordre est alphabétique français', () => {
    const membres = [
      membre('a', TOUS, { equipe: 'Zèbre' }),
      membre('b', TOUS, { equipe: 'Édition' }),
      membre('c', TOUS, { equipe: 'Atelier' }),
    ];
    expect(syntheseParEquipe({ membres, jours }).map((x) => x.label))
      .toEqual(['Atelier', 'Édition', 'Zèbre']);
  });

  it('les pics des groupes ne s’additionnent pas : ils tombent des jours différents', () => {
    const membres = [membre('a', LUNDI, { equipe: 'Paris' }), membre('b', MARDI, { equipe: 'Lyon' })];
    const g = syntheseParEquipe({ membres, jours });
    expect(g.map((x) => [x.label, x.pic, x.jourDePic.n])).toEqual([['Lyon', 1, 2], ['Paris', 1, 1]]);
    // Deux pics à 1 chacun, mais l’espace n’a jamais eu plus d’une personne.
    expect(syntheseUsage({ membres, jours }).pic).toBe(1);
  });

  it('la fiabilité se compte dans le groupe, pas sur tout l’espace', () => {
    const membres = [membre('a', TOUS, { equipe: 'Paris' }), membre('b', TOUS, { equipe: 'Lyon' })];
    const presences = jours.map((j) => ({ membre_id: 'a', jour: j.cle, statut: 'bureau', source: 'checkin' }));
    const g = syntheseParEquipe({ membres, presences, jours });
    expect(g.find((x) => x.label === 'Paris').fiabilite).toBe(1);
    expect(g.find((x) => x.label === 'Lyon').fiabilite).toBe(0);
  });

  it('ni postes facturés, ni coût, ni verdict : ils appartiennent à l’espace', () => {
    const membres = [membre('a', TOUS, { equipe: 'Paris' }), membre('b', TOUS, { equipe: 'Lyon' })];
    const [g] = syntheseParEquipe({ membres, jours });
    expect(Object.keys(g).sort()).toEqual([
      'cle', 'effectif', 'fiabilite', 'jourDePic', 'label', 'moyenne', 'pic', 'serie',
    ]);
  });
});

describe('ressources', () => {
  const box = { id: 'r1', type: 'phonebox', nom: 'Box 1' };
  const t = (h, m = 0) => new Date(2026, 8, 14, h, m);
  const resa = (id, h1, h2, membreId = 'a') => ({
    id, ressource_id: 'r1', membre_id: membreId, debut: t(h1), fin: t(h2),
  });

  it('chevauchent est exclusif aux bornes : 9h-10h et 10h-11h ne se touchent pas', () => {
    expect(chevauchent({ debut: t(9), fin: t(10) }, { debut: t(10), fin: t(11) })).toBe(false);
    expect(chevauchent({ debut: t(9), fin: t(10) }, { debut: t(9, 30), fin: t(11) })).toBe(true);
  });

  it('occupée : on sait par qui et pour combien de temps encore', () => {
    const e = etatRessource(box, [resa('x', 9, 10)], t(9, 40));
    expect(e.libre).toBe(false);
    expect(e.enCours.id).toBe('x');
    expect(e.minutesRestantes).toBe(20);
    expect(e.minutesLibres).toBe(0);
  });

  it('libre sans réservation à venir : la disponibilité est illimitée', () => {
    const e = etatRessource(box, [], t(9));
    expect(e.libre).toBe(true);
    expect(e.minutesLibres).toBe(Infinity);
    expect(e.suivante).toBe(null);
  });

  it('libre mais bientôt prise : la fenêtre réelle est rendue, pas « libre »', () => {
    const e = etatRessource(box, [resa('x', 10, 11)], t(9, 45));
    expect(e.libre).toBe(true);
    expect(e.minutesLibres).toBe(15);
    expect(creneauPossible(box, [resa('x', 10, 11)], 15, t(9, 45))).toBe(true);
    expect(creneauPossible(box, [resa('x', 10, 11)], 30, t(9, 45))).toBe(false);
  });

  it('une réservation qui vient de finir ne bloque plus', () => {
    expect(etatRessource(box, [resa('x', 9, 10)], t(10)).libre).toBe(true);
  });

  it('les réservations d’une autre ressource sont ignorées', () => {
    const ailleurs = { id: 'z', ressource_id: 'r2', debut: t(9), fin: t(18) };
    expect(etatRessource(box, [ailleurs], t(10)).libre).toBe(true);
  });

  it('usageRessource compte les heures et les utilisateurs distincts', () => {
    const jours = joursDeSemaine(new Date(2026, 8, 14));
    const u = usageRessource(box, [resa('x', 9, 10, 'a'), resa('y', 14, 15, 'b')], jours, 9);
    expect(u.reservations).toBe(2);
    expect(u.minutes).toBe(120);
    expect(u.utilisateurs).toBe(2);
    expect(u.taux).toBeCloseTo(120 / (5 * 9 * 60), 5);
  });

  it('une réservation hors de la période affichée n’est pas comptée', () => {
    const jours = joursDeSemaine(new Date(2026, 8, 21));
    expect(usageRessource(box, [resa('x', 9, 10)], jours).reservations).toBe(0);
  });
});

describe('contexte d’une réservation', () => {
  const t = (h, m = 0) => new Date(2026, 8, 14, h, m);
  const equipe = new Map([
    ['a', { id: 'a', prenom: 'Ada', nom: 'Lovelace' }],
    ['b', { id: 'b', prenom: 'Paul', nom: 'Martin' }],
  ]);

  it('minutesEntre arrondit, ne descend jamais sous zéro et encaisse l’invalide', () => {
    expect(minutesEntre(t(14), t(15, 45))).toBe(105);
    expect(minutesEntre(t(15), t(14))).toBe(0);
    expect(minutesEntre('n’importe quoi', t(14))).toBe(0);
  });

  it('accompagnants nettoie la colonne tableau, absente sur les lignes anciennes', () => {
    expect(accompagnants({ avec: ['a', null, 'b'] })).toEqual(['a', 'b']);
    expect(accompagnants({})).toEqual([]);
    expect(accompagnants(null)).toEqual([]);
  });

  it('le titulaire compte toujours pour un, même sans accompagnants', () => {
    expect(nombreParticipants({})).toBe(1);
    expect(nombreParticipants({ avec: ['a', 'b'], invites: 2 })).toBe(5);
    expect(nombreParticipants({ invites: -3 })).toBe(1);
  });

  it('le libellé nomme ceux qu’on connaît et compte les autres', () => {
    expect(libelleAccompagnants({ avec: ['a'], invites: 0 }, equipe)).toBe('avec Ada Lovelace');
    expect(libelleAccompagnants({ avec: ['a', 'b'], invites: 2 }, equipe))
      .toBe('avec Ada Lovelace, Paul Martin et 2 invités');
    expect(libelleAccompagnants({ invites: 1 }, equipe)).toBe('avec 1 invité');
    expect(libelleAccompagnants({}, equipe)).toBe('');
  });

  it('un membre supprimé retombe dans les invités au lieu de disparaître', () => {
    // Sans ça, une réunion à quatre s’afficherait à trois : le compte et le
    // libellé se contrediraient dès la première suppression de membre.
    const r = { avec: ['a', 'fantome'], invites: 0 };
    expect(libelleAccompagnants(r, equipe)).toBe('avec Ada Lovelace et 1 invité');
    expect(nombreParticipants(r)).toBe(3);
  });

  it('une table de correspondance en objet simple marche aussi', () => {
    expect(libelleAccompagnants({ avec: ['b'] }, { b: { prenom: 'Paul' } })).toBe('avec Paul');
  });
});

describe('mise en forme', () => {
  it('pourcent et euro suivent la typographie française', () => {
    expect(pourcent(0.675, 1)).toBe('67,5 %');
    expect(pourcent(NaN)).toBe('—');
  });
});

describe('groupes et recherche du planning', () => {
  const equipe = [
    membre(1, TOUS, { prenom: 'Zoé', nom: 'Martin', equipe: 'R & D' }),
    membre(2, TOUS, { prenom: 'Ana', nom: 'Élan', equipe: 'Ventes' }),
    membre(3, TOUS, { prenom: 'Léo', nom: 'Bô', equipe: '' }),
    membre(4, TOUS, { prenom: 'Max', nom: 'Roux', equipe: 'r&d' }),
  ];

  it('grouperParEquipe fusionne les graphies, trie en français, met les sans-équipe en dernier', () => {
    const g = grouperParEquipe(equipe);
    expect(g.map((x) => x.label)).toEqual(['R & D', 'Ventes', 'Sans groupe']);
    expect(g[0].membres.map((m) => m.id)).toEqual([1, 4]);
    expect(g[2].membres.map((m) => m.id)).toEqual([3]);
  });

  it('filtrerMembres ignore accents et casse, cherche le nom ou l’équipe, rend la même liste à vide', () => {
    expect(filtrerMembres(equipe, '')).toBe(equipe);
    expect(filtrerMembres(equipe, 'elan').map((m) => m.id)).toEqual([2]);
    expect(filtrerMembres(equipe, 'R&D').map((m) => m.id)).toEqual([1, 4]);
    expect(filtrerMembres(equipe, 'zz')).toEqual([]);
  });
});

describe('vue d’un jour', () => {
  it('jourDetaille dit si le bureau ouvre, et pourquoi pas', () => {
    const lundi = jourDetaille(new Date(2026, 8, 14));
    expect(lundi).toMatchObject({ n: 1, label: 'Lundi', cle: '2026-09-14', ferie: null, ouvre: true });
    expect(jourDetaille(new Date(2026, 8, 12))).toMatchObject({ n: 6, ouvre: false, ferie: null });
    expect(jourDetaille(new Date(2026, 4, 1))).toMatchObject({ n: 5, ouvre: false, ferie: 'Fête du Travail' });
    expect(jourDetaille(new Date(2026, 8, 12), [1, 2, 3, 4, 5, 6]).ouvre).toBe(true);
  });

  it('jourOuvreVoisin saute week-ends et fériés dans les deux sens', () => {
    expect(cleJour(jourOuvreVoisin(new Date(2026, 8, 11), 1))).toBe('2026-09-14');
    expect(cleJour(jourOuvreVoisin(new Date(2026, 8, 14), -1))).toBe('2026-09-11');
    // 30 avril 2026 → saute le 1er mai (vendredi férié) et le week-end.
    expect(cleJour(jourOuvreVoisin(new Date(2026, 3, 30), 1))).toBe('2026-05-04');
  });

  it('jourOuvreVoisin avance quand même si rien n’ouvre jamais', () => {
    expect(cleJour(jourOuvreVoisin(new Date(2026, 8, 14), 1, []))).toBe('2026-09-15');
  });

  it('une fermeture propre à l’espace ferme le jour et donne son motif', () => {
    const fermetures = { '2026-09-16': 'Séminaire', '2026-05-01': 'Inventaire' };
    expect(raisonFermeture(new Date(2026, 8, 16), fermetures)).toBe('Séminaire');
    expect(raisonFermeture(new Date(2026, 8, 17), fermetures)).toBe(null);
    // Le motif de l'espace prime sur le nom du férié national.
    expect(raisonFermeture(new Date(2026, 4, 1), fermetures)).toBe('Inventaire');
    expect(raisonFermeture(new Date(2026, 4, 1), {})).toBe('Fête du Travail');
    // Un motif vide ou une carte absente ne ferment rien.
    expect(raisonFermeture(new Date(2026, 8, 16), { '2026-09-16': '  ' })).toBe(null);
    expect(raisonFermeture(new Date(2026, 8, 16), null)).toBe(null);

    expect(jourDetaille(new Date(2026, 8, 16), undefined, fermetures)).toMatchObject({ ouvre: false, ferie: 'Séminaire' });
    const semaine = joursDeSemaine(new Date(2026, 8, 14), undefined, fermetures);
    expect(semaine.map((j) => j.ferie)).toEqual([null, null, 'Séminaire', null, null]);
    // Les flèches sautent le jour fermé.
    expect(cleJour(jourOuvreVoisin(new Date(2026, 8, 15), 1, undefined, fermetures))).toBe('2026-09-17');
    expect(cleJour(jourOuvreVoisin(new Date(2026, 8, 17), -1, undefined, fermetures))).toBe('2026-09-15');
  });

  // Miroir de `om_rythme_couvre_semaine` (SQL) : c'est lui qui décide si le
  // rappel du lundi part encore.
  it('un rythme ne couvre la semaine que si les cinq jours ouvrés sont déclarés', () => {
    expect(rythmeCouvreSemaine({ 1: 'bureau', 2: 'bureau', 3: 'teletravail', 4: 'bureau', 5: 'absent' })).toBe(true);
    // Le week-end ne compte pas : personne n'est relancé pour un samedi.
    expect(rythmeCouvreSemaine({ 1: 'bureau', 2: 'bureau', 3: 'bureau', 4: 'bureau', 5: 'bureau', 6: 'absent' })).toBe(true);
    // Un seul jour effacé et la question redevient ouverte : le mail repart.
    expect(rythmeCouvreSemaine({ 1: 'bureau', 2: 'bureau', 3: 'teletravail', 4: 'bureau' })).toBe(false);
    // Une valeur inconnue ne vaut pas une réponse.
    expect(rythmeCouvreSemaine({ 1: 'bureau', 2: 'bureau', 3: 'bureau', 4: 'bureau', 5: 'au bureau' })).toBe(false);
    expect(rythmeCouvreSemaine({})).toBe(false);
    expect(rythmeCouvreSemaine(null)).toBe(false);
    expect(rythmeCouvreSemaine('bureau')).toBe(false);
  });
});
