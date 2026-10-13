import { describe, it, expect } from 'vitest';
import {
  COTE_MEUBLE, MEUBLES_MAX, nettoyerMeuble, nettoyerMeubles,
} from './meubles.js';

describe('nettoyerMeuble', () => {
  it('rend une clé, un rectangle et un angle', () => {
    expect(nettoyerMeuble({ k: 'canape-3', x: 12.345, y: 8, l: 21, h: 9, rot: 90 }))
      .toEqual({ k: 'canape-3', x: 12.35, y: 8, l: 21, h: 9, rot: 90 });
  });

  it('écrit `rot` même à zéro : personne n’a à le deviner', () => {
    expect(nettoyerMeuble({ k: 'pouf', x: 0, y: 0, l: 6, h: 6 }).rot).toBe(0);
  });

  it('refuse une clé que la base refuserait', () => {
    // Miroir du `!~ '^[a-z0-9-]{1,40}$'` d'`om_plan_patch` : ce qui passe ici
    // doit passer là-bas, sinon l'écriture part et revient en erreur nue.
    expect(nettoyerMeuble({ k: 'Canapé 3', x: 1, y: 1, l: 4, h: 4 })).toBeNull();
    expect(nettoyerMeuble({ k: '', x: 1, y: 1, l: 4, h: 4 })).toBeNull();
    expect(nettoyerMeuble({ k: 'a'.repeat(41), x: 1, y: 1, l: 4, h: 4 })).toBeNull();
    expect(nettoyerMeuble({ x: 1, y: 1, l: 4, h: 4 })).toBeNull();
  });

  it('refuse un meuble hors du plan, borne ses côtés', () => {
    expect(nettoyerMeuble({ k: 'pouf', x: -1, y: 4, l: 6, h: 6 })).toBeNull();
    expect(nettoyerMeuble({ k: 'pouf', x: 4, y: 9999, l: 6, h: 6 })).toBeNull();
    expect(nettoyerMeuble({ k: 'tapis', x: 4, y: 4, l: 0, h: 9999 }))
      .toMatchObject({ l: COTE_MEUBLE.mini, h: COTE_MEUBLE.maxi });
  });

  it('ramène l’angle dans le tour', () => {
    expect(nettoyerMeuble({ k: 'pouf', x: 1, y: 1, l: 6, h: 6, rot: -90 }).rot).toBe(270);
    expect(nettoyerMeuble({ k: 'pouf', x: 1, y: 1, l: 6, h: 6, rot: 450 }).rot).toBe(90);
  });

  it('garde le nom quand il y en a un, sans le laisser déborder', () => {
    expect(nettoyerMeuble({ k: 'pouf', x: 1, y: 1, l: 6, h: 6, n: '  Coin détente ' }).n)
      .toBe('Coin détente');
    expect(nettoyerMeuble({ k: 'pouf', x: 1, y: 1, l: 6, h: 6, n: '   ' }).n).toBeUndefined();
    expect(nettoyerMeuble({ k: 'pouf', x: 1, y: 1, l: 6, h: 6, n: 'x'.repeat(80) }).n)
      .toHaveLength(60);
  });

  it('refuse ce qui n’est pas un objet', () => {
    expect(nettoyerMeuble(null)).toBeNull();
    expect(nettoyerMeuble([])).toBeNull();
    expect(nettoyerMeuble('canape-3')).toBeNull();
  });
});

describe('nettoyerMeubles', () => {
  it('jette les illisibles et garde l’ordre', () => {
    expect(nettoyerMeubles([
      { k: 'pouf', x: 1, y: 1, l: 6, h: 6 },
      null,
      { k: 'NON', x: 1, y: 1, l: 6, h: 6 },
      { k: 'tapis', x: 2, y: 2, l: 30, h: 20 },
    ]).map((m) => m.k)).toEqual(['pouf', 'tapis']);
  });

  it('s’arrête au plafond de la base', () => {
    const trop = Array.from({ length: MEUBLES_MAX + 30 }, () => ({ k: 'pouf', x: 1, y: 1, l: 6, h: 6 }));
    expect(nettoyerMeubles(trop)).toHaveLength(MEUBLES_MAX);
  });

  it('rend une liste vide pour tout le reste', () => {
    expect(nettoyerMeubles(undefined)).toEqual([]);
    expect(nettoyerMeubles('pouf')).toEqual([]);
  });
});
