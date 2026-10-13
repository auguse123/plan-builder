import { describe, it, expect } from 'vitest';
import {
  bornesObservees, bornesPeriode, decalerPeriode, fenetreMesurable, joursOuvresEntre,
  libelleJour, numeroTrimestre, PERIODES,
} from './periodes';

describe('bornesPeriode', () => {
  it('la semaine va du lundi au dimanche, jours non ouvrés compris', () => {
    // Le 16 septembre 2026 est un mercredi.
    const b = bornesPeriode('semaine', new Date(2026, 8, 16));
    expect(b.debut).toBe('2026-09-14');
    expect(b.fin).toBe('2026-09-20');
  });

  it('le mois s’arrête au dernier jour, même en février', () => {
    expect(bornesPeriode('mois', new Date(2026, 1, 10)).fin).toBe('2026-02-28');
    // 2028 est bissextile : le 29 existe.
    expect(bornesPeriode('mois', new Date(2028, 1, 10)).fin).toBe('2028-02-29');
  });

  it('le trimestre est civil, pas trois mois glissants', () => {
    const b = bornesPeriode('trimestre', new Date(2026, 8, 16));
    expect(b.debut).toBe('2026-07-01');
    expect(b.fin).toBe('2026-09-30');
    expect(b.label).toContain('T3');
  });

  it('« tout » ne rend aucune borne — c’est ce qui supprime la condition de date', () => {
    const b = bornesPeriode('tout');
    expect(b.debut).toBeNull();
    expect(b.fin).toBeNull();
  });

  it('un intervalle saisi à l’envers est remis à l’endroit', () => {
    const b = bornesPeriode('intervalle', new Date(), { debut: '2026-09-30', fin: '2026-09-01' });
    expect(b.debut).toBe('2026-09-01');
    expect(b.fin).toBe('2026-09-30');
  });

  it('un intervalle à moitié saisi se voit dans son libellé et se déclare partiel', () => {
    const b = bornesPeriode('intervalle', new Date(), { debut: '2026-09-01', fin: '' });
    expect(b.label).toBe('Intervalle à choisir');
    expect(b.fin).toBe('2026-09-01');
    expect(b.partielle).toBe(true);
  });

  it('un intervalle vide se déclare partiel — sinon il ressemble trait pour trait à « tout »', () => {
    const vide = bornesPeriode('intervalle', new Date(), {});
    const tout = bornesPeriode('tout');
    expect(vide.debut).toBe(tout.debut);
    expect(vide.fin).toBe(tout.fin);
    expect(vide.partielle).toBe(true);
    expect(tout.partielle).toBeUndefined();
  });

  it('un intervalle complet ne se déclare pas partiel', () => {
    const b = bornesPeriode('intervalle', new Date(), { debut: '2026-09-01', fin: '2026-09-30' });
    expect(b.partielle).toBeUndefined();
  });

  it('une clé inconnue retombe sur la semaine plutôt que de rendre du vide', () => {
    expect(bornesPeriode('trimestriel', new Date(2026, 8, 16)).cle).toBe('semaine');
  });
});

describe('decalerPeriode', () => {
  it('le mois se décale par le 1er : le 31 mars ne saute pas au 1er mai', () => {
    const suivant = decalerPeriode('mois', new Date(2026, 2, 31), 1);
    expect(bornesPeriode('mois', suivant).debut).toBe('2026-04-01');
  });

  it('le trimestre avance de trois mois d’un coup', () => {
    const suivant = decalerPeriode('trimestre', new Date(2026, 8, 16), 1);
    expect(bornesPeriode('trimestre', suivant).debut).toBe('2026-10-01');
  });

  it('la semaine recule de sept jours depuis son lundi', () => {
    const avant = decalerPeriode('semaine', new Date(2026, 8, 16), -1);
    expect(bornesPeriode('semaine', avant).debut).toBe('2026-09-07');
  });

  it('les périodes non navigables laissent l’ancre intacte', () => {
    PERIODES.filter((p) => !p.navigable).forEach((p) => {
      const ancre = new Date(2026, 8, 16);
      expect(decalerPeriode(p.cle, ancre, 1).getTime()).toBe(ancre.getTime());
    });
  });
});

