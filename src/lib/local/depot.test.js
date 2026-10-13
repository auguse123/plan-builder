import { describe, expect, it } from 'vitest';
import {
  creerPlan, deplacerPostes, dessinerZones, ecrireRessource, ecrireZone, genrerPostes, patcherPlan,
  poserSalle, projetNeuf, renommerPlan, semerPostes, supprimerPlan, vueDuProjet,
} from './depot.js';

const refuse = (f, code) => expect(f).toThrow(code);

describe('les plans', () => {
  it('un projet naît avec un plan, et la vue a la forme de om_postes_vue', () => {
    const p = projetNeuf('Siège');
    const v = vueDuProjet(p);
    expect(v.plans).toHaveLength(1);
    expect(v.plans[0]).toMatchObject({ nom: 'Plan 1', largeur: 300, hauteur: 200, murs: [], trait_mur: 0.25 });
    expect(v.plans[0].cree_le).toBeUndefined();
    expect(v).toMatchObject({ zones: [], salles: [], postes: [] });
  });

  it('crée jusqu’à six plans, renomme, et ne supprime jamais le dernier', () => {
    let p = projetNeuf();
    for (let i = 0; i < 5; i += 1) p = creerPlan(p).projet;
    expect(p.plans.map((x) => x.nom).at(-1)).toBe('Plan 6');
    refuse(() => creerPlan(p), 'plans_pleins');
    const id = p.plans[1].id;
    p = renommerPlan(p, id, '  Étage 2 ').projet;
    expect(p.plans[1].nom).toBe('Étage 2');
    refuse(() => renommerPlan(p, id, ' '), 'nom_invalide');
    const seul = projetNeuf();
    refuse(() => supprimerPlan(seul, seul.plans[0].id), 'dernier_plan');
  });

  it('supprimer un plan détache ses postes sans les perdre', () => {
    let p = creerPlan(projetNeuf()).projet;
    const etage = p.plans[1].id;
    p = semerPostes(p, { nombre: 2, geometrie: [{ x: 1, y: 1, l: 8, h: 6, plan_id: etage }, { x: 20, y: 1, l: 8, h: 6, plan_id: etage }] }).projet;
    p = supprimerPlan(p, etage).projet;
    expect(p.plans).toHaveLength(1);
    expect(p.postes.map((s) => s.plan_id)).toEqual([null, null]);
  });

  it('patche les murs comme la base, et refuse ce qu’elle refusait', () => {
    const p = projetNeuf();
    const id = p.plans[0].id;
    const r = patcherPlan(p, id, { largeur: 400, murs: [[[0, 0], [100, 0]]], epaisseurs: [2] });
    expect(r.retour).toMatchObject({ largeur: 400, murs: [[[0, 0], [100, 0]]], epaisseurs: [2] });
    refuse(() => patcherPlan(p, id, { couleur: 'rouge' }), 'champ_interdit');
    refuse(() => patcherPlan(p, id, { largeur: 10 }), 'plan_invalide');
    refuse(() => patcherPlan(p, id, { murs: [[[0, 0]]] }), 'murs_invalides');
    refuse(() => patcherPlan(p, id, { epaisseurs: [1] }), 'epaisseurs_invalides');
    refuse(() => patcherPlan(p, id, { portes: [{ k: 'porte', x: 1, y: 1, a: 0, l: 9 }] }), 'portes_invalides');
    refuse(() => patcherPlan(p, id, { trait_mur: '2' }), 'trait_invalide');
  });
});

