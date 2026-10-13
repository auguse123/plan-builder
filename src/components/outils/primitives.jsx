// Primitives visuelles des outils autonomes (comparateur, gestionnaire d'équipe).
//
// Elles existent pour une raison d'épure, pas de factorisation : l'écran avait
// quatre sélecteurs segmentés dessinés quatre fois, huit tuiles encadrées et six
// cartes bordées empilées. Tout se ressemblait, donc rien ne ressortait. Ici,
// UNE grammaire : un segmenté, un libellé, un repli, un tableau comparatif —
// et le fond blanc réservé aux deux vrais objets (les réglages, le graphique).
//
// Depuis C3, plus une seule couleur en style en ligne : les tons passent par les
// utilitaires Tailwind adossés aux jetons `--om-*`. Un style en ligne redéfinit
// un gris sans que personne ne le voie ; une classe, elle, casse au build si le
// jeton disparaît. Ne remettez pas de `style={{ color: … }}` ici.
import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Loader2, MoreHorizontal, Plus, Search } from 'lucide-react';

/**
 * Bulle d'aide. À poser dans un parent portant `relative group`.
 *
 * Remplace l'attribut `title` natif, qui n'était pas à la hauteur de la promesse
 * faite à l'écran : une seconde et demie d'attente, un rendu système hors charte,
 * rien au clavier et rien au tactile. Ici : apparition après 200 ms de survol OU
 * au focus du champ, donc accessible à la tabulation et sur téléphone.
 *
 * C'est ce qui permet de vider l'écran de ses paragraphes explicatifs : l'aide
 * n'a pas disparu, elle est au bout du curseur.
 */
export function Bulle({ texte }) {
  // La bulle part du bord gauche de son ancre. Sur téléphone, une ancre située
  // dans la colonne de droite la pousse hors de l'écran : elle reste invisible
  // tant qu'on ne survole pas, mais elle ÉLARGIT la page, qui se met à défiler
  // latéralement. On la ramène donc du nombre exact de pixels qui dépassent,
  // sans jamais la faire sortir par la gauche. Mesuré, pas deviné : basculer
  // bêtement l'accroche à droite déplace le problème d'un bord à l'autre.
  // Le décalage s'écrit sur le nœud plutôt que dans un état : c'est une mesure,
  // pas une donnée de rendu, et elle ne doit pas rouvrir la porte au style
  // en ligne que ce fichier vient de fermer.
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const ancre = el?.offsetParent;
    if (!el || !ancre) return undefined;
    const placer = () => {
      const { left } = ancre.getBoundingClientRect();
      const marge = 8;
      const deborde = left + el.offsetWidth - (window.innerWidth - marge);
      el.style.marginLeft = deborde > 0 ? `${-Math.min(deborde, Math.max(0, left - marge))}px` : '0px';
    };
    placer();
    window.addEventListener('resize', placer);
    return () => window.removeEventListener('resize', placer);
  }, [texte]);

  if (!texte) return null;
  return (
    <span
      ref={ref}
      role="tooltip"
      className="pointer-events-none absolute z-40 left-0 top-full mt-1.5 w-[250px] max-w-[calc(100vw-24px)] rounded-surface border border-ligne bg-surface text-encre-2 shadow-flottant px-2.5 py-2 text-micro leading-snug whitespace-pre-line opacity-0 translate-y-[-2px] transition duration-moyen ease-om delay-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0"
    >
      {texte}
    </span>
  );
}

/** Petit libellé de champ, toujours au même gris et à la même taille. */
export function Etiquette({ children, className = '' }) {
  return (
    <span className={`text-micro font-medium leading-none text-encre-3 ${className}`}>
      {children}
    </span>
  );
}

/**
 * Sélecteur segmenté. Un seul dessin pour l'horizon, la trajectoire, l'unité du
 * plan et la bascule coût/trésorerie.
 * `options` : [{ v, l, title? }]
 */
