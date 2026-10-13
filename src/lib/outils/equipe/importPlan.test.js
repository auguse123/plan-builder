import { describe, expect, it } from 'vitest';
import {
  ajusterAuPlan, lireChemin, lireDxf, lireSvg, lireTrace,
} from '@/lib/outils/equipe/importPlan';
import { MURS } from '@/lib/outils/equipe/plan';

describe('lireSvg', () => {
  it('lit une ligne, une polyligne et un rectangle', () => {
    const svg = `<svg>
      <line x1="0" y1="0" x2="10" y2="0" />
      <polyline points="0,0 10,0 10,5" />
      <rect x="2" y="3" width="4" height="6" />
    </svg>`;
    const lignes = lireSvg(svg);
    expect(lignes[0]).toEqual([[0, 0], [10, 0]]);
    expect(lignes[1]).toEqual([[0, 0], [10, 0], [10, 5]]);
    expect(lignes[2]).toEqual([[2, 3], [6, 3], [6, 9], [2, 9], [2, 3]]);
  });

  it('ferme un polygone', () => {
    const l = lireSvg('<polygon points="0,0 10,0 10,10" />')[0];
    expect(l[l.length - 1]).toEqual([0, 0]);
  });

  it('accepte les guillemets simples et les décimales', () => {
    expect(lireSvg("<line x1='0.5' y1='0' x2='1.5' y2='0'/>")[0]).toEqual([[0.5, 0], [1.5, 0]]);
  });

  it('ignore ce qui n’est pas un trait', () => {
    expect(lireSvg('<svg><text>Bureau</text><circle r="4"/></svg>')).toEqual([]);
  });

  it('écarte un rectangle sans dimension', () => {
    expect(lireSvg('<rect x="1" y="1" width="0" height="5"/>')).toEqual([]);
  });
});

describe('lireChemin', () => {
  it('suit M, L, H, V et ferme sur Z', () => {
    const l = lireChemin('M 0 0 L 10 0 V 10 H 0 Z')[0];
    expect(l).toEqual([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]);
  });

  it('comprend le relatif', () => {
    expect(lireChemin('m 5 5 l 10 0')[0]).toEqual([[5, 5], [15, 5]]);
  });

  it('coupe un M en deux polylignes', () => {
    expect(lireChemin('M 0 0 L 5 0 M 20 0 L 25 0')).toHaveLength(2);
  });

  it('saute une courbe jusqu’à son arrivée', () => {
    expect(lireChemin('M 0 0 C 1 1 2 2 6 0')[0]).toEqual([[0, 0], [6, 0]]);
  });

  it('survit au vide', () => {
    expect(lireChemin('')).toEqual([]);
    expect(lireChemin('M 0 0')).toEqual([]);
  });
});

describe('lireDxf', () => {
  const dxf = ['0', 'LINE', '10', '0', '20', '0', '11', '10', '21', '0',
    '0', 'LWPOLYLINE', '70', '1', '10', '0', '20', '0', '10', '10', '20', '0', '10', '10', '20', '10',
    '0', 'ENDSEC'].join('\n');

  it('lit une LINE en retournant l’axe y', () => {
    expect(lireDxf(dxf)[0]).toEqual([[0, -0], [10, -0]]);
  });

  it('lit une LWPOLYLINE et la ferme sur le drapeau 70', () => {
    const l = lireDxf(dxf)[1];
    expect(l).toHaveLength(4);
    expect(l[l.length - 1]).toEqual(l[0]);
  });

  it('descend les VERTEX d’une POLYLINE', () => {
    const src = ['0', 'POLYLINE', '0', 'VERTEX', '10', '0', '20', '0',
      '0', 'VERTEX', '10', '5', '20', '0', '0', 'SEQEND'].join('\n');
    expect(lireDxf(src)[0]).toEqual([[0, -0], [5, -0]]);
  });

  it('survit à un fichier vide', () => {
    expect(lireDxf('')).toEqual([]);
  });
});

describe('lireTrace', () => {
  it('choisit le lecteur au nom du fichier', () => {
    expect(lireTrace('<line x1="0" y1="0" x2="5" y2="0"/>', 'plan.svg')).toHaveLength(1);
    expect(lireTrace('0\nLINE\n10\n0\n20\n0\n11\n5\n21\n0', 'plan.dxf')).toHaveLength(1);
  });

  it('reconnaît un SVG sans nom', () => {
    expect(lireTrace('<svg><line x1="0" y1="0" x2="5" y2="0"/></svg>')).toHaveLength(1);
  });
});

describe('ajusterAuPlan', () => {
  const carre = [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]];

  it('pose le tracé au plus grand dans le cadre', () => {
    const { murs } = ajusterAuPlan(carre, { plan: { largeur: 300, hauteur: 200 }, marge: 0 });
    const xs = murs[0].map((p) => p[0]);
    const ys = murs[0].map((p) => p[1]);
    // Cadre 300×200, tracé carré : il tient sur la hauteur et se centre en x.
    expect(Math.max(...ys) - Math.min(...ys)).toBe(200);
    expect(Math.min(...xs)).toBe(50);
    expect(Math.max(...xs)).toBe(250);
  });

  it('respecte une échelle donnée', () => {
    const { murs } = ajusterAuPlan(carre, { plan: { largeur: 300, hauteur: 200 }, echelle: 0.5 });
    const xs = murs[0].map((p) => p[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(50);
  });

  it('tient les plafonds de la base', () => {
    const trop = Array.from({ length: MURS.lignes + 6 }, () => [[0, 0], [10, 0]]);
    const { murs, tombes } = ajusterAuPlan(trop);
    expect(murs.length).toBeLessThanOrEqual(MURS.lignes);
    expect(murs.reduce((n, l) => n + l.length, 0)).toBeLessThanOrEqual(MURS.total);
    expect(tombes).toBe(6);
  });

  it('ne rend rien sur une liste vide', () => {
    expect(ajusterAuPlan([])).toEqual({ murs: [], gardes: 0, tombes: 0 });
    expect(ajusterAuPlan([[[1, 1]]]).murs).toEqual([]);
  });
});
