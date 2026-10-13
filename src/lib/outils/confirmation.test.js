import { describe, expect, it } from 'vitest';
import { demander, questionCourante } from './confirmation.js';

describe('demander', () => {
  it('rend la réponse et retire la question', async () => {
    const p = demander({ titre: 'Supprimer le plan ?', oui: 'Supprimer', danger: true });
    expect(questionCourante()).toMatchObject({ titre: 'Supprimer le plan ?', oui: 'Supprimer', non: 'Annuler', danger: true });
    questionCourante().repondre(true);
    await expect(p).resolves.toBe(true);
    expect(questionCourante()).toBeNull();
  });

  it('une seconde question répond non à la première', async () => {
    const p1 = demander({ titre: 'A' });
    const p2 = demander({ titre: 'B' });
    await expect(p1).resolves.toBe(false);
    expect(questionCourante().titre).toBe('B');
    questionCourante().repondre(false);
    await expect(p2).resolves.toBe(false);
  });
});
