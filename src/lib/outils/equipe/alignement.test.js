import { describe, expect, it } from 'vitest';
import { alignerBoites, repartirBoites, reseau } from './alignement';

const b = (x0, y0, l, h) => ({ x0, y0, x1: x0 + l, y1: y0 + h });

describe('alignerBoites', () => {
  const lot = [b(0, 0, 10, 4), b(3, 10, 6, 4), b(-2, 20, 10, 4)];
  it('à gauche : sur le bord le plus à gauche', () => {
    expect(alignerBoites(lot, 'gauche').map((d) => d.dx)).toEqual([-2, -5, 0]);
  });
  it('à droite : sur le bord le plus à droite, rien en y', () => {
    expect(alignerBoites(lot, 'droite')).toEqual([{ dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: 2, dy: 0 }]);
  });
  it('au centre vertical de la boîte commune', () => {
    expect(alignerBoites(lot, 'centreX').map((d) => d.dx)).toEqual([-1, -2, 1]);
  });
  it('en haut', () => {
    expect(alignerBoites(lot, 'haut').map((d) => d.dy)).toEqual([0, -10, -20]);
  });
  it('seul ou mode inconnu : rien ne bouge', () => {
    expect(alignerBoites([lot[0]], 'gauche')).toEqual([{ dx: 0, dy: 0 }]);
    expect(alignerBoites(lot, 'n_importe')[1]).toEqual({ dx: 0, dy: 0 });
  });
});

describe('repartirBoites', () => {
  it('espaces égaux, extrêmes fixes, ordre gardé', () => {
    // Trois bureaux de 10 : 0-10, 12-22, 40-50 → vide total 20, soit 10 chacun.
    const d = repartirBoites([b(0, 0, 10, 4), b(40, 0, 10, 4), b(12, 0, 10, 4)], 'x');
    expect(d).toEqual([{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }, { dx: 8, dy: 0 }]);
  });
  it('tailles différentes : vides égaux, pas pas égaux', () => {
    const d = repartirBoites([b(0, 0, 4, 4), b(0, 5, 4, 10), b(0, 30, 4, 4)], 'y');
    // Pleins 18, étendue 34 → vides de 8 : 0-4, 12-22, 30-34.
    expect(d.map((x) => x.dy)).toEqual([0, 7, 0]);
  });
  it('moins de trois : rien à répartir', () => {
    expect(repartirBoites([b(0, 0, 1, 1), b(9, 0, 1, 1)], 'x')).toEqual([{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }]);
  });
});

describe('reseau', () => {
  it('n copies au pas', () => {
    expect(reseau(3, { dx: 14 })).toEqual([{ dx: 14, dy: 0 }, { dx: 28, dy: 0 }, { dx: 42, dy: 0 }]);
  });
  it('plafonné, et rien sans pas', () => {
    expect(reseau(999, { dy: 1 })).toHaveLength(50);
    expect(reseau(3, {})).toEqual([]);
  });
});
