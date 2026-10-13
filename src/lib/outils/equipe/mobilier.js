/**
 * L'AMÉNAGEMENT D'UNE TABLE : où tombent les chaises.
 *
 * Un plan d'architecte ne dessine pas « Table 8 pers. » dans un rectangle : il
 * dessine la table et ses huit chaises, et c'est ce qu'on lit d'un coup d'œil.
 * Ce module place les chaises ; le dessin (`PlanMobilier.jsx`) ne décide rien.
 *
 * L'EMPRISE NE BOUGE PAS. Les chaises tiennent DANS le rectangle posé — le
 * plateau se rétrécit d'autant — pour que ce qu'on voit reste ce qui est
 * compté : une salle de 3,2 × 2,1 m ne déborde pas parce qu'on l'a meublée.
 *
 * Une chaise porte `rot` : 0, elle tourne le dos au nord et regarde le sud.
 * Coordonnées relatives au coin haut-gauche de l'emprise. Unités de plan
 * (1 = 10 cm), aucun pixel, aucun React.
 */

/** Une chaise vue du dessus : 44 × 40 cm, qui glisse de 10 cm sous la table. */
export const CHAISE = { l: 4.4, p: 4, sous: 1 };

const PLACES_MAX = 40;
const r2 = (v) => Math.round(v * 100) / 100;

function nombre(v, defaut = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : defaut;
}

function tableRonde(l, h, n) {
  const marge = n ? CHAISE.p - CHAISE.sous : 1;
  const rx = Math.max(1, l / 2 - marge);
  const ry = Math.max(1, h / 2 - marge);
  const chaises = [];
  for (let i = 0; i < n; i += 1) {
    const t = -90 + (360 * i) / n;
    const a = (t * Math.PI) / 180;
    chaises.push({
      x: r2(l / 2 + (rx + CHAISE.p / 2 - CHAISE.sous) * Math.cos(a)),
      y: r2(h / 2 + (ry + CHAISE.p / 2 - CHAISE.sous) * Math.sin(a)),
      rot: r2(((t + 90) % 360 + 360) % 360),
    });
  }
  return { table: { rond: true, cx: r2(l / 2), cy: r2(h / 2), rx: r2(rx), ry: r2(ry) }, chaises };
}

// Toujours posée en long, de gauche à droite : le cas en hauteur se transpose.
function tableLongue(l, h, n) {
  const bouts = n >= 8 ? 2 : 0;
  const cotes = n - bouts;
  const haut = Math.ceil(cotes / 2);
  const bas = Math.floor(cotes / 2);
  const e = CHAISE.p - CHAISE.sous;
  const mx = bouts ? e : 1;
  const my = n ? e : 1;
  const table = { x: mx, y: my, l: Math.max(1, l - 2 * mx), h: Math.max(1, h - 2 * my) };
  const chaises = [];
  const rang = (k, y, rot) => {
    for (let i = 0; i < k; i += 1) {
      chaises.push({ x: r2(table.x + (table.l * (i + 0.5)) / k), y: r2(y), rot });
    }
  };
  const bord = CHAISE.p / 2 - CHAISE.sous;
  rang(haut, table.y - bord, 0);
  rang(bas, table.y + table.h + bord, 180);
  if (bouts) {
    chaises.push({ x: r2(table.x - bord), y: r2(h / 2), rot: 270 });
    chaises.push({ x: r2(table.x + table.l + bord), y: r2(h / 2), rot: 90 });
  }
  return { table: { rond: false, ...table }, chaises };
}

/**
 * La table et ses chaises dans une emprise `l × h`.
 * @param {{l:number, h:number, places?:number, rond?:boolean}} o
 */
export function amenagement({ l, h, places = 0, rond = false } = {}) {
  const L = Math.max(0, nombre(l));
  const H = Math.max(0, nombre(h));
  const n = Math.min(PLACES_MAX, Math.max(0, Math.floor(nombre(places))));
  if (rond) return tableRonde(L, H, n);
  if (L >= H) return tableLongue(L, H, n);
  const t = tableLongue(H, L, n);
  return {
    table: { rond: false, x: t.table.y, y: t.table.x, l: t.table.h, h: t.table.l },
    chaises: t.chaises.map((c) => ({ x: c.y, y: c.x, rot: (270 - c.rot + 360) % 360 })),
  };
}

