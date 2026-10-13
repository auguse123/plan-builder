/**
 * Imprimer le plan à l'échelle : le panneau qui choisit, la feuille qui sort.
 *
 * LA FEUILLE EST UN CLONE DU DESSIN, pas un second dessin : au moment
 * d'imprimer, le contenu du SVG de l'écran est recopié dans un SVG dimensionné
 * en MILLIMÈTRES (`feuille.js`), cadré sur ce qui est dessiné. Les classes
 * restent : `@media print` repeint la palette en encre sur blanc.
 *
 * ELLE VIT DANS `body`, PAR UN PORTAIL. La règle d'impression pose le bloc
 * visé en `position: absolute; top: 0` — dans le panneau du plan, il partirait
 * du haut du panneau, pas de la page. La règle `@page` (format, sens) n'existe
 * que tant que le panneau est ouvert.
 */
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { Bouton, Segmente } from '@/components/outils/primitives';
import { useImpression } from '@/lib/outils/impression';
import {
  CARTOUCHE, ECHELLES, FORMATS, barreEchelle, miseEnPage, reglePage,
} from '@/lib/outils/equipe/feuille';

const virgule = (n) => String(n).replace('.', ',');

export default function PlanImpression({ svgRef, boite, nomPlan, avantImpression }) {
  const [format, setFormat] = useState('A4');
  const [echelle, setEchelle] = useState(100);
  const [papier, lancer] = useImpression();
  const encre = useRef(null);
  const page = miseEnPage(boite, { format, echelle });
  const barre = barreEchelle(echelle, 60);
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const imprimerPlan = async () => {
    if (avantImpression) await avantImpression();
    const svg = svgRef.current;
    const g = encre.current;
    if (!svg || !g || !page.tient) return;
    const clone = svg.cloneNode(true);
    // La grille aide à poser, elle salit une planche : elle reste à l'écran.
    clone.querySelectorAll('pattern, [fill="url(#om-grille)"]').forEach((n) => n.remove());
    g.innerHTML = clone.innerHTML;
    try { lancer(); } finally { g.innerHTML = ''; }
  };

  const feuille = boite && typeof document !== 'undefined' ? createPortal(
    <div ref={papier} className="d2d-imprimable hidden print:block bg-papier text-papier-encre">
      <style>{reglePage(page)}</style>
      <div
        className="flex items-center justify-center"
        style={{ width: `${page.zone.l}mm`, height: `${page.zone.h}mm` }}
      >
        <svg
          viewBox={`${boite.x} ${boite.y} ${boite.l} ${boite.h}`}
          style={{ width: `${page.dessin.l}mm`, height: `${page.dessin.h}mm` }}
        >
          <g ref={encre} />
        </svg>
      </div>
      <div
        className="flex items-end justify-between gap-4 border-t border-papier-ligne pt-2"
        style={{ width: `${page.zone.l}mm`, height: `${CARTOUCHE}mm` }}
      >
        <div>
          <p className="text-section font-semibold text-papier-encre">{nomPlan || 'Plan du bureau'}</p>
          <p className="text-micro text-papier-encre-2">
            {date} · {page.format} · échelle 1:{page.echelle}
          </p>
        </div>
        {barre && (
          <svg
            viewBox={`-2 0 ${barre.mm + 8} 9`}
            style={{ width: `${barre.mm + 10}mm`, height: '9mm' }}
            aria-label={`Barre d’échelle : ${virgule(barre.metres)} m`}
          >
            {barre.pas.slice(1).map((m, i) => {
              const x0 = (barre.pas[i] * 1000) / echelle;
              const x1 = (m * 1000) / echelle;
              return (
                <rect
                  key={m} x={x0} y="1" width={x1 - x0} height="1.6" strokeWidth="0.2"
                  className={`stroke-papier-encre ${i % 2 ? 'fill-papier' : 'fill-papier-encre'}`}
                />
              );
            })}
            {barre.pas.map((m) => (
              <text
                key={m} x={(m * 1000) / echelle} y="6.2" textAnchor="middle" fontSize="2.6"
                className="fill-papier-encre"
              >
                {virgule(m)}{m === barre.metres ? ' m' : ''}
              </text>
            ))}
          </svg>
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <p className="text-micro text-encre mb-2">Imprimer à l’échelle</p>
      <div className="space-y-2">
        <Segmente
          plein taille="sm" valeur={format} onChange={setFormat}
          options={Object.keys(FORMATS).map((f) => ({ v: f, l: f }))}
        />
        <Segmente
          plein taille="sm" valeur={echelle} onChange={setEchelle}
          options={ECHELLES.map((e) => ({ v: e, l: `1:${e}` }))}
        />
      </div>
      {!boite ? (
        <p className="mt-2 text-micro text-encre-3">Rien n’est dessiné : il n’y a rien à imprimer.</p>
      ) : page.tient ? (
        <p className="mt-2 text-micro text-encre-3 tabular-nums">
          {page.orientation === 'portrait' ? 'Portrait' : 'Paysage'} · le dessin fait
          {' '}{Math.round(page.dessin.l)} × {Math.round(page.dessin.h)} mm sur la feuille.
          Imprimez à 100 %, sans « ajuster à la page ».
        </p>
      ) : (
        <p className="mt-2 text-micro text-alerte">
          Le dessin ne tient pas en {page.format} au 1:{page.echelle}
          {page.conseil ? ` : passez en ${page.conseil.format} au 1:${page.conseil.echelle}.` : ', même au 1:200 en A3.'}
          {page.conseil && (
            <Bouton
              variante="discret" taille="sm" className="ml-1"
              onClick={() => { setFormat(page.conseil.format); setEchelle(page.conseil.echelle); }}
            >
              Appliquer
            </Bouton>
          )}
        </p>
      )}
      <Bouton
        variante="neutre" taille="md" icone={Printer} pleineLargeur className="mt-3"
        disabled={!boite || !page.tient} onClick={imprimerPlan}
      >
        Imprimer
      </Bouton>
      {feuille}
    </>
  );
}
