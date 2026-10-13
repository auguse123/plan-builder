import { describe, expect, it } from 'vitest';
import { chercherSurPlan, normaliser, score, vueSur } from './recherche';

const membres = [
  { id: 'lea', prenom: 'Léa', nom: 'Martin' },
  { id: 'tom', prenom: 'Tom', nom: 'Salé' },
];
const postes = [
  { id: 'p1', nom: 'P1', genre: 'attitre', membre_id: 'lea', x: 10, y: 10, l: 14, h: 7 },
  { id: 'p2', nom: 'P2', genre: 'flex', x: 30, y: 10, l: 14, h: 7 },
  { id: 'p3', nom: 'P3', genre: 'flex' },
];
const salles = [
  { id: 's1', nom: 'Grande salle', x: 50, y: 50, l: 40, h: 30 },
  { id: 's2', nom: 'Salle Bleue', x: 100, y: 50, l: 30, h: 30 },
];
const zones = [{ id: 'z1', nom: 'Open space', x: 0, y: 0, l: 100, h: 40 }];

describe('normaliser et score', () => {
  it('ignore accents et casse', () => {
    expect(normaliser('  Léa  MARTIN ')).toBe('lea martin');
  });
  it('exact, début de mot, milieu', () => {
    expect(score('p1', 'P1')).toBe(3);
    expect(score('sal', 'Grande salle')).toBe(2);
    expect(score('ll', 'Salle')).toBe(1);
    expect(score('x', 'Salle')).toBe(0);
    expect(score('', 'Salle')).toBe(0);
  });
});

describe('chercherSurPlan', () => {
  it('trouve un poste par son titulaire, sans accent', () => {
    const r = chercherSurPlan('lea', { postes, membres });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ genre: 'poste', id: 'p1', detail: 'poste de Léa Martin' });
  });
  it('trouve par le réservant du jour', () => {
    const etats = new Map([['p2', { etat: 'reserve', membre: membres[1] }]]);
    const r = chercherSurPlan('tom', { postes, membres, etats });
    expect(r[0]).toMatchObject({ id: 'p2', detail: 'Tom Salé aujourd’hui' });
  });
  it('range le début de mot avant le milieu, puis par nom', () => {
    const r = chercherSurPlan('sal', { salles, membres, postes });
    expect(r.map((x) => x.id)).toEqual(['s1', 's2']);
    expect(chercherSurPlan('salle b', { salles })[0].id).toBe('s2');
  });
  it('laisse de côté ce qui n’est pas posé', () => {
    expect(chercherSurPlan('p3', { postes })).toEqual([]);
  });
  it('trouve une zone, borne le nombre', () => {
    expect(chercherSurPlan('open', { zones })[0]).toMatchObject({ genre: 'zone', id: 'z1' });
    expect(chercherSurPlan('p', { postes, zones }, 1)).toHaveLength(1);
  });
  it('rien tapé, rien trouvé', () => {
    expect(chercherSurPlan('  ', { postes })).toEqual([]);
  });
});

describe('vueSur', () => {
  it('centre sur l’objet et zoome, sans dépasser le plafond', () => {
    const v = vueSur({ x: 10, y: 10, l: 14, h: 7 }, { largeur: 300, hauteur: 200 });
    expect(v.centre).toEqual({ x: 17, y: 13.5 });
    expect(v.zoom).toBeCloseTo(300 / 56);
  });
  it('une grande zone ne dézoome pas sous ×1', () => {
    expect(vueSur({ x: 0, y: 0, l: 300, h: 200 }, { largeur: 300, hauteur: 200 }).zoom).toBe(1);
  });
  it('sans boîte, rien', () => {
    expect(vueSur(null, { largeur: 300, hauteur: 200 })).toBeNull();
  });
});
