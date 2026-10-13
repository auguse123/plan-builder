import { describe, expect, it } from 'vitest';
import {
  EPAISSEURS, EPAISSEUR_TRAIT, TRAITS, TRAIT_DEFAUT, contourDeMur, epaisseurCommune, epaisseurDe,
  epaisseurNette, epaisseurSous, libelleEpaisseur, nettoyerEpaisseurs, pixelsDuTrait, traitNet,
} from './epaisseurs';

describe('epaisseurNette', () => {
  it('garde un nombre dans les bornes, arrondi au centimètre', () => {
    expect(epaisseurNette(3)).toBe(3);
    expect(epaisseurNette('2')).toBe(2);
    expect(epaisseurNette(1.234)).toBe(1.2);
  });

  it('refuse le reste', () => {
    for (const v of [null, undefined, 0, 0.4, 11, NaN, 'x', '', {}]) expect(epaisseurNette(v)).toBeNull();
  });

  it('chaque épaisseur proposée passe', () => {
    for (const e of EPAISSEURS) expect(epaisseurNette(e.ep)).toBe(e.ep);
  });
});

describe('nettoyerEpaisseurs', () => {
  it("s'aligne sur le nombre de murs", () => {
    expect(nettoyerEpaisseurs([3], 3)).toEqual([3, null, null]);
    expect(nettoyerEpaisseurs([3, 2, 1], 2)).toEqual([3, 2]);
    expect(nettoyerEpaisseurs(undefined, 2)).toEqual([null, null]);
    expect(nettoyerEpaisseurs([99, 'a'], 2)).toEqual([null, null]);
  });
});

describe('epaisseurDe', () => {
  it("un mur sans épaisseur garde le trait d'avant", () => {
    expect(epaisseurDe([], 0)).toBe(EPAISSEUR_TRAIT);
    expect(epaisseurDe(null, 3)).toBe(EPAISSEUR_TRAIT);
    expect(epaisseurDe([null, 5], 1)).toBe(5);
  });
});

describe('epaisseurCommune', () => {
  it('dit la valeur partagée, ou null', () => {
    expect(epaisseurCommune([3, 3, 1], [0, 1])).toBe(3);
    expect(epaisseurCommune([3, 3, 1], [0, 2])).toBeNull();
    expect(epaisseurCommune([3], [])).toBeNull();
  });
});

describe('epaisseurSous', () => {
  const murs = [[[0, 0], [100, 0]], [[0, 50], [100, 50]]];
  it("prend l'épaisseur du mur le plus proche", () => {
    expect(epaisseurSous(murs, [5, 1], { x: 40, y: 0.3 })).toBe(5);
    expect(epaisseurSous(murs, [5, 1], { x: 40, y: 49 })).toBe(1);
  });
  it('loin de tout mur, le trait fin', () => {
    expect(epaisseurSous(murs, [5, 1], { x: 40, y: 25 })).toBe(EPAISSEUR_TRAIT);
  });
});

describe('libelleEpaisseur', () => {
  it('la cote en mètres, et le mot quand il y en a un', () => {
    expect(libelleEpaisseur(1)).toBe('0.10 m — cloison');
    expect(libelleEpaisseur(1.5)).toBe('0.15 m');
  });
});

describe('contourDeMur', () => {
  it('un segment devient un rectangle de la bonne épaisseur', () => {
    expect(contourDeMur([[0, 0], [10, 0]], 2)).toBe('M0 1L10 1L10 -1L0 -1Z');
  });

  it("un coude droit prend l'onglet", () => {
    expect(contourDeMur([[0, 0], [10, 0], [10, 10]], 2)).toBe('M0 1L9 1L9 10L11 10L11 -1L0 -1Z');
  });

  it('un tracé fermé rend deux anneaux', () => {
    const d = contourDeMur([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], 2);
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d).toContain('M1 1L9 1L9 9L1 9Z');
  });

  it('un angle aigu ne pointe pas au loin', () => {
    const d = contourDeMur([[0, 0], [100, 0], [0, 1]], 2);
    const nombres = d.match(/-?[0-9.]+/g).map(Number);
    expect(Math.max(...nombres)).toBeLessThan(105);
  });

  it('rien à dessiner sous deux points', () => {
    expect(contourDeMur([[1, 1]], 2)).toBe('');
    expect(contourDeMur([[1, 1], [1, 1]], 2)).toBe('');
  });
});

describe('traitNet', () => {
  it('garde une plume entre 0,1 et 1 mm', () => {
    expect(traitNet('0.25')).toBe(0.25);
    for (const t of TRAITS) expect(traitNet(t)).toBe(t);
    for (const v of [0, 0.05, 2, 'x', null]) expect(traitNet(v)).toBeNull();
  });

  it('en pixels, jamais sous le pixel', () => {
    expect(pixelsDuTrait(0.13)).toBe(1);
    expect(pixelsDuTrait(0.5)).toBeCloseTo(1.89, 2);
    expect(pixelsDuTrait(null)).toBe(pixelsDuTrait(TRAIT_DEFAUT));
  });
});
