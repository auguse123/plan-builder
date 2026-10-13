// Où vivent les projets : le navigateur de cette machine, et des fichiers.
//
// Un projet se range sous sa propre clé (`atelier-plans:projet:<id>`), la liste
// sous `atelier-plans:projets`. Rien ne part sur le réseau. Le navigateur peut
// vider ce stockage (navigation privée, nettoyage) : l'export en fichier est la
// sauvegarde, et l'écran d'accueil le rappelle.
//
// `memoire` remplace `localStorage` dans les tests.

export const PREFIXE = 'atelier-plans';
export const FORMAT = 'atelier-plans/projet';
export const VERSION_FORMAT = 1;

const cleListe = `${PREFIXE}:projets`;
const cleProjet = (id) => `${PREFIXE}:projet:${id}`;

export function memoire() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

const lireJson = (s, k, defaut) => {
  try { const v = s.getItem(k); return v ? JSON.parse(v) : defaut; } catch { return defaut; }
};

/** Le résumé de chaque projet, du plus récemment modifié au plus ancien. */
export function listerProjets(s) {
  const ids = lireJson(s, cleListe, []);
  return ids
    .map((id) => lireJson(s, cleProjet(id), null))
    .filter(Boolean)
    .map((p) => ({
      id: p.id, nom: p.nom, modifie_le: p.modifie_le, cree_le: p.cree_le,
      plans: (p.plans || []).length, postes: (p.postes || []).length,
    }))
    .sort((a, b) => String(b.modifie_le).localeCompare(String(a.modifie_le)));
}

export const lireProjet = (s, id) => lireJson(s, cleProjet(id), null);

/** Écrit le projet ; `quota_atteint` si le navigateur est plein. */
export function ecrireProjet(s, projet) {
  try {
    s.setItem(cleProjet(projet.id), JSON.stringify(projet));
    const ids = lireJson(s, cleListe, []);
    if (!ids.includes(projet.id)) s.setItem(cleListe, JSON.stringify([...ids, projet.id]));
  } catch {
    throw new Error('stockage_plein');
  }
  return projet;
}

export function supprimerProjet(s, id) {
  s.removeItem(cleProjet(id));
  s.setItem(cleListe, JSON.stringify(lireJson(s, cleListe, []).filter((x) => x !== id)));
}

/** Le fichier d'un projet : le projet, signé de son format. */
export function versFichier(projet) {
  return JSON.stringify({ format: FORMAT, version: VERSION_FORMAT, exporte_le: new Date().toISOString(), projet }, null, 2);
}

/**
 * Relire un fichier. Un id déjà présent ne s'écrase pas : le projet importé
 * reçoit un nouvel id, et « (copie) » s'il porte le même nom.
 */
export function depuisFichier(texte, existants = [], nouvelId = () => globalThis.crypto.randomUUID()) {
  let d;
  try { d = JSON.parse(texte); } catch { throw new Error('fichier_illisible'); }
  if (!d || d.format !== FORMAT || !d.projet || !Array.isArray(d.projet.plans)) throw new Error('fichier_illisible');
  if (Number(d.version) > VERSION_FORMAT) throw new Error('fichier_trop_recent');
  const p = { zones: [], salles: [], postes: [], ...d.projet };
  const pris = new Set(existants.map((e) => e.id));
  const noms = new Set(existants.map((e) => e.nom));
  return {
    ...p,
    id: pris.has(p.id) || !p.id ? nouvelId() : p.id,
    nom: noms.has(p.nom) ? `${p.nom} (copie)` : p.nom,
    modifie_le: new Date().toISOString(),
  };
}

/** Une copie complète, sous un nouvel id. */
export function dupliquer(projet, nouvelId = () => globalThis.crypto.randomUUID()) {
  const maintenant = new Date().toISOString();
  return { ...structuredClone(projet), id: nouvelId(), nom: `${projet.nom} (copie)`, cree_le: maintenant, modifie_le: maintenant };
}
