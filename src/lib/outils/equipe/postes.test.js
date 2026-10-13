import { describe, expect, it } from 'vitest';
import {
  CRENEAUX_LISTE,
  GENRES,
  bornesCreneau,
  capaciteFlex,
  creneauDe,
  creneauxSeChevauchent,
  dernierJourOuvert,
  horizonOuvert,
  numeroSuivant,
  occupationPostes,
  posteLibre,
  postesDeZone,
} from './postes.js';

const HEURES = { heure_ouverture: 9, heure_bascule: 13, heure_fermeture: 18 };

describe('bornesCreneau', () => {
  it('découpe la journée aux heures de l’espace', () => {
    const matin = bornesCreneau('2026-03-17', 'matin', HEURES);
    expect(matin.debut.getHours()).toBe(9);
    expect(matin.fin.getHours()).toBe(13);
    const aprem = bornesCreneau('2026-03-17', 'apres_midi', HEURES);
    expect(aprem.debut.getHours()).toBe(13);
    expect(aprem.fin.getHours()).toBe(18);
    const jour = bornesCreneau('2026-03-17', 'journee', HEURES);
    expect(jour.debut.getHours()).toBe(9);
    expect(jour.fin.getHours()).toBe(18);
  });

  it('suit les heures d’un espace qui ouvre tôt', () => {
    const m = bornesCreneau('2026-03-17', 'matin', { heure_ouverture: 7, heure_bascule: 12, heure_fermeture: 20 });
    expect(m.debut.getHours()).toBe(7);
    expect(m.fin.getHours()).toBe(12);
  });

  it('retombe sur la journée par défaut si les heures sont incohérentes', () => {
    const m = bornesCreneau('2026-03-17', 'matin', { heure_ouverture: 18, heure_bascule: 9, heure_fermeture: 8 });
    expect(m.debut.getHours()).toBe(9);
    expect(m.fin.getHours()).toBe(13);
  });

  it('bascule au lendemain quand l’espace ferme à minuit', () => {
    const j = bornesCreneau('2026-03-17', 'journee', { heure_ouverture: 9, heure_bascule: 13, heure_fermeture: 24 });
    expect(j.fin.getDate()).toBe(18);
    expect(j.fin.getHours()).toBe(0);
  });

  it('reste sur le jour demandé le dimanche du changement d’heure', () => {
    // 29 mars 2026 : la nuit fait 23 h. Des bornes fabriquées en UTC
    // glisseraient d'une heure ; construites en local, elles ne bougent pas.
    const j = bornesCreneau('2026-03-29', 'journee', HEURES);
    expect(j.debut.getDate()).toBe(29);
    expect(j.debut.getHours()).toBe(9);
    expect(j.fin.getHours()).toBe(18);
  });
});

describe('creneauDe', () => {
  const prise = (h1, h2) => ({
    debut: new Date(2026, 2, 17, h1).toISOString(),
    fin: new Date(2026, 2, 17, h2).toISOString(),
  });

  it('déduit le créneau des bornes, comme la base', () => {
    expect(creneauDe(prise(9, 13), HEURES)).toBe('matin');
    expect(creneauDe(prise(13, 18), HEURES)).toBe('apres_midi');
    expect(creneauDe(prise(9, 18), HEURES)).toBe('journee');
  });

  it('range la bascule elle-même dans l’après-midi', () => {
    expect(creneauDe(prise(13, 14), HEURES)).toBe('apres_midi');
  });

  it('rend null sur une prise sans bornes', () => {
    expect(creneauDe(null, HEURES)).toBe(null);
    expect(creneauDe({ debut: 'pas une date', fin: 'pas une date' }, HEURES)).toBe(null);
  });
});

describe('creneauxSeChevauchent', () => {
  it('fait de la journée l’ennemie des deux moitiés', () => {
    expect(creneauxSeChevauchent('journee', 'matin')).toBe(true);
    expect(creneauxSeChevauchent('apres_midi', 'journee')).toBe(true);
  });

  it('laisse cohabiter un matin et un après-midi', () => {
    expect(creneauxSeChevauchent('matin', 'apres_midi')).toBe(false);
  });
});

