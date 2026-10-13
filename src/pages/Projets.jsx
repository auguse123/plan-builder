// L'accueil : les projets de cette machine.
//
// Un projet, c'est un lieu — un client, un immeuble — et jusqu'à six plans
// (étages). Tout reste dans ce navigateur : l'export en fichier est la seule
// sauvegarde, d'où sa place sur chaque ligne et le rappel en bas de page.
import React, { useRef, useState } from 'react';
import { Copy, Download, FolderOpen, Moon, Pencil, Plus, Sun, Trash2, Upload } from 'lucide-react';
import { Bouton, EnTetePage, Squelette, Surface, Vide } from '@/components/outils/primitives';
import { demander } from '@/lib/outils/confirmation';
import { telechargerFichier } from '@/lib/outils/fichier';
import { useTheme } from '@/lib/outils/theme';
import {
  fichierDuProjet, useCreerProjet, useDupliquerProjet, useImporterProjet, useProjets,
  useRenommerProjet, useSupprimerProjet,
} from '@/lib/local/projets';

const dateCourte = (iso) => {
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch { return ''; }
};
const nomDeFichier = (nom) => `${String(nom || 'projet').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'projet'}.plans.json`;

function LigneProjet({ p, onOuvrir }) {
  const [nom, setNom] = useState(null);
  const renommer = useRenommerProjet();
  const dupliquer = useDupliquerProjet();
  const supprimer = useSupprimerProjet();
  const valider = () => {
    if (nom !== null && nom.trim() && nom.trim() !== p.nom) renommer.mutate({ id: p.id, nom });
    setNom(null);
  };
  const exporter = () => {
    const f = fichierDuProjet(p.id);
    telechargerFichier(nomDeFichier(f.nom), f.contenu, 'application/json');
  };
  const effacer = async () => {
    const ok = await demander({
      titre: `Supprimer « ${p.nom} » ?`,
      texte: 'Le projet et ses plans quittent ce navigateur. Exportez-le d’abord si vous voulez le garder.',
      oui: 'Supprimer', danger: true,
    });
    if (ok) supprimer.mutate({ id: p.id });
  };
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <div className="min-w-0 grow basis-60">
        {nom !== null ? (
          <input
            autoFocus value={nom} maxLength={80}
            onChange={(e) => setNom(e.target.value)} onBlur={valider}
            onKeyDown={(e) => { if (e.key === 'Enter') valider(); if (e.key === 'Escape') setNom(null); }}
            aria-label="Nom du projet"
            className="w-full h-9 rounded-controle border px-2.5 text-corps bg-surface border-accent text-encre"
          />
        ) : (
          <button type="button" onClick={() => onOuvrir(p.id)} className="text-left w-full min-w-0">
            <span className="block text-corps font-medium text-encre truncate hover:text-accent">{p.nom}</span>
            <span className="block text-appui text-encre-3">
              {p.plans} plan{p.plans > 1 ? 's' : ''} · {p.postes} poste{p.postes > 1 ? 's' : ''} · modifié {dateCourte(p.modifie_le)}
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Bouton variante="neutre" taille="sm" icone={FolderOpen} onClick={() => onOuvrir(p.id)}>Ouvrir</Bouton>
        <Bouton variante="discret" taille="sm" iconeSeule icone={Pencil} aria-label={`Renommer ${p.nom}`} title="Renommer" onClick={() => setNom(p.nom)} />
        <Bouton variante="discret" taille="sm" iconeSeule icone={Download} aria-label={`Exporter ${p.nom}`} title="Exporter en fichier" onClick={exporter} />
        <Bouton variante="discret" taille="sm" iconeSeule icone={Copy} aria-label={`Dupliquer ${p.nom}`} title="Dupliquer" onClick={() => dupliquer.mutate({ id: p.id })} />
        <Bouton variante="discret" taille="sm" iconeSeule icone={Trash2} aria-label={`Supprimer ${p.nom}`} title="Supprimer" onClick={effacer} />
      </div>
    </li>
  );
}

export default function Projets({ onOuvrir }) {
  const projets = useProjets();
  const creer = useCreerProjet();
  const importer = useImporterProjet();
  const [theme, choisirTheme] = useTheme();
  const champFichier = useRef(null);
  const sombre = theme === 'sombre' || (theme === 'systeme' && document.documentElement.dataset.theme === 'sombre');

  const nouveau = () => creer.mutate({ nom: `Projet ${(projets.data?.length || 0) + 1}` }, { onSuccess: (p) => onOuvrir(p.id) });
  const lireFichier = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    importer.mutate({ texte: await f.text() }, { onSuccess: (p) => onOuvrir(p.id) });
  };

  const liste = projets.data || [];
  return (
    <div className="min-h-dvh bg-fond text-encre">
      <div className="max-w-[880px] mx-auto px-4 py-8 md:py-12">
        <EnTetePage
          sur="Desk to Desk"
          titre="Atelier de plans"
          meta="Dessinez et gérez les plans de vos bureaux : murs, portes, zones, postes, salles et mobilier."
          actions={<>
            <Bouton variante="discret" iconeSeule icone={sombre ? Sun : Moon} aria-label="Changer de thème" title="Clair / sombre" onClick={() => choisirTheme(sombre ? 'clair' : 'sombre')} />
            <Bouton variante="neutre" icone={Upload} onClick={() => champFichier.current?.click()}>Importer</Bouton>
            <Bouton variante="primaire" icone={Plus} onClick={nouveau} enCours={creer.isPending}>Nouveau projet</Bouton>
          </>}
        />
        <input ref={champFichier} type="file" accept=".json,application/json" className="hidden" onChange={lireFichier} />

        {projets.isPending ? <Squelette lignes={3} /> : liste.length === 0 ? (
          <Vide
            icone={FolderOpen}
            titre="Aucun projet sur cet appareil"
            texte="Créez un projet par lieu — un client, un immeuble. Chaque projet porte jusqu’à six plans (étages)."
            action={{ libelle: 'Créer un premier projet', onClick: nouveau, icone: Plus, primaire: true }}
          />
        ) : (
          <Surface padding={0}>
            <ul className="divide-y divide-ligne">
              {liste.map((p) => <LigneProjet key={p.id} p={p} onOuvrir={onOuvrir} />)}
            </ul>
          </Surface>
        )}

        <p className="mt-6 text-appui text-encre-3">
          Les projets restent dans ce navigateur, sur cet appareil. Exportez-les en fichier pour les sauvegarder ou les transmettre.
        </p>
      </div>
    </div>
  );
}
