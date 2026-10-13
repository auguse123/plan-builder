// L'Atelier de plans : une liste de projets, et l'éditeur.
//
// Pas de routeur : deux écrans, et l'adresse les dit (`#/projet/<id>`), pour
// que le bouton Retour du navigateur ramène à la liste et qu'un projet se
// rouvre au rechargement.
import React, { useEffect, useState } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Annonces from '@/components/outils/Annonces';
import Confirmation from '@/components/outils/Confirmation';
import { annoncer } from '@/lib/outils/annonces';
import { omErreurMessage } from '@/lib/outils/equipe/publicApi';
import { useTheme } from '@/lib/outils/theme';
import Projets from '@/pages/Projets';
import Atelier from '@/pages/Atelier';

const client = new QueryClient({
  // Chaque écriture s'annonce : « Enregistré », ou le refus en clair.
  mutationCache: new MutationCache({
    onSuccess: (_d, _v, _c, m) => { if (!m.meta?.silencieuse) annoncer({ texte: 'Enregistré', faible: true }); },
    onError: (e, _v, _c, m) => { if (!m.meta?.silencieuse) annoncer({ texte: omErreurMessage(e), type: 'echec' }); },
  }),
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

const projetDeLAdresse = () => (window.location.hash.match(/^#\/projet\/([0-9a-f-]{36})$/i) || [])[1] || '';

export default function App() {
  useTheme();
  const [projetId, setProjetId] = useState(projetDeLAdresse);
  useEffect(() => {
    const suivre = () => setProjetId(projetDeLAdresse());
    window.addEventListener('hashchange', suivre);
    return () => window.removeEventListener('hashchange', suivre);
  }, []);
  const ouvrir = (id) => { window.location.hash = id ? `#/projet/${id}` : '#/'; };

  return (
    <QueryClientProvider client={client}>
      {projetId
        ? <Atelier projetId={projetId} onFermer={() => ouvrir('')} />
        : <Projets onOuvrir={ouvrir} />}
      <Annonces />
      <Confirmation />
    </QueryClientProvider>
  );
}
