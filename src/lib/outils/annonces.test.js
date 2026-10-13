import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  annonceCourante, annoncer, estMasque, fermerAnnonce, supprimerAvecAnnulation, viderSuppressions,
} from './annonces.js';

describe('annonces', () => {
  beforeEach(() => { vi.useFakeTimers(); fermerAnnonce(); });
  afterEach(() => { viderSuppressions(); vi.useRealTimers(); });

  it('un « Enregistré » générique ne recouvre pas une annonce précise', () => {
    annoncer({ texte: 'Échéance ajoutée' });
    annoncer({ texte: 'Enregistré', faible: true });
    expect(annonceCourante().texte).toBe('Échéance ajoutée');
    vi.advanceTimersByTime(2000);
    expect(annonceCourante()).toBeNull();
    annoncer({ texte: 'Enregistré', faible: true });
    expect(annonceCourante().texte).toBe('Enregistré');
  });

  it('supprimer masque tout de suite et n’écrit qu’après le délai', () => {
    const faire = vi.fn();
    supprimerAvecAnnulation({ cle: 'a', texte: 'Supprimé', faire });
    expect(estMasque('a')).toBe(true);
    expect(annonceCourante().action.libelle).toBe('Annuler');
    vi.advanceTimersByTime(4999);
    expect(faire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(faire).toHaveBeenCalledTimes(1);
    expect(estMasque('a')).toBe(false);
  });

  it('annuler rend la ligne et n’écrit rien', () => {
    const faire = vi.fn();
    supprimerAvecAnnulation({ cle: 'b', texte: 'Supprimé', faire });
    annonceCourante().action.faire();
    expect(estMasque('b')).toBe(false);
    expect(annonceCourante().texte).toBe('Restauré');
    vi.advanceTimersByTime(10000);
    expect(faire).not.toHaveBeenCalled();
  });

  it('fermer l’onglet envoie les suppressions en attente, une seule fois', () => {
    const faire = vi.fn();
    supprimerAvecAnnulation({ cle: 'c', texte: 'Supprimé', faire });
    viderSuppressions();
    vi.advanceTimersByTime(10000);
    expect(faire).toHaveBeenCalledTimes(1);
  });

  it('après une suppression, le « Enregistré » de la base se tait', () => {
    supprimerAvecAnnulation({ cle: 'd', texte: 'Supprimé', faire: () => {} });
    vi.advanceTimersByTime(5000);
    fermerAnnonce();
    annoncer({ texte: 'Enregistré', faible: true });
    expect(annonceCourante()).toBeNull();
  });
});

describe('suppression en lot', () => {
  it('masque toutes les lignes et n’écrit qu’une fois', () => {
    vi.useFakeTimers();
    const faire = vi.fn();
    supprimerAvecAnnulation({ cle: ['l1', 'l2'], texte: '2 lignes supprimées', faire });
    expect(estMasque('l1') && estMasque('l2')).toBe(true);
    viderSuppressions();
    expect(faire).toHaveBeenCalledTimes(1);
    expect(estMasque('l1')).toBe(false);
    vi.useRealTimers();
  });
});

describe('sansMasques', () => {
  it('retire les lignes masquées de chaque liste, et rend le même objet sinon', async () => {
    const { sansMasques } = await import('./annonces.js');
    const d = { espace: { id: 'e' }, membres: [{ id: 'm1' }, { id: 'm2' }], n: 3 };
    expect(sansMasques(d)).toBe(d);
    supprimerAvecAnnulation({ cle: 'm2', texte: 'x', faire: () => {} });
    expect(sansMasques(d)).toEqual({ espace: { id: 'e' }, membres: [{ id: 'm1' }], n: 3 });
    expect(sansMasques([{ id: 'm2' }, { id: 'z' }])).toEqual([{ id: 'z' }]);
    viderSuppressions();
  });
});
