// L'hôte des questions (`lib/outils/confirmation.js`) : une fenêtre de l'app,
// pas la boîte grise du navigateur. Échap ou un clic à côté répondent « non ».
import React, { useEffect, useRef } from 'react';
import { questionCourante, useQuestion } from '@/lib/outils/confirmation';
import { Bouton, usePiegeFocus } from '@/components/outils/primitives';

export default function Confirmation() {
  const q = useQuestion();
  const panneau = useRef(null);
  const oui = useRef(null);
  usePiegeFocus(panneau, !!q);
  useEffect(() => {
    if (!q) return undefined;
    const avant = document.activeElement;
    oui.current?.focus();
    const surTouche = (e) => { if (e.key === 'Escape') { e.stopPropagation(); questionCourante()?.repondre(false); } };
    window.addEventListener('keydown', surTouche, true);
    return () => { window.removeEventListener('keydown', surTouche, true); avant?.focus?.(); };
  }, [q]);
  if (!q) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-voile animate-fondu"
      onMouseDown={(e) => { if (e.target === e.currentTarget) q.repondre(false); }}
    >
      <div
        ref={panneau}
        role="alertdialog" aria-modal="true" aria-labelledby="om-question-titre"
        aria-describedby={q.texte ? 'om-question-texte' : undefined}
        className="w-full max-w-[420px] rounded-surface border p-5 shadow-flottant bg-surface border-ligne animate-monte"
      >
        <h2 id="om-question-titre" className="text-corps font-semibold text-encre">{q.titre}</h2>
        {q.texte && <p id="om-question-texte" className="mt-1.5 text-appui text-encre-2">{q.texte}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Bouton variante="discret" onClick={() => q.repondre(false)}>{q.non}</Bouton>
          <Bouton ref={oui} variante={q.danger ? 'danger' : 'primaire'} onClick={() => q.repondre(true)}>{q.oui}</Bouton>
        </div>
      </div>
    </div>
  );
}
