// L'impression visée : ce qui doit être posé pendant le dialogue, et ce qui ne
// doit rien laisser derrière.
//
// Le marquage est la moitié du mécanisme (l'autre est dans `index.css`). S'il
// restait après une annulation, l'écran s'imprimerait de travers au coup
// suivant — un bogue qu'on ne voit qu'une fois le PDF ouvert.
import { afterEach, describe, expect, it } from 'vitest';
import { imprimer } from './impression';

function poserDom(print) {
  const vus = [];
  const cible = {
    attributs: new Set(),
    setAttribute: (n) => cible.attributs.add(n),
    removeAttribute: (n) => cible.attributs.delete(n),
  };
  globalThis.document = { body: { dataset: {} } };
  globalThis.window = {
    print: () => {
      vus.push({
        marque: globalThis.document.body.dataset.omImpression,
        cible: cible.attributs.has('data-om-cible'),
      });
      print?.();
    },
  };
  return { cible, vus };
}

afterEach(() => {
  delete globalThis.document;
  delete globalThis.window;
});

describe('imprimer', () => {
  it('marque la cible et le corps pendant le dialogue, puis démarque', () => {
    const { cible, vus } = poserDom();
    imprimer(cible);
    expect(vus).toEqual([{ marque: 'cible', cible: true }]);
    expect(cible.attributs.size).toBe(0);
    expect(globalThis.document.body.dataset.omImpression).toBeUndefined();
  });

  it('démarque même si l’impression jette', () => {
    const { cible } = poserDom(() => { throw new Error('refus'); });
    expect(() => imprimer(cible)).toThrow('refus');
    expect(cible.attributs.size).toBe(0);
    expect(globalThis.document.body.dataset.omImpression).toBeUndefined();
  });

  it('sans cible, rien n’est marqué : c’est l’impression ordinaire', () => {
    const { vus } = poserDom();
    imprimer();
    expect(vus).toEqual([{ marque: undefined, cible: false }]);
  });

  it('ne fait rien sans DOM', () => {
    expect(() => imprimer()).not.toThrow();
  });
});
