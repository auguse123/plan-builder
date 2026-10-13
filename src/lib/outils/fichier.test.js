// La porte des téléchargements — et les deux détails qui l'ont fait écrire.
//
// Le BOM et le `type` ne sont pas cosmétiques : sans le BOM, Excel affiche
// « Ã© » partout dans un export d'accents ; sans le bon `type`, l'agenda ne
// s'ouvre pas dans l'agenda. Il n'y a pas de DOM dans les tests (pas de jsdom,
// pas de dépendance de plus), donc on fournit le strict nécessaire : ce qui
// compte ici n'est pas que le navigateur clique, c'est ce qu'on lui remet.
import { afterEach, describe, expect, it } from 'vitest';
import { telechargerCsv, telechargerFichier, telechargerIcs, telechargerJson } from './fichier';

/** Un faux DOM qui note ce qu'on lui donne. */
function poserDom() {
  const blobs = [];
  const liens = [];
  const revoques = [];
  globalThis.Blob = class {
    constructor(parties, options) { this.parties = parties; this.type = options?.type; }
  };
  globalThis.URL = {
    createObjectURL: (b) => { blobs.push(b); return `blob:${blobs.length}`; },
    revokeObjectURL: (u) => revoques.push(u),
  };
  globalThis.document = {
    createElement: () => {
      const a = { click: () => { a.clique = true; }, remove: () => { a.retire = true; } };
      liens.push(a);
      return a;
    },
    body: { appendChild: () => {} },
  };
  return { blobs, liens, revoques };
}

afterEach(() => {
  delete globalThis.document;
  delete globalThis.Blob;
  delete globalThis.URL;
});

describe('telechargerFichier', () => {
  it('fabrique le lien, le clique et le retire', () => {
    const { liens, blobs } = poserDom();
    telechargerFichier('note.txt', 'bonjour');
    expect(liens).toHaveLength(1);
    expect(liens[0].download).toBe('note.txt');
    expect(liens[0].href).toBe('blob:1');
    expect(liens[0].clique).toBe(true);
    expect(liens[0].retire).toBe(true);
    expect(blobs[0].type).toBe('text/plain;charset=utf-8');
  });

  it('ne révoque pas l’URL dans la même tâche — Safari couperait le fichier', () => {
    const { revoques } = poserDom();
    telechargerFichier('note.txt', 'bonjour');
    expect(revoques).toEqual([]);
  });

  it('ne fait rien sans DOM : le module s’importe côté serveur', () => {
    expect(() => telechargerFichier('note.txt', 'bonjour')).not.toThrow();
  });
});

describe('les trois formats', () => {
  it('un CSV part avec le BOM, sinon Excel casse les accents', () => {
    const { blobs } = poserDom();
    telechargerCsv('passages.csv', 'zone;fait_le\nCafé;2026-09-20');
    expect(blobs[0].parties[0].startsWith('﻿')).toBe(true);
    expect(blobs[0].parties[0]).toContain('Café');
    expect(blobs[0].type).toBe('text/csv;charset=utf-8');
  });

  it('un JSON part indenté — un export se relit à l’œil', () => {
    const { blobs, liens } = poserDom();
    telechargerJson('espace.json', { nom: 'Bureau', membres: [] });
    expect(blobs[0].parties[0]).toBe('{\n  "nom": "Bureau",\n  "membres": []\n}');
    expect(blobs[0].type).toBe('application/json;charset=utf-8');
    expect(liens[0].download).toBe('espace.json');
  });

  it('un agenda part en text/calendar, sinon il s’ouvre dans un éditeur', () => {
    const { blobs } = poserDom();
    telechargerIcs('classeur.ics', 'BEGIN:VCALENDAR');
    expect(blobs[0].parties[0]).toBe('BEGIN:VCALENDAR');
    expect(blobs[0].type).toBe('text/calendar;charset=utf-8');
  });
});
