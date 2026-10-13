// L'hôte des annonces : un seul toast pour toute l'app (`lib/outils/annonces.js`).
//
// Posé au-dessus de la barre du bas sur téléphone, en bas au centre ailleurs.
// Une annonce avec action (« Annuler ») se touche : elle reçoit les clics ;
// une simple confirmation les laisse passer à travers.
import React from 'react';
import { useAnnonce } from '@/lib/outils/annonces';

export default function Annonces() {
  const a = useAnnonce();
  const echec = a?.type === 'echec';
  return (
    <div
      role="status"
      aria-live="polite"
      className="d2d-sans-impression fixed left-1/2 -translate-x-1/2 z-[60] pointer-events-none
        bottom-[calc(68px+env(safe-area-inset-bottom))] md:bottom-[max(16px,env(safe-area-inset-bottom))]"
    >
      {a && (
        <div
          key={a.id}
          className={`flex items-center gap-3 rounded-controle pl-4 ${a.action ? 'pr-1.5 py-1.5 pointer-events-auto' : 'pr-4 py-2.5'}
            text-corps font-medium shadow-flottant w-[calc(100vw-32px)] sm:w-max sm:max-w-[560px] animate-monte
            ${echec ? 'bg-danger text-fond' : 'bg-encre text-fond'}`}
        >
          <span className="min-w-0 flex-1">{a.texte}</span>
          {a.action && (
            <button
              type="button"
              onClick={a.action.faire}
              className="shrink-0 h-8 px-3 rounded-interne font-semibold text-fond underline-offset-2 hover:underline focus-visible:outline-fond"
            >
              {a.action.libelle}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
