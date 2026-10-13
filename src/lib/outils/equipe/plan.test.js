import { describe, expect, it } from 'vitest';
import {
  aimanter, BORNES, boite, borner, cadre, cadreNecessaire, chevauchent, deplacer, ECART,
  echelleDe, geometrieDe, ilot,
  MURS, murNet, PAS, placerManquants, PLAN, poserDans, POSTE, rectangleEntre, semerGrille,
  plafondZoom, traitDe, unitesParPixel, versEcran, versPlan, vueZoomee, ZOOM, zoneDuPoint,
} from './plan.js';

describe('aimanter', () => {
  it('colle au pas le plus proche, dans les deux sens', () => {
    expect([aimanter(0), aimanter(0.9), aimanter(1.1), aimanter(5), aimanter(-1.1)])
      .toEqual([0, 0, 2, 6, -2]);
  });

  it('retombe sur zéro plutôt que de rendre NaN', () => {
    expect([aimanter(undefined), aimanter('douze'), aimanter(4, 0)]).toEqual([0, 0, 4]);
  });
});

describe('borner', () => {
  it('ramène entre les bornes, et rend le minimum si elles sont à l’envers', () => {
    expect([borner(5, 0, 10), borner(-3, 0, 10), borner(30, 0, 10), borner(5, 10, 0)])
      .toEqual([5, 0, 10, 10]);
  });
});

describe('poserDans', () => {
  it('ramène un objet entier dans le plan, jamais à moitié dehors', () => {
    const p = poserDans({ x: 295, y: -10, l: 14, h: 8 }, { largeur: 300, hauteur: 200 });
    expect([p.x, p.y]).toEqual([286, 0]);
  });

  it('rabote un objet plus grand que le plan', () => {
    const p = poserDans({ x: 0, y: 0, l: 500, h: 400 }, { largeur: 100, hauteur: 80 });
    expect([p.l, p.h]).toEqual([100, 80]);
  });

  it('garde les champs qui ne sont pas de la géométrie', () => {
    expect(poserDans({ id: 'a', nom: 'Poste 1', x: 0, y: 0 }, PLAN).nom).toBe('Poste 1');
  });
});

describe('chevauchent', () => {
  it('le contact bord à bord ne compte pas', () => {
    const a = { x: 0, y: 0, l: 10, h: 10 };
    expect([chevauchent(a, { x: 10, y: 0, l: 10, h: 10 }), chevauchent(a, { x: 9, y: 0, l: 10, h: 10 })])
      .toEqual([false, true]);
  });

  it('un objet manquant ne chevauche rien', () => {
    expect(chevauchent(null, { x: 0, y: 0, l: 1, h: 1 })).toBe(false);
  });
});

describe('boite', () => {
  it('rend null quand rien n’est posé', () => {
    expect([boite([]), boite([{ nom: 'sans géométrie' }])]).toEqual([null, null]);
  });

  it('englobe la largeur et la hauteur des objets, pas seulement leurs origines', () => {
    expect(boite([{ x: 10, y: 10, l: 14, h: 8 }, { x: 40, y: 30, l: 14, h: 8 }]))
      .toEqual({ x: 10, y: 10, l: 44, h: 28 });
  });
});

describe('semerGrille', () => {
  it('semer 24 postes donne 6 colonnes, pas une file de 24', () => {
    const cases = semerGrille(24);
    const colonnes = new Set(cases.map((c) => c.x)).size;
    expect([cases.length, colonnes, new Set(cases.map((c) => c.y)).size]).toEqual([24, 5, 5]);
  });

  it('ne sème rien pour zéro ou une bêtise', () => {
    expect([semerGrille(0).length, semerGrille(-3).length, semerGrille('deux').length]).toEqual([0, 0, 0]);
  });

  it('centre la grille dans le plan', () => {
    const cases = semerGrille(4, { plan: { largeur: 300, hauteur: 200 }, colonnes: 2 });
    const b = boite(cases);
    expect(Math.abs((300 - b.l) / 2 - b.x) <= PAS).toBe(true);
    expect(Math.abs((200 - b.h) / 2 - b.y) <= PAS).toBe(true);
  });

  it('tient dans un plan étroit plutôt que d’en sortir', () => {
    const cases = semerGrille(9, { plan: { largeur: 40, hauteur: 200 } });
    expect(cases.every((c) => c.x >= 0 && c.x + c.l <= 40)).toBe(true);
  });

  it('pose des postes à la taille par défaut, sans rotation', () => {
    expect(semerGrille(1)[0]).toMatchObject({ l: POSTE.l, h: POSTE.h, rot: 0 });
  });

  it('les postes semés ne se chevauchent jamais', () => {
    const cases = semerGrille(12);
    const collisions = cases.filter((a, i) => cases.slice(i + 1).some((b) => chevauchent(a, b)));
    expect(collisions).toEqual([]);
  });
});

