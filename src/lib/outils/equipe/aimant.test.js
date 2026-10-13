import { describe, expect, it } from 'vitest';
import {
  aimanterLot, aimanterPoint, aimanterPose, boiteTournee, collerAuBiais, reperesDe, traceTouche,
} from './aimant';

describe('boiteTournee', () => {
  it('droit : la boîte même', () => {
    expect(boiteTournee({ x: 0, y: 0, l: 10, h: 4 })).toMatchObject({ x0: 0, y0: 0, x1: 10, y1: 4 });
  });
  it('quart de tour : largeur et hauteur échangées autour du centre', () => {
    expect(boiteTournee({ x: 0, y: 0, l: 10, h: 4, rot: 90 })).toMatchObject({ x0: 3, y0: -3, x1: 7, y1: 7 });
  });
});

describe('reperesDe', () => {
  it('un rectangle donne bords et axe', () => {
    const r = reperesDe({ rectangles: [{ x: 0, y: 0, l: 10, h: 4 }] });
    expect(r.x.map((d) => d.v)).toEqual([0, 5, 10]);
    expect(r.y.map((d) => d.v)).toEqual([0, 2, 4]);
  });
  it("un mur droit donne ses deux faces et l'axe", () => {
    const r = reperesDe({ murs: [[[20, 0], [20, 50]]], epaisseurs: [2] });
    expect(r.x.map((d) => d.v)).toEqual(expect.arrayContaining([19, 20, 21]));
  });
  it('un mur oblique ne donne que ses sommets', () => {
    const r = reperesDe({ murs: [[[0, 0], [10, 10]]], epaisseurs: [2] });
    expect(r.x.map((d) => d.v)).toEqual([0, 10]);
  });
});

describe('aimanterLot', () => {
  const fixes = reperesDe({ murs: [[[20, 0], [20, 50]]], epaisseurs: [2] });
  const table = reperesDe({ rectangles: [{ x: 0, y: 10, l: 10, h: 4 }] });

  it('sous le seuil, le bord se colle à la face du mur', () => {
    const r = aimanterLot(table, fixes, { dx: 8.4, dy: 3 }, 1);
    expect(r.dx).toBe(9);
    expect(r.dy).toBe(3);
    expect(r.x).toBe(true);
    expect(r.y).toBe(false);
    expect(r.guides).toHaveLength(1);
  });
  it('au-delà du seuil, le geste reste libre', () => {
    const r = aimanterLot(table, fixes, { dx: 5, dy: 3 }, 1);
    expect(r).toMatchObject({ dx: 5, dy: 3, x: false, y: false, guides: [] });
  });
  it('seuil nul : rien ne colle', () => {
    expect(aimanterLot(table, fixes, { dx: 9, dy: 0 }, 0).x).toBe(false);
  });
  it('deux axes à la fois : alignement de deux bureaux', () => {
    const voisin = reperesDe({ rectangles: [{ x: 30, y: 30, l: 10, h: 4 }] });
    const r = aimanterLot(table, voisin, { dx: 20.5, dy: 19.6 }, 1);
    expect(r).toMatchObject({ dx: 20, dy: 20, x: true, y: true });
  });
});

describe('aimanterPoint', () => {
  it('un coin se pose sur la face voisine', () => {
    const fixes = reperesDe({ rectangles: [{ x: 0, y: 0, l: 10, h: 10 }] });
    expect(aimanterPoint({ x: 10.4, y: 30 }, fixes, 1)).toMatchObject({ x: 10, y: 30, colle: true });
  });
});

describe('traceTouche', () => {
  const r = { x: 0, y: 0, l: 10, h: 10 };
  it('un sommet dedans', () => expect(traceTouche([[5, 5], [50, 50]], r)).toBe(true));
  it('un segment qui traverse sans sommet dedans', () => {
    expect(traceTouche([[-5, 5], [20, 5]], r)).toBe(true);
  });
  it('loin : non', () => expect(traceTouche([[20, 20], [30, 30]], r)).toBe(false));
});

describe('collerAuBiais', () => {
  // Un mur à 45°, de (0, 0) à (100, 100), 20 cm d'épaisseur.
  const murs = [[[0, 0], [100, 100]]];
  const bureau = { x: 40, y: 50, l: 16, h: 8, rot: 0 };
  it('près du mur de biais : le bureau pivote à 45° et se pose sur la face', () => {
    const r = collerAuBiais(bureau, murs, [2], { dx: 0, dy: 0 }, 5);
    expect(r.rot).toBe(45);
    // Centre posé à demi-épaisseur + demi-profondeur de l'axe : 1 + 4 = 5.
    const cx = 48 + r.dx; const cy = 54 + r.dy;
    expect(Math.abs((cx - cy) / Math.SQRT2)).toBeCloseTo(5, 1);
  });
  it('il garde son sens : de profil, il prend le quart de tour voisin', () => {
    const r = collerAuBiais({ ...bureau, rot: 100 }, murs, [2], {}, 8);
    expect(r.rot).toBe(135);
  });
  it('loin du mur : rien', () => {
    expect(collerAuBiais({ ...bureau, x: 0, y: 80 }, murs, [2], {}, 3)).toBeNull();
  });
  it('un mur droit reste l’affaire des repères', () => {
    expect(collerAuBiais(bureau, [[[0, 60], [100, 60]]], [2], {}, 10)).toBeNull();
  });
});

describe('aimanterPose', () => {
  const murs = [[[0, 0], [0, 100]]];
  const fixes = reperesDe({ murs, epaisseurs: [2] });
  it('colle le bloc à la face du mur, sans le tourner', () => {
    const r = aimanterPose([{ x: 3, y: 20, l: 16, h: 8, rot: 0 }], { fixes, murs, epaisseurs: [2], seuil: 3 });
    expect(r.formes[0].x).toBe(1);
    expect(r.formes[0].y).toBe(20);
    expect(r.colle).toBe(true);
    expect(r.guides.length).toBe(1);
  });
  it('déplace toutes les places d’un bench du même pas', () => {
    const r = aimanterPose([{ x: 3, y: 20, l: 16, h: 8 }, { x: 19, y: 20, l: 16, h: 8 }], { fixes, seuil: 3 });
    expect(r.formes.map((f) => f.x)).toEqual([1, 17]);
  });
  it('ne bouge rien hors de portée, ni sans seuil', () => {
    const loin = [{ x: 30, y: 20, l: 16, h: 8 }];
    expect(aimanterPose(loin, { fixes, seuil: 3 }).formes[0].x).toBe(30);
    expect(aimanterPose([{ x: 3, y: 20, l: 16, h: 8 }], { fixes, seuil: 0 }).colle).toBe(false);
  });
  it('se pose à plat contre un mur de biais', () => {
    const biais = [[[0, 0], [100, 100]]];
    const r = aimanterPose([{ x: 40, y: 30, l: 10, h: 6, rot: 0 }], {
      fixes: reperesDe({ murs: biais, epaisseurs: [2] }), murs: biais, epaisseurs: [2], seuil: 3, biais: 10,
    });
    expect(r.formes[0].rot).toBe(45);
  });
});
