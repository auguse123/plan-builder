import { describe, expect, it } from 'vitest';
import { projetNeuf } from './depot.js';
import {
  depuisFichier, dupliquer, ecrireProjet, listerProjets, lireProjet, memoire, supprimerProjet, versFichier,
} from './stockage.js';

describe('stockage', () => {
  it('écrit, liste du plus récent au plus ancien, supprime', () => {
    const s = memoire();
    const a = ecrireProjet(s, { ...projetNeuf('A'), modifie_le: '2026-01-01' });
    const b = ecrireProjet(s, { ...projetNeuf('B'), modifie_le: '2026-02-01' });
    expect(listerProjets(s).map((p) => p.nom)).toEqual(['B', 'A']);
    expect(listerProjets(s)[0]).toMatchObject({ plans: 1, postes: 0 });
    supprimerProjet(s, b.id);
    expect(listerProjets(s).map((p) => p.id)).toEqual([a.id]);
    expect(lireProjet(s, b.id)).toBeNull();
  });

  it('dit « stockage plein » quand le navigateur refuse', () => {
    const plein = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: () => {} };
    expect(() => ecrireProjet(plein, projetNeuf())).toThrow('stockage_plein');
  });

  it('un fichier exporté se réimporte, sans écraser l’original', () => {
    const p = projetNeuf('Siège');
    let n = 0;
    const id = () => `00000000-0000-4000-8000-00000000000${(n += 1)}`;
    const copie = depuisFichier(versFichier(p), [{ id: p.id, nom: p.nom }], id);
    expect(copie.id).not.toBe(p.id);
    expect(copie.nom).toBe('Siège (copie)');
    expect(copie.plans).toEqual(p.plans);
    expect(depuisFichier(versFichier(p), []).id).toBe(p.id);
    expect(() => depuisFichier('pas du json')).toThrow('fichier_illisible');
    expect(() => depuisFichier(JSON.stringify({ format: 'autre' }))).toThrow('fichier_illisible');
  });

  it('dupliquer copie tout sous un nouvel id', () => {
    const p = projetNeuf('Siège');
    const d = dupliquer(p, () => 'nouvel-id');
    expect(d).toMatchObject({ id: 'nouvel-id', nom: 'Siège (copie)' });
    d.plans[0].nom = 'changé';
    expect(p.plans[0].nom).toBe('Plan 1');
  });
});
