import { describe, expect, it } from 'vitest';
import { estFerie, feriesDe, nomFerie, paquesDe } from './feries';
import { joursDeSemaine } from './model';
import { joursOuvresEntre } from './periodes';
import { syntheseUsage } from './model';

const cle = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('paquesDe', () => {
  // Dates de référence (dimanche de Pâques, calendrier grégorien). Une erreur
  // de Meeus/Butcher ne se voit pas sur une seule année : elle se voit sur la
  // décennie, parce que le cycle métonique fait 19 ans.
  const REFERENCE = {
    2020: '2020-04-12',
    2021: '2021-04-04',
    2022: '2022-04-17',
    2023: '2023-04-09',
    2024: '2024-03-31',
    2025: '2025-04-20',
    2026: '2026-04-05',
    2027: '2027-03-28',
    2028: '2028-04-16',
    2029: '2029-04-01',
    2030: '2030-04-21',
    2038: '2038-04-25', // la plus tardive possible du siècle
  };
  it('retrouve chaque dimanche de Pâques', () => {
    Object.entries(REFERENCE).forEach(([an, attendu]) => {
      expect(cle(paquesDe(Number(an)))).toBe(attendu);
    });
  });
  it('rend une date locale à minuit, pas un instant UTC', () => {
    const p = paquesDe(2026);
    expect(p.getHours()).toBe(0);
    expect(p.getMonth()).toBe(3); // avril, pas mars — le piège de `toISOString`
  });
});

describe('feriesDe', () => {
  it('rend onze jours par an', () => {
    expect(feriesDe(2026).size).toBe(11);
    expect(feriesDe(2027).size).toBe(11);
  });
  it('place les mobiles à partir de Pâques', () => {
    const f = feriesDe(2026); // Pâques le 5 avril
    expect(f.get('2026-04-06')).toBe('Lundi de Pâques');
    expect(f.get('2026-05-14')).toBe('Ascension');
    expect(f.get('2026-05-25')).toBe('Lundi de Pentecôte');
  });
  it('place les fixes', () => {
    const f = feriesDe(2026);
    expect(f.get('2026-01-01')).toBe('Jour de l’an');
    expect(f.get('2026-05-01')).toBe('Fête du Travail');
    expect(f.get('2026-07-14')).toBe('Fête nationale');
    expect(f.get('2026-12-25')).toBe('Noël');
  });
  it('ne prétend rien pour une année absurde', () => {
    expect(feriesDe('bureau').size).toBe(0);
  });
});

describe('nomFerie', () => {
  it('accepte une clé comme une Date', () => {
    expect(nomFerie('2026-05-01')).toBe('Fête du Travail');
    expect(nomFerie(new Date(2026, 4, 1))).toBe('Fête du Travail');
  });
  it('rend null hors férié et sur une entrée illisible', () => {
    expect(nomFerie('2026-05-04')).toBe(null);
    expect(nomFerie('')).toBe(null);
    expect(nomFerie(null)).toBe(null);
    expect(nomFerie('pas une date')).toBe(null);
    expect(estFerie('2026-05-01')).toBe(true);
    expect(estFerie('2026-05-04')).toBe(false);
  });
});

describe('le tag remonte dans les deux générateurs de jours', () => {
  it('joursDeSemaine marque la semaine du 1er mai 2026', () => {
    // 2026-05-01 est un vendredi.
    const jours = joursDeSemaine(new Date(2026, 3, 27), [1, 2, 3, 4, 5]);
    expect(jours.map((j) => j.ferie)).toEqual([null, null, null, null, 'Fête du Travail']);
  });
  it('joursOuvresEntre marque le même jour', () => {
    const jours = joursOuvresEntre('2026-04-27', '2026-05-01', [1, 2, 3, 4, 5]);
    expect(jours.find((j) => j.cle === '2026-05-01').ferie).toBe('Fête du Travail');
  });
});

describe('syntheseUsage écarte les fériés', () => {
  const membres = [
    { id: 'a', prenom: 'Ana', rythme: { 1: 'bureau', 2: 'bureau', 3: 'bureau', 4: 'bureau', 5: 'bureau' } },
    { id: 'b', prenom: 'Bo', rythme: { 1: 'bureau', 2: 'bureau', 3: 'bureau', 4: 'bureau', 5: 'bureau' } },
  ];
  const semaine = joursDeSemaine(new Date(2026, 3, 27), [1, 2, 3, 4, 5]);

  it('ne compte pas le vendredi férié comme un creux à zéro', () => {
    const s = syntheseUsage({ membres, presences: [], jours: semaine, postesFactures: 2 });
    expect(s.serie.length).toBe(4);
    expect(s.pic).toBe(2);
    expect(s.creux).toBe(2);
    expect(s.moyenne).toBe(2);
    expect(s.verdict).toBe('juste');
  });

  it('sans le filtre, le même jeu aurait fabriqué un creux', () => {
    const brut = syntheseUsage({
      membres, presences: [], postesFactures: 2,
      jours: semaine.map(({ ferie, ...reste }) => reste),
    });
    expect(brut.creux).toBe(2); // le rythme remplit aussi le vendredi…
    expect(brut.serie.length).toBe(5); // …mais la journée fermée était comptée
  });
});
