// Les projets eux-mêmes : lister, créer, renommer, dupliquer, supprimer,
// importer. Même mécanique que `publicApi.js` : le stockage, puis le cache.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projetNeuf } from '@/lib/local/depot';
import {
  depuisFichier, dupliquer, ecrireProjet, listerProjets, lireProjet, supprimerProjet, versFichier,
} from '@/lib/local/stockage';
import { cles, stockageCourant } from '@/lib/outils/equipe/publicApi';

export function useProjets() {
  return useQuery({ queryKey: cles.projets, queryFn: async () => listerProjets(stockageCourant()), staleTime: Infinity });
}

function useGeste(faire) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args) => faire(stockageCourant(), args),
    onSuccess: (_r, args) => {
      qc.invalidateQueries({ queryKey: cles.projets });
      if (args?.id) qc.invalidateQueries({ queryKey: cles.postes(args.id) });
    },
  });
}

export const useCreerProjet = () => useGeste((s, { nom } = {}) => ecrireProjet(s, projetNeuf(nom)));

export const useRenommerProjet = () => useGeste((s, { id, nom }) => {
  const p = lireProjet(s, id);
  if (!p) throw new Error('projet_inconnu');
  const n = String(nom || '').trim().slice(0, 80);
  if (!n) throw new Error('nom_requis');
  return ecrireProjet(s, { ...p, nom: n, modifie_le: new Date().toISOString() });
});

export const useDupliquerProjet = () => useGeste((s, { id }) => {
  const p = lireProjet(s, id);
  if (!p) throw new Error('projet_inconnu');
  return ecrireProjet(s, dupliquer(p));
});

export const useSupprimerProjet = () => useGeste((s, { id }) => { supprimerProjet(s, id); return { id }; });

export const useImporterProjet = () => useGeste((s, { texte }) => ecrireProjet(s, depuisFichier(texte, listerProjets(s))));

/** Le contenu du fichier d'export d'un projet. */
export function fichierDuProjet(id) {
  const p = lireProjet(stockageCourant(), id);
  if (!p) throw new Error('projet_inconnu');
  return { nom: p.nom, contenu: versFichier(p) };
}