describe('posteLibre', () => {
  const flex = { id: 'p1', genre: 'flex', actif: true };
  const jour = '2026-03-17';
  const prise = (id, h1, h2, mienne = false) => ({
    ressource_id: id,
    jour,
    mienne,
    debut: new Date(2026, 2, 17, h1).toISOString(),
    fin: new Date(2026, 2, 17, h2).toISOString(),
  });

  it('dit libre un poste flex que personne n’a pris', () => {
    expect(posteLibre(flex, { jour, creneau: 'matin', heures: HEURES })).toEqual({ libre: true, motif: null });
  });

  it('refuse un poste bloqué, même vide', () => {
    expect(posteLibre({ ...flex, genre: 'bloque' }, { jour, heures: HEURES }).motif).toBe('poste_bloque');
  });

  it('refuse un poste inactif', () => {
    expect(posteLibre({ ...flex, actif: false }, { jour, heures: HEURES }).motif).toBe('ressource_inactive');
  });

  it('garde un poste attitré à son titulaire', () => {
    const attitre = { ...flex, genre: 'attitre', membre_id: 'm2' };
    expect(posteLibre(attitre, { jour, membreId: 'm1', heures: HEURES }).motif).toBe('poste_reserve_titulaire');
    expect(posteLibre(attitre, { jour, membreId: 'm2', heures: HEURES }).libre).toBe(true);
  });

  it('ne libère un attitré que si l’espace le veut ET que le titulaire est absent', () => {
    const attitre = { ...flex, genre: 'attitre', membre_id: 'm2' };
    const args = { jour, membreId: 'm1', heures: HEURES, attitresLiberables: true };
    expect(posteLibre(attitre, { ...args, titulairePresent: true }).motif).toBe('poste_reserve_titulaire');
    expect(posteLibre(attitre, { ...args, titulairePresent: false }).libre).toBe(true);
  });

  it('voit le conflit sur le créneau demandé, pas sur l’autre', () => {
    const prises = [prise('p1', 9, 13)];
    expect(posteLibre(flex, { prises, jour, creneau: 'matin', heures: HEURES }).motif).toBe('occupe');
    expect(posteLibre(flex, { prises, jour, creneau: 'apres_midi', heures: HEURES }).libre).toBe(true);
    expect(posteLibre(flex, { prises, jour, creneau: 'journee', heures: HEURES }).motif).toBe('occupe');
  });

  it('ne se bloque pas sur sa propre prise', () => {
    const prises = [prise('p1', 9, 18, true)];
    expect(posteLibre(flex, { prises, jour, creneau: 'journee', heures: HEURES })).toEqual({
      libre: true,
      motif: 'mienne',
    });
  });

  it('ignore une prise d’un autre jour', () => {
    const prises = [{ ...prise('p1', 9, 18), jour: '2026-03-18' }];
    expect(posteLibre(flex, { prises, jour, creneau: 'journee', heures: HEURES }).libre).toBe(true);
  });
});

describe('capaciteFlex', () => {
  const postes = [
    { id: '1', genre: 'flex', actif: true },
    { id: '2', genre: 'flex', actif: false },
    { id: '3', genre: 'bloque', actif: true },
    { id: '4', genre: 'attitre', actif: true, membre_id: 'm1' },
  ];

  it('ne compte ni les bloqués ni les inactifs ni les attitrés', () => {
    expect(capaciteFlex(postes)).toBe(1);
  });

  it('compte les attitrés quand l’espace les libère', () => {
    expect(capaciteFlex(postes, { attitresLiberables: true })).toBe(2);
  });

  it('rend zéro sans postes', () => {
    expect(capaciteFlex(null)).toBe(0);
  });
});

describe('occupationPostes', () => {
  it('compte pris et libres sur le créneau demandé', () => {
    const postes = [
      { id: 'a', genre: 'flex', actif: true },
      { id: 'b', genre: 'flex', actif: true },
      { id: 'c', genre: 'bloque', actif: true },
    ];
    const prises = [
      {
        ressource_id: 'a',
        jour: '2026-03-17',
        debut: new Date(2026, 2, 17, 9).toISOString(),
        fin: new Date(2026, 2, 17, 13).toISOString(),
      },
    ];
    expect(occupationPostes(postes, prises, { jour: '2026-03-17', creneau: 'matin', heures: HEURES })).toEqual({
      total: 2,
      pris: 1,
      libres: 1,
    });
    expect(occupationPostes(postes, prises, { jour: '2026-03-17', creneau: 'apres_midi', heures: HEURES })).toEqual({
      total: 2,
      pris: 0,
      libres: 2,
    });
  });
});

describe('horizonOuvert', () => {
  const auj = new Date(2026, 2, 17);

  it('ferme au-delà de l’horizon', () => {
    expect(horizonOuvert('2026-04-16', 30, auj)).toBe(true);
    expect(horizonOuvert('2026-04-17', 30, auj)).toBe(false);
  });

  it('laisse corriger le passé', () => {
    expect(horizonOuvert('2026-01-05', 30, auj)).toBe(true);
  });

  it('dit le dernier jour réservable', () => {
    expect(dernierJourOuvert(30, auj).getDate()).toBe(16);
    expect(dernierJourOuvert(30, auj).getMonth()).toBe(3);
  });
});

describe('numeroSuivant', () => {
  it('reprend la numérotation là où la zone s’est arrêtée', () => {
    const postes = [
      { nom: 'Poste 1', zone_id: 'z1' },
      { nom: 'Poste 7', zone_id: 'z1' },
      { nom: 'Poste 40', zone_id: 'z2' },
    ];
    expect(numeroSuivant(postes, 'z1')).toBe(8);
    expect(numeroSuivant(postes, 'z2')).toBe(41);
    expect(numeroSuivant(postes, 'z3')).toBe(1);
  });

  it('ignore un nom sans chiffre', () => {
    expect(numeroSuivant([{ nom: 'Le canapé', zone_id: 'z1' }], 'z1')).toBe(1);
  });
});

describe('postesDeZone', () => {
  it('trie par ordre puis par nom', () => {
    const postes = [
      { id: 'b', nom: 'Poste 2', zone_id: 'z1', ordre: 2 },
      { id: 'a', nom: 'Poste 1', zone_id: 'z1', ordre: 1 },
      { id: 'c', nom: 'Poste 9', zone_id: 'z2', ordre: 1 },
    ];
    expect(postesDeZone(postes, 'z1').map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('les catalogues', () => {
  it('offre trois créneaux et trois genres', () => {
    expect(CRENEAUX_LISTE.map((c) => c.cle)).toEqual(['matin', 'apres_midi', 'journee']);
    expect(Object.keys(GENRES)).toEqual(['flex', 'attitre', 'bloque']);
  });
});
