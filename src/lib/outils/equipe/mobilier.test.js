import { describe, expect, it } from 'vitest';
import { amenagement, amenagementSalle, CHAISE, corpsQuiTient } from './mobilier';

// De profil (90°, 270°), une chaise échange largeur et profondeur.
const dedans = (c, l, h) => {
  const [dx, dy] = c.rot % 180 ? [CHAISE.p / 2, CHAISE.l / 2] : [CHAISE.l / 2, CHAISE.p / 2];
  return c.x - dx >= -0.01 && c.x + dx <= l + 0.01 && c.y - dy >= -0.01 && c.y + dy <= h + 0.01;
};

describe('amenagement', () => {
  it('une chaise par place, toutes dans l’emprise', () => {
    for (const places of [1, 4, 6, 8, 10, 16]) {
      const a = amenagement({ l: 40, h: 16, places });
      expect(a.chaises).toHaveLength(places);
      expect(a.chaises.every((c) => dedans(c, 40, 16))).toBe(true);
    }
  });

  it('à partir de huit, une chaise à chaque bout', () => {
    const a = amenagement({ l: 32, h: 21, places: 8 });
    expect(a.chaises.filter((c) => c.rot === 90 || c.rot === 270)).toHaveLength(2);
    expect(a.chaises.filter((c) => c.rot === 0)).toHaveLength(3);
  });

  it('le plateau se rétrécit, l’emprise non', () => {
    const { table } = amenagement({ l: 18, h: 12, places: 4 });
    expect(table).toMatchObject({ x: 1, y: 3, l: 16, h: 6 });
  });

  it('une table en hauteur se transpose', () => {
    const a = amenagement({ l: 12, h: 24, places: 6 });
    expect(a.table).toMatchObject({ x: 3, y: 1, l: 6, h: 22 });
    expect(a.chaises.filter((c) => c.rot === 270)).toHaveLength(3);
    expect(a.chaises.every((c) => dedans(c, 12, 24))).toBe(true);
  });

  it('ronde : les chaises tournées vers le centre', () => {
    const a = amenagement({ l: 22, h: 22, places: 4, rond: true });
    expect(a.table).toMatchObject({ rond: true, cx: 11, cy: 11, rx: 8 });
    expect(a.chaises[0]).toMatchObject({ x: 11, rot: 0 });
    expect(a.chaises[2]).toMatchObject({ x: 11, rot: 180 });
  });

  it('sans place, la table seule', () => {
    expect(amenagement({ l: 10, h: 10 }).chaises).toEqual([]);
  });
});

describe('amenagementSalle', () => {
  it('le nom dit la forme : « ronde » fait un disque', () => {
    expect(amenagementSalle({ nom: 'Table ronde 6 pers.', l: 22, h: 22, capacite: 6 }).table.rond).toBe(true);
    expect(amenagementSalle({ nom: 'Table 6 pers.', l: 24, h: 12, capacite: 6 }).table.rond).toBe(false);
  });

  it('une phone box : vitrage, tablette, une chaise', () => {
    const a = amenagementSalle({ nom: 'Phone box', l: 10, h: 10, capacite: 1 });
    expect(a.vitre).not.toBeNull();
    expect(a.tablette).not.toBeNull();
    expect(a.chaises).toHaveLength(1);
  });

  it('une pièce vaste : la table au milieu, pas contre les murs', () => {
    const a = amenagementSalle({ nom: 'Salle de projet', l: 40, h: 30, capacite: 10 });
    expect(a.table.x).toBeGreaterThan(4);
    expect(a.table.y).toBeGreaterThan(4);
    expect(a.chaises).toHaveLength(10);
    expect(a.chaises.every((c) => dedans(c, 40, 30))).toBe(true);
  });

  it('sans capacité, rien à meubler', () => {
    expect(amenagementSalle({ nom: 'Salle', l: 30, h: 30 }).table).toBeNull();
  });
});

describe('corpsQuiTient', () => {
  it('assez de place : le corps plein', () => {
    expect(corpsQuiTient('Salle', 40)).toBe(3.6);
  });
  it('un peu serré : le corps se réduit', () => {
    const c = corpsQuiTient('Salle de projet', 20);
    expect(c).toBeLessThan(3.6);
    expect(c * 15 * 0.56).toBeLessThanOrEqual(20.01);
  });
  it('trop long : rien plutôt qu’un débord', () => {
    expect(corpsQuiTient('Table ronde 4 pers. (4)', 12)).toBe(0);
  });
});