export function Segmente({ options, valeur, onChange, taille = 'md', plein = false, replie = '' }) {
  // `replie` (le nom du choix) : sous 640 px, une liste déroulante prend la
  // place. Cinq ou six segments font plus large qu'un téléphone.
  if (replie) {
    return (
      <>
        <Selecteur
          className="sm:hidden w-full" taille={taille} valeur={valeur} onChange={onChange}
          aria-label={replie} options={options}
        />
        <div className="hidden sm:block">
          <Segmente options={options} valeur={valeur} onChange={onChange} taille={taille} plein={plein} />
        </div>
      </>
    );
  }
  // `plein` : les cellules se partagent la largeur à parts égales. Sans lui, quatre
  // libellés dans une colonne de 336 px passaient à la ligne — ce qui se lit comme
  // une casse d'affichage, pas comme un choix.
  // En mode plein, la cellule la plus longue commande : on descend d'un cran de
  // corps pour que « Sur mesure » tienne sans se faire tronquer, tout en gardant
  // la hauteur de 32 px (cible tactile).
  // Les cellules sont d'un cran plus basses que le cadre : la bordure et le
  // jour de 2 px ramènent l'ensemble à la hauteur d'un bouton de même taille.
  const h = taille === 'sm' ? 'h-[22px] text-appui' : `h-[26px] ${plein ? 'text-appui' : 'text-corps'}`;
  const large = plein ? 'flex-1 min-w-0 px-1' : (taille === 'sm' ? 'px-2.5' : 'px-3');
  return (
    <div
      className={`${plein ? 'flex w-full' : 'inline-flex'} rounded-controle border border-ligne bg-fond p-0.5 gap-0.5`}
      role="group"
    >
      {options.map((o) => {
        const actif = valeur === o.v;
        return (
          <button
            key={o.v}
            type="button"
            title={o.title}
            aria-pressed={actif}
            onClick={() => onChange(o.v)}
            className={`${h} ${large} rounded-interne font-medium whitespace-nowrap truncate
              transition-colors duration-court ease-om
              ${actif ? 'bg-surface-2 text-encre shadow-pose' : 'text-encre-3 hover:text-encre'}`}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

/** Section repliable : un titre discret, un compteur facultatif, un chevron. */
export function Repli({ titre, compteur = null, children, ouvertParDefaut = false }) {
  const [ouvert, setOuvert] = useState(ouvertParDefaut);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
        className="group flex items-center gap-2 py-1.5 -mx-1 px-1 rounded-controle w-full text-left"
      >
        <span className="text-corps font-medium text-encre-2">{titre}</span>
        {compteur != null && (
          <span className="text-appui tabular-nums text-encre-3">{compteur}</span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-encre-3 transition-transform duration-moyen ease-om ${ouvert ? 'rotate-180' : ''}`}
        />
      </button>
      {ouvert && <div className="pt-2 animate-fondu">{children}</div>}
    </section>
  );
}

/**
 * Tableau comparatif : lignes = mesures, colonnes = offres.
 *
 * C'est LA forme de l'écran : les chiffres clés, les trajectoires et le détail
 * du coût la partagent, si bien qu'on apprend à lire une fois pour trois blocs.
 * `colonnes` : [{ id, nom, couleur }] · `lignes` : [{ cle, label, sous?, valeurs: {id: node}, fort?, gagnant?, actif? }]
 */
// Assez étroit pour que DEUX offres tiennent sans défilement sur un téléphone :
// un chiffre clé coupé au premier coup d'œil ne vaut rien. Une table de classes
// plutôt qu'un calcul : Tailwind ne génère que ce qu'il lit dans le source.
const TABLEAU_LAIZE = {
  1: 'min-w-[268px]', 2: 'min-w-[356px]', 3: 'min-w-[444px]', 4: 'min-w-[532px]',
};

export function TableauComparatif({ colonnes, lignes, enTete = true }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className={`w-full text-corps ${TABLEAU_LAIZE[colonnes.length] || 'min-w-[620px]'}`}>
        {enTete && (
          <thead>
            <tr>
              <th className="w-full" />
              {colonnes.map((c) => (
                <th key={c.id} className="text-right pb-2 pl-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 text-encre-2">
                    {/* La pastille porte une couleur de DONNÉE (la série de l'offre) :
                        un attribut SVG, pas un style en ligne. */}
                    <svg width={6} height={6} aria-hidden="true"><circle cx={3} cy={3} r={3} fill={c.couleur} /></svg>
                    <span className="truncate max-w-[150px]">{c.nom}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {lignes.map((l) => (
            <tr
              key={l.cle}
              className={`border-t border-ligne ${l.actif ? 'bg-accent-doux' : ''}`}
            >
              <td className="py-2 pr-3 align-top rounded-l-controle">
                <span
                  className={`relative inline-block ${l.sous ? 'group cursor-help' : ''} ${l.fort ? 'text-encre font-semibold' : 'text-encre-2'}`}
                  tabIndex={l.sous ? 0 : undefined}
                >
                  {l.label}
                  <Bulle texte={l.sous} />
                </span>
              </td>
              {colonnes.map((c) => {
                const gagne = l.gagnant === c.id;
                return (
                  <td
                    key={c.id}
                    className={`py-2 pl-4 text-right align-top tabular-nums whitespace-nowrap last:rounded-r-controle last:pr-2 text-encre ${gagne || l.fort ? 'font-semibold' : ''}`}
                  >
                    {l.valeurs[c.id]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Menu « ajouter » : un bouton discret, une liste de choix décrits.
 *
 * Écrit ici plutôt que repris du menu déroulant de l'app pour deux raisons :
 * la page est un outil autonome qu'on veut pouvoir publier avec le moins de
 * dépendances possible, et quatre puces de modèles alignées sous le panneau
 * pesaient plus lourd à l'œil que ce qu'elles servaient une fois la comparaison
 * lancée.
 */
export function MenuAjout({ libelle, items, onChoisir }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef(null);

  useEffect(() => {
    if (!ouvert) return undefined;
    const surClic = (e) => { if (boite.current && !boite.current.contains(e.target)) setOuvert(false); };
    const surTouche = (e) => { if (e.key === 'Escape') setOuvert(false); };
    document.addEventListener('mousedown', surClic);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('mousedown', surClic);
      document.removeEventListener('keydown', surTouche);
    };
  }, [ouvert]);

  return (
    <div className="relative" ref={boite}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-controle text-corps font-medium text-encre-2 transition-colors duration-court ease-om hover:bg-surface-2 hover:text-encre"
      >
        <Plus className="w-3.5 h-3.5" />
        {libelle}
      </button>

      {ouvert && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-20 rounded-surface border border-ligne bg-surface p-1 shadow-flottant animate-surgit"
          role="menu"
        >
          {items.map((it) => (
            <button
              key={it.cle}
              type="button"
              role="menuitem"
              onClick={() => { onChoisir(it.cle); setOuvert(false); }}
              className="w-full text-left px-2.5 py-2 rounded-controle transition-colors duration-court ease-om hover:bg-surface-2"
            >
              <span className="block text-corps font-medium text-encre">{it.label}</span>
              <span className="block text-micro leading-snug mt-0.5 text-encre-3">{it.aide}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Menu « ⋯ » : les gestes secondaires d'un écran, repliés derrière un bouton.
 *
 * Une barre d'outils ne porte qu'un bouton plein ; le reste descend ici. Sur un
 * téléphone, six boutons se cassaient sur trois lignes et cachaient le tableau
 * — replié, c'est une pastille de trente-deux pixels.
 *
 * Le menu s'ouvre sous son bouton et s'aligne à DROITE : il naît au bord droit
 * de la barre, un panneau aligné à gauche sortirait de l'écran. Les flèches le
 * parcourent, `Échap` le ferme et rend le clavier au bouton — sinon le focus
 * retomberait sur `body` et la tabulation repartirait du haut de la page.
 */
export function MenuSecondaire({ items, onChoisir, libelle = 'Autres actions' }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef(null);
  // `Bouton` ne transmet pas de `ref` : on retrouve le déclencheur par son rôle,
  // il est seul de son espèce dans la boîte.
  const declencheur = () => boite.current?.querySelector('[aria-haspopup="menu"]');

  useEffect(() => {
    if (!ouvert) return undefined;
    const surClic = (e) => { if (boite.current && !boite.current.contains(e.target)) setOuvert(false); };
    document.addEventListener('mousedown', surClic);
    return () => document.removeEventListener('mousedown', surClic);
  }, [ouvert]);

  const auClavier = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOuvert(false);
      declencheur()?.focus();
      return;
    }
    const sens = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!sens) return;
    e.preventDefault();
    const entrees = [...(boite.current?.querySelectorAll('[role="menuitem"]') || [])];
    const i = entrees.indexOf(document.activeElement);
    const cible = entrees[(i + sens + entrees.length) % entrees.length];
    cible?.focus();
  };

  return (
    <div className="relative" ref={boite} onKeyDown={auClavier}>
      <Bouton
        icone={MoreHorizontal}
        iconeSeule
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label={libelle}
        title={libelle}
        onClick={() => setOuvert((v) => !v)}
      />

      {ouvert && (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-surface border border-ligne bg-surface p-1 shadow-flottant animate-surgit"
          role="menu"
        >
          {items.map((it) => (
            <button
              key={it.cle}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              title={it.aide}
              onClick={() => { setOuvert(false); onChoisir(it.cle); }}
              className={`w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-controle text-corps text-encre
                transition-colors duration-court ease-om
                ${it.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface-2'}`}
            >
              {it.icone ? <it.icone className="w-3.5 h-3.5 shrink-0 text-encre-3" aria-hidden="true" /> : null}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const NIVEAUX = {
  net: { mot: 'Net', trait: 'var(--om-accent)', encre: 'text-accent' },
  serre: { mot: 'Serré', trait: 'var(--om-alerte)', encre: 'text-alerte' },
  bruit: { mot: 'Trop serré', trait: 'var(--om-alerte)', encre: 'text-alerte' },
};

/**
 * Jauge de robustesse : le résultat résiste-t-il à ±25 % sur les valeurs estimées ?
 *
 * Un dessin plutôt qu'un paragraphe : une bande (la fourchette possible), un
 * repère à zéro (la bascule), un point (la valeur calculée). Quand la bande
 * traverse le repère, le verdict peut s'inverser — ça se voit d'un coup d'œil, là
 * où trois phrases se feraient sauter.
 *
 * `bascule` / `tient` disent ce que la traversée du zéro signifie POUR CET OUTIL :
 * un classement qui s'inverse chez le comparateur, une opération qui devient
 * déficitaire chez le simulateur de sous-location. Le dessin, lui, ne change pas.
 */
export function JaugeRobustesse({
  robustesse, format,
  bascule = 'le classement peut s’inverser',
  tient = 'le classement tient',
  quantite = "l'écart",
}) {
  if (!robustesse) return null;
  const { ecart, min, max, franchitZero, niveau, amplitude } = robustesse;
  const n = NIVEAUX[niveau] || NIVEAUX.net;

  const L = 148;
  const lo = Math.min(0, min);
  const hi = Math.max(0, max, ecart);
  const etendue = (hi - lo) || 1;
  const x = (v) => 2 + ((v - lo) / etendue) * (L - 4);

  const titre = franchitZero
    ? `À ±${Math.round(amplitude * 100)} % sur les prix estimés, ${quantite} va de ${format(min)} à ${format(max)} : ${bascule}.`
    : `À ±${Math.round(amplitude * 100)} % sur les prix estimés, ${quantite} reste entre ${format(min)} et ${format(max)} : ${tient}.`;

  return (
    <span className="inline-flex items-center gap-2 align-middle" title={titre}>
      <svg width={L} height={14} role="img" aria-label={titre} className="overflow-visible">
        <line x1={2} y1={7} x2={L - 2} y2={7} stroke="var(--om-ligne)" strokeWidth={2} strokeLinecap="round" />
        <rect
          x={Math.min(x(min), x(max))} y={4} rx={3}
          width={Math.max(3, Math.abs(x(max) - x(min)))} height={6}
          fill={n.trait} fillOpacity={0.28}
        />
        <line x1={x(0)} y1={0} x2={x(0)} y2={14} stroke="var(--om-encre-3)" strokeWidth={1} />
        <circle cx={x(ecart)} cy={7} r={3.5} fill={n.trait} stroke="var(--om-surface)" strokeWidth={1.5} />
      </svg>
      <span className={`text-appui font-medium whitespace-nowrap ${n.encre}`}>{n.mot}</span>
    </span>
  );
}

/** Largeur mesurée d'un conteneur : les dessins SVG en ont besoin pour placer
 *  leur texte sans le déformer. Rend `{ ref, largeur }`. */
export function useLargeur() {
  const ref = useRef(null);
  const [largeur, setLargeur] = useState(0);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setLargeur(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, largeur };
}

// ————————————————————————————————————————————————————————————————————————
// LA GRAMMAIRE DES CONTRÔLES
//
// Avant : chaque écran redessinait ses boutons à la main — dix-sept `h-9`
// dans la seule liste du classeur, trente-six styles inline dans la liste
// d'équipe, trois hauteurs et quatre grises différentes pour le même geste.
// Rien de tout cela n'était un choix : c'était la trace de l'ordre dans lequel
// les écrans ont été écrits. Un client qui paie des centaines d'euros par mois
// voit la différence entre un produit et une accumulation d'écrans.
//
// Ici, un dessin par geste. L'anneau de focus n'est PAS redéfini composant par
// composant : `:focus-visible` dans `index.css` le pose pour tout le monde, et
// c'est ce qui garantit qu'il est identique partout.
//
// Ce fichier ne connaît ni Supabase ni les entités : les calculateurs
// l'importent, et leur chunk ne doit pas tirer le client de base. D'où `Etat`
// qui reçoit un `texte` déjà traduit plutôt qu'un objet d'erreur.

// Quatre hauteurs, pas cinq : `xl` est la cible tactile de 44 px, celle des
// écrans de réglages en mobile, où le bouton se pose au bout d'un champ de la
// même hauteur. Ailleurs, `lg` suffit.
const BOUTON_TAILLES = {
  sm: 'h-7 px-2.5 text-appui gap-1.5',
  md: 'h-8 px-3 text-corps gap-1.5',
  lg: 'h-10 px-4 text-corps gap-2',
  xl: 'h-11 px-4 text-corps gap-2',
};
const BOUTON_ICONE_SEULE = { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-10 w-10', xl: 'h-11 w-11' };

// Quatre variantes, et une seule qui remplit : le plein est le budget d'attention
// de l'écran. Voir le garde-fou plus bas.
const BOUTON_VARIANTES = {
  primaire: 'bg-accent text-fond font-semibold border-accent shadow-pose hover:bg-accent-vif hover:border-accent-vif',
  danger: 'bg-surface text-danger border-ligne hover:bg-danger/10 hover:border-danger/40',
  discret: 'bg-transparent text-encre-2 border-transparent hover:bg-surface-2 hover:text-encre',
  neutre: 'bg-surface text-encre border-ligne shadow-pose hover:bg-surface-2 hover:border-encre-3/40',
};

// L'état enfoncé d'une bascule (un menu ouvert, un filtre actif). Il vit dans sa
// propre table plutôt qu'en classe ajoutée par l'appelant : deux `bg-` dans le
// même `className` laissent l'ordre du CSS décider, et il ne décide pas comme on
// croit. Purement visuel — l'`aria-expanded` ou l'`aria-pressed` reste à l'appelant,
// qui seul sait si la bascule ouvre un tiroir ou retient un choix.
const BOUTON_ENFONCE = {
  discret: 'bg-fond text-encre border-transparent hover:bg-fond',
  neutre: 'bg-fond text-encre border-ligne hover:bg-fond',
};

// Garde-fou de développement : deux boutons pleins à l'écran, c'est deux gestes
// principaux, donc aucun. Il compte les `primaire` montés en même temps et crie
// une fois — il ne casse rien, et il disparaît du bundle de production.
let pleinsMontes = 0;
function useUnSeulPlein(actif) {
  useEffect(() => {
    if (!import.meta.env.DEV || !actif) return undefined;
    pleinsMontes += 1;
    if (pleinsMontes > 1) {
      console.warn(
        `[primitives] ${pleinsMontes} boutons « primaire » montés en même temps. ` +
        'Un seul geste plein par vue : les autres passent en « neutre » ou dans ⌘K.',
      );
    }
    return () => { pleinsMontes -= 1; };
  }, [actif]);
}

/**
 * Bouton. Quatre variantes, trois hauteurs, et c'est tout.
 *
 * `enCours` désactive SANS changer le libellé : remplacer « Enregistrer » par
 * « Enregistrement… » fait sauter la largeur du bouton sous le curseur, et on
 * ne sait plus ce qu'on a cliqué. L'attente se dit par l'opacité et le curseur.
 *
 * Il porte un `ref` : sans lui, un bouton qui ouvre un menu ne pouvait pas être
 * mesuré ni rendu son focus à la fermeture, et l'appelant retombait sur un
 * `<button>` brut — c'est ainsi qu'on se retrouve avec deux cents boutons qui
 * ne partagent ni leur `active:scale`, ni leur `aria-busy`, ni leurs coins.
 */
export const Bouton = React.forwardRef(function Bouton({
  variante = 'neutre', taille = 'md', icone: Icone, iconeSeule = false,
  enCours = false, pleineLargeur = false, enfonce = false, type = 'button',
  disabled = false, className = '', style, children, ...reste
}, ref) {
  const inactif = disabled || enCours;
  const dim = iconeSeule ? BOUTON_ICONE_SEULE[taille] : BOUTON_TAILLES[taille];
  const tons = (enfonce && BOUTON_ENFONCE[variante]) || BOUTON_VARIANTES[variante] || BOUTON_VARIANTES.neutre;
  const grosseIcone = taille === 'lg' || taille === 'xl';
  useUnSeulPlein(variante === 'primaire');
  return (
    <button
      ref={ref}
      type={type}
      disabled={inactif}
      aria-busy={enCours || undefined}
      className={`inline-flex items-center justify-center shrink-0 rounded-controle border font-medium
        transition-[background-color,border-color,color,transform,opacity] duration-court ease-om
        ${dim} ${tons}
        ${pleineLargeur ? 'w-full' : ''}
        ${inactif ? 'cursor-not-allowed opacity-50' : 'active:scale-[.98]'} ${className}`}
      style={style}
      {...reste}
    >
      {/* Le sablier remplace l'icône plutôt que de s'ajouter : un bouton qui
          s'élargit pendant l'envoi déplace ses voisins sous le curseur. */}
      {enCours ? <Loader2 className={`animate-spin ${grosseIcone ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} aria-hidden="true" />
        : Icone ? <Icone className={grosseIcone ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden="true" /> : null}
      {/* Un bouton-icône n'a pas de libellé — sauf quand l'appelant passe l'icône
          en enfant pour l'animer (un chevron qui pivote). */}
      {iconeSeule && Icone ? null : children}
    </button>
  );
});

/**
 * Copie dans le presse-papiers, avec son état de retour : `''`, `'ok'`, `'echec'`,
 * qui retombe à vide au bout de deux secondes. Utile seul quand le retour se pose
 * ailleurs que sur le bouton ; sinon c'est `BoutonCopier` qui le porte.
 */
export function useCopie() {
  const [etat, setEtat] = useState('');
  const copier = async (texte) => {
    try {
      await navigator.clipboard.writeText(texte);
      setEtat('ok');
    } catch {
      setEtat('echec');
    }
    setTimeout(() => setEtat(''), 2000);
  };
  return [etat, copier];
}

/**
 * Le bouton qui copie, et qui dit qu'il a copié.
 *
 * Vingt-deux appels dessinaient ce retour à la main : chacun son icône, son
 * libellé d'échec (« Échec », « Échec — copiez à la main », « Copie refusée »),
 * et six d'entre eux leur propre `<button>` bordé. Le geste est le même partout,
 * donc le retour aussi : l'icône passe au `Check`, le libellé dit ce qui est
 * dans le presse-papiers, et deux secondes plus tard le bouton est redevenu
 * lui-même.
 *
 * Il ne se recolore PAS. Un `text-accent` glissé par `className` double le
 * `text-` de la variante et laisse l'ordre du CSS trancher — et un bouton qui
 * annonce « Lien copié » n'a besoin de rien d'autre pour être compris.
 *
 * `texte` est une chaîne ou une fonction, pour ne pas construire un récapitulatif
 * de trente lignes à chaque rendu.
 */
export const BoutonCopier = React.forwardRef(function BoutonCopier({
  texte, label, labelCopie = 'Copié', labelEchec = 'Copie refusée',
  icone = Copy, titre, titreCopie, onCopie, ...reste
}, ref) {
  const [etat, copier] = useCopie();
  const libelle = etat === 'ok' ? labelCopie : etat === 'echec' ? labelEchec : label;
  return (
    <Bouton
      ref={ref}
      icone={etat === 'ok' ? Check : icone}
      title={etat === 'ok' ? (titreCopie || titre) : titre}
      aria-label={etat === 'ok' ? (titreCopie || titre) : titre}
      onClick={() => {
        copier(typeof texte === 'function' ? texte() : texte);
        if (onCopie) onCopie();
      }}
      {...reste}
    >
      {/* Le libellé est annoncé : la copie n'a pas d'autre trace à l'écran. */}
      <span role="status">{libelle}</span>
    </Bouton>
  );
});

const CHAMP_TAILLES = { sm: 'h-7 text-appui', md: 'h-8 text-corps', lg: 'h-10 text-corps' };

/**
 * Champ de saisie avec son libellé, son aide et son erreur.
 *
 * L'aide passe par `Bulle` (au survol ET au focus) plutôt que par un paragraphe
 * sous le champ : c'est ce qui permet de vider l'écran sans perdre l'explication.
 * La cible tactile ne se règle pas ici : `CSS_TACTILE` (`public/commun.jsx`)
 * pousse tout champ à 44 px sous 768 px, une fois, pour toute la coque.
 */
export function Champ({
  label, aide, erreur, taille = 'md', suffixe, id, className = '', ...proprietesInput
}) {
  const auto = React.useId();
  const cle = id || auto;
  return (
    <div className={`relative group ${className}`}>
      {label ? (
        <label htmlFor={cle} className="block mb-1">
          <Etiquette>{label}</Etiquette>
        </label>
      ) : null}
      <div className="relative">
        <input
          id={cle}
          aria-invalid={erreur ? true : undefined}
          aria-errormessage={erreur ? `${cle}-erreur` : undefined}
          className={`w-full rounded-controle border bg-surface text-encre px-2.5 transition-colors duration-court ease-om
            ${CHAMP_TAILLES[taille]} ${suffixe ? 'pr-8' : ''} ${erreur ? 'border-danger' : 'border-ligne'}`}
          {...proprietesInput}
        />
        {suffixe ? (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-appui text-encre-3 pointer-events-none">
            {suffixe}
          </span>
        ) : null}
      </div>
      {aide ? <Bulle texte={aide} /> : null}
      {erreur ? (
        <p id={`${cle}-erreur`} role="alert" className="mt-1 text-appui text-danger animate-fondu">{erreur}</p>
      ) : null}
    </div>
  );
}

/** Liste déroulante native : sur téléphone, rien ne bat le sélecteur du système. */
export function Selecteur({
  label, valeur, onChange, options = [], taille = 'md', placeholder, disabled = false,
  id, className = '', ...reste
}) {
  const auto = React.useId();
  const cle = id || auto;
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={cle} className="block mb-1"><Etiquette>{label}</Etiquette></label>
      ) : null}
      <select
        id={cle}
        value={valeur ?? ''}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full rounded-controle border border-ligne bg-surface text-encre px-2.5
          disabled:opacity-50 disabled:cursor-not-allowed ${CHAMP_TAILLES[taille]}`}
        {...reste}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

/**
 * Puce de filtre. Un seul dessin pour « Contrats », « en retard », « ce site ».
 * `onRetirer` en fait un filtre posé, qu'on enlève d'un clic sur la croix —
 * sans ça, on ne sait plus pourquoi la liste est vide.
 */
export function Puce({ actif = false, onClick, compteur, onRetirer, children, ...reste }) {
  const contenu = (
    <>
      {children}
      {compteur !== undefined && compteur !== null ? (
        <span className="font-mono text-micro text-encre-3">{compteur}</span>
      ) : null}
    </>
  );
  const ton = actif
    ? 'bg-accent-doux border-accent/50 text-encre'
    : 'bg-surface border-ligne text-encre-2';
  if (onRetirer) {
    return (
      <span className={`inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-controle border text-appui ${ton}`}>
        {contenu}
        <button type="button" onClick={onRetirer} aria-label="Retirer ce filtre"
                className="h-5 w-5 inline-flex items-center justify-center rounded-interne text-encre-3 transition-colors duration-court ease-om hover:text-encre">×</button>
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={onClick ? actif : undefined}
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-controle border text-appui
              transition-colors duration-court ease-om active:scale-[.98] ${ton} ${actif ? '' : 'hover:text-encre'}`}
            {...reste}>
      {contenu}
    </button>
  );
}

/** Une carte, ou rien. Le fond blanc reste réservé aux vrais objets. */
const SURFACE_TONS = {
  carte: 'bg-surface border border-ligne',
  plat: 'bg-transparent',
  accent: 'bg-accent-doux border border-accent',
  creux: 'bg-surface-2 border border-ligne',
};

// `padding` reste un nombre côté appelants (l'API ne bouge pas), mais il se
// résout dans une table close : Tailwind ne génère pas une classe calculée.
const SURFACE_PADDINGS = { 0: 'p-0', 8: 'p-2', 10: 'p-2.5', 12: 'p-3', 16: 'p-4', 20: 'p-5' };

export function Surface({
  ton = 'carte', padding = 16, as: Balise = 'div', className = '', style, children,
  titre, compteur, actions, ...reste
}) {
  // `padding={null}` laisse les classes de l'appelant décider : une carte de
  // liste veut son propre `px-3 py-2`.
  const espace = padding === null ? '' : (SURFACE_PADDINGS[padding] || 'p-4');
  // Une carte qui porte un `titre` a une tête : le nom, son compte, ses gestes,
  // séparés du corps par une ligne — la carte se lit avant d'être lue.
  if (titre) {
    return (
      <Balise
        className={`rounded-surface ${SURFACE_TONS[ton] || SURFACE_TONS.carte} ${className}`}
        style={style}
        {...reste}
      >
        <div className="flex items-center gap-2 min-h-11 px-4 py-2 border-b border-ligne">
          <h3 className="text-corps font-semibold text-encre truncate">{titre}</h3>
          {compteur != null ? <Badge>{compteur}</Badge> : null}
          <div className="flex-1" />
          {actions}
        </div>
        <div className={espace}>{children}</div>
      </Balise>
    );
  }
  return (
    // `as` existe pour les cartes d'une liste : un <div> entre <ul> et <li>
    // casse la sémantique que les lecteurs d'écran annoncent.
    <Balise
      className={`rounded-surface ${SURFACE_TONS[ton] || SURFACE_TONS.carte} ${espace} ${className}`}
      style={style}
      {...reste}
    >
      {children}
    </Balise>
  );
}

/**
 * Le même écran vide partout : chargement, rien à voir, rien qui corresponde au
 * filtre, erreur. Un écran vide qui ne dit pas quoi faire est un cul-de-sac ;
 * `action` est donc la règle, pas l'exception.
 *
 * `texte` arrive déjà traduit (`omErreurMessage(error)` chez l'appelant) : ce
 * fichier ne doit pas importer la porte vers la base.
 */
export function Etat({ variante = 'vide', titre, texte, action, children = null, className = '' }) {
  if (variante === 'chargement') {
    return (
      <p role="status" className={`text-corps py-10 text-center text-encre-3 ${className}`}>
        {titre || 'Chargement…'}
      </p>
    );
  }
  const erreur = variante === 'erreur';
  return (
    <div className={`max-w-[560px] mx-auto mt-10 rounded-surface border bg-surface p-5 animate-monte
           ${erreur ? 'border-danger' : 'border-ligne'} ${className}`}
         role={erreur ? 'alert' : undefined}>
      {titre ? <h2 className="text-section font-semibold text-encre">{titre}</h2> : null}
      {texte ? <p className="text-corps mt-2 leading-relaxed text-encre-2">{texte}</p> : null}
      {action ? (
        <div className="mt-4">
          <Bouton variante="primaire" onClick={action.onClick}>{action.libelle}</Bouton>
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Le squelette dit « ça arrive, à cette place ». Un « Chargement… » centré fait
 * sauter tout l'écran quand les lignes arrivent ; celui-ci tient la place.
 *
 * `souffle` plutôt qu'`animate-pulse` : l'opacité ne descend qu'à 0,55 et la
 * boucle dure 1,6 s — un clignotement plus marqué transforme une liste qui
 * charge en alarme.
 */
const SQUELETTE_HAUTEURS = { 24: 'h-6', 28: 'h-7', 32: 'h-8', 36: 'h-9', 40: 'h-10', 48: 'h-12' };

export function Squelette({ lignes = 4, hauteur = 36, className = '' }) {
  const h = SQUELETTE_HAUTEURS[hauteur] || 'h-9';
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Chargement">
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className={`rounded-controle bg-surface-2 animate-souffle ${h}`} />
      ))}
    </div>
  );
}

/**
 * Le vide d'un onglet, dessiné. Trois outils avaient chacun leur petit `Vide`
 * local — un paragraphe gris centré, sans issue. C'était la première chose que
 * voyait un client qui ouvre un espace neuf : tous ses onglets sont vides.
 *
 * Donc un cadre en pointillés (il dit « ça se remplira ici » sans se faire
 * passer pour une carte pleine), un titre qui nomme le manque, une phrase qui
 * dit à quoi sert l'onglet, et l'action quand elle existe. Aligné à gauche
 * comme le reste de l'app : le centrage est réservé aux pages publiques.
 *
 * `cadre={false}` retire le pointillé quand le vide tombe déjà dans une boîte
 * bordée : deux cadres l'un dans l'autre se voient.
 *
 * L'action est un bouton neutre : un onglet vide ne vole pas le geste plein de
 * la barre supérieure. `action.primaire` l'accorde quand le vide EST l'écran.
 */
export function Vide({ titre, texte, action, icone: Icone, cadre = true, className = '' }) {
  const habit = cadre ? 'rounded-surface border border-dashed border-ligne bg-surface' : '';
  return (
    <div className={`${habit} px-5 py-8 animate-fondu ${className}`}>
      <div className="flex items-start gap-3">
        {Icone ? <Icone className="w-5 h-5 mt-px shrink-0 text-encre-3" aria-hidden="true" /> : null}
        <div className="min-w-0">
          <p className="text-corps font-medium text-encre">{titre}</p>
          {texte ? <p className="text-appui mt-1 max-w-[62ch] leading-relaxed text-encre-2">{texte}</p> : null}
          {action ? (
            <div className="mt-3">
              <Bouton
                taille="sm"
                variante={action.primaire ? 'primaire' : 'neutre'}
                icone={action.icone}
                onClick={action.onClick}
              >
                {action.libelle}
              </Bouton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Le squelette d'un écran entier, pendant que le jeton part chercher l'espace.
 *
 * Un « Chargement… » centré ment sur la forme de la page : il occupe le milieu,
 * puis disparaît d'un coup et tout descend. Celui-ci pose déjà le titre, la
 * rangée d'onglets et les lignes à leur place — l'arrivée des données ne
 * déplace plus rien. `onglets` est un nombre : on ne connaît pas encore leurs
 * noms, seulement qu'il y en a.
 */
export function SqueletteEcran({ onglets = 0, lignes = 6, className = '' }) {
  return (
    <div className={`animate-fondu ${className}`} role="status" aria-label="Chargement">
      <div className="h-7 w-[240px] max-w-full rounded-controle bg-surface-2 animate-souffle" />
      {onglets > 0 ? (
        <div className="mt-5 flex gap-2">
          {Array.from({ length: onglets }, (_, i) => (
            <div key={i} className="h-8 w-[104px] rounded-controle bg-surface-2 animate-souffle" />
          ))}
        </div>
      ) : null}
      <div className="mt-5 rounded-surface border border-ligne bg-surface p-3">
        <Squelette lignes={lignes} hauteur={32} />
      </div>
    </div>
  );
}

/**
 * Barre d'outils d'une liste : la recherche à gauche, les filtres à sa suite, le
 * compteur et les actions à droite. Elle ne s'imprime pas — un registre remis à
 * un contrôleur n'a pas de champ de recherche.
 */
export function BarreOutils({ recherche, filtres, actions, compteur, className = '' }) {
  return (
    <div className={`d2d-sans-impression flex flex-wrap items-center gap-2 ${className}`}>
      {recherche ? (
        <label className="relative flex-1 min-w-[180px] max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-encre-3 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={recherche.valeur}
            onChange={(e) => recherche.onChange(e.target.value)}
            placeholder={recherche.placeholder || 'Rechercher'}
            aria-label={recherche.placeholder || 'Rechercher'}
            className="h-8 w-full rounded-controle border border-ligne bg-surface text-encre pl-8 pr-2.5 text-corps
              placeholder:text-encre-3 transition-colors duration-court ease-om hover:border-encre-3/40"
          />
        </label>
      ) : null}
      {filtres}
      <div className="flex-1 min-w-0" />
      {compteur ? <span className="font-mono text-appui text-encre-3">{compteur}</span> : null}
      {actions}
    </div>
  );
}

/**
 * Le badge : un statut, un compte, une catégorie — dit en quatre tons, jamais
 * plus. Rectangle à coins de 4 px plutôt que pilule : dans une colonne de
 * tableau, une pilule se lit comme un bouton.
 */
const BADGE_TONS = {
  neutre: 'bg-surface-2 text-encre-2 border-ligne',
  accent: 'bg-accent-doux text-accent border-accent/30',
  alerte: 'bg-alerte/10 text-alerte border-alerte/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
};

export function Badge({ ton = 'neutre', point = false, className = '', children, ...reste }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-5 px-1.5 rounded-interne border text-micro font-medium whitespace-nowrap
        ${BADGE_TONS[ton] || BADGE_TONS.neutre} ${className}`}
      {...reste}
    >
      {point ? <span className="w-1.5 h-1.5 rounded-pastille bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/**
 * La tête d'un écran : son titre, une ligne de situation, ses gestes à droite.
 * Un seul dessin pour que chaque outil s'ouvre de la même façon.
 */
export function EnTetePage({ titre, sur, meta, actions, children = null, className = '' }) {
  return (
    <header className={`mb-6 flex flex-wrap items-end gap-x-6 gap-y-3 animate-monte ${className}`}>
      {/* Base de 18rem : à `flex-1` (base 0) le texte restait sur la ligne des
          actions et se tassait mot par mot sur téléphone. */}
      <div className="min-w-0 grow basis-72">
        {sur ? <p className="mb-1 text-etiquette text-accent truncate">{sur}</p> : null}
        <h1 className="text-titre text-encre">{titre}</h1>
        {meta ? <p className="mt-1 text-corps text-encre-2 max-w-[70ch]">{meta}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0 max-sm:w-full">{actions}</div> : null}
    </header>
  );
}

/**
 * Un indicateur : le nom en étiquette, le chiffre, une ligne de contexte. Le
 * trait du haut porte le ton — c'est la seule couleur de la tuile. `aide`
 * pose une Bulle : la tuile devient focalisable, l'explication reste au bout du
 * curseur. Le trait est tenu par un calque qui coupe les coins, la bulle par la
 * tuile qui ne coupe rien — sinon l'arrondi mangerait l'aide.
 */
const INDICATEUR_TRAITS = {
  neutre: 'before:bg-ligne',
  accent: 'before:bg-accent',
  alerte: 'before:bg-alerte',
  danger: 'before:bg-danger',
};

export function Indicateur({ label, valeur, sous, ton = 'neutre', aide = '', className = '' }) {
  return (
    <div
      className={`group relative rounded-surface border border-ligne bg-surface ${aide ? 'cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40' : ''} ${className}`}
      tabIndex={aide ? 0 : undefined}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-0 overflow-hidden rounded-surface pointer-events-none
          before:absolute before:inset-x-0 before:top-0 before:h-0.5 ${INDICATEUR_TRAITS[ton] || INDICATEUR_TRAITS.neutre}`}
      />
      <div className="px-4 pt-4 pb-3.5">
        <p className="text-etiquette text-encre-3 truncate">{label}</p>
        <p className="mt-2 text-chiffre text-encre">{valeur}</p>
        {sous ? <p className="mt-1 text-appui text-encre-3 truncate">{sous}</p> : null}
      </div>
      <Bulle texte={aide} />
    </div>
  );
}

/**
 * Une liste longue, par paquets : `const [visibles, plus] = useParPaquets(liste, 12)`,
 * puis `{plus}` sous la liste. Une liste coupée sans le dire cachait la treizième
 * réserve ou le cinquante et unième colis (audit du 2026-10-05).
 */
export function useParPaquets(liste = [], pas = 12) {
  const [n, setN] = useState(pas);
  const tout = Array.isArray(liste) ? liste : [];
  const reste = tout.length - n;
  const plus = reste > 0 ? (
    <button
      type="button" onClick={() => setN((x) => x + pas)}
      className="mt-1.5 h-8 px-2 rounded-controle text-appui font-medium text-encre-2 transition-colors duration-court ease-om hover:bg-surface-2 hover:text-encre"
    >
      Afficher plus — {reste} restant{reste > 1 ? 's' : ''}
    </button>
  ) : null;
  return [tout.slice(0, n), plus];
}

const FOCUSABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Le clavier reste dans une fenêtre modale : Tab au dernier élément revient au
 * premier, Maj+Tab au premier part au dernier. Sans lui, la tabulation filait
 * vers la page éteinte derrière, qu'on ne voit pas (audit du 2026-10-05).
 * `ref` : le conteneur `role="dialog"`.
 */
export function usePiegeFocus(ref, actif = true) {
  useEffect(() => {
    if (!actif) return undefined;
    const surTouche = (e) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const liste = [...ref.current.querySelectorAll(FOCUSABLES)].filter((el) => el.offsetParent !== null);
      if (!liste.length) { e.preventDefault(); return; }
      const premier = liste[0];
      const dernier = liste[liste.length - 1];
      const ici = document.activeElement;
      if (e.shiftKey && (ici === premier || !ref.current.contains(ici))) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && (ici === dernier || !ref.current.contains(ici))) { e.preventDefault(); premier.focus(); }
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ref, actif]);
}
