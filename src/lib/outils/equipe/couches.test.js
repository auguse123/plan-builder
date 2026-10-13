import { describe, expect, it } from 'vitest';
import { COUCHES, basculerCouche, couchesNettes, couchesTouchees, prenable } from './couches';

describe('couches', () => {
  it('par défaut tout se voit, rien n’est verrouillé', () => {
    const c = couchesNettes(null);
    expect(Object.keys(c)).toEqual(COUCHES.map((x) => x.cle));
    expect(Object.values(c).every((x) => x.vu && !x.verrou)).toBe(true);
    expect(couchesTouchees(c)).toBe(0);
  });
  it('un état relu ne se croit pas', () => {
    const c = couchesNettes({ murs: { vu: 'non', verrou: 1 }, inconnue: { vu: false }, zones: 3 });
    expect(c.murs).toEqual({ vu: true, verrou: false });
    expect(c.inconnue).toBeUndefined();
    expect(c.zones).toEqual({ vu: true, verrou: false });
  });
  it('masquer ou verrouiller retire la couche des prises', () => {
    let c = basculerCouche({}, 'mobilier', 'verrou');
    expect(prenable(c, 'mobilier')).toBe(false);
    expect(prenable(c, 'murs')).toBe(true);
    c = basculerCouche(c, 'murs', 'vu');
    expect(prenable(c, 'murs')).toBe(false);
    expect(couchesTouchees(c)).toBe(2);
  });
  it('un drapeau inconnu ne change rien', () => {
    expect(basculerCouche({}, 'murs', 'rouge')).toEqual(couchesNettes({}));
  });
});
