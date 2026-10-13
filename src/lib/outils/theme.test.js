import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { THEMES, themeEffectif } from './theme.js';

describe('thème', () => {
  it('suit le système quand on ne choisit rien', () => {
    expect(themeEffectif('systeme', true)).toBe('sombre');
    expect(themeEffectif('systeme', false)).toBe('clair');
    expect(themeEffectif('n’importe quoi', false)).toBe('clair');
  });

  it('un choix explicite gagne sur le système', () => {
    expect(themeEffectif('clair', true)).toBe('clair');
    expect(themeEffectif('sombre', false)).toBe('sombre');
    expect(THEMES.map((t) => t.v)).toEqual(['systeme', 'clair', 'sombre']);
  });

  it('index.html pose le thème avant le premier rendu, avec la même règle', () => {
    const html = fs.readFileSync(path.resolve(import.meta.dirname, '../../../index.html'), 'utf8');
    expect(html).toContain("localStorage.getItem('om-theme')");
    expect(html).toContain('prefers-color-scheme: dark');
    expect(html.indexOf('om-theme')).toBeLessThan(html.indexOf('/src/main.jsx'));
  });

  it('la palette claire redéfinit tous les jetons de couleur de la sombre', () => {
    const css = fs.readFileSync(path.resolve(import.meta.dirname, '../../index.css'), 'utf8');
    const bloc = (debut) => {
      const i = css.indexOf(debut);
      return css.slice(i, css.indexOf('\n  }', i));
    };
    const jetons = (txt) => new Set([...txt.matchAll(/(--om-[a-z0-9-]+):/g)].map((m) => m[1]));
    const sombre = jetons(bloc(':root {'));
    const clair = jetons(bloc(':root[data-theme="clair"] {'));
    // Le papier et la focale suivent par renvoi ; tout le reste doit être redit.
    const attendus = [...sombre].filter((j) => !/^--om-(papier|focus|t-|courbe)/.test(j));
    expect(attendus.filter((j) => !clair.has(j))).toEqual([]);
  });
});
