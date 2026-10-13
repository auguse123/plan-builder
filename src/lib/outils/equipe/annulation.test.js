import { describe, expect, it } from 'vitest';
import {
  empiler, entreeVide, fusionner, inverse, vueAvecGeometries, vueAvecPatchPlan, vueAvecZones,
} from './annulation';

describe('fusionner', () => {
  it('un geste qui touche murs, postes et zones devient UNE entrée', () => {
    const plan = { plan: { id: 'p1', patch: { murs: [[1]] } } };
    const postes = { postes: [{ id: 'a', x: 1 }] };
    const zones = { zones: [{ id: 'z', x: 0 }] };
    const e = fusionner(fusionner(plan, postes), zones);
    expect(e).toEqual({ plan: { id: 'p1', patch: { murs: [[1]] } }, postes: [{ id: 'a', x: 1 }], zones: [{ id: 'z', x: 0 }] });
  });

  it("garde l'état le plus ancien d'un même objet", () => {
    const e = fusionner({ postes: [{ id: 'a', x: 1 }] }, { postes: [{ id: 'a', x: 9 }, { id: 'b', x: 2 }] });
    expect(e.postes).toEqual([{ id: 'a', x: 1 }, { id: 'b', x: 2 }]);
  });

  it('un plan patché deux fois garde ses premières clés et gagne les autres', () => {
    const e = fusionner(
      { plan: { id: 'p', patch: { murs: 'ancien' } } },
      { plan: { id: 'p', patch: { murs: 'recent', meubles: 'm' } } },
    );
    expect(e.plan.patch).toEqual({ murs: 'ancien', meubles: 'm' });
  });

  it('rassemble les créations', () => {
    expect(fusionner({ crees: ['a'] }, { crees: ['b', 'a'] }).crees).toEqual(['a', 'b']);
    expect(fusionner({ crees: ['a'] }, { zonesCreees: ['z'] })).toEqual({ crees: ['a'], zonesCreees: ['z'] });
  });

  it('un calque null (pas de calque avant) reste une entrée', () => {
    expect(fusionner(null, { calque: null })).toEqual({ calque: null });
    expect(entreeVide({ calque: null })).toBe(false);
  });
});

describe('empiler', () => {
  it("n'empile pas le vide, borne la pile", () => {
    expect(empiler([], {})).toEqual([]);
    expect(empiler([1, 2, 3].map((i) => ({ crees: [i] })), { crees: [4] }, 3).map((e) => e.crees[0])).toEqual([2, 3, 4]);
  });
});

describe('inverse', () => {
  const etat = {
    plan: { murs: 'maintenant', portes: 'p' },
    postes: [{ id: 'a', x: 5, y: 6, l: 14, h: 8, rot: 0, nom: 'A' }],
    zones: [{ id: 'z', x: 1, y: 2, l: 3, h: 4 }],
    calque: { x: 3 },
  };

  it("relit l'état courant des mêmes clés", () => {
    const e = inverse({
      plan: { id: 'p', patch: { murs: 'avant' } },
      postes: [{ id: 'a', x: 0, y: 0 }],
      zones: [{ id: 'z', x: 0, y: 0, l: 1, h: 1 }],
      calque: null,
    }, etat);
    expect(e).toEqual({
      plan: { id: 'p', patch: { murs: 'maintenant' } },
      postes: [{ id: 'a', x: 5, y: 6 }],
      zones: [{ id: 'z', x: 1, y: 2, l: 3, h: 4 }],
      calque: { x: 3 },
    });
  });

  it('une création défaite ne se refait pas', () => {
    expect(inverse({ crees: ['a'] }, etat)).toBeNull();
    expect(inverse({ zonesCreees: ['z'], postes: [{ id: 'a', x: 0 }] }, etat)).toBeNull();
  });

  it('un objet disparu ne se relit pas', () => {
    expect(inverse({ postes: [{ id: 'mort', x: 1 }] }, etat)).toBeNull();
  });
});

describe('le cache devancé', () => {
  const vue = {
    postes: [{ id: 'a', x: 0, nom: 'A' }, { id: 'b', x: 0 }],
    salles: [{ id: 's', x: 0 }],
    zones: [{ id: 'z', x: 0, nom: 'Z' }],
    plans: [{ id: 'p', murs: [] }, { id: 'q', murs: [] }],
  };

  it('pose les géométries sur postes ET salles, sans rien perdre', () => {
    const v = vueAvecGeometries(vue, [{ id: 'a', x: 5 }, { id: 's', x: 7 }]);
    expect(v.postes[0]).toEqual({ id: 'a', x: 5, nom: 'A' });
    expect(v.postes[1]).toBe(vue.postes[1]);
    expect(v.salles[0].x).toBe(7);
  });

  it('pose les zones et le patch du bon plan', () => {
    expect(vueAvecZones(vue, [{ id: 'z', x: 4 }]).zones[0]).toEqual({ id: 'z', x: 4, nom: 'Z' });
    const v = vueAvecPatchPlan(vue, 'q', { murs: [[1]] });
    expect(v.plans[0].murs).toEqual([]);
    expect(v.plans[1].murs).toEqual([[1]]);
  });

  it('une vue absente reste absente', () => {
    expect(vueAvecGeometries(undefined, [{ id: 'a' }])).toBeUndefined();
  });
});
