// Le mobilier dessiné comme sur un plan d'architecte : simplifié, jamais muet.
//
// UN RECTANGLE GRIS NE DIT PAS « CANAPÉ ». Chaque forme du catalogue a ici son
// pictogramme vu du dessus — dossier et accoudoirs, chaises autour d'une table,
// cuvette et réservoir, marches d'un escalier — tracé d'une plume fine dans
// l'emprise `l × h` posée. Le dessin ne déborde jamais de l'emprise : ce qu'on
// voit reste ce qui est compté (voir `mobilier.js`).
//
// AUCUN ÉTAT, AUCUNE RÈGLE : des `<g>` qui reçoivent une boîte et la rendent.
// La rotation est celle du `<g>` parent. Couleurs en classes, comme partout.
import React from 'react';
import { CHAISE, amenagement, corpsQuiTient } from '@/lib/outils/equipe/mobilier';

const FIN = 0.3;
const r2 = (v) => Math.round(v * 100) / 100;

/** Une chaise vue du dessus, dos au nord à `rot` = 0. */
export function Chaise({ x, y, rot = 0, trait }) {
  const l = CHAISE.l;
  const p = CHAISE.p;
  return (
    <g transform={`translate(${r2(x)} ${r2(y)}) rotate(${rot})`}>
      <rect
        x={-l / 2} y={-p / 2 + 0.8} width={l} height={p - 0.8} rx="0.7"
        className={`fill-surface-2 ${trait}`} strokeWidth={FIN}
      />
      <rect
        x={-l / 2 + 0.2} y={-p / 2} width={l - 0.4} height="1.1" rx="0.45"
        className={`fill-surface ${trait}`} strokeWidth={FIN}
      />
    </g>
  );
}

/** Le plateau d'une table (rectangle ou disque) et ses chaises, déjà placés. */
export function TableEtChaises({ table, chaises = [], x = 0, y = 0, trait, fond = 'fill-surface' }) {
  if (!table && !chaises.length) return null;
  return (
    <g transform={x || y ? `translate(${x} ${y})` : undefined}>
      {chaises.map((c, i) => <Chaise key={i} {...c} trait={trait} />)}
      {!table ? null : table.rond ? (
        <ellipse cx={table.cx} cy={table.cy} rx={table.rx} ry={table.ry} className={`${fond} ${trait}`} strokeWidth="0.45" />
      ) : (
        <rect x={table.x} y={table.y} width={table.l} height={table.h} rx="0.5" className={`${fond} ${trait}`} strokeWidth="0.45" />
      )}
    </g>
  );
}

// Un feuillage festonné : ce qui distingue une plante d'un pouf rond.
function feuillage(cx, cy, r, n = 7) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [r2(cx + 0.8 * r * Math.cos(a)), r2(cy + 0.8 * r * Math.sin(a))];
  });
  const rr = r2(r * 0.4);
  return `M${pts[0].join(' ')}${pts.map((_, i) => {
    const q = pts[(i + 1) % n];
    return `A${rr} ${rr} 0 0 1 ${q.join(' ')}`;
  }).join('')}Z`;
}

/**
 * Le dessin d'une forme dans sa boîte. Retourne null pour les formes que
 * `Meuble` sait déjà tracer seul (rond, rect, tapis, arrondi).
 */