describe('ilot', () => {
  it('six postes font deux rangs de trois, dos à dos', () => {
    const banque = ilot({ x: 20, y: 20 }, 6);
    expect(banque.length).toBe(6);
    expect(new Set(banque.map((p) => p.y)).size).toBe(2);
    expect(new Set(banque.map((p) => p.x)).size).toBe(3);
  });

  it('les deux rangs sont collés : pas de circulation entre eux', () => {
    const banque = ilot({ x: 20, y: 20 }, 4);
    expect(banque[2].y - banque[0].y).toBe(POSTE.h);
  });

  it('sans dos à dos, une simple file', () => {
    const file = ilot({ x: 0, y: 0 }, 4, { dos: false });
    expect(new Set(file.map((p) => p.y)).size).toBe(1);
  });

  it('en vertical, la file descend et les rangs sont côte à côte', () => {
    const banque = ilot({ x: 0, y: 0 }, 4, { sens: 'vertical' });
    expect([banque[1].y - banque[0].y, banque[2].x - banque[0].x]).toEqual([ECART.y, POSTE.l]);
  });

  it('part d’un point aimanté, même si le doigt ne l’était pas', () => {
    expect(ilot({ x: 11.4, y: 7.2 }, 1)[0]).toMatchObject({ x: 12, y: 8 });
  });

  it('ne sort pas du plan', () => {
    const banque = ilot({ x: 290, y: 195 }, 6, { plan: { largeur: 300, hauteur: 200 } });
    expect(banque.every((p) => p.x + p.l <= 300 && p.y + p.h <= 200)).toBe(true);
  });
});

describe('deplacer', () => {
  it('bouge toute la sélection du même vecteur aimanté', () => {
    const avant = [{ x: 10, y: 10, l: 14, h: 8 }, { x: 40, y: 10, l: 14, h: 8 }];
    const apres = deplacer(avant, { dx: 5.4, dy: -3.1 });
    expect(apres.map((p) => [p.x, p.y])).toEqual([[16, 6], [46, 6]]);
  });

  it("un axe libre (collé par l'aimant) échappe au cran", () => {
    const avant = [{ x: 10, y: 10, l: 14, h: 8 }];
    const apres = deplacer(avant, { dx: 5.4, dy: -3.1 }, { libre: { x: true } });
    expect([apres[0].x, apres[0].y]).toEqual([15.4, 6]);
  });

  it('un îlot ne se déforme pas contre le bord : le lot bute ensemble', () => {
    const avant = [{ x: 0, y: 0, l: 14, h: 8 }, { x: 18, y: 0, l: 14, h: 8 }];
    const apres = deplacer(avant, { dx: -50, dy: 0 }, { plan: { largeur: 300, hauteur: 200 } });
    expect(apres[1].x - apres[0].x).toBe(18);
    expect(apres[0].x).toBe(0);
  });

  it('bute aussi à droite sans écraser les écarts', () => {
    const avant = [{ x: 0, y: 0, l: 14, h: 8 }, { x: 18, y: 0, l: 14, h: 8 }];
    const apres = deplacer(avant, { dx: 999, dy: 0 }, { plan: { largeur: 100, hauteur: 100 } });
    expect([apres[0].x, apres[1].x]).toEqual([68, 86]);
  });

  it('un bench posé au centimètre garde ses écarts sous un cran grossier', () => {
    const avant = [{ x: 10.3, y: 5.1, l: 14, h: 8 }, { x: 24.4, y: 5.1, l: 14, h: 8 }, { x: 38.5, y: 13.2, l: 14, h: 8 }];
    const apres = deplacer(avant, { dx: 7, dy: 3 }, { pas: 2 });
    expect(apres[0].x).toBe(18);
    expect(apres[0].y).toBe(8);
    expect(apres[1].x - apres[0].x).toBeCloseTo(14.1, 5);
    expect(apres[2].x - apres[0].x).toBeCloseTo(28.2, 5);
    expect(apres[2].y - apres[0].y).toBeCloseTo(8.1, 5);
  });

  it('pas de bruit flottant : trois crans de 0,1 font 0,3', () => {
    const [p] = deplacer([{ x: 0.1, y: 0.2, l: 14, h: 8 }], { dx: 0.2, dy: 0.1 }, { pas: 0.1 });
    expect([p.x, p.y]).toEqual([0.3, 0.3]);
  });

  it('une sélection vide ne bouge rien', () => {
    expect(deplacer([], { dx: 10, dy: 10 })).toEqual([]);
  });
});

