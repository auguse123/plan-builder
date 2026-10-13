import { describe, it, expect } from 'vitest';
import {
  ACCROCHE, ANGLES, accrocher, aimanterSommets, aire, angleEntre, boiteDe, cap, changerLongueur, contraindre,
  ciblesDuSommet, cotes, deplacerSommet, depuisMetres, joindreMurs, enMetres, ferme, finesseDe, longueur, murLePlusProche,
  perimetre, piece, pivoter, pivoterTrace, segmentProche, translaterTrace, versPoint,
} from '@/lib/outils/equipe/trace';
import { PAS } from '@/lib/outils/equipe/plan';

describe('finesseDe', () => {
  it('garde le réglage d’avant tant que rien n’est mesuré', () => {
    expect(finesseDe(0)).toEqual({ pas: PAS, accroche: ACCROCHE });
  });

  it('dézoomé, ne dépasse jamais le pas de grille ni l’accroche de référence', () => {
    // Un plateau entier à l'écran : un pixel vaut un tiers d'unité.
    expect(finesseDe(1 / 3)).toEqual({ pas: PAS, accroche: ACCROCHE });
    // Encore plus loin : les plafonds tiennent, la grille ne se dégrade pas.
    expect(finesseDe(5)).toEqual({ pas: PAS, accroche: ACCROCHE });
  });

  it('zoomé, descend au centimètre — c’est tout l’objet', () => {
    // 2 m à l'écran sur 900 px : un pixel vaut 2 cm.
    const f = finesseDe(0.02);
    expect(f.pas).toBe(0.2);
    expect(f.accroche).toBeCloseTo(0.32, 6);
  });

  it('choisit le premier cran qui fasse au moins 7 px', () => {
    expect(finesseDe(0.05).pas).toBe(0.5);
    expect(finesseDe(0.1).pas).toBe(1);
  });

  it('ne rend jamais une accroche plus fine que le pas', () => {
    const f = finesseDe(0.001);
    expect(f.pas).toBe(0.1);
    expect(f.accroche).toBe(0.1);
  });
});

describe('longueur et cap', () => {
  it('mesure un segment', () => {
    expect(longueur([0, 0], [30, 40])).toBe(50);
    expect(longueur({ x: 0, y: 0 }, { x: 0, y: 12 })).toBe(12);
  });
  it('rend zéro sur un point dégénéré ou illisible', () => {
    expect(longueur([5, 5], [5, 5])).toBe(0);
    expect(longueur([null, undefined], [0, 0])).toBe(0);
  });
  it('compte les degrés dans le sens de l’écran : y descend', () => {
    expect(cap([0, 0], [10, 0])).toBe(0);
    expect(cap([0, 0], [0, 10])).toBe(90);
    expect(cap([0, 0], [-10, 0])).toBe(180);
    expect(cap([0, 0], [0, -10])).toBe(270);
  });
});

describe('versPoint', () => {
  it('pose le point à la longueur dite', () => {
    const p = versPoint([10, 10], 50, 0);
    expect(p.x).toBeCloseTo(60);
    expect(p.y).toBeCloseTo(10);
  });
  it('tourne vers le bas à 90 degrés', () => {
    const p = versPoint([10, 10], 20, 90);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(30);
  });
  it('ne sort jamais des bornes du plan', () => {
    const p = versPoint([0, 0], 9999, 180);
    expect(p.x).toBe(0);
  });
});

describe('contraindre', () => {
  it('colle le cap au multiple demandé', () => {
    const r = contraindre([0, 0], [100, 8], { angle: 90 });
    expect(r.cap).toBe(0);
    expect(r.y).toBeCloseTo(0);
  });
  it('garde l’angle plutôt que d’aimanter x et y séparément', () => {
    const r = contraindre([0, 0], [100, 99], { angle: 45 });
    expect(r.cap).toBe(45);
    expect(Math.abs(r.x - r.y)).toBeLessThan(0.001);
  });
  it('aimante la longueur sur le pas', () => {
    const r = contraindre([0, 0], [101, 0], { angle: 90, pas: 2 });
    expect(r.longueur % 2).toBe(0);
  });
  it('laisse le cap libre à zéro', () => {
    const r = contraindre([0, 0], [100, 37], { angle: 0 });
    expect(r.cap).toBeGreaterThan(0);
    expect(r.cap).toBeLessThan(45);
  });
  it('ne rend jamais moins d’un pas', () => {
    const r = contraindre([10, 10], [10, 10], { angle: 90 });
    expect(r.longueur).toBe(0);
    const q = contraindre([10, 10], [10.3, 10], { angle: 90 });
    expect(q.longueur).toBe(2);
  });
  it('offre l’angle libre en premier, l’angle droit juste après', () => {
    expect(ANGLES[0]).toBe(0);
    expect(ANGLES[1]).toBe(90);
  });
});

