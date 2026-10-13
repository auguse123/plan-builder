import { describe, it, expect } from 'vitest';
import { facteurEchelle, mettreAEchelle, FACTEUR } from '@/lib/outils/equipe/echelle';

describe('facteurEchelle', () => {
  it('rend le rapport de la cible à la mesure', () => {
    // Le segment mesure 6 m sur le dessin, il fait 12 m en vrai : tout double.
    expect(facteurEchelle(60, 120)).toBe(2);
  });

  it('rétrécit aussi', () => {
    expect(facteurEchelle(120, 60)).toBe(0.5);
  });

  it('refuse un segment nul', () => {
    // Deux points confondus n'ont pas d'échelle : on ne divise pas par eux.
    expect(facteurEchelle(0, 120)).toBe(null);
    expect(facteurEchelle(60, 0)).toBe(null);
  });

  it('refuse une faute de frappe', () => {
    expect(facteurEchelle(1, 10000)).toBe(null);
    expect(facteurEchelle(10000, 1)).toBe(null);
  });
});

describe('mettreAEchelle', () => {
  const plan = { largeur: 300, hauteur: 200 };

  it('double les murs depuis leur coin haut-gauche', () => {
    // Le coin du dessin ne bouge pas : c'est le seul repère qui ne fasse pas
    // dériver le plan à chaque correction.
    const r = mettreAEchelle({ murs: [[[10, 10], [60, 10]]] }, 2, { plan });
    expect(r.murs).toEqual([[[10, 10], [110, 10]]]);
  });

  it('emmène les portes, largeur comprise, sans toucher l’angle', () => {
    const r = mettreAEchelle({
      murs: [[[0, 0], [100, 0]]],
      portes: [{ x: 40, y: 0, a: 0, l: 9, k: 'simple' }],
    }, 2, { plan });
    expect(r.portes[0]).toMatchObject({ x: 80, y: 0, l: 18, a: 0, k: 'simple' });
  });

  it('emmène les rectangles, position et taille', () => {
    const r = mettreAEchelle({
      boites: [{ id: 'a', x: 20, y: 20, l: 14, h: 8, rot: 90 }],
    }, 2, { plan });
    expect(r.boites[0]).toMatchObject({ id: 'a', x: 20, y: 20, l: 28, h: 16, rot: 90 });
  });

  it('garde les proportions du plan', () => {
    const r = mettreAEchelle({ murs: [[[0, 0], [100, 0], [100, 50], [0, 0]]] }, 1.5, { plan });
    const [, b, c] = r.murs[0];
    expect(b[0] / c[1]).toBeCloseTo(100 / 50, 6);
  });

  it('refuse plutôt que d’écrêter', () => {
    // Un mur écrêté contre la bordure déformerait la pièce sans le dire.
    expect(mettreAEchelle({ murs: [[[0, 0], [200, 0]]] }, 2, { plan })).toBe(null);
  });

  it('refuse un poste devenu plus grand que la borne', () => {
    expect(mettreAEchelle({ boites: [{ id: 'a', x: 0, y: 0, l: 14, h: 8 }] }, 20, { plan })).toBe(null);
  });

  it('refuse une porte devenue trop étroite', () => {
    const r = mettreAEchelle({ portes: [{ x: 0, y: 0, a: 0, l: 9, k: 'simple' }] }, 0.2, { plan });
    expect(r).toBe(null);
  });

  it('refuse un plan vide et un facteur absurde', () => {
    expect(mettreAEchelle({ murs: [] }, 2, { plan })).toBe(null);
    expect(mettreAEchelle({ murs: [[[0, 0], [10, 0]]] }, 0, { plan })).toBe(null);
    expect(mettreAEchelle({ murs: [[[0, 0], [10, 0]]] }, FACTEUR.maxi + 1, { plan })).toBe(null);
  });

  it('en souple, écrête les meubles au lieu de tout refuser', () => {
    // Une zone de 15 m doublée ferait 30 m, au-delà de la borne de table : elle
    // s'arrête à 20 m, les murs eux gardent leur longueur vraie.
    const r = mettreAEchelle({
      murs: [[[0, 0], [60, 0]]],
      boites: [{ id: 'z', x: 0, y: 0, l: 150, h: 40 }],
    }, 2, { plan: { largeur: 2000, hauteur: 2000 }, souple: true });
    expect(r.murs[0][1][0]).toBe(120);
    expect(r.boites[0]).toMatchObject({ id: 'z', l: 200, h: 80 });
  });

  it('en souple, recolle le dessin contre le bord au lieu de refuser', () => {
    // Le plan doublé sortirait de 40 unités : il glisse en bloc, sans se
    // déformer — la forme compte plus que la position, et sa longueur reste
    // celle qu'on vient de déclarer.
    const r = mettreAEchelle({ murs: [[[100, 0], [220, 0]]] }, 2, { plan, souple: true });
    expect(r.murs[0]).toEqual([[60, 0], [300, 0]]);
  });

  it('en souple, refuse encore un dessin plus grand que le cadre', () => {
    expect(mettreAEchelle({ murs: [[[0, 0], [200, 0]]] }, 4, { plan, souple: true })).toBe(null);
  });

  it('arrondit au centimètre', () => {
    const r = mettreAEchelle({ murs: [[[0, 0], [10, 0]]] }, 1.333333, { plan });
    expect(r.murs[0][1][0]).toBe(13.33);
  });

  it('emmène le calque avec le dessin : il porte la même échelle', () => {
    const r = mettreAEchelle({
      murs: [[[10, 10], [30, 10]]],
      calque: { x: 0, y: 0, l: 100, h: 60 },
    }, 2, { plan });
    // Le coin qui ne bouge pas est celui du DESSIN (10,10), pas celui du
    // calque : le calque se place par rapport au tracé relevé dessus.
    expect(r.calque).toEqual({ x: -10, y: -10, l: 200, h: 120 });
    expect(r.murs[0]).toEqual([[10, 10], [50, 10]]);
  });

  it('ne laisse pas le calque peser sur le cadre ni sur le recollage', () => {
    // Le calque déborde largement : le dessin ne se déplace pas pour lui, et
    // le geste n'est pas refusé — un fond n'a pas de bornes à tenir.
    const r = mettreAEchelle({
      murs: [[[0, 0], [50, 0]]],
      calque: { x: 0, y: 0, l: 300, h: 300 },
    }, 2, { plan, souple: true });
    expect(r.murs[0]).toEqual([[0, 0], [100, 0]]);
    expect(r.calque).toEqual({ x: 0, y: 0, l: 600, h: 600 });
  });

  it('rend `calque: null` quand il n’y en a pas', () => {
    expect(mettreAEchelle({ murs: [[[0, 0], [10, 0]]] }, 2, { plan }).calque).toBe(null);
  });
});
