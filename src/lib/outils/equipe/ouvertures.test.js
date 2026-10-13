import { describe, expect, it } from 'vitest';
import {
  LARGEUR, OUVERTURES_MAX, TYPES_OUVERTURE, bornesOuverture, deplacerOuverture,
  etirerOuverture, nettoyerOuverture, nettoyerOuvertures, ouvertureProche, poserOuverture, projeter,
  retournerOuverture,
  typeOuverture,
} from '@/lib/outils/equipe/ouvertures';

const MUR_BAS = [[[0, 0], [100, 0]]];

describe('projeter', () => {
  it('colle le point au mur et en prend le cap', () => {
    const sur = projeter(MUR_BAS, { x: 40, y: 3 });
    expect(sur).toMatchObject({ x: 40, y: 0, a: 0 });
    expect(sur.d).toBeCloseTo(3);
  });

  it('ne sort pas du segment', () => {
    expect(projeter(MUR_BAS, { x: 140, y: 1 }, { seuil: 60 })).toMatchObject({ x: 100, y: 0 });
  });

  it('rend null au-delà du seuil', () => {
    expect(projeter(MUR_BAS, { x: 40, y: 30 })).toBeNull();
  });

  it('prend le mur le plus proche', () => {
    const murs = [[[0, 0], [100, 0]], [[0, 50], [100, 50]]];
    expect(projeter(murs, { x: 20, y: 46 })).toMatchObject({ y: 50 });
  });

  it('donne le cap du segment, pas celui de la souris', () => {
    expect(projeter([[[0, 0], [0, 60]]], { x: 4, y: 20 })).toMatchObject({ a: 90 });
  });

  it('ignore un segment de longueur nulle', () => {
    expect(projeter([[[10, 10], [10, 10]]], { x: 10, y: 11 })).toBeNull();
  });
});

describe('poserOuverture', () => {
  it('pose la largeur du type demandé', () => {
    expect(poserOuverture(MUR_BAS, { x: 30, y: 2 }, { type: 'double' }))
      .toEqual({ x: 30, y: 0, a: 0, l: 16, k: 'double' });
  });

  it('refuse de poser dans le vide', () => {
    expect(poserOuverture(MUR_BAS, { x: 30, y: 40 }, { type: 'simple' })).toBeNull();
  });

  it('retombe sur la porte simple si le type est inventé', () => {
    expect(poserOuverture(MUR_BAS, { x: 30, y: 1 }, { type: 'sas' }).k).toBe('simple');
  });
});

describe('deplacerOuverture', () => {
  const porte = { x: 30, y: 0, a: 0, l: 9, k: 'simple' };

  it('reprend le cap du mur d’arrivée', () => {
    const murs = [...MUR_BAS, [[0, 0], [0, 80]]];
    expect(deplacerOuverture(porte, murs, { x: 2, y: 40 })).toMatchObject({ x: 0, y: 40, a: 90 });
  });

  it('ne bouge pas hors des murs', () => {
    expect(deplacerOuverture(porte, MUR_BAS, { x: 30, y: 90 })).toEqual(porte);
  });

  it('garde le type et la largeur', () => {
    const large = { ...porte, k: 'coulissante', l: 20 };
    expect(deplacerOuverture(large, MUR_BAS, { x: 60, y: 1 })).toMatchObject({ k: 'coulissante', l: 20 });
  });
});

describe('bornesOuverture', () => {
  it('ouvre de part et d’autre du point', () => {
    expect(bornesOuverture({ x: 30, y: 0, a: 0, l: 10, k: 'simple' }))
      .toEqual({ a: { x: 25, y: 0 }, b: { x: 35, y: 0 } });
  });

  it('suit le cap', () => {
    const b = bornesOuverture({ x: 0, y: 40, a: 90, l: 10, k: 'simple' });
    expect(b.a.y).toBeCloseTo(35);
    expect(b.b.y).toBeCloseTo(45);
  });

  it('rend null sur une ouverture illisible', () => {
    expect(bornesOuverture({ k: 'sas' })).toBeNull();
  });
});