describe('versPlan', () => {
  const rect = { left: 0, top: 0, width: 600, height: 400 };

  it('traduit un pixel en unité de plan, échelle égale en x et en y', () => {
    // 600 px pour 300 unités de large, 400 px pour 200 de haut : échelle 2.
    expect(versPlan({ x: 60, y: 40 }, rect, { largeur: 300, hauteur: 200 })).toEqual({ x: 30, y: 20 });
  });

  it('tient compte du vide centré quand les proportions diffèrent', () => {
    // Plan carré dans une vue large : 400 px de haut → échelle 2, marge de 100 px.
    const p = versPlan({ x: 100, y: 0 }, rect, { largeur: 200, hauteur: 200 });
    expect([p.x, p.y]).toEqual([0, 0]);
  });

  it('tient compte de l’origine de la vue', () => {
    const p = versPlan({ x: 160, y: 140 }, { left: 100, top: 100, width: 600, height: 400 }, { largeur: 300, hauteur: 200 });
    expect(p).toEqual({ x: 30, y: 20 });
  });

  it('rend l’origine plutôt qu’une division par zéro', () => {
    expect(versPlan({ x: 10, y: 10 }, { left: 0, top: 0, width: 0, height: 0 }, PLAN)).toEqual({ x: 0, y: 0 });
  });
});

describe('versEcran', () => {
  const rect = { width: 600, height: 400 };

  it('rend le pixel d’un point du plan', () => {
    expect(versEcran({ x: 30, y: 20 }, rect, { largeur: 300, hauteur: 200 })).toEqual({ x: 60, y: 40 });
  });

  it('ajoute le vide centré quand les proportions diffèrent', () => {
    expect(versEcran({ x: 0, y: 0 }, rect, { largeur: 200, hauteur: 200 })).toEqual({ x: 100, y: 0 });
  });

  it('défait ce que versPlan a fait', () => {
    const cadreLa = { largeur: 300, hauteur: 200 };
    const vue = { left: 100, top: 50, width: 600, height: 400 };
    const p = versPlan({ x: 250, y: 190 }, vue, cadreLa);
    const e = versEcran(p, vue, cadreLa);
    expect([e.x + vue.left, e.y + vue.top]).toEqual([250, 190]);
  });

  it('rend l’origine plutôt qu’une division par zéro', () => {
    expect(versEcran({ x: 10, y: 10 }, { width: 0, height: 0 }, PLAN)).toEqual({ x: 0, y: 0 });
  });
});

describe('cadre', () => {
  it('rend le viewBox du plan, défaut compris', () => {
    expect([cadre(), cadre({ largeur: 120, hauteur: 80 })]).toEqual(['0 0 300 200', '0 0 120 80']);
  });

  it('ne laisse pas un plan absurde sortir des bornes', () => {
    expect(cadre({ largeur: 99999, hauteur: 1 })).toBe(`0 0 ${BORNES.max} 20`);
  });
});