describe('les postes', () => {
  it('semer numérote à la suite du projet et rend les ids', () => {
    let p = projetNeuf();
    p = semerPostes(p, { nombre: 3 }).projet;
    const r = semerPostes(p, { nombre: 2, prefixe: 'Bureau' });
    expect(r.projet.postes.map((s) => s.nom)).toEqual(['Poste 1', 'Poste 2', 'Poste 3', 'Bureau 4', 'Bureau 5']);
    expect(r.retour.ids).toHaveLength(2);
    refuse(() => semerPostes(p, { nombre: 0 }), 'nombre_invalide');
    refuse(() => semerPostes(p, { nombre: 2, geometrie: [{}] }), 'geometrie_invalide');
  });

  it('un poste glissé dans une zone en devient — la plus petite, du même plan', () => {
    let p = projetNeuf();
    const pl = p.plans[0].id;
    p = ecrireZone(p, { nom: 'Open space' }).projet;
    p = ecrireZone(p, { nom: 'Îlot' }).projet;
    const [grande, petite] = p.zones;
    p = dessinerZones(p, [{ id: grande.id, x: 0, y: 0, l: 100, h: 100, plan_id: pl }, { id: petite.id, x: 10, y: 10, l: 20, h: 20, plan_id: pl }]).projet;
    p = semerPostes(p, { nombre: 1 }).projet;
    const id = p.postes[0].id;
    p = deplacerPostes(p, [{ id, x: 15, y: 15, l: 8, h: 6, plan_id: pl }]).projet;
    expect(p.postes[0]).toMatchObject({ zone_id: petite.id, zone: 'Îlot', x: 15 });
    // Hors de toute zone, il garde la sienne.
    p = deplacerPostes(p, [{ id, x: 500, y: 500, l: 8, h: 6, plan_id: pl }]).projet;
    expect(p.postes[0].zone_id).toBe(petite.id);
    refuse(() => deplacerPostes(p, []), 'lot_vide');
    refuse(() => deplacerPostes(p, [{ id: 'x' }]), 'ressource_inconnue');
  });

  it('bloquer un poste le sort des places de sa zone ; attitrer demande une équipe', () => {
    let p = ecrireZone(projetNeuf(), { nom: 'A' }).projet;
    const z = p.zones[0].id;
    p = semerPostes(p, { zoneId: z, nombre: 3 }).projet;
    expect(p.zones[0].places).toBe(3);
    p = genrerPostes(p, { ids: [p.postes[0].id], genre: 'bloque' }).projet;
    expect(p.zones[0].places).toBe(2);
    refuse(() => genrerPostes(p, { ids: [p.postes[0].id], genre: 'attitre' }), 'titulaire_requis');
  });

  it('pose une salle, renomme une ressource, la supprime', () => {
    let p = poserSalle(projetNeuf(), { nom: 'Salle Seine', capacite: 200, geometrie: { x: 5, y: 5, l: 30, h: 20 } }).projet;
    expect(p.salles[0]).toMatchObject({ nom: 'Salle Seine', capacite: 99, x: 5 });
    const id = p.salles[0].id;
    p = ecrireRessource(p, { id, nom: 'Salle Loire' }).projet;
    expect(p.salles[0].nom).toBe('Salle Loire');
    p = ecrireRessource(p, { id, supprimer: true }).projet;
    expect(p.salles).toEqual([]);
    refuse(() => poserSalle(p, { nom: ' ' }), 'nom_requis');
  });

  it('renommer une zone renomme ses postes ; la supprimer les détache', () => {
    let p = ecrireZone(projetNeuf(), { nom: 'A' }).projet;
    const z = p.zones[0].id;
    p = semerPostes(p, { zoneId: z, nombre: 1 }).projet;
    p = ecrireZone(p, { id: z, nom: 'Direction' }).projet;
    expect(p.postes[0].zone).toBe('Direction');
    p = ecrireZone(p, { id: z, supprimer: true }).projet;
    expect(p.zones).toEqual([]);
    expect(p.postes[0].zone_id).toBeNull();
  });

  it('ne modifie jamais le projet reçu', () => {
    const p = projetNeuf();
    const avant = JSON.stringify(p);
    semerPostes(p, { nombre: 2 });
    patcherPlan(p, p.plans[0].id, { largeur: 500 });
    expect(JSON.stringify(p)).toBe(avant);
  });
});
