import { describe, expect, it } from 'vitest';
import { glisserSegment, insererSommet, poigneeDeSegment } from './segments';

const boite = [[0, 0], [40, 0], [40, 30], [0, 30], [0, 0]];

describe('glisserSegment', () => {
  it('le segment glisse le long de sa normale, ses deux bouts ensemble', () => {
    // Segment 1 : (40,0)→(40,30), vertical. Un geste en biais ne garde que dx.
    expect(glisserSegment(boite, 1, { dx: 6, dy: 5 }, { pas: 2 }))
      .toEqual([[0, 0], [46, 0], [46, 30], [0, 30], [0, 0]]);
  });
  it('calé au pas', () => {
    expect(glisserSegment(boite, 2, { dx: 0, dy: 4.7 }, { pas: 2 })[2]).toEqual([40, 34]);
  });
  it('une pièce fermée reste fermée par le premier segment', () => {
    const r = glisserSegment(boite, 0, { dx: 0, dy: 4 }, { pas: 2 });
    expect(r[0]).toEqual([0, 4]);
    expect(r[1]).toEqual([40, 4]);
    expect(r[4]).toEqual([0, 4]);
  });
  it('et par le dernier', () => {
    const r = glisserSegment(boite, 3, { dx: 4, dy: 0 }, { pas: 2 });
    expect(r[0]).toEqual([4, 0]);
    expect(r[4]).toEqual([4, 0]);
    expect(r[3]).toEqual([4, 30]);
  });
  it('rien sous le pas, rien hors du mur', () => {
    expect(glisserSegment(boite, 1, { dx: 0.4, dy: 0 }, { pas: 2 })).toBeNull();
    expect(glisserSegment(boite, 4, { dx: 4, dy: 0 })).toBeNull();
  });
});

describe('insererSommet', () => {
  it('au pied du point, sur le segment le plus proche', () => {
    const r = insererSommet([[0, 0], [40, 0]], { x: 12.3, y: 1.5 });
    expect(r).toEqual({ mur: [[0, 0], [12.3, 0], [40, 0]], sommet: 1 });
  });
  it('dans une pièce fermée', () => {
    const r = insererSommet(boite, { x: 41, y: 10 });
    expect(r.sommet).toBe(2);
    expect(r.mur).toHaveLength(6);
    expect(r.mur[2]).toEqual([40, 10]);
  });
  it('pas de doublon contre un sommet', () => {
    expect(insererSommet([[0, 0], [40, 0]], { x: 0.2, y: 0 })).toBeNull();
    expect(insererSommet([[0, 0]], { x: 1, y: 0 })).toBeNull();
  });
});

describe('poigneeDeSegment', () => {
  it('reste au milieu d’un long segment', () => {
    expect(poigneeDeSegment([0, 0], [100, 0], 1)).toEqual({ x: 50, y: 0, milieu: [50, 0], deporte: false });
  });
  it('sort d’un segment court, sur sa normale, à 16 px', () => {
    const p = poigneeDeSegment([0, 0], [10, 0], 0.5);
    expect(p.deporte).toBe(true);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(8);
  });
  it('rien pour un segment nul', () => {
    expect(poigneeDeSegment([3, 3], [3, 3], 1)).toBeNull();
  });
});
