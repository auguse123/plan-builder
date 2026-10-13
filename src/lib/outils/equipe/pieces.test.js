import { describe, expect, it } from 'vitest';
import { metresDuPlan, piecesDuPlan } from './pieces';

// Une boîte de 4 × 3 m, tracée d'un seul trait fermé.
const boite = [[0, 0], [40, 0], [40, 30], [0, 30], [0, 0]];

describe('piecesDuPlan', () => {
  it('un tracé fermé fait une pièce, surface entre axes', () => {
    const p = piecesDuPlan([boite], []);
    expect(p).toHaveLength(1);
    expect(p[0].brute).toBe(12);
  });
  it('la surface nette déduit les demi-murs', () => {
    // Murs de 20 cm : 10 cm pris de chaque côté, 14 m de pourtour → 1,4 m².
    const [p] = piecesDuPlan([boite], [2]);
    expect(p.aire).toBeCloseTo(10.6, 1);
  });
  it('quatre murs séparés ferment aussi la pièce', () => {
    const murs = [[[0, 0], [40, 0]], [[40, 0], [40, 30]], [[40, 30], [0, 30]], [[0, 30], [0, 0]]];
    expect(piecesDuPlan(murs, []).map((p) => p.brute)).toEqual([12]);
  });
  it('une cloison en T coupe la pièce en deux', () => {
    const p = piecesDuPlan([boite, [[20, 0], [20, 30]]], []);
    expect(p.map((x) => x.brute).sort()).toEqual([6, 6]);
  });
  it('une cloison posée sur la FACE d’un mur épais ferme quand même', () => {
    // Mur de 40 cm : faces à ±2 de l'axe. La cloison s'arrête aux faces.
    const p = piecesDuPlan([boite, [[20, 2], [20, 28]]], [4, 1]);
    expect(p).toHaveLength(2);
  });
  it('deux murs qui se croisent sans sommet commun se coupent', () => {
    const p = piecesDuPlan([boite, [[-5, 15], [45, 15]]], []);
    expect(p).toHaveLength(2);
  });
  it('un tracé ouvert ne fait pas de pièce', () => {
    expect(piecesDuPlan([[[0, 0], [40, 0], [40, 30]]], [])).toEqual([]);
  });
  it('un bout de mur qui dépasse ne gêne pas', () => {
    const p = piecesDuPlan([boite, [[40, 15], [60, 15]]], []);
    expect(p.map((x) => x.brute)).toEqual([12]);
  });
  it("l'étiquette tombe dans la pièce, même en L", () => {
    const L = [[0, 0], [40, 0], [40, 10], [10, 10], [10, 40], [0, 40], [0, 0]];
    const [p] = piecesDuPlan([L], []);
    const c = p.centre;
    expect(c.x < 10 || c.y < 10).toBe(true);
  });
  it('rien sans murs', () => expect(piecesDuPlan([], [])).toEqual([]));
});

describe('cotes des pièces', () => {
  it('une pièce droite donne ses cotes nettes', () => {
    // 4 × 3 m entre axes, murs de 20 cm : 3,8 × 2,8 m dedans.
    const [p] = piecesDuPlan([boite], [2]);
    expect(p.cotes).toEqual({ l: 3.8, h: 2.8 });
  });
  it('un T de cloison ne casse pas les cotes', () => {
    const p = piecesDuPlan([boite, [[20, 0], [20, 30]]], [2, 2]);
    expect(p.map((x) => x.cotes)).toEqual([{ l: 1.8, h: 2.8 }, { l: 1.8, h: 2.8 }]);
  });
  it('une pièce en L n’a pas de cotes', () => {
    const L = [[0, 0], [40, 0], [40, 10], [10, 10], [10, 40], [0, 40], [0, 0]];
    expect(piecesDuPlan([L], [])[0].cotes).toBeNull();
  });
});

describe('metresDuPlan', () => {
  it('surface, linéaire, m² par poste', () => {
    const pieces = piecesDuPlan([boite], [2]);
    const m = metresDuPlan([boite], pieces, 2);
    expect(m.lineaire).toBe(14);
    expect(m.surface).toBeCloseTo(10.6, 1);
    expect(m.parPoste).toBeCloseTo(5.3, 1);
  });
  it('sans poste, pas de ratio', () => {
    expect(metresDuPlan([], [], 0)).toEqual({ surface: 0, lineaire: 0, parPoste: null });
  });
});
