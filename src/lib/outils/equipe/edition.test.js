import { describe, expect, it } from 'vitest';
import {
  MINI, POIGNEES, etirerCalque, glisserCalque, nomNet, poigneeProche, poignees,
  redimensionner, sommetProche,
} from '@/lib/outils/equipe/edition';
import { deplacerSommet } from '@/lib/outils/equipe/trace';

const PLAN = { largeur: 300, hauteur: 200 };
const R = { x: 20, y: 20, l: 40, h: 30 };

describe('poignees', () => {
  it('rend les quatre coins dans le sens de lecture', () => {
    expect(poignees(R).map((p) => p.cle)).toEqual(POIGNEES);
    expect(poignees(R)[0]).toEqual({ cle: 'nw', x: 20, y: 20 });
    expect(poignees(R)[2]).toEqual({ cle: 'se', x: 60, y: 50 });
  });

  it('ne rend rien d’un rectangle sans surface', () => {
    expect(poignees({ x: 0, y: 0, l: 0, h: 10 })).toEqual([]);
    expect(poignees(null)).toEqual([]);
  });
});

describe('redimensionner', () => {
  it('tire le coin sud-est et laisse le nord-ouest en place', () => {
    const r = redimensionner(R, 'se', { x: 100, y: 80 }, { plan: PLAN });
    expect(r).toEqual({ x: 20, y: 20, l: 80, h: 60 });
  });

  it('tire le coin nord-ouest et laisse le sud-est en place', () => {
    const r = redimensionner(R, 'nw', { x: 10, y: 10 }, { plan: PLAN });
    expect(r).toEqual({ x: 10, y: 10, l: 50, h: 40 });
    expect(r.x + r.l).toBe(R.x + R.l);
    expect(r.y + r.h).toBe(R.y + R.h);
  });

  it('aimante le point sur la grille', () => {
    const r = redimensionner(R, 'se', { x: 71, y: 51 }, { plan: PLAN });
    expect(r.l % 2).toBe(0);
    expect(r.h % 2).toBe(0);
  });

  it('ne descend jamais sous le côté minimum', () => {
    const r = redimensionner(R, 'se', { x: 0, y: 0 }, { plan: PLAN });
    expect(r.l).toBe(MINI);
    expect(r.h).toBe(MINI);
    const q = redimensionner(R, 'nw', { x: 300, y: 200 }, { plan: PLAN });
    expect(q.l).toBe(MINI);
    expect(q.h).toBe(MINI);
  });

  it('reste dans le plan', () => {
    const r = redimensionner(R, 'se', { x: 9999, y: 9999 }, { plan: PLAN });
    expect(r.x + r.l).toBeLessThanOrEqual(PLAN.largeur);
    expect(r.y + r.h).toBeLessThanOrEqual(PLAN.hauteur);
  });

  it('refuse une poignée inconnue ou un rectangle vide', () => {
    expect(redimensionner(R, 'nord', { x: 0, y: 0 })).toBeNull();
    expect(redimensionner({ x: 0, y: 0, l: 0, h: 0 }, 'se', { x: 10, y: 10 })).toBeNull();
  });
});

describe('poigneeProche', () => {
  it('trouve le coin visé', () => {
    expect(poigneeProche(R, { x: 61, y: 51 })).toBe('se');
    expect(poigneeProche(R, { x: 20, y: 20 })).toBe('nw');
  });

  it('ne trouve rien au milieu', () => {
    expect(poigneeProche(R, { x: 40, y: 35 })).toBeNull();
  });
});

describe('sommetProche', () => {
  const mur = [[10, 10], [50, 10], [50, 40]];

  it('trouve le sommet visé', () => {
    expect(sommetProche(mur, { x: 51, y: 11 })).toBe(1);
  });

  it('rend -1 loin de tout sommet', () => {
    expect(sommetProche(mur, { x: 30, y: 10 })).toBe(-1);
    expect(sommetProche([], { x: 0, y: 0 })).toBe(-1);
  });
});

