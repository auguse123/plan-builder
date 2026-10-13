/**
 * Chercher sur le plan : une personne, un poste, une salle, une zone. JS pur.
 *
 * ON CHERCHE CE QU'ON CONNAÎT. Le visiteur ne sait pas que Léa a le « P14 » :
 * il tape « léa » et veut voir le poste s'allumer. Un poste se trouve donc
 * par son nom, par son titulaire, et par qui l'a réservé aujourd'hui quand la
 * vue du jour est ouverte. Accents et casse ne comptent pas : « lea » trouve
 * « Léa ».
 *
 * LE DÉBUT D'UN MOT PASSE AVANT LE MILIEU. « sal » doit ranger « Salle
 * Bleue » avant « Grande salle », et un nom exact avant tout le reste.
 */
import { plafondZoom } from '@/lib/outils/equipe/plan';

/** Minuscules, sans accents, espaces serrés. */
export function normaliser(texte) {
  return String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function nombre(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const nomComplet = (m) => (m ? [m.prenom, m.nom].filter(Boolean).join(' ').trim() : '');

/** 3 : exact, 2 : début d'un mot, 1 : ailleurs, 0 : absent. */
export function score(cherche, texte) {
  const q = normaliser(cherche);
  const t = normaliser(texte);
  if (!q || !t) return 0;
  if (t === q) return 3;
  if (t.startsWith(q) || t.includes(` ${q}`)) return 2;
  return t.includes(q) ? 1 : 0;
}

function boiteDe(o) {
  const x = nombre(o?.x); const y = nombre(o?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const l = nombre(o?.l); const h = nombre(o?.h);
  return { x, y, l: Number.isFinite(l) ? l : 0, h: Number.isFinite(h) ? h : 0 };
}

/**
 * Les objets du plan qui répondent à `texte`, les meilleurs d'abord.
 *
 * Seuls les objets posés (x et y lisibles) sortent : trouver un poste sans
 * place ne mènerait nulle part. `etats` est la Map de `planDuJour` — le
 * réservant du jour — ou rien.
 *
 * @returns {Array<{genre: 'poste'|'salle'|'zone', id: string, libelle: string,
 *   detail: string, boite: {x,y,l,h}}>}
 */
export function chercherSurPlan(texte, sources = {}, max = 8) {
  if (!normaliser(texte)) return [];
  const parId = new Map((sources.membres || []).map((m) => [m.id, m]));
  const etats = sources.etats instanceof Map ? sources.etats : null;
  const trouves = [];
  const garder = (genre, o, candidats) => {
    const boite = boiteDe(o);
    if (!boite || !o?.id) return;
    let meilleur = { s: 0, detail: '' };
    for (const [t, detail] of candidats) {
      const s = score(texte, t);
      if (s > meilleur.s) meilleur = { s, detail };
    }
    if (meilleur.s) {
      trouves.push({
        genre, id: o.id, libelle: String(o.nom || ''), detail: meilleur.detail, boite, s: meilleur.s,
      });
    }
  };
  for (const p of sources.postes || []) {
    const titulaire = p.genre === 'attitre' ? parId.get(p.membre_id) : null;
    const jour = etats?.get(p.id)?.membre || null;
    garder('poste', p, [
      [p.nom, ''],
      [nomComplet(titulaire), titulaire ? `poste de ${nomComplet(titulaire)}` : ''],
      [nomComplet(jour), jour ? `${nomComplet(jour)} aujourd’hui` : ''],
    ]);
  }
  for (const s of sources.salles || []) garder('salle', s, [[s.nom, 'salle']]);
  for (const z of sources.zones || []) garder('zone', z, [[z.nom, 'zone']]);
  return trouves
    .sort((a, b) => b.s - a.s || a.libelle.localeCompare(b.libelle, 'fr', { numeric: true }))
    .slice(0, Math.max(0, max))
    .map((r) => ({
      genre: r.genre, id: r.id, libelle: r.libelle, detail: r.detail, boite: r.boite,
    }));
}

/**
 * Le zoom et le centre qui montrent `boite` : l'objet occupe environ le
 * quart de la fenêtre, jamais moins de 3 m de champ, jamais au-delà du
 * plafond de la feuille.
 */
export function vueSur(boite, plan) {
  const b = boiteDe(boite);
  const p = { largeur: Number(plan?.largeur) || 1, hauteur: Number(plan?.hauteur) || 1 };
  if (!b) return null;
  const champ = (taille) => Math.max(taille * 4, 30);
  const zoom = Math.max(1, Math.min(
    plafondZoom(p), p.largeur / champ(b.l), p.hauteur / champ(b.h),
  ));
  return { zoom, centre: { x: b.x + b.l / 2, y: b.y + b.h / 2 } };
}