describe('joursOuvresEntre', () => {
  it('ne rend que les jours ouvrés de l’espace', () => {
    const jours = joursOuvresEntre('2026-09-14', '2026-09-20', [1, 2, 3, 4, 5]);
    expect(jours.map((j) => j.cle)).toEqual([
      '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
    ]);
  });

  it('suit un rythme qui inclut le samedi', () => {
    const jours = joursOuvresEntre('2026-09-14', '2026-09-20', [1, 6]);
    expect(jours.map((j) => j.cle)).toEqual(['2026-09-14', '2026-09-19']);
  });

  it('porte les fermetures de l’espace dans `ferie`, avec leur motif', () => {
    const jours = joursOuvresEntre('2026-09-14', '2026-09-20', [1, 2, 3, 4, 5], { '2026-09-16': 'Séminaire' });
    // Le jour reste dans la liste (la synthèse l'écarte et le nomme), avec sa raison.
    expect(jours.find((j) => j.cle === '2026-09-16').ferie).toBe('Séminaire');
    expect(jours.find((j) => j.cle === '2026-09-17').ferie).toBe(null);
    expect(jours.length).toBe(5);
  });

  it('accepte des bornes inversées et refuse des bornes manquantes', () => {
    expect(joursOuvresEntre('2026-09-20', '2026-09-14').length).toBe(5);
    expect(joursOuvresEntre('', '2026-09-14')).toEqual([]);
    expect(joursOuvresEntre('2026-09-14', null)).toEqual([]);
  });

  it('une faute de frappe sur l’année ne fabrique pas quarante mille dates', () => {
    // Le plafond est un garde-fou, pas une limite de produit : dix ans suffisent.
    const jours = joursOuvresEntre('1900-01-01', '2026-09-14');
    expect(jours.length).toBeLessThan(3000);
  });
});

describe('bornesObservees', () => {
  it('prend le min et le max de tout ce qui a une date, quelle qu’en soit la forme', () => {
    const presences = [{ jour: '2026-09-10' }, { jour: '2026-09-02' }];
    const reservations = [{ debut: new Date(2026, 8, 25, 10, 0).toString() }];
    const b = bornesObservees([presences, reservations]);
    expect(b.debut).toBe('2026-09-02');
    expect(b.fin).toBe('2026-09-25');
  });

  it('rend deux nulls quand il n’y a rien à observer', () => {
    expect(bornesObservees([[], null])).toEqual({ debut: null, fin: null });
  });
});

describe('fenetreMesurable', () => {
  const aujourdhui = new Date(2026, 8, 17); // jeudi

  it('ne compte jamais le futur : le vendredi qui n’a pas eu lieu ne pénalise pas la couverture', () => {
    const f = fenetreMesurable({ debut: '2026-09-14', fin: '2026-09-20' }, [], aujourdhui);
    expect(f.fin).toBe('2026-09-17');
  });

  it('« tout » se borne aux données observées', () => {
    const f = fenetreMesurable({ debut: null, fin: null }, [[{ jour: '2026-03-02' }]], aujourdhui);
    expect(f.debut).toBe('2026-03-02');
    expect(f.fin).toBe('2026-03-02');
  });

  it('une période entièrement à venir se réduit à son premier jour plutôt qu’à l’envers', () => {
    const f = fenetreMesurable({ debut: '2026-12-01', fin: '2026-12-31' }, [], aujourdhui);
    expect(f).toEqual({ debut: '2026-12-01', fin: '2026-12-01' });
  });

  it('sans bornes ni données, il n’y a rien à mesurer', () => {
    expect(fenetreMesurable({ debut: null, fin: null }, [], aujourdhui)).toEqual({ debut: null, fin: null });
  });
});

describe('libellés', () => {
  it('numeroTrimestre suit le calendrier civil', () => {
    expect(numeroTrimestre(new Date(2026, 0, 1))).toBe(1);
    expect(numeroTrimestre(new Date(2026, 8, 30))).toBe(3);
    expect(numeroTrimestre(new Date(2026, 11, 31))).toBe(4);
  });

  it('libelleJour reste lisible et encaisse une clé invalide', () => {
    expect(libelleJour('2026-09-14')).toBe('14 sept. 2026');
    expect(libelleJour('')).toBe('—');
  });

  it('une semaine à cheval sur deux mois nomme les deux', () => {
    const b = bornesPeriode('semaine', new Date(2026, 8, 30));
    expect(b.label).toContain('sept.');
    expect(b.label).toContain('oct.');
  });
});