describe('accrocher', () => {
  const murs = [[[0, 0], [100, 0]], [[100, 50]]];
  it('colle au sommet visé', () => {
    const p = accrocher([98, 3], murs);
    expect(p).toEqual({
      x: 100, y: 0, accroche: true, genre: 'sommet',
    });
  });
  it('laisse le point tranquille loin de tout', () => {
    const p = accrocher([50, 30], murs);
    expect(p.accroche).toBe(false);
    expect(p.genre).toBeNull();
    expect(p.x).toBe(50);
  });
  it('choisit le plus proche', () => {
    const p = accrocher([100, 44], murs, { seuil: 20 });
    expect(p.y).toBe(50);
  });
  it('survit à une liste vide', () => {
    expect(accrocher([1, 2], []).accroche).toBe(false);
    expect(accrocher([1, 2]).accroche).toBe(false);
  });
  it('prend le milieu d’un segment', () => {
    const p = accrocher([50, 3], [[[0, 0], [100, 0]]]);
    expect(p).toMatchObject({ x: 50, y: 0, genre: 'milieu' });
  });
  it('se pose sur le segment quand ni sommet ni milieu ne sont là', () => {
    const p = accrocher([20, 3], [[[0, 0], [100, 0]]]);
    expect(p).toMatchObject({ x: 20, y: 0, genre: 'segment' });
  });
  it('le sommet bat le segment, même plus loin', () => {
    // Le segment passe à 1 sous le doigt, le sommet est à 4 : c'est le coin
    // qu'on vise. L'ordre des genres prime sur la distance.
    const p = accrocher([96, 1], [[[0, 0], [100, 0]]]);
    expect(p).toMatchObject({ x: 100, genre: 'sommet' });
  });
  it('tire l’équerre d’un mur voisin', () => {
    // Mur du bas horizontal ; depuis (50,0) on vise presque la verticale.
    const p = accrocher([52, 40], [[[0, 0], [100, 0]]], { origine: [50, 0], seuil: 8 });
    expect(p).toMatchObject({ genre: 'equerre', x: 50 });
    expect(p.y).toBeCloseTo(40, 0);
  });
  it('aligne sur l’axe d’un sommet existant', () => {
    const p = accrocher([103, 60], [[[0, 0], [100, 0]]], { seuil: 8 });
    expect(p).toMatchObject({ x: 100, y: 60, genre: 'axe' });
  });
});

describe('accrocher — la portée de chaque genre', () => {
  const mur = [[[0, 0], [100, 0]]];

  it('laisse tracer à 40 cm d’un mur', () => {
    // La plainte d'origine : l'accroche tirait de 80 cm et rendait impossible
    // un point posé volontairement près d'un mur. Le segment ne porte plus
    // qu'à 30 cm.
    expect(accrocher([50, 4], mur).accroche).toBe(false);
  });

  it('garde le coin accrocheur plus loin que le mur', () => {
    expect(accrocher([100, 4], mur)).toMatchObject({ genre: 'sommet', y: 0 });
    expect(accrocher([50, 4], mur).accroche).toBe(false);
  });

  it('n’aligne plus que de très près', () => {
    // L'alignement est le genre le plus discret : il se déclenche sous le
    // doigt, pas à un demi-mètre.
    expect(accrocher([103, 60], mur).accroche).toBe(false);
    expect(accrocher([102, 60], mur)).toMatchObject({ genre: 'axe', x: 100 });
  });

  it('coupe tout à seuil nul', () => {
    // La touche Alt : rien n'accroche, on pose où on veut.
    expect(accrocher([100, 0], mur, { seuil: 0 })).toMatchObject({
      x: 100, y: 0, accroche: false, genre: null,
    });
  });
});

