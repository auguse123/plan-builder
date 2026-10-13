/**
 * La mise en page d'un plan imprimé à l'échelle. JS pur, en millimètres de
 * papier ; le plan parle en unités (1 unité = 10 cm). Ni React ni DOM.
 *
 * UNE ÉCHELLE IMPRIMÉE SE VÉRIFIE À LA RÈGLE. « Ajuster à la page » donne un
 * plan juste de forme et faux de taille : l'architecte pose son double-décimètre
 * sur la cloison et lit n'importe quoi. On imprime donc au 1:50, 1:100 ou
 * 1:200, et si le dessin ne tient pas on le DIT — avec l'échelle ou le format
 * qui le ferait tenir — plutôt que de rétrécir en silence.
 *
 * LE CARTOUCHE PREND SA PLACE AU BAS DE LA FEUILLE : nom, date, échelle et
 * barre d'échelle. La barre survit à une photocopie réduite, le « 1:100 » non.
 */

/** Les formats, en paysage : l'orientation se choisit à la mise en page. */
export const FORMATS = {
  A4: { l: 297, h: 210 },
  A3: { l: 420, h: 297 },
};

export const ECHELLES = [50, 100, 200];

/** La marge de page (celle de `@page`) et la hauteur du cartouche, en mm. */
export const MARGE = 10;
export const CARTOUCHE = 22;

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

/** Des unités de plan en millimètres de papier, à une échelle 1:`echelle`. */
export function auPapier(unites, echelle) {
  const e = nombre(echelle);
  if (e <= 0) return 0;
  return Math.round(((nombre(unites) * 100) / e) * 10) / 10;
}

/** Ce qu'on imprime : la boîte du dessin, plus 50 cm d'air tout autour. */
export function boiteImprimee(boite, air = 5) {
  if (!boite || !(nombre(boite.l) > 0) || !(nombre(boite.h) > 0)) return null;
  const a = Math.max(0, nombre(air));
  return {
    x: nombre(boite.x) - a, y: nombre(boite.y) - a,
    l: nombre(boite.l) + 2 * a, h: nombre(boite.h) + 2 * a,
  };
}

/** La zone où le dessin peut se poser, dans une feuille orientée. */
function zoneUtile(papier) {
  return { l: papier.l - 2 * MARGE, h: papier.h - 2 * MARGE - CARTOUCHE };
}

function orienter(format, orientation) {
  const f = FORMATS[format] || FORMATS.A4;
  return orientation === 'portrait' ? { l: f.h, h: f.l } : { l: f.l, h: f.h };
}

function tientDans(dessin, format) {
  for (const orientation of ['paysage', 'portrait']) {
    const z = zoneUtile(orienter(format, orientation));
    if (dessin.l <= z.l && dessin.h <= z.h) return orientation;
  }
  return null;
}

/**
 * La page : orientation, taille du dessin en mm, et s'il tient.
 *
 * L'orientation suit le dessin — un plateau en longueur part en paysage —,
 * puis bascule si l'autre sens le fait tenir. Quand rien ne tient, `conseil`
 * nomme la plus fine échelle qui tient dans ce format, sinon le même rapport
 * en A3 : le geste le moins coûteux d'abord.
 */
export function miseEnPage(boite, options = {}) {
  const format = FORMATS[options.format] ? options.format : 'A4';
  const echelle = ECHELLES.includes(Number(options.echelle)) ? Number(options.echelle) : 100;
  const b = boite || { l: 0, h: 0 };
  const dessin = { l: auPapier(b.l, echelle), h: auPapier(b.h, echelle) };
  const prefere = dessin.l >= dessin.h ? 'paysage' : 'portrait';
  const zonePref = zoneUtile(orienter(format, prefere));
  const orientation = dessin.l <= zonePref.l && dessin.h <= zonePref.h
    ? prefere : (tientDans(dessin, format) || prefere);
  const papier = orienter(format, orientation);
  const zone = zoneUtile(papier);
  const tient = dessin.l > 0 && dessin.l <= zone.l && dessin.h <= zone.h;
  let conseil = null;
  if (!tient && dessin.l > 0) {
    const essais = [
      ...ECHELLES.filter((e) => e > echelle).map((e) => ({ format, echelle: e })),
      ...(format === 'A4' ? ECHELLES.filter((e) => e >= echelle).map((e) => ({ format: 'A3', echelle: e })) : []),
    ];
    conseil = essais.find((c) => tientDans(
      { l: auPapier(b.l, c.echelle), h: auPapier(b.h, c.echelle) }, c.format,
    )) || null;
  }
  return { format, echelle, orientation, papier, zone, dessin, tient, conseil };
}

/**
 * La barre d'échelle : la plus longue longueur ronde qui tient dans `maxMm`.
 * `pas` donne les graduations, en mètres depuis zéro.
 */
export function barreEchelle(echelle, maxMm = 60) {
  const e = nombre(echelle);
  if (e <= 0) return null;
  const ronds = [0.5, 1, 2, 5, 10, 20, 50];
  const mmDe = (m) => (m * 1000) / e;
  const metres = [...ronds].reverse().find((m) => mmDe(m) <= nombre(maxMm, 60)) || ronds[0];
  const n = [4, 5, 2].find((k) => Number.isInteger((metres / k) * 10)) || 1;
  const pas = Array.from({ length: n + 1 }, (_, i) => Math.round((metres / n) * i * 100) / 100);
  return { metres, mm: Math.round(mmDe(metres) * 10) / 10, pas };
}

/** La règle `@page` de la feuille : format et sens, la marge du calcul. */
export function reglePage(page) {
  return `@page { size: ${page.format} ${page.orientation === 'portrait' ? 'portrait' : 'landscape'}; margin: ${MARGE}mm; }`;
}
