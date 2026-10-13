// Champ numérique des outils : libellé au-dessus, unité en suffixe.
//
// Les flèches natives du champ nombre sont masquées : à cette densité elles
// chevauchaient le suffixe, et personne n'incrémente un loyer au m² clic par clic.
import React from 'react';
import { Bulle, Etiquette } from '@/components/outils/primitives';

export default function ChampNombre({
  label, valeur, onChange, unite = '', min = 0, max = undefined, pas = 1, aide = '',
  large = false, defaut = undefined,
}) {
  // Un champ laissé vide n'est pas « zéro » : le moteur y applique l'hypothèse.
  // L'afficher en gris évite de lire un blanc comme une absence de coût.
  //
  // `null` compte pour vide, et il FAUT le dire explicitement : `Number(null)`
  // vaut 0, donc le test de finitude seul le prenait pour une valeur saisie. Le
  // champ devenait alors un `<input value={null}>` — React s'en plaint, le
  // placeholder qui montre la valeur déduite ne s'affichait jamais.
  const vide = valeur === null || valeur === undefined || valeur === ''
    || !Number.isFinite(Number(valeur));
  return (
    <label className={`relative group flex flex-col gap-1.5 min-w-0 ${large ? 'col-span-2' : ''}`}>
      <Etiquette>{label}</Etiquette>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={vide ? '' : valeur}
          placeholder={vide && Number.isFinite(Number(defaut)) ? String(Math.round(Number(defaut))) : undefined}
          min={min}
          max={max}
          step={pas}
          onChange={(e) => {
            const v = e.target.value;
            // Champ vidé : on retient 0 plutôt que NaN, sinon le moteur reçoit
            // une valeur non finie et toute la série tombe.
            onChange(v === '' ? 0 : Number(v));
          }}
          className={`champ-nombre w-full h-8 rounded-controle border px-2.5 text-corps tabular-nums transition-colors duration-court ease-om bg-surface border-ligne text-encre focus:border-accent ${unite ? 'pr-9' : ''}`}
        />
        {unite && (
          <span
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-micro text-encre-3"
          >
            {unite}
          </span>
        )}
      </div>
      <Bulle texte={aide} />
    </label>
  );
}