describe('changerLongueur', () => {
  const mur = [[0, 0], [100, 0], [100, 50]];

  it('rallonge le segment sans tordre la suite', () => {
    expect(changerLongueur(mur, 0, 120)).toEqual([[0, 0], [120, 0], [120, 50]]);
  });

  it('raccourcit aussi', () => {
    expect(changerLongueur(mur, 1, 20)).toEqual([[0, 0], [100, 0], [100, 20]]);
  });

  it('garde une polyligne fermée fermée', () => {
    const piece4 = [[0, 0], [100, 0], [100, 50], [0, 50], [0, 0]];
    const sortie = changerLongueur(piece4, 0, 150);
    expect(sortie[0]).toEqual([0, 0]);
    expect(sortie[sortie.length - 1]).toEqual([0, 0]);
    expect(sortie[1]).toEqual([150, 0]);
  });

  it('refuse un index ou une mesure hors jeu', () => {
    expect(changerLongueur(mur, 2, 30)).toBeNull();
    expect(changerLongueur(mur, -1, 30)).toBeNull();
    expect(changerLongueur(mur, 0, 0)).toBeNull();
    expect(changerLongueur([[5, 5], [5, 5]], 0, 30)).toBeNull();
  });
});

describe('segmentProche', () => {
  const mur = [[0, 0], [100, 0], [100, 50]];
  it('trouve le segment visé', () => {
    expect(segmentProche(mur, [40, 2])).toBe(0);
    expect(segmentProche(mur, [99, 30])).toBe(1);
  });
  it('rend -1 loin du mur', () => {
    expect(segmentProche(mur, [40, 40])).toBe(-1);
  });
});

describe('angleEntre', () => {
  it('voit l’angle droit', () => {
    expect(angleEntre([0, 10], [0, 0], [10, 0])).toBeCloseTo(90);
  });
  it('voit le mur droit', () => {
    expect(angleEntre([-10, 0], [0, 0], [10, 0])).toBeCloseTo(180);
  });
  it('rend zéro sans longueur', () => {
    expect(angleEntre([0, 0], [0, 0], [10, 0])).toBe(0);
  });
});

describe('périmètre, aire, fermeture', () => {
  const carre = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]];
  it('additionne les segments', () => {
    expect(perimetre(carre)).toBe(400);
    expect(perimetre([])).toBe(0);
  });
  it('rend l’aire en mètres carrés', () => {
    // 100 unités = 10 m de côté, donc 100 m².
    expect(aire(carre)).toBeCloseTo(100);
  });
  it('ne compte pas l’aire d’un trait', () => {
    expect(aire([[0, 0], [10, 0]])).toBe(0);
  });
  it('dit quand la boucle se referme', () => {
    expect(ferme(carre)).toBe(true);
    expect(ferme([[0, 0], [100, 0], [100, 100]])).toBe(false);
  });
});

describe('enMetres et depuisMetres', () => {
  it('écrit comme on lit', () => {
    expect(enMetres(64)).toBe('6,40 m');
    expect(enMetres(64, { unite: false })).toBe('6,40');
    expect(enMetres(64, { decimales: 1 })).toBe('6,4 m');
  });
  it('relit une saisie humaine', () => {
    expect(depuisMetres('6,4')).toBe(64);
    expect(depuisMetres('6.4 m')).toBe(64);
    expect(depuisMetres('')).toBe(null);
    expect(depuisMetres('abc')).toBe(null);
    expect(depuisMetres('0')).toBe(null);
  });
});

describe('cotes', () => {
  it('pose une étiquette au milieu de chaque segment', () => {
    const c = cotes([[0, 0], [100, 0], [100, 60]]);
    expect(c).toHaveLength(2);
    expect(c[0]).toMatchObject({ x: 50, y: 0, texte: '10,00 m' });
    expect(c[1].texte).toBe('6,00 m');
  });
  it('ne met jamais le texte la tête en bas', () => {
    const c = cotes([[100, 0], [0, 0]]);
    expect(c[0].angle).toBe(0);
  });
  it('porte l’index du segment, même quand une cote saute', () => {
    // La cote est la poignée d'édition : son index doit viser le bon segment,
    // pas sa place dans la liste — sinon un bout trop court décale tout.
    const c = cotes([[0, 0], [2, 0], [2, 100]]);
    expect(c).toHaveLength(1);
    expect(c[0].index).toBe(1);
  });
  it('ignore les bouts trop courts pour être lus', () => {
    expect(cotes([[0, 0], [2, 0]])).toHaveLength(0);
  });
});

describe('murLePlusProche', () => {
  const murs = [[[0, 0], [100, 0]], [[0, 50], [100, 50]]];
  it('trouve le mur sous le clic', () => {
    expect(murLePlusProche(murs, [50, 2])).toBe(0);
    expect(murLePlusProche(murs, [50, 48])).toBe(1);
  });
  it('rend -1 loin de tout', () => {
    expect(murLePlusProche(murs, [50, 25])).toBe(-1);
  });
});

