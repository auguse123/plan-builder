import { describe, expect, it } from 'vitest';
import {
  BLOCS, blocDe, blocsDuRayon, encombrement, meubleDuBloc, ouvertureDuBloc,
  posesDuBloc, RAYONS, rectangleDuBloc, tailleDite, typeDuBloc,
} from './blocs.js';
import { BORNES } from './plan.js';
import { COTE_MEUBLE, nettoyerMeuble } from './meubles.js';
import { LARGEUR, TYPES_OUVERTURE } from './ouvertures.js';

describe('catalogue', () => {
  it('range chaque bloc dans un rayon connu, sans clé en double', () => {
    const rayons = RAYONS.map((r) => r.cle);
    expect(BLOCS.every((b) => rayons.includes(b.rayon))).toBe(true);
    expect(new Set(BLOCS.map((b) => b.cle)).size).toBe(BLOCS.length);
  });

  it('ne propose que des tailles que la base accepte', () => {
    expect(BLOCS.every((b) => b.l > 0 && b.h > 0
      && b.l <= BORNES.taille && b.h <= BORNES.taille)).toBe(true);
  });

  it('donne une des quatre familles, et ce que chacune exige', () => {
    expect(BLOCS.every((b) => ['poste', 'salle', 'meuble', 'ouverture'].includes(b.famille)))
      .toBe(true);
    expect(BLOCS.filter((b) => b.famille === 'salle').every((b) => b.capacite >= 1)).toBe(true);
    expect(BLOCS.filter((b) => b.famille === 'poste').every((b) => b.postes >= 1)).toBe(true);
  });

  it('ne pose que des clés de meuble que la base accepte', () => {
    // Miroir du `^[a-z0-9-]{1,40}$` d'`om_plan_patch` : une clé refusée là-bas
    // ferait échouer l'écriture ENTIÈRE du plan, pas seulement ce meuble.
    const meubles = BLOCS.filter((b) => b.famille === 'meuble');
    expect(meubles.length).toBeGreaterThan(20);
    expect(meubles.every((b) => /^[a-z0-9-]{1,40}$/.test(b.cle))).toBe(true);
    expect(meubles.every((b) => b.l >= COTE_MEUBLE.mini && b.l <= COTE_MEUBLE.maxi
      && b.h >= COTE_MEUBLE.mini && b.h <= COTE_MEUBLE.maxi)).toBe(true);
  });

  it('n’ouvre que des types et des largeurs connus des ouvertures', () => {
    const types = TYPES_OUVERTURE.map((t) => t.cle);
    const portes = BLOCS.filter((b) => b.famille === 'ouverture');
    expect(portes.length).toBeGreaterThan(4);
    expect(portes.every((b) => types.includes(b.type))).toBe(true);
    expect(portes.every((b) => b.l >= LARGEUR.mini && b.l <= LARGEUR.maxi)).toBe(true);
    expect(typeDuBloc(blocDe('porte-double')).cle).toBe('double');
    expect(typeDuBloc(blocDe('bench-6'))).toBe(null);
  });

  it('retombe sur le bureau standard si la clé est inconnue', () => {
    expect(blocDe('n’existe pas').cle).toBe('bureau-standard');
    expect(blocsDuRayon('bench').length).toBeGreaterThan(3);
  });

  it('annonce la taille en mètres, virgule française', () => {
    expect(tailleDite(blocDe('bureau-standard'))).toBe('1,4 × 0,8 m');
  });

  it('n’annonce qu’une largeur pour une ouverture : l’épaisseur est celle du mur', () => {
    expect(tailleDite(blocDe('porte-simple'))).toBe('0,9 m de large');
  });
});

describe('encombrement', () => {
  it('rend le meuble lui-même pour un bloc à une place', () => {
    expect(encombrement(blocDe('bureau-confort'))).toEqual({ l: 16, h: 8 });
  });

  it('rend la banque entière pour un bench dos à dos', () => {
    // Six places : trois de front (2 × 18 + 14), deux rangs de 8.
    expect(encombrement(blocDe('bench-6'))).toEqual({ l: 50, h: 16 });
  });

  it('compte une rangée simple en longueur', () => {
    expect(encombrement(blocDe('file-3'))).toEqual({ l: 50, h: 8 });
  });
});