describe('ouvertureProche', () => {
  const liste = [
    { x: 30, y: 0, a: 0, l: 10, k: 'simple' },
    { x: 80, y: 0, a: 0, l: 10, k: 'double' },
  ];

  it('trouve celle qu’on vise', () => {
    expect(ouvertureProche(liste, { x: 79, y: 1 })).toBe(1);
  });

  it('rend -1 loin de tout', () => {
    expect(ouvertureProche(liste, { x: 55, y: 30 })).toBe(-1);
  });
});

describe('nettoyerOuverture', () => {
  it('refuse un type hors liste', () => {
    expect(nettoyerOuverture({ x: 1, y: 1, a: 0, l: 9, k: 'sas' })).toBeNull();
  });

  it('refuse un point hors plan', () => {
    expect(nettoyerOuverture({ x: -1, y: 0, a: 0, l: 9, k: 'simple' })).toBeNull();
  });

  it('ramène le cap dans le tour', () => {
    expect(nettoyerOuverture({ x: 1, y: 1, a: -90, l: 9, k: 'simple' }).a).toBe(270);
  });

  it('borne la largeur', () => {
    expect(nettoyerOuverture({ x: 1, y: 1, a: 0, l: 900, k: 'simple' }).l).toBe(LARGEUR.maxi);
    expect(nettoyerOuverture({ x: 1, y: 1, a: 0, l: 0.1, k: 'simple' }).l).toBe(LARGEUR.mini);
  });
});

describe('nettoyerOuvertures', () => {
  it('écarte les intruses et tient le plafond', () => {
    const trop = Array.from({ length: OUVERTURES_MAX + 5 }, () => ({ x: 1, y: 1, a: 0, l: 9, k: 'simple' }));
    expect(nettoyerOuvertures([...trop, null, { k: 'sas' }])).toHaveLength(OUVERTURES_MAX);
  });

  it('accepte une liste vide', () => {
    expect(nettoyerOuvertures(undefined)).toEqual([]);
  });
});

describe('typeOuverture', () => {
  it('rend toujours un type dessinable', () => {
    expect(TYPES_OUVERTURE.map((t) => typeOuverture(t.cle).cle)).toEqual(TYPES_OUVERTURE.map((t) => t.cle));
    expect(typeOuverture(undefined).cle).toBe('simple');
  });
});

describe('etirerOuverture', () => {
  const porte = { x: 30, y: 0, a: 0, l: 10, k: 'simple' };

  it('garde l’autre bout en place', () => {
    // Bout `a` en 25, bout `b` en 35 : tirer `b` jusqu'à 45 donne 20 de large,
    // centrée en 35 — le 25 n'a pas bougé.
    expect(etirerOuverture(porte, 'b', { x: 45, y: 0 })).toMatchObject({ x: 35, l: 20 });
  });

  it('tire aussi par le bout de gauche', () => {
    expect(etirerOuverture(porte, 'a', { x: 15, y: 0 })).toMatchObject({ x: 25, l: 20 });
  });

  it('borne la largeur', () => {
    expect(etirerOuverture(porte, 'b', { x: 26, y: 0 }).l).toBe(LARGEUR.mini);
    expect(etirerOuverture(porte, 'b', { x: 900, y: 0 }).l).toBe(LARGEUR.maxi);
  });

  it('suit le cap du mur, pas la souris', () => {
    const debout = { x: 0, y: 40, a: 90, l: 10, k: 'simple' };
    expect(etirerOuverture(debout, 'b', { x: 30, y: 55 })).toMatchObject({ a: 90, l: 20 });
  });
});

describe('retournerOuverture', () => {
  const porte = { x: 30, y: 0, a: 0, l: 9, k: 'simple' };

  it('n’écrit le miroir que s’il sert', () => {
    expect(porte.m).toBeUndefined();
    expect(retournerOuverture(porte).m).toBe(1);
    expect(retournerOuverture(retournerOuverture(porte)).m).toBeUndefined();
  });

  it('change de côté sans bouger le trou', () => {
    expect(retournerOuverture(porte)).toMatchObject({ x: 30, y: 0, a: 0, l: 9 });
  });

  it('change de gond par un demi-tour et un miroir', () => {
    const g = retournerOuverture(porte, 'charniere');
    expect(g).toMatchObject({ a: 180, m: 1, x: 30 });
  });

  it('rend null sur une ouverture illisible', () => {
    expect(retournerOuverture({ k: 'sas' })).toBeNull();
  });
});