describe('piece', () => {
  it('rend quatre murs fermés', () => {
    const m = piece({ x: 10, y: 20, l: 100, h: 60 });
    expect(m).toHaveLength(5);
    expect(m[0]).toEqual([10, 20]);
    expect(m[4]).toEqual([10, 20]);
    expect(aire(m)).toBeCloseTo(60);
  });
  it('refuse un rectangle plat', () => {
    expect(piece({ x: 0, y: 0, l: 0, h: 10 })).toBe(null);
  });
});

describe('pivoter', () => {
  const postes = [
    { id: 'a', x: 0, y: 0, l: 14, h: 8, rot: 0 },
    { id: 'b', x: 20, y: 0, l: 14, h: 8, rot: 0 },
  ];
  it('tourne le groupe comme un meuble, pas chaque poste sur lui-même', () => {
    const r = pivoter(postes, 90);
    expect(r[0].rot).toBe(90);
    // Alignés en x avant, alignés en y après.
    expect(r[0].x).toBe(r[1].x);
    expect(r[0].y).not.toBe(r[1].y);
  });
  it('ramène l’angle dans [0, 360[', () => {
    expect(pivoter([{ x: 0, y: 0, l: 14, h: 8, rot: 300 }], 90)[0].rot).toBe(30);
    expect(pivoter([{ x: 0, y: 0, l: 14, h: 8, rot: 0 }], -90)[0].rot).toBe(270);
  });
  it('accepte un pivot imposé et garde le plan', () => {
    const r = pivoter(postes, 180, { centre: { x: 0, y: 0 } });
    expect(r[0].x).toBeGreaterThanOrEqual(0);
    expect(r[0].y).toBeGreaterThanOrEqual(0);
  });
  it('rend une liste vide sur rien', () => {
    expect(pivoter([], 90)).toEqual([]);
  });
});

describe('deplacerSommet', () => {
  const mur = [[0, 0], [100, 0], [100, 50]];
  it('déplace le point visé et aimante', () => {
    const r = deplacerSommet(mur, 1, { x: 101, y: 3 });
    expect(r[1]).toEqual([102, 4]);
    expect(r[0]).toEqual([0, 0]);
  });
  it('refuse un index hors du mur', () => {
    expect(deplacerSommet(mur, 9, { x: 0, y: 0 })).toBe(null);
    expect(deplacerSommet([], 0, { x: 0, y: 0 })).toBe(null);
  });
});

describe('translaterTrace', () => {
  it('déplace tous les points du même vecteur', () => {
    expect(translaterTrace([[10, 10], [30, 10]], { dx: 5, dy: -2 }))
      .toEqual([[15, 8], [35, 8]]);
  });

  it('borne au plan sans déformer le reste', () => {
    const r = translaterTrace([[0, 0], [20, 0]], { dx: -50, dy: 0 });
    expect(r[0][0]).toBe(0);
  });
});

describe('pivoterTrace', () => {
  it('tourne un mur d’un quart de tour autour de sa boîte', () => {
    // Un mur horizontal de 20 devient vertical de 20, au même endroit.
    const r = pivoterTrace([[10, 10], [30, 10]], 90);
    expect(r).toEqual([[20, 0], [20, 20]]);
  });

  it('tourne autour d’un centre imposé — le groupe, pas chacun', () => {
    expect(pivoterTrace([[10, 0], [20, 0]], 180, { x: 15, y: 0 }))
      .toEqual([[20, 0], [10, 0]]);
  });
});

describe('boiteDe', () => {
  it('englobe tracés et rectangles', () => {
    const b = boiteDe([[[10, 10], [30, 10]]], [{ x: 0, y: 0, l: 5, h: 50 }]);
    expect(b).toMatchObject({ x: 0, y: 0, l: 30, h: 50, cx: 15, cy: 25 });
  });

  it('rend null sur du vide', () => {
    expect(boiteDe([], [])).toBe(null);
  });
});