describe('vueZoomee', () => {
  const p = { largeur: 300, hauteur: 200 };

  it('à ×1 rend la feuille entière, coin en haut à gauche', () => {
    expect(vueZoomee(p, { zoom: 1 })).toEqual({ x: 0, y: 0, largeur: 300, hauteur: 200, zoom: 1 });
  });

  it('à ×2 rend un quart de la feuille, centré sur le point demandé', () => {
    expect(vueZoomee(p, { zoom: 2, centre: { x: 150, y: 100 } }))
      .toEqual({ x: 75, y: 50, largeur: 150, hauteur: 100, zoom: 2 });
  });

  it('ne laisse pas la vue sortir de la feuille', () => {
    const v = vueZoomee(p, { zoom: 2, centre: { x: 0, y: 1000 } });
    expect([v.x, v.y]).toEqual([0, 100]);
  });

  it('ne zoome pas sous 2 m de vue', () => {
    expect(vueZoomee({ largeur: 40, hauteur: 40 }, { zoom: 99 }).largeur).toBe(ZOOM.vueMini);
  });

  it('sous ×1 la vue dépasse la feuille, qui se pose au milieu', () => {
    const v = vueZoomee(p, { zoom: 0.5 });
    expect([v.x, v.y, v.largeur, v.hauteur]).toEqual([-150, -100, 600, 400]);
  });

  it('dézoome bien au-delà de la feuille', () => {
    expect(vueZoomee(p, { zoom: 0.001 }).zoom).toBe(ZOOM.mini);
    expect(ZOOM.mini).toBeLessThan(1);
  });
});

describe('plafondZoom', () => {
  it('laisse approcher jusqu’à 2 m de vue, feuille par feuille', () => {
    // 300 unités de large : ×15 n'en montre plus que 20 (2 m).
    expect(plafondZoom({ largeur: 300, hauteur: 200 })).toBe(10);
    expect(plafondZoom({ largeur: 2000, hauteur: 2000 })).toBe(ZOOM.maxi);
  });

  it('borne la vue au même plafond que les boutons', () => {
    const grand = { largeur: 600, hauteur: 400 };
    expect(vueZoomee(grand, { zoom: 999 }).zoom).toBe(plafondZoom(grand));
  });

  it('ne descend jamais sous ×1 : une petite feuille se regarde entière', () => {
    expect(plafondZoom({ largeur: 20, hauteur: 20 })).toBe(1);
  });
});

describe('unitesParPixel', () => {
  it('rend l’inverse de l’échelle de rendu, côté le plus contraint', () => {
    // 300 unités sur 900 px : un pixel vaut un tiers d'unité (3,3 cm).
    expect(unitesParPixel({ width: 900, height: 600 }, { largeur: 300, hauteur: 200 }))
      .toBeCloseTo(1 / 3, 6);
  });

  it('suit le zoom : une vue deux fois plus serrée vaut deux fois moins', () => {
    const vue = vueZoomee({ largeur: 300, hauteur: 200 }, { zoom: 2 });
    expect(unitesParPixel({ width: 900, height: 600 }, vue)).toBeCloseTo(1 / 6, 6);
  });

  it('prend le côté qui commande, comme `versPlan`', () => {
    // La hauteur est le côté serré : c'est elle qui fixe l'échelle.
    expect(unitesParPixel({ width: 900, height: 200 }, { largeur: 300, hauteur: 200 })).toBe(1);
  });

  it('rend 0 tant que rien n’est mesuré', () => {
    expect(unitesParPixel({ width: 0, height: 0 }, { largeur: 300, hauteur: 200 })).toBe(0);
  });
});

