import { describe, expect, it } from 'vitest';
import {
  CARTOUCHE, MARGE, auPapier, barreEchelle, boiteImprimee, miseEnPage, reglePage,
} from './feuille';

describe('auPapier', () => {
  it('10 m au 1:100 font 100 mm', () => {
    expect(auPapier(100, 100)).toBe(100);
    expect(auPapier(100, 50)).toBe(200);
    expect(auPapier(100, 200)).toBe(50);
  });
  it('une échelle nulle ne divise pas', () => {
    expect(auPapier(100, 0)).toBe(0);
  });
});

describe('boiteImprimee', () => {
  it('ajoute 50 cm d’air', () => {
    expect(boiteImprimee({ x: 10, y: 10, l: 100, h: 50 })).toEqual({ x: 5, y: 5, l: 110, h: 60 });
  });
  it('rien à imprimer sans dessin', () => {
    expect(boiteImprimee(null)).toBeNull();
    expect(boiteImprimee({ x: 0, y: 0, l: 0, h: 0 })).toBeNull();
  });
});

describe('miseEnPage', () => {
  it('un plateau de 20 × 12 m tient en A4 au 1:100, en paysage', () => {
    const p = miseEnPage({ l: 200, h: 120 }, { format: 'A4', echelle: 100 });
    expect(p).toMatchObject({ tient: true, orientation: 'paysage', dessin: { l: 200, h: 120 }, conseil: null });
    expect(p.zone).toEqual({ l: 297 - 2 * MARGE, h: 210 - 2 * MARGE - CARTOUCHE });
  });
  it('un plan en hauteur part en portrait', () => {
    expect(miseEnPage({ l: 100, h: 200 }, { format: 'A4', echelle: 100 }).orientation).toBe('portrait');
  });
  it('ne tient pas : conseille l’échelle au-dessus, dans le même format', () => {
    const p = miseEnPage({ l: 200, h: 120 }, { format: 'A4', echelle: 50 });
    expect(p.tient).toBe(false);
    expect(p.conseil).toEqual({ format: 'A4', echelle: 100 });
  });
  it('puis l’A3 quand aucune échelle ne sauve l’A4', () => {
    const p = miseEnPage({ l: 600, h: 300 }, { format: 'A4', echelle: 200 });
    expect(p.tient).toBe(false);
    expect(p.conseil).toEqual({ format: 'A3', echelle: 200 });
  });
  it('rien ne tient : pas de conseil', () => {
    expect(miseEnPage({ l: 2000, h: 2000 }, { format: 'A3', echelle: 200 }).conseil).toBeNull();
  });
  it('format et échelle inconnus retombent sur A4 et 1:100', () => {
    expect(miseEnPage({ l: 10, h: 10 }, { format: 'A0', echelle: 75 })).toMatchObject({ format: 'A4', echelle: 100 });
  });
});

describe('barreEchelle', () => {
  it('au 1:100, 5 m font 50 mm, gradués au mètre', () => {
    expect(barreEchelle(100)).toEqual({ metres: 5, mm: 50, pas: [0, 1, 2, 3, 4, 5] });
  });
  it('au 1:50, 2 m par demi-mètre', () => {
    expect(barreEchelle(50)).toEqual({ metres: 2, mm: 40, pas: [0, 0.5, 1, 1.5, 2] });
  });
  it('au 1:200, 10 m', () => {
    expect(barreEchelle(200)).toMatchObject({ metres: 10, mm: 50 });
  });
  it('échelle absurde : rien', () => {
    expect(barreEchelle(0)).toBeNull();
  });
});

describe('reglePage', () => {
  it('dit le format et le sens', () => {
    expect(reglePage({ format: 'A3', orientation: 'portrait' })).toBe(`@page { size: A3 portrait; margin: ${MARGE}mm; }`);
    expect(reglePage({ format: 'A4', orientation: 'paysage' })).toContain('A4 landscape');
  });
});
