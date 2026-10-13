// Le dépôt local : ce que la base faisait pour l'éditeur de plan, en JS pur.
//
// L'éditeur (`PlanPostes.jsx`) a été écrit contre des fonctions Postgres
// (`om_plan_patch`, `om_postes_deplacer`, `om_postes_semer`…). Plutôt que de
// le réécrire, on lui rend les mêmes réponses : chaque fonction ci-dessous est
// le miroir d'une fonction SQL de « Qui vient au bureau », mêmes refus (codes
// stables, traduits par `omErreurMessage`), mêmes effets de bord — un poste
// glissé dans une zone en devient, semer numérote à la suite, le dernier plan
// ne se supprime pas.
//
// UN PROJET = ce qu'était un espace : jusqu'à six plans (étages), leurs zones,
// salles et postes. Les fonctions prennent un projet et en rendent un nouveau
// (jamais de mutation) ; la persistance est ailleurs (`stockage.js`).

export const PLANS_MAX = 6;
export const RESSOURCES_MAX = 500;
export const ZONES_MAX = 200;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const refus = (code) => { throw new Error(code); };
const nouvelId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16).padStart(8, '0').slice(-8)}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`);
const maintenant = () => new Date().toISOString();

/** Un nombre lu comme la base : ce qui n'en est pas un devient `null`, pas zéro. */
function nombre(v, entier = false) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(entier ? /\D/g : /[^0-9.-]/g, ''));
  if (!Number.isFinite(n) || String(v).replace(entier ? /\D/g : /[^0-9.-]/g, '') === '') return null;
  return entier ? Math.round(n) : n;
}

function planNeuf(nom, ordre) {
  return {
    id: nouvelId(), nom, ordre, largeur: 300, hauteur: 200,
    murs: [], portes: [], meubles: [], epaisseurs: [], trait_mur: 0.25,
    cree_le: maintenant(),
  };
}

/** Un projet vide : un plan, rien dessus. */
export function projetNeuf(nom = 'Nouveau projet') {
  return {
    id: nouvelId(),
    nom: String(nom || '').trim().slice(0, 80) || 'Nouveau projet',
    cree_le: maintenant(),
    modifie_le: maintenant(),
    plans: [planNeuf('Plan 1', 0)],
    zones: [],
    salles: [],
    postes: [],
  };
}

/** Ce que rendait `om_postes_vue` : la forme que l'éditeur lit. */
export function vueDuProjet(p) {
  const plans = [...(p.plans || [])].sort((a, b) => (a.ordre - b.ordre) || String(a.cree_le).localeCompare(String(b.cree_le)));
  const parOrdre = (a, b) => ((a.ordre ?? 0) - (b.ordre ?? 0)) || String(a.nom).localeCompare(String(b.nom), 'fr');
  return {
    espace: { visibilite: 'equipe' },
    plans: plans.map(({ cree_le: _c, ...pl }) => pl),
    zones: [...(p.zones || [])].sort(parOrdre),
    salles: [...(p.salles || [])].sort(parOrdre),
    postes: [...(p.postes || [])].map((s) => ({ ...s, occupe: false })).sort(parOrdre),
  };
}

const touche = (p, patch) => ({ ...p, ...patch, modifie_le: maintenant() });

/** `om_plan_du_lot` : le plan porté par l'objet, s'il est de ce projet. */
function planDuLot(p, objet) {
  if (!objet || typeof objet !== 'object') return null;
  const t = String(objet.plan_id ?? '').trim();
  if (!t) return null;
  if (!UUID.test(t) || !p.plans.some((pl) => pl.id === t)) refus('plan_inconnu');
  return t;
}

/** Les places d'une zone suivent ses postes réservables. */
function placesDeZone(postes, zoneId) {
  return postes.filter((s) => s.zone_id === zoneId && s.genre !== 'bloque' && s.actif !== false).length;
}

/** LE PLAN DÉCIDE DE LA ZONE : la plus petite qui contient le centre, sur le même plan. */
function zoneSous(p, s) {
  if (s.x == null || s.y == null || s.l == null || s.h == null) return null;
  const cx = s.x + s.l / 2;
  const cy = s.y + s.h / 2;
  const sous = (p.zones || []).filter((z) => z.actif !== false && z.x != null
    && (z.plan_id ?? null) === (s.plan_id ?? null)
    && cx >= z.x && cx <= z.x + z.l && cy >= z.y && cy <= z.y + z.h);
  sous.sort((a, b) => a.l * a.h - b.l * b.h);
  return sous[0] || null;
}

function lot(liste, code = 'geometrie_invalide') {
  if (!Array.isArray(liste)) refus(code);
  if (!liste.length) refus('lot_vide');
  if (liste.length > 100) refus('lot_trop_grand');
}

// ── Les plans ────────────────────────────────────────────────────────────────

export function creerPlan(p, nom) {
  if (p.plans.length >= PLANS_MAX) refus('plans_pleins');
  const n = String(nom ?? '').trim().slice(0, 60) || `Plan ${p.plans.length + 1}`;
  const pl = planNeuf(n, p.plans.length);
  return { projet: touche(p, { plans: [...p.plans, pl] }), retour: { id: pl.id, nom: n } };
}

export function renommerPlan(p, planId, nom) {
  const n = String(nom ?? '').trim().slice(0, 60);
  if (!n) refus('nom_invalide');
  if (!p.plans.some((pl) => pl.id === planId)) refus('plan_inconnu');
  return {
    projet: touche(p, { plans: p.plans.map((pl) => (pl.id === planId ? { ...pl, nom: n } : pl)) }),
    retour: { id: planId, nom: n },
  };
}

export function supprimerPlan(p, planId) {
  if (p.plans.length <= 1) refus('dernier_plan');
  if (!p.plans.some((pl) => pl.id === planId)) refus('plan_inconnu');
  // Les zones et les postes survivent, détachés (`on delete set null`).
  const detacher = (o) => (o.plan_id === planId ? { ...o, plan_id: null } : o);
  return {
    projet: touche(p, {
      plans: p.plans.filter((pl) => pl.id !== planId),
      zones: p.zones.map(detacher), salles: p.salles.map(detacher), postes: p.postes.map(detacher),
    }),
    retour: { supprime: planId },
  };
}

const CHAMPS_PLAN = ['largeur', 'hauteur', 'murs', 'portes', 'meubles', 'epaisseurs', 'trait_mur'];
const dans = (v, a, b) => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;

/** `om_plan_patch` : taille, murs, ouvertures, mobilier, épaisseurs, trait. */
export function patcherPlan(p, planId, patch) {
  const pl = p.plans.find((x) => x.id === planId);
  if (!pl) refus('plan_inconnu');
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) refus('patch_invalide');
  Object.keys(patch).forEach((k) => { if (!CHAMPS_PLAN.includes(k)) refus('champ_interdit'); });
  const net = {};
  ['largeur', 'hauteur'].forEach((k) => {
    if (!(k in patch)) return;
    const t = String(patch[k] ?? '').trim();
    if (!/^[0-9]{1,4}$/.test(t)) refus('nombre_invalide');
    const n = Number(t);
    if (n < 20 || n > 2000) refus('plan_invalide');
    net[k] = n;
  });
  if ('murs' in patch) {
    const m = patch.murs;
    if (!Array.isArray(m) || m.length > 40) refus('murs_invalides');
    let pts = 0;
    m.forEach((ligne) => {
      if (!Array.isArray(ligne) || ligne.length < 2 || ligne.length > 100) refus('murs_invalides');
      pts += ligne.length;
      if (pts > 800) refus('murs_invalides');
      ligne.forEach((pt) => {
        if (!Array.isArray(pt) || pt.length !== 2 || !dans(pt[0], 0, 2000) || !dans(pt[1], 0, 2000)) refus('murs_invalides');
      });
    });
    net.murs = m;
  }
  if ('portes' in patch) {
    const o = patch.portes;
    if (!Array.isArray(o) || o.length > 120) refus('portes_invalides');
    o.forEach((x) => {
      if (!x || typeof x !== 'object' || !['simple', 'double', 'coulissante', 'passage', 'fenetre'].includes(x.k)) refus('portes_invalides');
      if (!dans(x.x, 0, 2000) || !dans(x.y, 0, 2000) || !dans(x.l, 4, 60)) refus('portes_invalides');
      if (typeof x.a !== 'number' || x.a < 0 || x.a >= 360) refus('portes_invalides');
      if ('m' in x && ![0, 1].includes(x.m)) refus('portes_invalides');
    });
    net.portes = o;
  }
  if ('meubles' in patch) {
    const o = patch.meubles;
    if (!Array.isArray(o) || o.length > 400) refus('meubles_invalides');
    o.forEach((x) => {
      if (!x || typeof x !== 'object' || !/^[a-z0-9-]{1,40}$/.test(String(x.k ?? ''))) refus('meubles_invalides');
      if (!dans(x.x, 0, 2000) || !dans(x.y, 0, 2000) || !dans(x.l, 1, 400) || !dans(x.h, 1, 400)) refus('meubles_invalides');
      if ('rot' in x && (typeof x.rot !== 'number' || x.rot < 0 || x.rot >= 360)) refus('meubles_invalides');
      if ('n' in x && (typeof x.n !== 'string' || x.n.length > 60)) refus('meubles_invalides');
    });
    net.meubles = o;
  }
  if ('epaisseurs' in patch) {
    const e = patch.epaisseurs;
    const nb = (net.murs ?? pl.murs ?? []).length;
    if (!Array.isArray(e) || e.length !== nb) refus('epaisseurs_invalides');
    e.forEach((v) => { if (v !== null && !dans(v, 0.5, 10)) refus('epaisseurs_invalides'); });
    net.epaisseurs = e;
  }
  if ('trait_mur' in patch) {
    const t = String(patch.trait_mur ?? '').trim();
    if (!/^[0-9](\.[0-9]{1,2})?$/.test(t)) refus('trait_invalide');
    const n = Number(t);
    if (n < 0.1 || n > 1) refus('trait_invalide');
    net.trait_mur = n;
  }
  const neuf = { ...pl, ...net };
  return { projet: touche(p, { plans: p.plans.map((x) => (x.id === planId ? neuf : x)) }), retour: neuf };
}

// ── Les postes et les salles ─────────────────────────────────────────────────

function geometrie(g, entierRot = true) {
  return {
    x: nombre(g?.x), y: nombre(g?.y), l: nombre(g?.l), h: nombre(g?.h),
    rot: entierRot ? nombre(g?.rot, true) : nombre(g?.rot),
  };
}

/** `om_postes_deplacer` : la géométrie d'un lot, et la zone qui en découle. */
export function deplacerPostes(p, lignes) {
  lot(lignes);
  let postes = p.postes;
  let salles = p.salles;
  let n = 0;
  lignes.forEach((ligne) => {
    if (!ligne || typeof ligne !== 'object') refus('geometrie_invalide');
    const id = String(ligne.id ?? '').trim();
    if (!UUID.test(id)) refus('ressource_inconnue');
    const pl = planDuLot(p, ligne);
    const appliquer = (s) => ({ ...s, ...geometrie(ligne), plan_id: pl ?? s.plan_id ?? null });
    if (postes.some((s) => s.id === id)) {
      postes = postes.map((s) => {
        if (s.id !== id) return s;
        const bouge = appliquer(s);
        const z = zoneSous({ ...p, postes }, bouge);
        return z && z.id !== bouge.zone_id ? { ...bouge, zone_id: z.id, zone: z.nom } : bouge;
      });
      n += 1;
    } else if (salles.some((s) => s.id === id)) {
      salles = salles.map((s) => (s.id === id ? appliquer(s) : s));
      n += 1;
    }
  });
  return { projet: touche(p, { postes, salles }), retour: { deplaces: n } };
}

const GENRES = ['flex', 'attitre', 'bloque'];

/** `om_postes_genre` : flex, bloqué — attitré demande un titulaire. */
export function genrerPostes(p, { ids, genre, membreId = null }) {
  if (!GENRES.includes(genre)) refus('genre_invalide');
  if (!Array.isArray(ids)) refus('geometrie_invalide');
  if (!ids.length || ids.length > 100) refus('nombre_invalide');
  if (genre === 'attitre') {
    // Le projet local n'a pas d'équipe : personne à qui attribuer un poste.
    if (!membreId) refus('titulaire_requis');
    refus('membre_inconnu');
  }
  const vise = new Set(ids);
  let postes = p.postes.map((s) => (vise.has(s.id) ? { ...s, genre, membre_id: null } : s));
  const zonesTouchees = new Set(postes.filter((s) => vise.has(s.id)).map((s) => s.zone_id).filter(Boolean));
  const zones = p.zones.map((z) => (zonesTouchees.has(z.id) ? { ...z, places: placesDeZone(postes, z.id) } : z));
  return { projet: touche(p, { postes, zones }), retour: { changes: vise.size, genre } };
}

/** `om_postes_semer` : N postes d'un coup, numérotés à la suite du projet. */
export function semerPostes(p, { zoneId = null, nombre: nb, prefixe = null, geometrie: geo = null }) {
  let z = null;
  if (zoneId) {
    z = p.zones.find((x) => x.id === zoneId);
    if (!z) refus('zone_inconnue');
  }
  const n = Number(nb) || 0;
  if (n < 1 || n > 100) refus('nombre_invalide');
  if (geo !== null && geo !== undefined && (!Array.isArray(geo) || geo.length !== n)) refus('geometrie_invalide');
  if (p.postes.length + p.salles.length + n > RESSOURCES_MAX) refus('ressources_pleines');
  const pref = (String(prefixe ?? '').trim() || 'Poste').slice(0, 40);
  const dep = p.postes.reduce((m, s) => Math.max(m, Number(String(s.nom).replace(/\D/g, '')) || 0), 0);
  const ids = [];
  const neufs = Array.from({ length: n }, (_, i) => {
    const g = geo ? geo[i] : null;
    if (g !== null && g !== undefined && typeof g !== 'object') refus('geometrie_invalide');
    const id = nouvelId();
    ids.push(id);
    return {
      id, nom: `${pref} ${dep + i + 1}`, zone: z ? z.nom : '', zone_id: z ? z.id : null,
      plan_id: planDuLot(p, g), actif: true, ordre: dep + i + 1, genre: 'flex', membre_id: null,
      unite: 'demi', quota_semaine: 0, ...geometrie(g),
    };
  });
  const postes = [...p.postes, ...neufs];
  const zones = z ? p.zones.map((x) => (x.id === z.id ? { ...x, places: Math.max(x.places || 0, placesDeZone(postes, z.id)) } : x)) : p.zones;
  return { projet: touche(p, { postes, zones }), retour: { zone_id: z?.id ?? null, crees: n, ids } };
}

/** `om_salle_poser` : une salle de réunion, posée sur le plan. */
export function poserSalle(p, { nom, capacite = 4, geometrie: g = null }) {
  const n = String(nom ?? '').trim();
  if (!n) refus('nom_requis');
  if (g !== null && (typeof g !== 'object' || Array.isArray(g))) refus('geometrie_invalide');
  if (p.postes.length + p.salles.length >= RESSOURCES_MAX) refus('ressources_pleines');
  const s = {
    id: nouvelId(), nom: n.slice(0, 80), capacite: Math.min(Math.max(Number(capacite) || 4, 1), 99),
    actif: true, ordre: p.postes.length + p.salles.length, plan_id: planDuLot(p, g), ...geometrie(g),
  };
  return { projet: touche(p, { salles: [...p.salles, s] }), retour: { id: s.id, nom: s.nom } };
}

/** `om_ressource_ecrire`, réduit à ce que le plan touche : postes et salles. */
export function ecrireRessource(p, { id = null, supprimer = false, ...data }) {
  const ou = p.postes.some((s) => s.id === id) ? 'postes' : p.salles.some((s) => s.id === id) ? 'salles' : null;
  if (id && !ou) refus('ressource_inconnue');
  if (supprimer) {
    if (!id) refus('ressource_inconnue');
    return { projet: touche(p, { [ou]: p[ou].filter((s) => s.id !== id) }), retour: { id, supprime: true } };
  }
  const permis = ['type', 'nom', 'zone', 'zone_id', 'capacite', 'actif', 'ordre', 'unite', 'quota_semaine', 'genre', 'membre_id'];
  Object.keys(data).forEach((k) => { if (!permis.includes(k)) refus('champ_interdit'); });
  if ('genre' in data && !GENRES.includes(data.genre)) refus('genre_invalide');
  if (data.genre === 'attitre') refus('titulaire_requis');
  let zone = null;
  if ('zone_id' in data && data.zone_id) {
    zone = p.zones.find((z) => z.id === data.zone_id);
    if (!zone) refus('zone_inconnue');
  }
  if ('capacite' in data && !(/^\d{1,3}$/.test(String(data.capacite)) && Number(data.capacite) >= 1)) refus('nombre_invalide');
  const net = { ...data };
  if ('nom' in data) net.nom = String(data.nom ?? '').trim().slice(0, 80) || undefined;
  if ('capacite' in data) net.capacite = Number(data.capacite);
  if ('zone_id' in data) { net.zone_id = zone?.id ?? null; net.zone = zone?.nom ?? ''; }
  if ('actif' in data) net.actif = data.actif === true || data.actif === 'true';
  Object.keys(net).forEach((k) => net[k] === undefined && delete net[k]);
  if (!id) {
    const type = data.type || 'poste';
    if (!net.nom) refus('nom_requis');
    if (p.postes.length + p.salles.length >= RESSOURCES_MAX) refus('ressources_pleines');
    const cible = type === 'salle' ? 'salles' : 'postes';
    const r = {
      id: nouvelId(), zone: '', zone_id: null, plan_id: null, actif: true, ordre: 0,
      genre: 'flex', membre_id: null, capacite: 1, x: null, y: null, l: null, h: null, rot: null,
      ...net,
    };
    delete r.type;
    return { projet: touche(p, { [cible]: [...p[cible], r] }), retour: r };
  }
  delete net.type;
  let neuf = null;
  const liste = p[ou].map((s) => { if (s.id !== id) return s; neuf = { ...s, ...net }; return neuf; });
  return { projet: touche(p, { [ou]: liste }), retour: neuf };
}

// ── Les zones ────────────────────────────────────────────────────────────────

/** `om_zones_geometrie` : le rectangle d'un lot de zones, ou son effacement. */
export function dessinerZones(p, lignes) {
  lot(lignes);
  let zones = p.zones;
  let n = 0;
  lignes.forEach((ligne) => {
    if (!ligne || typeof ligne !== 'object') refus('geometrie_invalide');
    const id = String(ligne.id ?? '').trim();
    if (!UUID.test(id)) refus('zone_inconnue');
    const pl = planDuLot(p, ligne);
    zones = zones.map((z) => {
      if (z.id !== id) return z;
      n += 1;
      if (ligne.effacer === true || ligne.effacer === 'true') return { ...z, x: null, y: null, l: null, h: null };
      const g = geometrie(ligne);
      return { ...z, x: g.x, y: g.y, l: g.l, h: g.h, plan_id: pl ?? z.plan_id ?? null };
    });
  });
  return { projet: touche(p, { zones }), retour: { dessinees: n } };
}

/** `om_zone_ecrire` : créer, renommer, supprimer une zone. */
export function ecrireZone(p, { id = null, supprimer = false, ...data }) {
  const z = id ? p.zones.find((x) => x.id === id) : null;
  if (id && !z) refus('zone_inconnue');
  if (supprimer) {
    if (!z) refus('zone_inconnue');
    // Les postes gardent leur nom de zone, perdent le lien (`on delete set null`).
    return {
      projet: touche(p, {
        zones: p.zones.filter((x) => x.id !== id),
        postes: p.postes.map((s) => (s.zone_id === id ? { ...s, zone_id: null } : s)),
      }),
      retour: { id, supprime: true },
    };
  }
  Object.keys(data).forEach((k) => { if (!['nom', 'places', 'site_id', 'ordre', 'actif'].includes(k)) refus('champ_interdit'); });
  let places;
  if ('places' in data) {
    const t = String(data.places ?? '0').trim() || '0';
    if (!/^[0-9]{1,6}$/.test(t)) refus('nombre_invalide');
    places = Math.min(100000, Number(t));
  }
  if (!z) {
    const nom = String(data.nom ?? '').trim();
    if (!nom) refus('nom_requis');
    if (p.zones.length >= ZONES_MAX) refus('zones_pleines');
    const neuve = {
      id: nouvelId(), nom: nom.slice(0, 80), site_id: null, actif: data.actif !== false && data.actif !== 'false',
      places: places ?? 0, ordre: nombre(data.ordre, true) ?? p.zones.length, plan_id: null,
      x: null, y: null, l: null, h: null,
    };
    return { projet: touche(p, { zones: [...p.zones, neuve] }), retour: neuve };
  }
  const neuve = {
    ...z,
    ...('nom' in data ? { nom: String(data.nom ?? '').trim().slice(0, 80) || z.nom } : {}),
    ...(places !== undefined ? { places } : {}),
    ...('ordre' in data ? { ordre: nombre(data.ordre, true) ?? 0 } : {}),
    ...('actif' in data ? { actif: data.actif === true || data.actif === 'true' } : {}),
  };
  // Le nom de zone est recopié sur ses postes, comme en base.
  const postes = 'nom' in data ? p.postes.map((s) => (s.zone_id === id ? { ...s, zone: neuve.nom } : s)) : p.postes;
  return { projet: touche(p, { zones: p.zones.map((x) => (x.id === id ? neuve : x)), postes }), retour: neuve };
}