describe('ciblesDuSommet', () => {
  it('le mur tiré perd son sommet ; ses voisins deviennent repères, pas cibles', () => {
    const c = ciblesDuSommet([[[0, 0], [10, 0], [10, 10], [20, 10]], [[50, 0], [50, 20]]], 0, 3, [2, 1]);
    expect(c.traces).toEqual([[[0, 0], [10, 0], [10, 10]], [[50, 0], [50, 20]]]);
    expect(c.epaisseurs).toEqual([2, 1]);
    expect(c.reperes).toEqual([[10, 10]]);
    expect(c.origine).toEqual([10, 10]);
  });
  it('une pièce fermée perd aussi le double de son premier point', () => {
    const c = ciblesDuSommet([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]], 0, 0);
    expect(c.traces).toEqual([[[10, 0], [10, 10], [0, 10]]]);
    expect(c.reperes).toEqual(expect.arrayContaining([[10, 0], [0, 10]]));
  });
  it('un mur court ne se recolle pas à son propre coin', () => {
    const c = ciblesDuSommet([[[0, 0], [0, 4]]], 0, 1);
    const r = accrocher({ x: 0.5, y: 0.6 }, c.traces, { seuil: 5, reperes: c.reperes });
    expect(r.genre).not.toBe('sommet');
  });
});

describe('accrocher sur la face', () => {
  // Un mur de 40 cm d'épaisseur le long de y = 0 : faces à y = ±2.
  const murs = [[[0, 0], [100, 0]]];
  it('un point près de la face s’y pose, pas sur l’axe', () => {
    expect(accrocher({ x: 50, y: 5.5 }, murs, { seuil: 5, epaisseurs: [4] }))
      .toMatchObject({ x: 50, y: 2, genre: 'face' });
  });
  it('dans l’épaisseur aussi, sur la face la plus proche', () => {
    expect(accrocher({ x: 50, y: -1.5 }, murs, { seuil: 5, epaisseurs: [4] }))
      .toMatchObject({ y: -2, genre: 'face' });
  });
  it('sans épaisseurs donnés, l’axe comme avant', () => {
    expect(accrocher({ x: 30, y: 1 }, murs, { seuil: 5 }).genre).toBe('segment');
  });
});

describe('aimanterSommets sur la face', () => {
  it('un bout de cloison bute sur la face du mur épais', () => {
    const r = aimanterSommets([[50, 20], [50, 10]], [[[0, 0], [100, 0]]], { dx: 0, dy: -6 }, 4, [4]);
    expect(r).toMatchObject({ dx: 0, dy: -8, point: { x: 50, y: 2 } });
  });
});

describe('deplacerSommet libre', () => {
  it('un point accroché ne retombe pas sur la grille', () => {
    expect(deplacerSommet([[0, 0], [10, 0]], 1, { x: 13.37, y: 2.21 }, { pas: 5, libre: true }))
      .toEqual([[0, 0], [13.37, 2.21]]);
  });
});

describe('joindreMurs', () => {
  it('deux bouts qui se touchent font un seul tracé', () => {
    const r = joindreMurs([[[0, 0], [10, 0]], [[10, 20], [10, 0]]], [2, 1], 0, 1);
    expect(r.joint).toBe(true);
    expect(r.murs).toEqual([[[0, 0], [10, 0], [10, 20]]]);
    expect(r.epaisseurs).toEqual([2]);
  });
  it('par le début du mur tiré', () => {
    const r = joindreMurs([[[0, 0], [5, 5]], [[0, 9], [0, 0]]], [], 0, 0);
    expect(r.murs).toEqual([[[5, 5], [0, 0], [0, 9]]]);
  });
  it('un sommet du milieu, ou rien en face : rien ne change', () => {
    const murs = [[[0, 0], [10, 0], [10, 10]], [[10, 0], [20, 0]]];
    expect(joindreMurs(murs, [], 0, 1).joint).toBe(false);
    expect(joindreMurs([[[0, 0], [3, 0]], [[9, 9], [8, 8]]], [], 0, 1).joint).toBe(false);
  });
});

describe('aimanterSommets', () => {
  const fixes = [[[20, 0], [20, 40]]];
  it('un bout tombe sur le sommet voisin', () => {
    expect(aimanterSommets([[0, 0], [10, 0]], fixes, { dx: 9, dy: 1 }, 3))
      .toMatchObject({ dx: 10, dy: 0, point: { x: 20, y: 0 } });
  });
  it('à défaut, sur le segment', () => {
    expect(aimanterSommets([[0, 20], [10, 20]], fixes, { dx: 9.5, dy: 0 }, 3))
      .toMatchObject({ dx: 10, dy: 0, point: { x: 20, y: 20 } });
  });
  it('loin, ou seuil nul : libre', () => {
    expect(aimanterSommets([[0, 0]], fixes, { dx: 5, dy: 5 }, 3).point).toBeNull();
    expect(aimanterSommets([[0, 0]], fixes, { dx: 20, dy: 0 }, 0).point).toBeNull();
  });
});