describe('deplacerSommet garde la pièce fermée', () => {
  const carre = [[0, 0], [40, 0], [40, 30], [0, 30], [0, 0]];

  it('déplace les deux copies du premier point', () => {
    const r = deplacerSommet(carre, 0, { x: 10, y: 10 });
    expect(r[0]).toEqual([10, 10]);
    expect(r[4]).toEqual([10, 10]);
  });

  it('fait de même par le dernier point', () => {
    const r = deplacerSommet(carre, 4, { x: 6, y: 6 });
    expect(r[0]).toEqual([6, 6]);
    expect(r[4]).toEqual([6, 6]);
  });

  it('laisse une polyligne ouverte ouverte', () => {
    const r = deplacerSommet([[0, 0], [40, 0], [40, 30]], 0, { x: 10, y: 10 });
    expect(r[0]).toEqual([10, 10]);
    expect(r[2]).toEqual([40, 30]);
  });
});

describe('nomNet', () => {
  it('nettoie les espaces et coupe à 80', () => {
    expect(nomNet('  Salle   du fond ')).toBe('Salle du fond');
    expect(nomNet('a'.repeat(120))).toHaveLength(80);
  });

  it('refuse le vide', () => {
    expect(nomNet('   ')).toBeNull();
    expect(nomNet(null)).toBeNull();
  });
});

describe('glisserCalque', () => {
  const C = { src: 'data:x', x: 20, y: 20, l: 40, h: 20 };

  it('translate la photo sans l’aimanter', () => {
    expect(glisserCalque(C, { dx: 3.33, dy: -7.5 }, { plan: PLAN }))
      .toEqual({ ...C, x: 23.33, y: 12.5 });
  });

  it('recolle dans la feuille ce qui en sort', () => {
    expect(glisserCalque(C, { dx: 500, dy: 500 }, { plan: PLAN }))
      .toEqual({ ...C, x: 260, y: 180 });
    expect(glisserCalque(C, { dx: -500, dy: -500 }, { plan: PLAN }))
      .toEqual({ ...C, x: 0, y: 0 });
  });

  it('laisse sortir des deux côtés une photo plus grande que la feuille', () => {
    const grand = { src: 'data:x', x: -50, y: 0, l: 400, h: 200 };
    expect(glisserCalque(grand, { dx: -500, dy: 0 }, { plan: PLAN }).x).toBe(-100);
    expect(glisserCalque(grand, { dx: 500, dy: 0 }, { plan: PLAN }).x).toBe(0);
  });

  it('ne rend rien sans photo', () => {
    expect(glisserCalque(null, { dx: 1, dy: 1 })).toBeNull();
    expect(glisserCalque({ src: 'data:x', l: 0, h: 10 }, { dx: 1, dy: 1 })).toBeNull();
  });
});

describe('etirerCalque', () => {
  const C = { src: 'data:x', x: 20, y: 20, l: 40, h: 20 };

  it('tient le rapport de l’image, quel que soit le coin visé', () => {
    const r = etirerCalque(C, 'se', { x: 140, y: 30 }, { plan: PLAN });
    expect(r).toEqual({ ...C, x: 20, y: 20, l: 120, h: 60 });
    expect(r.l / r.h).toBeCloseTo(C.l / C.h);
  });

  it('laisse le coin opposé en place', () => {
    const r = etirerCalque(C, 'nw', { x: 0, y: 0 }, { plan: PLAN });
    expect(r.x + r.l).toBe(60);
    expect(r.y + r.h).toBe(40);
    expect(r.l / r.h).toBeCloseTo(2);
  });

  it('couvre le point visé : le plus exigeant des deux écarts gagne', () => {
    // 30 de large ne ferait que 15 de haut, or le doigt est à 40 du coin fixe.
    const r = etirerCalque(C, 'se', { x: 50, y: 60 }, { plan: PLAN });
    expect(r).toEqual({ ...C, l: 80, h: 40 });
  });

  it('s’arrête au bord de la feuille sans se déformer', () => {
    const r = etirerCalque(C, 'se', { x: 9999, y: 9999 }, { plan: PLAN });
    expect(r.x + r.l).toBeLessThanOrEqual(PLAN.largeur);
    expect(r.y + r.h).toBeLessThanOrEqual(PLAN.hauteur);
    expect(r.l / r.h).toBeCloseTo(2);
  });

  it('ne descend pas sous le plus petit côté', () => {
    const r = etirerCalque(C, 'se', { x: 20, y: 20 }, { plan: PLAN });
    expect(Math.min(r.l, r.h)).toBe(MINI);
  });

  it('ne rend rien d’une poignée inconnue ou sans photo', () => {
    expect(etirerCalque(C, 'nord', { x: 0, y: 0 })).toBeNull();
    expect(etirerCalque(null, 'se', { x: 0, y: 0 })).toBeNull();
  });
});