describe('echelleDe', () => {
  it('rend une échelle de planche, pas un pourcentage', () => {
    // 300 unités (30 m) rendues sur 1134 px ≈ 30 cm d'écran : 1:100.
    expect(echelleDe(1134, 300).texte).toBe('1:100');
  });

  it('se resserre quand on zoome : la vue rétrécit, l’échelle aussi', () => {
    expect(echelleDe(1134, 150).denominateur).toBe(50);
  });

  it('ne rend pas d’échelle sans dessin mesuré', () => {
    expect(echelleDe(0, 300).texte).toBe('—');
  });
});

describe('cadre et versPlan zoomés', () => {
  it('le viewBox porte le coin de la vue', () => {
    expect(cadre({ x: 75, y: 50, largeur: 150, hauteur: 100 })).toBe('75 50 150 100');
  });

  it('versEcran défait versPlan dans une vue décalée', () => {
    const vue = { width: 600, height: 400 };
    const v = vueZoomee({ largeur: 300, hauteur: 200 }, { zoom: 2, centre: { x: 200, y: 150 } });
    const point = versPlan({ x: 300, y: 200 }, vue, v);
    const retour = versEcran(point, vue, v);
    expect([Math.round(retour.x), Math.round(retour.y)]).toEqual([300, 200]);
  });
});

