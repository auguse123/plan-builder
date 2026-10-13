// Un projet ouvert : l'éditeur de plan, en plein écran.
//
// Même rôle que l'`OngletPlan` de « Qui vient au bureau » en mode dessin : lire
// la vue, choisir le plan, ne passer à l'éditeur que ce qui est sur ce plan
// (ce qui n'a pas de plan appartient au premier, le seul endroit où on le
// retrouve).
import React, { Suspense, lazy, useState } from 'react';
import { Etat, SqueletteEcran } from '@/components/outils/primitives';
import { omErreurMessage, usePostes } from '@/lib/outils/equipe/publicApi';
import { useProjets } from '@/lib/local/projets';

const PlanPostes = lazy(() => import('@/components/outils/equipe/public/PlanPostes'));

export default function Atelier({ projetId, onFermer }) {
  const vue = usePostes(projetId);
  const projets = useProjets();
  const [planChoisi, setPlanChoisi] = useState('');
  const nom = projets.data?.find((p) => p.id === projetId)?.nom || 'Projet';

  let corps;
  if (vue.isPending) corps = <SqueletteEcran lignes={6} />;
  else if (vue.error) {
    corps = (
      <Etat
        variante="erreur" titre="Projet introuvable" texte={omErreurMessage(vue.error)}
        action={{ libelle: 'Revenir aux projets', onClick: onFermer }}
      />
    );
  } else {
    const plans = vue.data.plans || [];
    const actif = plans.find((p) => p.id === planChoisi) || plans[0];
    const premier = plans[0]?.id === actif?.id;
    const dActif = (o) => (o?.plan_id ? o.plan_id === actif.id : premier);
    corps = (
      <Suspense fallback={<SqueletteEcran lignes={6} />}>
        <PlanPostes
          titre={nom}
          onTerminer={onFermer}
          jeton={projetId}
          zones={(vue.data.zones || []).filter(dActif)}
          salles={(vue.data.salles || []).filter(dActif)}
          postes={(vue.data.postes || []).filter(dActif)}
          plan={actif}
          plans={plans}
          onChoisirPlan={setPlanChoisi}
          membres={[]}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-dvh bg-fond text-encre lg:h-dvh lg:overflow-hidden flex flex-col">
      <main className="flex-1 min-h-0 flex flex-col px-3 py-3 md:px-4">{corps}</main>
    </div>
  );
}