describe('posesDuBloc', () => {
  const plan = { largeur: 300, hauteur: 200 };

  it('pose le bloc CENTRÉ sur le point cliqué', () => {
    const [p] = posesDuBloc(blocDe('bureau-standard'), { x: 100, y: 50 }, { plan });
    expect([p.x, p.y, p.l, p.h]).toEqual([94, 46, 14, 8]);
  });

  it('rend autant de places que le bloc en annonce', () => {
    expect(posesDuBloc(blocDe('bench-8'), { x: 150, y: 100 }, { plan })).toHaveLength(8);
  });

  it('garde la banque dans la feuille', () => {
    const places = posesDuBloc(blocDe('bench-8'), { x: 0, y: 0 }, { plan });
    expect(places.every((p) => p.x >= 0 && p.y >= 0)).toBe(true);
  });

  it('ne rend rien pour un bloc de réunion', () => {
    expect(posesDuBloc(blocDe('table-8'), { x: 10, y: 10 }, { plan })).toEqual([]);
  });
});

describe('rectangleDuBloc', () => {
  const plan = { largeur: 300, hauteur: 200 };

  it('centre la salle sur le point et garde son gabarit', () => {
    expect(rectangleDuBloc(blocDe('table-8'), { x: 100, y: 100 }, { plan }))
      .toEqual({ x: 84, y: 90, l: 32, h: 21, rot: 0 });
  });

  it('ne laisse pas la salle déborder de la feuille', () => {
    const r = rectangleDuBloc(blocDe('booth-ronde'), { x: 300, y: 200 }, { plan });
    expect([r.x + r.l <= 300, r.y + r.h <= 200]).toEqual([true, true]);
  });

  it('ne rend rien pour un bloc de bureau', () => {
    expect(rectangleDuBloc(blocDe('bench-6'), { x: 10, y: 10 }, { plan })).toBe(null);
  });
});

describe('meubleDuBloc', () => {
  const plan = { largeur: 300, hauteur: 200 };

  it('centre le meuble et emporte son nom', () => {
    expect(meubleDuBloc(blocDe('canape-3'), { x: 100, y: 100 }, { plan }))
      .toEqual({ k: 'canape-3', n: 'Canapé 3 places', x: 90, y: 96, l: 21, h: 9, rot: 0 });
  });

  it('rend un meuble que la base accepterait tel quel', () => {
    const m = meubleDuBloc(blocDe('plante'), { x: 12, y: 12 }, { plan });
    expect(nettoyerMeuble(m)).toEqual(m);
  });

  it('ne laisse pas le meuble déborder de la feuille', () => {
    const m = meubleDuBloc(blocDe('tapis'), { x: 300, y: 200 }, { plan });
    expect([m.x + m.l <= 300, m.y + m.h <= 200]).toEqual([true, true]);
  });

  it('ne rend rien pour un bloc qui se réserve', () => {
    expect(meubleDuBloc(blocDe('table-8'), { x: 10, y: 10 }, { plan })).toBe(null);
    expect(meubleDuBloc(blocDe('bench-6'), { x: 10, y: 10 }, { plan })).toBe(null);
  });
});

describe('ouvertureDuBloc', () => {
  const murs = [[[0, 0], [100, 0]]];

  it('perce le mur visé, à la largeur du bloc', () => {
    expect(ouvertureDuBloc(blocDe('porte-double'), murs, { x: 40, y: 1 }))
      .toMatchObject({ x: 40, y: 0, a: 0, l: 16, k: 'double' });
  });

  it('ne pose rien loin de tout mur : une porte qui flotte ne veut rien dire', () => {
    expect(ouvertureDuBloc(blocDe('porte-simple'), murs, { x: 40, y: 80 })).toBe(null);
    expect(ouvertureDuBloc(blocDe('porte-simple'), [], { x: 0, y: 0 })).toBe(null);
  });

  it('ne rend rien pour un bloc qui n’est pas un percement', () => {
    expect(ouvertureDuBloc(blocDe('canape-3'), murs, { x: 40, y: 1 })).toBe(null);
  });
});