describe('placerManquants', () => {
  it('ne touche pas aux postes déjà posés', () => {
    expect(placerManquants([{ id: 'a', x: 10, y: 10 }])).toEqual([]);
  });

  it('range les orphelins sous ce qui existe, pas par-dessus', () => {
    const postes = [{ id: 'a', x: 10, y: 10, l: 14, h: 8 }, { id: 'b' }, { id: 'c' }];
    const places = placerManquants(postes);
    expect(places.map((p) => p.id)).toEqual(['b', 'c']);
    expect(places.every((p) => p.y >= 18)).toBe(true);
  });

  it('pose les orphelins en grille quand le plan est vide', () => {
    const places = placerManquants([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]);
    expect(places.length).toBe(4);
    expect(places.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
});

describe('geometrieDe', () => {
  it('rend cinq nombres, et rien d’autre', () => {
    expect(geometrieDe({ id: 'a', nom: 'Poste 1', x: 11.4, y: 7.2, rot: 450 }))
      .toEqual({ x: 11.4, y: 7.2, l: POSTE.l, h: POSTE.h, rot: 90 });
  });

  it('N’AIMANTE PAS : le geste a déjà choisi son pas', () => {
    // Zoomé, on pose au centimètre ; aimanter ici reculait le bloc de 10 cm au
    // lâcher, et le plan ne tombait plus sur ce qu'on avait visé.
    expect(geometrieDe({ x: 11.4, y: 7.25 })).toMatchObject({ x: 11.4, y: 7.25 });
    expect(geometrieDe({ x: 11.409, y: -3 })).toMatchObject({ x: 11.41, y: 0 });
  });

  it('ramène un angle négatif dans [0, 360) : la base refuse le reste', () => {
    expect(geometrieDe({ x: 0, y: 0, rot: -90 }).rot).toBe(270);
  });

  it('ne laisse pas passer une taille nulle ni exponentielle', () => {
    expect(geometrieDe({ x: 0, y: 0, l: 1e-7, h: 0 })).toMatchObject({ l: 0.1, h: 0.1 });
    expect(geometrieDe({ x: 0, y: 0, l: 9999, h: 14.006 })).toMatchObject({ l: 200, h: 14.01 });
  });

  it('ne rend jamais NaN sur un objet vide', () => {
    expect(geometrieDe(null)).toEqual({ x: 0, y: 0, l: POSTE.l, h: POSTE.h, rot: 0 });
  });
});

describe('rectangleEntre', () => {
  it('normalise : tirer à l’envers dessine le même rectangle', () => {
    const a = rectangleEntre({ x: 10, y: 10 }, { x: 40, y: 30 });
    const b = rectangleEntre({ x: 40, y: 30 }, { x: 10, y: 10 });
    expect(a).toEqual({ x: 10, y: 10, l: 30, h: 20 });
    expect(b).toEqual(a);
  });

  it('refuse le rectangle plus petit qu’un pas — un clic n’est pas une zone', () => {
    expect(rectangleEntre({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(null);
    expect(rectangleEntre({ x: 10, y: 10 }, { x: 40, y: 10.5 })).toBe(null);
  });

  it('reste dans le plan et sur la grille', () => {
    const r = rectangleEntre({ x: -50, y: -50 }, { x: 5000, y: 5000 });
    expect(r).toEqual({ x: 0, y: 0, l: PLAN.largeur, h: PLAN.hauteur });
  });
});

describe('zoneDuPoint', () => {
  const grande = { id: 'g', x: 0, y: 0, l: 100, h: 100 };
  const petite = { id: 'p', x: 10, y: 10, l: 20, h: 20 };

  it('rend la plus petite zone qui contient le point', () => {
    expect(zoneDuPoint({ x: 15, y: 15 }, [grande, petite])?.id).toBe('p');
    expect(zoneDuPoint({ x: 80, y: 80 }, [grande, petite])?.id).toBe('g');
  });

  it('rend null hors de toute zone, et ignore les zones non dessinées', () => {
    expect(zoneDuPoint({ x: 500, y: 5 }, [grande])).toBe(null);
    expect(zoneDuPoint({ x: 5, y: 5 }, [{ id: 'z' }])).toBe(null);
    expect(zoneDuPoint({ x: 'x', y: 5 }, [grande])).toBe(null);
  });
});

describe('murNet', () => {
  it('aimante, écrase les doublons consécutifs, borne au plan', () => {
    expect(murNet([[0.4, 0.4], [1, 1], [50, -10], [50, 0]]))
      .toEqual([[0, 0], [2, 2], [50, 0]]);
  });

  it('refuse un tracé qui n’a pas deux points distincts', () => {
    expect(murNet([[4, 4], [4.2, 4.2]])).toBe(null);
    expect(murNet([])).toBe(null);
  });

  it('coupe au plafond des points d’une ligne', () => {
    const longs = Array.from({ length: 300 }, (_, i) => [i * PAS, 0]);
    expect(murNet(longs)).toHaveLength(MURS.points);
  });
});

describe('traitDe', () => {
  it('rend un chemin SVG, et rien pour un tracé trop court', () => {
    expect(traitDe([[0, 0], [10, 0], [10, 5]])).toBe('M 0 0 L 10 0 L 10 5');
    expect(traitDe([[0, 0]])).toBe('');
  });
});

describe('cadreNecessaire', () => {
  it('rend le plan par défaut quand rien n’est posé', () => {
    expect(cadreNecessaire({}, {})).toEqual({ largeur: PLAN.largeur, hauteur: PLAN.hauteur });
  });

  it('grandit avec le tracé, marge comprise', () => {
    const c = cadreNecessaire({ murs: [[[0, 0], [500, 40]]] }, { plan: PLAN, marge: 60 });
    expect(c.largeur).toBe(560);
    expect(c.hauteur).toBe(PLAN.hauteur);
  });

  it('compte les boîtes par leur coin bas-droit', () => {
    const c = cadreNecessaire({ boites: [{ x: 400, y: 300, l: 14, h: 8 }] }, { plan: PLAN, marge: 60 });
    expect(c.largeur).toBe(480);
    expect(c.hauteur).toBe(370);
  });

  it('ne rend le blanc qu’au-delà d’une marge de jeu', () => {
    const contenu = { boites: [{ x: 0, y: 0, l: 10, h: 10 }] };
    expect(cadreNecessaire(contenu, { plan: { largeur: 340, hauteur: 200 }, marge: 60 }))
      .toEqual({ largeur: 340, hauteur: PLAN.hauteur });
    expect(cadreNecessaire(contenu, { plan: { largeur: 900, hauteur: 200 }, marge: 60 }))
      .toEqual({ largeur: PLAN.largeur, hauteur: PLAN.hauteur });
  });

  it('ne dépasse jamais le plafond de la base', () => {
    const c = cadreNecessaire({ murs: [[[0, 0], [1999, 1999]]] }, { plan: PLAN });
    expect(c).toEqual({ largeur: BORNES.max, hauteur: BORNES.max });
  });
});