export function DessinMeuble({ forme, x, y, l, h, places = 0, trait, nom = '' }) {
  const ligne = { className: trait, fill: 'none', strokeWidth: FIN };
  const corps = (extra = {}) => (
    <rect x={x} y={y} width={l} height={h} rx="0.5" className={`fill-surface-2 ${trait}`} strokeWidth="0.45" {...extra} />
  );
  const cx = x + l / 2;
  const cy = y + h / 2;
  const petit = Math.min(l, h);

  switch (forme) {
    case 'canape': {
      const dos = Math.min(2.6, h * 0.3);
      const bras = Math.min(2.2, l * 0.12);
      const n = Math.max(1, Math.round((l - 2 * bras) / 7));
      const pas = (l - 2 * bras) / n;
      return (
        <g>
          {corps({ rx: 1 })}
          <path d={`M${x + bras} ${y + h}V${y + dos}H${x + l - bras}V${y + h}`} {...ligne} />
          {Array.from({ length: n - 1 }, (_, i) => (
            <line key={i} x1={r2(x + bras + pas * (i + 1))} y1={y + dos} x2={r2(x + bras + pas * (i + 1))} y2={y + h - 0.6} {...ligne} />
          ))}
        </g>
      );
    }
    case 'canape-angle': {
      const p = Math.min(9, h * 0.55, l * 0.4);
      const dos = Math.min(2.6, p * 0.3);
      const bras = 2;
      const contour = `M${x} ${y}H${x + l}V${y + p}H${x + p}V${y + h}H${x}Z`;
      return (
        <g>
          <path d={contour} className={`fill-surface-2 ${trait}`} strokeWidth="0.45" strokeLinejoin="round" />
          <path d={`M${x + dos} ${y + h - bras}V${y + dos}H${x + l - bras}V${y + p}`} {...ligne} />
          <line x1={x + dos} y1={y + h - bras} x2={x + p} y2={y + h - bras} {...ligne} />
          <line x1={x + p} y1={y + dos} x2={x + p} y2={y + p} {...ligne} />
          <line x1={r2(x + p + (l - p - bras) / 2)} y1={y + dos} x2={r2(x + p + (l - p - bras) / 2)} y2={y + p} {...ligne} />
        </g>
      );
    }
    case 'siege':
      return (
        <g>
          <rect x={x} y={y + h * 0.2} width={l} height={h * 0.8} rx={petit * 0.18} className={`fill-surface-2 ${trait}`} strokeWidth="0.4" />
          <rect x={x + l * 0.05} y={y} width={l * 0.9} height={h * 0.28} rx={petit * 0.12} className={`fill-surface ${trait}`} strokeWidth="0.4" />
        </g>
      );
    case 'fauteuil': {
      const bras = l * 0.18;
      return (
        <g>
          {corps({ rx: petit * 0.2 })}
          <path d={`M${x + bras} ${y + h}V${y + h * 0.3}H${x + l - bras}V${y + h}`} {...ligne} />
        </g>
      );
    }
    case 'siege-bureau':
      return (
        <g>
          <ellipse cx={cx} cy={y + h * 0.58} rx={l * 0.42} ry={h * 0.4} className={`fill-surface-2 ${trait}`} strokeWidth="0.4" />
          <path
            d={`M${x + l * 0.12} ${y + h * 0.3}Q${cx} ${y - h * 0.05} ${x + l * 0.88} ${y + h * 0.3}`}
            className={trait} fill="none" strokeWidth={Math.max(0.6, h * 0.12)} strokeLinecap="round"
          />
        </g>
      );
    case 'table-chaises':
    case 'ronde-chaises': {
      const a = amenagement({ l, h, places, rond: forme === 'ronde-chaises' });
      return <TableEtChaises {...a} x={x} y={y} trait={trait} />;
    }
    case 'vegetal': {
      if (l > 2 * h) {
        const n = Math.max(2, Math.round(l / h));
        const pas = l / n;
        return (
          <g>
            <rect x={x} y={y} width={l} height={h} rx="0.4" className={`fill-surface-2 ${trait}`} strokeWidth="0.4" />
            {Array.from({ length: n }, (_, i) => (
              <path key={i} d={feuillage(x + pas * (i + 0.5), cy, Math.min(pas, h) * 0.55, 6)} className={`fill-surface ${trait}`} strokeWidth={FIN} />
            ))}
          </g>
        );
      }
      return (
        <g>
          <path d={feuillage(cx, cy, petit / 2)} className={`fill-surface ${trait}`} strokeWidth="0.4" />
          <circle cx={cx} cy={cy} r={petit * 0.12} {...ligne} />
        </g>
      );
    }
    case 'cuisine': {
      const evier = { l: Math.min(6, l * 0.28), h: h * 0.6 };
      const ex = x + Math.min(2, l * 0.08);
      const plaque = l >= 12;
      const pr = Math.min(1.1, h * 0.14);
      const px = x + l - Math.min(2, l * 0.08) - 5.2;
      return (
        <g>
          {corps()}
          <rect x={ex} y={cy - evier.h / 2} width={evier.l} height={evier.h} rx="0.8" {...ligne} />
          <circle cx={ex + evier.l / 2} cy={y + 0.7} r="0.35" {...ligne} />
          {plaque && [[1.3, -1.4], [3.9, -1.4], [1.3, 1.4], [3.9, 1.4]].map(([dx, dy], i) => (
            <circle key={i} cx={px + dx} cy={cy + dy} r={pr} {...ligne} />
          ))}
        </g>
      );
    }
    case 'armoire':
      return (
        <g>
          {corps()}
          <line x1={x} y1={y + h - 0.8} x2={x + l} y2={y + h - 0.8} {...ligne} />
          <line x1={x} y1={y + h - 0.8} x2={x + l} y2={y} {...ligne} />
        </g>
      );
    case 'etagere': {
      const n = Math.max(1, Math.round(l / 8));
      return (
        <g>
          {corps()}
          <line x1={x} y1={cy} x2={x + l} y2={cy} {...ligne} />
          {Array.from({ length: n - 1 }, (_, i) => (
            <line key={i} x1={r2(x + (l * (i + 1)) / n)} y1={y} x2={r2(x + (l * (i + 1)) / n)} y2={y + h} {...ligne} />
          ))}
        </g>
      );
    }
    case 'casiers': {
      const n = Math.max(2, Math.round(l / 3));
      return (
        <g>
          {corps()}
          {Array.from({ length: n - 1 }, (_, i) => (
            <line key={i} x1={r2(x + (l * (i + 1)) / n)} y1={y} x2={r2(x + (l * (i + 1)) / n)} y2={y + h} {...ligne} />
          ))}
        </g>
      );
    }
    case 'appareil':
      return (
        <g>
          {corps()}
          <rect x={x + 0.7} y={y + 0.7} width={Math.max(0.2, l - 1.4)} height={Math.max(0.2, h - 1.4)} rx="0.3" {...ligne} />
        </g>
      );
    case 'wc':
      return (
        <g>
          <rect x={x + l * 0.05} y={y} width={l * 0.9} height={h * 0.25} rx="0.3" className={`fill-surface-2 ${trait}`} strokeWidth="0.4" />
          <ellipse cx={cx} cy={y + h * 0.25 + h * 0.37} rx={l * 0.42} ry={h * 0.36} className={`fill-surface ${trait}`} strokeWidth="0.4" />
          <ellipse cx={cx} cy={y + h * 0.25 + h * 0.4} rx={l * 0.24} ry={h * 0.22} {...ligne} />
        </g>
      );
    case 'urinoir':
      return (
        <path
          d={`M${x} ${y}H${x + l}V${y + h * 0.35}A${l / 2} ${h * 0.65} 0 0 1 ${x} ${y + h * 0.35}Z`}
          className={`fill-surface ${trait}`} strokeWidth="0.4"
        />
      );
    case 'lavabo': {
      const n = l >= 10 ? 2 : 1;
      return (
        <g>
          {corps()}
          {Array.from({ length: n }, (_, i) => (
            <ellipse key={i} cx={r2(x + (l * (i + 0.5)) / n)} cy={cy + 0.3} rx={Math.min(2.4, l / (2 * n) - 0.6)} ry={h * 0.3} {...ligne} />
          ))}
        </g>
      );
    }
    case 'douche':
      return (
        <g>
          {corps()}
          <path d={`M${x} ${y}L${x + l} ${y + h}M${x + l} ${y}L${x} ${y + h}`} {...ligne} />
          <circle cx={cx} cy={cy} r="0.5" className={`fill-surface ${trait}`} strokeWidth={FIN} />
        </g>
      );
    case 'cabine-wc':
      return (
        <g>
          <rect x={x} y={y} width={l} height={h} className={`fill-surface ${trait}`} strokeWidth="0.45" />
          <DessinMeuble forme="wc" x={cx - 2} y={y + 0.4} l={4} h={7} trait={trait} />
          <path d={`M${x + 0.8} ${y + h}A${l - 1.6} ${l - 1.6} 0 0 1 ${x + l - 0.8} ${y + h - (l - 1.6)}V${y + h}`} {...ligne} strokeDasharray="0.8 0.6" />
        </g>
      );
    case 'escalier': {
      const long = l >= h;
      const L = long ? l : h;
      const n = Math.max(3, Math.round(L / 2.8));
      const pas = L / n;
      const marches = Array.from({ length: n - 1 }, (_, i) => r2(pas * (i + 1)));
      const fleche = long
        ? `M${x + 1} ${cy}H${x + l - 1.2}M${x + l - 2.6} ${cy - 1.2}L${x + l - 1.2} ${cy}L${x + l - 2.6} ${cy + 1.2}`
        : `M${cx} ${y + 1}V${y + h - 1.2}M${cx - 1.2} ${y + h - 2.6}L${cx} ${y + h - 1.2}L${cx + 1.2} ${y + h - 2.6}`;
      return (
        <g>
          {corps()}
          {marches.map((m) => (long
            ? <line key={m} x1={x + m} y1={y} x2={x + m} y2={y + h} {...ligne} />
            : <line key={m} x1={x} y1={y + m} x2={x + l} y2={y + m} {...ligne} />))}
          <path d={fleche} {...ligne} strokeWidth="0.4" />
        </g>
      );
    }
    case 'ascenseur':
      return (
        <g>
          {corps()}
          <rect x={x + 1} y={y + 1} width={l - 2} height={h - 2.4} {...ligne} />
          <path d={`M${x + 1} ${y + 1}L${x + l - 1} ${y + h - 1.4}M${x + l - 1} ${y + 1}L${x + 1} ${y + h - 1.4}`} {...ligne} />
          <line x1={x + l * 0.25} y1={y + h - 0.5} x2={x + l * 0.75} y2={y + h - 0.5} className={trait} strokeWidth="0.6" />
        </g>
      );
    case 'gaine':
      return (
        <g>
          {corps()}
          <path d={`M${x} ${y}L${x + l} ${y + h}M${x + l} ${y}L${x} ${y + h}`} {...ligne} />
        </g>
      );
    case 'poteau':
      return <rect x={x} y={y} width={l} height={h} className="fill-encre-2 stroke-encre-2" strokeWidth={FIN} />;
    case 'accueil': {
      const e = Math.min(3, h * 0.28);
      const c = `M${x} ${y + h * 0.2}V${y + h}H${x + l}V${y + h * 0.2}H${x + l - e}V${y + h - e}H${x + e}V${y + h * 0.2}Z`;
      return (
        <g>
          <path d={c} className={`fill-surface-2 ${trait}`} strokeWidth="0.45" strokeLinejoin="round" />
          <Chaise x={cx} y={y + h - e - CHAISE.p / 2 - 0.6} rot={0} trait={trait} />
        </g>
      );
    }
    case 'local':
    case 'couloir': {
      const taille = corpsQuiTient(nom, l - 3, { max: Math.min(6, Math.max(2.8, petit / 4.5)), min: 1.5, chasse: 0.78 });
      return (
        <g>
          {forme === 'local' ? (
            <rect x={x} y={y} width={l} height={h} className={`fill-surface ${trait}`} fillOpacity="0.55" strokeWidth={FIN} strokeDasharray="1.6 1" />
          ) : (
            <>
              <rect x={x} y={y} width={l} height={h} className="fill-surface" fillOpacity="0.35" />
              <path d={l >= h ? `M${x} ${y}H${x + l}M${x} ${y + h}H${x + l}` : `M${x} ${y}V${y + h}M${x + l} ${y}V${y + h}`} {...ligne} strokeDasharray="1.6 1" />
            </>
          )}
          {taille > 0 && (
            <text x={cx} y={cy + taille * 0.35} textAnchor="middle" fontSize={r2(taille)} letterSpacing="0.2" className="fill-encre-3 pointer-events-none">
              {nom.toUpperCase()}
            </text>
          )}
        </g>
      );
    }
    default:
      return null;
  }
}

/** Les formes qui se posent AU SOL : dessinées sous le reste du mobilier. */
export const FORMES_AU_SOL = new Set(['local', 'couloir', 'tapis']);
