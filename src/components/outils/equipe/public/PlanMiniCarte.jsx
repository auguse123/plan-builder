/**
 * La mini-carte : toute la feuille en vignette, et la fenêtre qu'on regarde.
 *
 * ZOOMÉ SUR UN ANGLE DE CLOISON, ON NE SAIT PLUS OÙ L'ON EST. La vignette
 * montre murs et objets en gris, la fenêtre en teinte ; un clic y recentre,
 * un glissé y promène la vue. Elle ne sert qu'au zoom : à ×1 la vue EST la
 * feuille, l'écran le montre déjà.
 */
import React, { useRef, useState } from 'react';
import { cadre, versPlan } from '@/lib/outils/equipe/plan';

export default function PlanMiniCarte({
  plan, vue, murs = [], boites = [], onCentrer = () => {},
}) {
  const ref = useRef(null);
  const [tire, setTire] = useState(false);
  const feuille = { x: 0, y: 0, largeur: plan.largeur, hauteur: plan.hauteur };
  // Un trait lisible à la taille de la vignette, quelle que soit la feuille.
  const trait = Math.max(plan.largeur, plan.hauteur) / 110;
  const viser = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) onCentrer(versPlan({ x: e.clientX, y: e.clientY }, r, feuille));
  };
  return (
    <svg
      ref={ref}
      viewBox={cadre(feuille)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Mini-carte : cliquez ou tirez pour recentrer la vue"
      className="block w-44 h-28 cursor-crosshair touch-none select-none"
      onPointerDown={(e) => {
        e.stopPropagation();
        ref.current?.setPointerCapture?.(e.pointerId);
        setTire(true);
        viser(e);
      }}
      onPointerMove={(e) => { if (tire) viser(e); }}
      onPointerUp={() => setTire(false)}
      onPointerCancel={() => setTire(false)}
    >
      <rect x="0" y="0" width={plan.largeur} height={plan.hauteur} className="fill-surface-2" />
      {boites.map((b, i) => (
        <rect
          key={i} x={b.x} y={b.y} width={b.l} height={b.h}
          fillOpacity={0.35} className="fill-encre-3"
        />
      ))}
      {murs.map((m, i) => (
        <polyline
          key={i} points={(m || []).map((p) => p.join(',')).join(' ')}
          fill="none" strokeWidth={trait} className="stroke-encre-2"
        />
      ))}
      <rect
        x={vue.x} y={vue.y} width={vue.largeur} height={vue.hauteur}
        fillOpacity={0.12} strokeWidth={trait * 1.2}
        className="fill-accent stroke-accent-vif"
      />
    </svg>
  );
}
