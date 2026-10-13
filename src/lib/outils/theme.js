// Le thème : système, clair ou sombre — un choix par appareil.
//
// DEUX PALETTES, UN SEUL JEU DE JETONS. `index.css` redéfinit les `--om-*` sous
// `:root[data-theme="clair"]` ; ce module ne fait que poser l'attribut. Aucun
// composant ne lit le thème : s'il en avait besoin, ce serait le signe d'une
// couleur écrite en dur.
//
// « SYSTÈME » PAR DÉFAUT, comme les logiciels qu'on ouvre toute la journée : le
// poste réglé en clair le matin et en sombre le soir est suivi sans geste.
// Le choix vit dans `localStorage` — une préférence de la machine, pas du
// compte : le même OM peut vouloir du clair au bureau et du sombre chez lui.
//
// SANS FLASH. `index.html` porte une copie de `themeEffectif` en script
// bloquant : l'attribut est posé avant le premier rendu. Les deux se modifient
// ensemble.
import { useCallback, useEffect, useState } from 'react';

export const CLE_THEME = 'om-theme';
export const THEMES = [
  { v: 'systeme', l: 'Système' },
  { v: 'clair', l: 'Clair' },
  { v: 'sombre', l: 'Sombre' },
];
const VALEURS = new Set(THEMES.map((t) => t.v));

/** Le choix enregistré, `systeme` à défaut (ou si `localStorage` refuse). */
export function lireTheme() {
  try {
    const v = window.localStorage.getItem(CLE_THEME);
    return VALEURS.has(v) ? v : 'systeme';
  } catch {
    return 'systeme';
  }
}

/** Ce que l'écran affiche vraiment : `clair` ou `sombre`. */
export function themeEffectif(choix, systemeSombre) {
  if (choix === 'clair' || choix === 'sombre') return choix;
  return systemeSombre ? 'sombre' : 'clair';
}

const systemeSombre = () => {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return true; }
};

/** Pose l'attribut et la couleur de la barre du navigateur. */
export function appliquerTheme(choix) {
  if (typeof document === 'undefined') return;
  const effectif = themeEffectif(choix, systemeSombre());
  document.documentElement.dataset.theme = effectif;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effectif === 'clair' ? '#F9FAFB' : '#0F1112');
}

/** `const [theme, choisir] = useTheme()` — le choix, et de quoi le changer. */
export function useTheme() {
  const [theme, setTheme] = useState(lireTheme);

  // Un autre onglet, ou un autre sélecteur de cette page, a changé le thème :
  // celui-ci suit. Sans l'événement local, l'instance racine garderait
  // « système » et repasserait en sombre au prochain changement du poste.
  useEffect(() => {
    const relire = () => setTheme(lireTheme());
    const surStockage = (e) => { if (e.key === CLE_THEME) relire(); };
    window.addEventListener('storage', surStockage);
    window.addEventListener(CLE_THEME, relire);
    return () => {
      window.removeEventListener('storage', surStockage);
      window.removeEventListener(CLE_THEME, relire);
    };
  }, []);

  // En « système », le passage du poste en sombre à 19 h se suit en direct.
  useEffect(() => {
    appliquerTheme(theme);
    if (theme !== 'systeme') return undefined;
    let mq;
    try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch { return undefined; }
    const suivre = () => appliquerTheme('systeme');
    mq.addEventListener?.('change', suivre);
    return () => mq.removeEventListener?.('change', suivre);
  }, [theme]);

  const choisir = useCallback((v) => {
    const net = VALEURS.has(v) ? v : 'systeme';
    try { window.localStorage.setItem(CLE_THEME, net); } catch { /* le choix vaudra pour la session */ }
    setTheme(net);
    window.dispatchEvent(new Event(CLE_THEME));
  }, []);

  return [theme, choisir];
}