/**
 * Comment meubler une salle posée, qui ne garde que nom, capacité et rectangle.
 *
 * LA BASE NE GARDE PAS LA CLÉ DU BLOC d'une salle : c'est une ressource, pas un
 * meuble. Le dessin se DÉDUIT donc de ce qu'elle porte — « ronde » dans le nom
 * fait une table ronde, « cabine », « phone box » ou « bulle » un vitrage, et une
 * pièce vaste reçoit une table au milieu plutôt qu'une table murale.
 *
 * @returns {{vitre:object|null, table:object|null, chaises:Array, tablette:object|null}}
 */
export function amenagementSalle(salle = {}) {
  const l = Math.max(0, nombre(salle.l));
  const h = Math.max(0, nombre(salle.h));
  const n = Math.min(PLACES_MAX, Math.max(0, Math.floor(nombre(salle.capacite))));
  const nom = String(salle.nom || '');
  const rond = /rond/i.test(nom);
  const cabine = /phone|cabine|booth|bulle/i.test(nom);
  const vide = { vitre: null, table: null, chaises: [], tablette: null };
  if (!n || l < 6 || h < 6) return vide;

  const vitre = cabine ? { x: 0.8, y: 0.8, l: l - 1.6, h: h - 1.6 } : null;
  if (cabine && n <= 2) {
    // Une cabine d'une ou deux places : une tablette contre la vitre du fond,
    // les chaises tournées vers elle.
    const tablette = { x: 1.6, y: 1.6, l: l - 3.2, h: Math.min(3, h / 4) };
    const y = tablette.y + tablette.h + CHAISE.p / 2 - CHAISE.sous;
    const chaises = Array.from({ length: n }, (_, i) => ({
      x: r2(tablette.x + (tablette.l * (i + 0.5)) / n), y: r2(y), rot: 180,
    }));
    return { vitre, table: null, chaises, tablette };
  }

  let pied = cabine ? { ...vitre } : { x: 0, y: 0, l, h };
  if (Math.min(l, h) >= 28) {
    // Une pièce vaste : la table au milieu, à la taille des places — pas une
    // table de 5 m dans une salle de projet.
    const ext = rond ? 8 + n * 1.6 : null;
    const bouts = n >= 8 ? 2 : 0;
    const long = Math.min(l - 8, rond ? ext : Math.ceil((n - bouts) / 2) * 6 + (bouts ? 8 : 2));
    const court = Math.min(h - 8, rond ? ext : (n > 12 ? 18 : 15));
    pied = { x: (l - long) / 2, y: (h - court) / 2, l: long, h: court };
  }
  const a = amenagement({ l: pied.l, h: pied.h, places: n, rond });
  const decale = (o) => ({ ...o, x: r2(o.x + pied.x), y: r2(o.y + pied.y) });
  const table = a.table.rond
    ? { ...a.table, cx: r2(a.table.cx + pied.x), cy: r2(a.table.cy + pied.y) }
    : decale(a.table);
  return { vitre, table, chaises: a.chaises.map(decale), tablette: null };
}

/**
 * Le corps de texte qui fait tenir `texte` dans `largeur`, entre `min` et `max`
 * — 0 s'il ne tient pas même au plus petit. Une légende qui déborde sur le
 * voisin se lit pire que pas de légende : le survol dit le nom quand même.
 * `chasse` : largeur moyenne d'un signe, en corps (plus large en capitales).
 */
export function corpsQuiTient(texte, largeur, { max = 3.6, min = 2, chasse = 0.56 } = {}) {
  const n = String(texte || '').length;
  const L = nombre(largeur);
  if (!n || L <= 0) return 0;
  const corps = Math.min(max, L / (n * chasse));
  return corps >= min ? r2(corps) : 0;
}
