import { describe, expect, it } from 'vitest';
import { indexerPresences } from './model';
import {
  palier, planDuJour, syntheseDuJour, syntheseOccupation, tauxOccupation,
} from './occupation';

const lundi = { cle: '2026-09-21', n: 1 };
const mardi = { cle: '2026-09-22', n: 2 };
const membres = [
  { id: 'ana', prenom: 'Ana', nom: 'B', rythme: { 1: 'bureau', 2: 'teletravail' } },
  { id: 'leo', prenom: 'Léo', nom: 'C', rythme: {} },
];
const postes = [
  { id: 'p1', genre: 'flex' },
  { id: 'p2', genre: 'attitre', membre_id: 'ana' },
  { id: 'p3', genre: 'bloque' },
  { id: 'p4', genre: 'flex' },
];
const salles = [{ id: 's1' }];
const reservations = [
  { ressource_id: 'p1', jour: '2026-09-21', membre_id: 'leo' },
  { ressource_id: 's1', jour: '2026-09-21', libelle: 'Point' },
  { ressource_id: 's1', jour: '2026-09-21', libelle: 'Revue' },
];

describe('planDuJour', () => {
  it('réservé, titulaire présent, bloqué, libre', () => {
    const e = planDuJour({ postes, salles, reservations, membres, index: new Map(), jour: lundi });
    expect(e.get('p1')).toMatchObject({ etat: 'reserve', membre: { id: 'leo' } });
    expect(e.get('p2')).toMatchObject({ etat: 'titulaire', membre: { id: 'ana' } });
    expect(e.get('p3').etat).toBe('bloque');
    expect(e.get('p4').etat).toBe('libre');
    expect(e.get('s1')).toMatchObject({ etat: 'reserve', n: 2, libelle: 'Point' });
  });

  it('un titulaire en télétravail libère son poste', () => {
    const e = planDuJour({ postes, membres, jour: mardi });
    expect(e.get('p2').etat).toBe('libere');
  });

  it('la présence déclarée prime sur le rythme', () => {
    const index = indexerPresences([{ membre_id: 'ana', jour: '2026-09-21', statut: 'absent' }]);
    expect(planDuJour({ postes, membres, index, jour: lundi }).get('p2').etat).toBe('libere');
  });

  it('un poste attitré réservé par un autre est réservé', () => {
    const e = planDuJour({
      postes, membres, jour: mardi, reservations: [{ ressource_id: 'p2', jour: mardi.cle, membre_id: 'leo' }],
    });
    expect(e.get('p2')).toMatchObject({ etat: 'reserve', membre: { id: 'leo' } });
  });

  it('résumé : pris, libres, libérés', () => {
    const e = planDuJour({ postes, reservations, membres, jour: mardi });
    expect(syntheseDuJour(e, postes)).toEqual({ pris: 0, libres: 2, liberes: 1 });
  });
});

describe('tauxOccupation', () => {
  it('compte les jours servis, titulaire compris, bloqué absent', () => {
    const t = tauxOccupation({ postes, salles, reservations, membres, jours: [lundi, mardi] });
    expect(t.get('p1')).toEqual({ jours: 1, sur: 2, taux: 0.5 });
    expect(t.get('p2')).toEqual({ jours: 1, sur: 2, taux: 0.5 });
    expect(t.has('p3')).toBe(false);
    expect(t.get('p4').jours).toBe(0);
    expect(t.get('s1').jours).toBe(1);
  });

  it('sans jour, rien', () => {
    expect(tauxOccupation({ postes, jours: [] }).size).toBe(0);
  });

  it('synthèse : moyenne et jamais pris', () => {
    const t = tauxOccupation({ postes, reservations, membres, jours: [lundi, mardi] });
    expect(syntheseOccupation(t, postes)).toEqual({ moyenne: 0.33, jamais: 1, pleins: 0, n: 3 });
  });
});

describe('palier', () => {
  it('cinq crans', () => {
    expect([0, 0.05, 0.1, 0.4, 0.6, 0.8, 1].map(palier)).toEqual([0, 0, 1, 2, 3, 4, 4]);
    expect(palier(NaN)).toBe(0);
  });
});
