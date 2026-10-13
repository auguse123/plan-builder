/**
 * LE PLAN QUI SAIT QUI VIENT : ce que Rayon ne peut pas dessiner.
 *
 * Un logiciel de plan connaît des rectangles ; l'outil connaît aussi les
 * réservations et les présences. Ce module croise les deux, pour deux lectures
 * posées sur le même dessin :
 *
 *   - `planDuJour` : qui est sur quel poste CE jour-là, ce qui reste libre, et
 *     ce qu'un titulaire absent libère ;
 *   - `tauxOccupation` : sur une fenêtre passée, la part des jours où chaque
 *     poste ou salle a servi — la carte thermique qui dit quoi supprimer.
 *
 * UN POSTE ATTITRÉ SERT QUAND SON TITULAIRE EST AU BUREAU, pas seulement quand
 * quelqu'un le réserve : sans ça, les postes fixes paraîtraient tous vides et
 * la carte recommanderait de retirer ceux qui servent le plus.
 *
 * Les jours reçus sont déjà les bons (ouvrés, ni fériés ni futurs) : ce module
 * ne connaît pas le calendrier, `joursOuvresEntre` le fait. Ni React ni base.
 */
import { statutMembre } from './model';

/** Les réservations rangées par `ressource|jour` : une lecture, pas N filtres. */
function indexerReservations(reservations = []) {
  const map = new Map();
  for (const r of reservations) {
    if (!r || !r.ressource_id || !r.jour) continue;
    const cle = `${r.ressource_id}|${r.jour}`;
    if (!map.has(cle)) map.set(cle, []);
    map.get(cle).push(r);
  }
  return map;
}

function titulaireAuBureau(poste, parId, index, jour) {
  const membre = poste.membre_id ? parId.get(poste.membre_id) : null;
  if (!membre) return null;
  return statutMembre(membre, jour, index).statut === 'bureau' ? membre : false;
}

/**
 * L'état de chaque poste et salle un jour donné.
 *
 * @param {{ postes?: Array, salles?: Array, reservations?: Array,
 *           membres?: Array, index?: Map, jour: {cle:string, n:number} }} o
 * @returns {Map<string, {etat: 'reserve'|'titulaire'|'libere'|'libre'|'bloque',
 *           membre: object|null, libelle: string, n: number}>}
 *   `n` : combien de réservations tombent ce jour-là (une salle en a plusieurs).
 */
export function planDuJour({ postes = [], salles = [], reservations = [], membres = [], index = new Map(), jour }) {
  const sortie = new Map();
  if (!jour || !jour.cle) return sortie;
  const parId = new Map(membres.map((m) => [m.id, m]));
  const resas = indexerReservations(reservations);

  for (const p of postes) {
    const liste = resas.get(`${p.id}|${jour.cle}`) || [];
    if (liste.length) {
      const r = liste[0];
      sortie.set(p.id, {
        etat: 'reserve', membre: parId.get(r.membre_id) || null, libelle: r.libelle || '', n: liste.length,
      });
      continue;
    }
    if (p.genre === 'bloque') { sortie.set(p.id, { etat: 'bloque', membre: null, libelle: '', n: 0 }); continue; }
    if (p.genre === 'attitre') {
      const t = titulaireAuBureau(p, parId, index, jour);
      if (t) { sortie.set(p.id, { etat: 'titulaire', membre: t, libelle: '', n: 0 }); continue; }
      if (t === false) { sortie.set(p.id, { etat: 'libere', membre: parId.get(p.membre_id), libelle: '', n: 0 }); continue; }
    }
    sortie.set(p.id, { etat: 'libre', membre: null, libelle: '', n: 0 });
  }
  for (const s of salles) {
    const liste = resas.get(`${s.id}|${jour.cle}`) || [];
    sortie.set(s.id, {
      etat: liste.length ? 'reserve' : 'libre', membre: null, libelle: liste[0]?.libelle || '', n: liste.length,
    });
  }
  return sortie;
}

/**
 * La part des jours où chaque poste ou salle a servi, sur `jours`.
 *
 * Un poste bloqué n'a pas de taux (il n'est pas offert) : il est absent de la
 * sortie, et la carte le laisse neutre plutôt que de le dire « jamais pris ».
 *
 * @returns {Map<string, {jours:number, sur:number, taux:number}>}
 */
export function tauxOccupation({ postes = [], salles = [], reservations = [], membres = [], index = new Map(), jours = [] }) {
  const sortie = new Map();
  const sur = jours.length;
  if (!sur) return sortie;
  const parId = new Map(membres.map((m) => [m.id, m]));
  const resas = indexerReservations(reservations);
  const compter = (id, pris) => {
    const k = jours.filter(pris).length;
    sortie.set(id, { jours: k, sur, taux: Math.round((k / sur) * 100) / 100 });
  };
  for (const p of postes) {
    if (p.genre === 'bloque') continue;
    compter(p.id, (j) => resas.has(`${p.id}|${j.cle}`)
      || (p.genre === 'attitre' && !!titulaireAuBureau(p, parId, index, j)));
  }
  for (const s of salles) compter(s.id, (j) => resas.has(`${s.id}|${j.cle}`));
  return sortie;
}

/** Cinq paliers, pour cinq aplats : l'œil ne lit pas un dégradé continu. */
export const PALIERS = [
  { min: 0, label: 'moins de 10 %' },
  { min: 0.1, label: '10 à 30 %' },
  { min: 0.3, label: '30 à 55 %' },
  { min: 0.55, label: '55 à 80 %' },
  { min: 0.8, label: '80 % et plus' },
];

export function palier(taux) {
  const t = Number(taux);
  if (!Number.isFinite(t)) return 0;
  let i = 0;
  PALIERS.forEach((p, k) => { if (t >= p.min) i = k; });
  return i;
}

/**
 * Le résumé d'une carte : taux moyen des postes, et ceux qui n'ont jamais servi
 * — le chiffre qu'une office manager apporte en réunion d'aménagement.
 *
 * @param {Map} taux la sortie de `tauxOccupation`
 * @param {Array} postes pour ne résumer que les postes (les salles à part)
 */
export function syntheseOccupation(taux, postes = []) {
  const vus = postes.map((p) => taux.get(p.id)).filter(Boolean);
  if (!vus.length) return { moyenne: null, jamais: 0, pleins: 0, n: 0 };
  const moyenne = vus.reduce((a, t) => a + t.taux, 0) / vus.length;
  return {
    moyenne: Math.round(moyenne * 100) / 100,
    jamais: vus.filter((t) => t.jours === 0).length,
    pleins: vus.filter((t) => t.taux >= 0.8).length,
    n: vus.length,
  };
}

/** Le résumé d'un jour : combien de postes pris, libres, libérés. */
export function syntheseDuJour(etats, postes = []) {
  const s = { pris: 0, libres: 0, liberes: 0 };
  for (const p of postes) {
    const e = etats.get(p.id)?.etat;
    if (e === 'reserve' || e === 'titulaire') s.pris += 1;
    else if (e === 'libere') s.liberes += 1;
    else if (e === 'libre') s.libres += 1;
  }
  return s;
}
