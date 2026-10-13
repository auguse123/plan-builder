import { describe, expect, it } from 'vitest';
import { SURFACE_POINTS_MAX, mesureSurface, poserPointSurface } from './surface';

const carre = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }];

describe('poserPointSurface', () => {
  it('ajoute un point, ignore un doublon du dernier', () => {
    const a = poserPointSurface([], { x: 0, y: 0 });
    expect(a).toEqual({ points: [{ x: 0, y: 0 }], ferme: false });
    expect(poserPointSurface(a.points, { x: 0, y: 0 }).points).toHaveLength(1);
  });
  it('referme sur le premier point, dès trois points', () => {
    expect(poserPointSurface(carre, { x: 0.5, y: 0.5 }, 1)).toEqual({ points: carre, ferme: true });
    expect(poserPointSurface(carre.slice(0, 2), { x: 0, y: 0 }, 1).ferme).toBe(false);
  });
  it('refuse un point illisible et plafonne', () => {
    expect(poserPointSurface(carre, { x: 'a', y: 1 }).points).toBe(carre);
    const plein = Array.from({ length: SURFACE_POINTS_MAX }, (_, i) => ({ x: i * 10, y: i % 2 }));
    expect(poserPointSurface(plein, { x: 9999, y: 9999 }).points).toHaveLength(SURFACE_POINTS_MAX);
  });
});

describe('mesureSurface', () => {
  it('fermé : 10 m × 5 m font 50 m² et 30 m de tour', () => {
    expect(mesureSurface(carre, true)).toEqual({ aire: 50, perimetre: 300 });
  });
  it('ouvert : pas d’aire, la longueur tracée seule', () => {
    expect(mesureSurface(carre, false)).toEqual({ aire: 0, perimetre: 250 });
  });
});
