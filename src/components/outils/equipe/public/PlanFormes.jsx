// Ce qui se dessine dans le plan : postes, salles, zones, cotes, ouvertures.
//
// SÉPARÉ DE `PlanPostes.jsx` PARCE QUE CE FICHIER NE DÉCIDE RIEN. Aucun état,
// aucune mutation, aucune règle : des `<g>` qui reçoivent une forme et la
// rendent. L'éditeur, lui, a déjà plus de mille lignes de gestes — mélanger les
// deux rendait le dessin impossible à relire.
//
// LES COULEURS SONT DES CLASSES, PAS DES VALEURS : le thème unique passe par
// Tailwind (`fill-*`, `stroke-*`), jamais par un `style` ni un `#rrggbb`.
import React from 'react';
import { initiales } from '@/lib/outils/equipe/model';
import { cotes } from '@/lib/outils/equipe/trace';
import { poignees } from '@/lib/outils/equipe/edition';
import { bornesOuverture, typeOuverture } from '@/lib/outils/equipe/ouvertures';
import { formeDe, placesDe } from '@/lib/outils/equipe/blocs';
import { amenagementSalle, corpsQuiTient } from '@/lib/outils/equipe/mobilier';
import { DessinMeuble, TableEtChaises } from './PlanMobilier';
import { traitDe } from '@/lib/outils/equipe/plan';
import {
  EPAISSEUR_TRAIT, TRAIT_DEFAUT, contourDeMur, pixelsDuTrait,
} from '@/lib/outils/equipe/epaisseurs';

// Le genre se lit à l'aplat, pas à la légende : un plateau se survole, il ne se
// déchiffre pas. Liste fermée — une couleur inventée sort du thème.
/**
 * CE QUI SERT À VISER SE MESURE EN PIXELS, PAS EN CENTIMÈTRES.
 *
 * Une poignée dessinée en unités de plan double de taille à chaque cran de
 * zoom : à ×16, la pastille d'une extrémité de mur couvre un mètre carré et
 * cache précisément le point qu'on zoomait pour voir. Idem pour une cote, qui
 * est une annotation et pas un objet du plateau. Le contexte porte ce que vaut
 * UN pixel en unités de plan ; chaque pastille demande sa taille en pixels.
 *
 * Le défaut (1/3) est ce que vaut un pixel sur une vue ajustée d'un plateau
 * moyen : il ne sert qu'aux rendus hors éditeur.
 */
const AuPixel = React.createContext((n) => n / 3);

export function EchelleEcran({ unitesParPixel, children }) {
  const u = Number(unitesParPixel) > 0 ? Number(unitesParPixel) : 0;
  const px = React.useMemo(() => (n) => n * (u || 1 / 3), [u]);
  return <AuPixel.Provider value={px}>{children}</AuPixel.Provider>;
}

/** `px(7)` : sept pixels d'écran, dits en unités de plan. */
export function useAuPixel() {
  return React.useContext(AuPixel);
}

export const PEINTURE = {
  flex: { fond: 'fill-surface-2', trait: 'stroke-ligne', encre: 'fill-encre-2' },
  attitre: { fond: 'fill-accent-doux', trait: 'stroke-accent', encre: 'fill-encre' },
  bloque: { fond: 'fill-surface', trait: 'stroke-encre-3', encre: 'fill-encre-3' },
};

export function Poste({ poste, membre, choisi, onPointerDown, onKeyDown, actif }) {
  const peinture = PEINTURE[poste.genre] || PEINTURE.flex;
  const tour = `rotate(${poste.rot || 0} ${poste.x + poste.l / 2} ${poste.y + poste.h / 2})`;
  return (
    <g
      transform={tour}
      tabIndex={actif ? 0 : -1}
      role="button"
      aria-pressed={choisi}
      aria-label={`${poste.nom}${membre ? `, ${membre.prenom} ${membre.nom}` : ''}`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={`${actif ? 'cursor-move' : 'pointer-events-none'} focus:outline-none`}
    >
      <rect
        x={poste.x} y={poste.y} width={poste.l} height={poste.h} rx="1"
        className={`${peinture.fond} ${choisi ? 'stroke-accent-vif' : peinture.trait}`}
        strokeWidth={choisi ? 1.2 : 0.4}
      />
      <text
        x={poste.x + poste.l / 2} y={poste.y + poste.h / 2 + 1.4}
        textAnchor="middle" fontSize="3.4"
        className={membre ? 'fill-encre' : peinture.encre}
      >
        {membre ? initiales(membre) : poste.nom.replace(/^\D+/, '')}
      </text>
    </g>
  );
}

/**
 * Les cotes d'un mur : sa longueur écrite sur chaque segment.
 *
 * Un plan sans cote est un dessin ; avec, c'est un relevé qu'on peut vérifier
 * au décamètre. Le texte suit le mur et ne se lit jamais à l'envers.
 *
 * LA COTE EST LA POIGNÉE DE SA PROPRE MESURE : on clique le nombre qu'on lit,
 * on le retape sur place. La corriger dans une barre en haut de l'écran, c'est
 * viser un segment des yeux et le retrouver au jugé trente centimètres plus
 * loin. Le clic vise une plaque transparente, pas les glyphes : un texte de
 * 2,8 unités ne se pointe pas.
 */
/**
 * Un mur. Sans épaisseur choisie, le trait fin d'origine, bouts ronds. Avec,
 * une bande comme chez l'architecte : un fond cerné d'une plume `trait` (mm)
 * qui ne grossit pas au zoom — on lit la cote du mur, pas un feutre.
 */
export function TraitDeMur({ points, epaisseur = null, trait = TRAIT_DEFAUT, className }) {
  if (epaisseur == null) {
    return (
      <path
        d={traitDe(points)} fill="none" strokeWidth={EPAISSEUR_TRAIT}
        strokeLinecap="round" strokeLinejoin="round" className={className}
      />
    );
  }
  return (
    <path
      d={contourDeMur(points, epaisseur)} fillRule="evenodd"
      strokeWidth={pixelsDuTrait(trait)} vectorEffect="non-scaling-stroke"
      strokeLinejoin="miter" className={`fill-surface ${className || ''}`}
    />
  );
}

/**
 * Tous les murs d'un plan, SOUDÉS : deux passes au lieu d'un mur à la fois.
 *
 * UN MUR EN T RESTAIT DEUX BANDES : le bout de l'un posé sur la face de
 * l'autre, chacune gardait son cerne, et la face traversait la jonction d'un
 * trait. On dessine donc d'abord TOUS les cernes (plume doublée), puis TOUS
 * les fonds par-dessus : chaque fond mange la moitié intérieure de son cerne
 * — d'où la plume doublée — et, à une jonction, la moitié qui déborde sur le
 * mur voisin. Ce qui reste visible est le contour de l'ensemble : un T, un
 * angle, une croix, sans rien changer aux tracés enregistrés.
 *
 * `classeDe(i)` : la couleur du cerne (la sélection se lit à la couleur).
 */
export function MursSoudes({ murs = [], epaisseurs = [], trait = TRAIT_DEFAUT, classeDe = () => 'stroke-encre-2' }) {
  const plume = pixelsDuTrait(trait) * 2;
  const epais = murs.map((m, i) => ({ m, i, ep: epaisseurs?.[i] ?? null })).filter((w) => w.ep != null && w.m?.length > 1);
  return (
    <g>
      {epais.map(({ m, i, ep }) => (
        <path
          key={`cerne-${i}`} d={contourDeMur(m, ep)} fill="none"
          strokeWidth={plume} vectorEffect="non-scaling-stroke" strokeLinejoin="miter"
          className={`pointer-events-none ${classeDe(i)}`}
        />
      ))}
      {epais.map(({ m, i, ep }) => (
        <path key={`fond-${i}`} d={contourDeMur(m, ep)} fillRule="evenodd" stroke="none" className="fill-surface pointer-events-none" />
      ))}
      {murs.map((m, i) => ((epaisseurs?.[i] ?? null) == null && m?.length > 1 ? (
        <TraitDeMur key={`fin-${i}`} points={m} className={`pointer-events-none ${classeDe(i)}`} />
      ) : null))}
    </g>
  );
}

export function CotesDeMur({ points, souligne, onChoisir, choisi = -1 }) {
  const actif = typeof onChoisir === 'function';
  const px = useAuPixel();
  // La cote se lit à la même taille à tous les zooms : c'est une annotation,
  // pas un meuble. `ecart` tient le texte au-dessus du trait, plaque comprise.
  const ecart = px(4.2);
  return (
    <g className={actif ? '' : 'pointer-events-none'}>
      {cotes(points).map((c) => (
        <g
          key={`cote-${c.index}`}
          transform={`rotate(${c.angle.toFixed(2)} ${c.x} ${c.y - ecart})`}
          className={actif ? 'cursor-text' : 'pointer-events-none'}
          onPointerDown={actif ? (e) => { e.stopPropagation(); onChoisir(c.index, e); } : undefined}
        >
          <rect
            x={c.x - px(21)} y={c.y - px(13.2)} width={px(42)} height={px(13.2)}
            fill="transparent" className={actif ? '' : 'pointer-events-none'}
          />
          <text
            x={c.x} y={c.y - ecart}
            textAnchor="middle" fontSize={px(8.4)}
            className={`pointer-events-none ${
              c.index === choisi || souligne ? 'fill-accent-vif' : 'fill-encre-3'
            }`}
          >
            {c.texte}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Une zone dessinée : un cadre tireté et son nom en haut à gauche. */
export function ZoneDessinee({ zone, compte, souligne }) {
  return (
    <g className="pointer-events-none">
      <rect
        x={zone.x} y={zone.y} width={zone.l} height={zone.h} rx="1.5"
        className={souligne ? 'fill-accent-doux stroke-accent' : 'fill-surface-2 stroke-ligne'}
        fillOpacity="0.35" strokeWidth={souligne ? 0.9 : 0.5} strokeDasharray="2 1.5"
      />
      <text x={zone.x + 1.5} y={zone.y + 4} fontSize="3.6" className="fill-encre-2">
        {zone.nom}{compte ? ` · ${compte}` : ''}
      </text>
    </g>
  );
}

/**
 * Une salle de réunion : ses murs, sa table et ses chaises, son nom.
 *
 * La base ne garde d'une salle que nom, capacité et rectangle : l'aménagement
 * s'en déduit (`amenagementSalle`) — la capacité fait les chaises, « ronde »
 * dans le nom un disque, « cabine » ou « phone box » un vitrage.
 */
export function Salle({ salle, choisi, actif, onPointerDown, sansNom = false }) {
  const tour = `rotate(${salle.rot || 0} ${salle.x + salle.l / 2} ${salle.y + salle.h / 2})`;
  const trait = choisi ? 'stroke-accent-vif' : 'stroke-encre-3';
  const a = amenagementSalle(salle);
  const t = a.table;
  const centre = t
    ? (t.rond ? { x: salle.x + t.cx, y: salle.y + t.cy } : { x: salle.x + t.x + t.l / 2, y: salle.y + t.y + t.h / 2 })
    : { x: salle.x + salle.l / 2, y: salle.y + salle.h / 2 };
  // Sur le plateau s'il y en a un, sinon dans la salle : avec la capacité si
  // elle tient, le nom seul sinon, rien plutôt qu'un débord.
  const place = (t ? (t.rond ? t.rx * 1.6 : t.l) : salle.l) - 1.5;
  const complet = `${salle.nom}${salle.capacite ? ` (${salle.capacite})` : ''}`;
  const legende = [complet, salle.nom]
    .map((texte) => ({ texte, corps: corpsQuiTient(texte, place, { max: 3.6, min: 2.2 }) }))
    .find((o) => o.corps > 0) || { corps: 0 };
  return (
    <g
      transform={tour}
      className={actif ? 'cursor-move' : 'pointer-events-none'}
      onPointerDown={onPointerDown}
    >
      <rect
        x={salle.x} y={salle.y} width={salle.l} height={salle.h} rx="1"
        className={`fill-surface ${trait}`}
        strokeWidth={choisi ? 1.2 : 0.6}
      />
      {a.vitre && (
        <rect
          x={salle.x + a.vitre.x} y={salle.y + a.vitre.y} width={a.vitre.l} height={a.vitre.h} rx="0.6"
          className={trait} fill="none" strokeWidth="0.3"
        />
      )}
      {a.tablette && (
        <rect
          x={salle.x + a.tablette.x} y={salle.y + a.tablette.y} width={a.tablette.l} height={a.tablette.h}
          className={`fill-surface-2 ${trait}`} strokeWidth="0.35"
        />
      )}
      {(t || a.chaises.length > 0) && (
        <TableEtChaises table={t || null} chaises={a.chaises} x={salle.x} y={salle.y} trait={trait} />
      )}
      {!sansNom && legende.corps > 0 && (
        <text
          x={centre.x} y={centre.y + legende.corps / 3}
          textAnchor="middle" fontSize={legende.corps} strokeWidth="0.9" paintOrder="stroke"
          className="fill-encre-2 stroke-surface pointer-events-none"
        >
          {legende.texte}
        </text>
      )}
    </g>
  );
}

/**
 * Un meuble : du décor, dessiné à sa silhouette.
 *
 * LE DÉCOR SE RECONNAÎT DE LOIN OU NE SERT À RIEN. Un plan où canapé, plante et
 * armoire sont trois rectangles gris ne dit rien de plus qu'un plan vide : on
 * ne saurait pas, en le regardant, si l'étage a un coin détente. D'où une
 * silhouette par famille de forme — ronde, canapé, siège, tapis, verdure,
 * écran — et le rectangle en dernier recours.
 *
 * LA SILHOUETTE NE CHANGE PAS L'EMPRISE : ce qui est stocké reste `l × h`, et
 * une table ronde occupe le carré qui la contient. Le dessin est une lecture,
 * jamais une mesure — sinon deux meubles « ronds » pourraient se chevaucher
 * sans que rien ne le montre.
 *
 * LE NOM NE S'ÉCRIT QUE S'IL TIENT : à 60 cm de côté, un tabouret légendé
 * n'est plus qu'une tache de texte. Le survol, lui, le dit toujours.
 */
export function Meuble({ meuble, choisi, actif, onPointerDown }) {
  const { x, y, l, h } = meuble;
  const cx = x + l / 2;
  const cy = y + h / 2;
  const tour = `rotate(${meuble.rot || 0} ${cx} ${cy})`;
  const forme = formeDe(meuble.k);
  const trait = choisi ? 'stroke-accent-vif' : 'stroke-encre-3';
  const large = choisi ? 1 : 0.5;
  const nom = meuble.n || '';
  // Le pictogramme d'architecte d'abord ; les formes simples ensuite.
  const dessin = DessinMeuble({ forme, x, y, l, h, places: placesDe(meuble.k), trait, nom });
  // Le nom ne s'écrit que sur ce que le dessin ne dit pas seul.
  const legende = ['rect', 'appareil', 'arrondi'].includes(forme);
  const corps = legende ? corpsQuiTient(nom, l - 1.5, { max: 2.8, min: 1.8 }) : 0;
  return (
    <g
      transform={tour}
      className={actif ? 'cursor-move' : 'pointer-events-none'}
      onPointerDown={onPointerDown}
    >
      <title>{nom}</title>
      {/* Une chaise autour d'une table laisse des trous : un fond invisible
          garde toute l'emprise prenable. */}
      <rect x={x} y={y} width={l} height={h} fill="transparent" />
      {dessin || (forme === 'rond' ? (
        <ellipse
          cx={cx} cy={cy} rx={l / 2} ry={h / 2}
          className={`fill-surface-2 ${trait}`} strokeWidth={large}
        />
      ) : (
        <rect
          x={x} y={y} width={l} height={h}
          rx={forme === 'arrondi' ? Math.min(l, h) / 2 : 0.6}
          className={`fill-surface-2 ${trait}`}
          fillOpacity={forme === 'tapis' ? 0.6 : undefined}
          strokeWidth={large}
          strokeDasharray={forme === 'tapis' ? '1.6 1.2' : undefined}
        />
      ))}
      {/* Écran : la dalle est un trait épais, le pied le dit debout. */}
      {forme === 'ecran' && (
        <line
          x1={x + 0.8} y1={cy} x2={x + l - 0.8} y2={cy}
          strokeWidth="1.4" className={choisi ? 'stroke-accent-vif' : 'stroke-encre-2'}
        />
      )}
      {/* Choisi, le cadre de l'emprise : un dessin ajouré ne montre pas seul
          jusqu'où il porte. */}
      {choisi && dessin && (
        <rect x={x} y={y} width={l} height={h} fill="none" className="stroke-accent-vif" strokeWidth="0.4" strokeDasharray="1 0.8" />
      )}

      {corps > 0 && h >= 4 && (
        <text
          x={cx} y={cy + corps / 3} textAnchor="middle" fontSize={corps}
          className="fill-encre-3 pointer-events-none"
        >
          {nom}
        </text>
      )}
    </g>
  );
}

/**
 * Les quatre poignées d'un rectangle choisi.
 *
 * ON NE REDESSINE PAS CE QU'ON VEUT CORRIGER. Sans poignée, agrandir une salle
 * d'un mètre demande de la supprimer et de la retracer — avec ses réservations.
 * Le corps du rectangle ne capte rien : seules ces pastilles sont cliquables,
 * pour qu'un rectangle posé ne vole jamais le geste d'un tracé voisin.
 */
export function Poignees({ forme, onPrendre }) {
  const px = useAuPixel();
  return (
    <g>
      {poignees(forme).map((p) => (
        <circle
          key={p.cle} cx={p.x} cy={p.y} r={px(5)}
          className="fill-accent-vif stroke-fond cursor-pointer" strokeWidth={px(1.2)}
          onPointerDown={(e) => onPrendre(p.cle, e)}
        />
      ))}
    </g>
  );
}

/**
 * Une ouverture : le trou dans le mur, puis le signe de ce qui le ferme.
 *
 * LE TROU D'ABORD. Un vantail dessiné par-dessus un mur intact ne se lit pas :
 * c'est le blanc qui dit « on passe ici ». Le trait de fond masque le mur, le
 * reste n'est qu'une convention de plan — battant et son arc, double battant,
 * coulissante décalée, passage nu, fenêtre à double filet.
 *
 * LE MIROIR EST UN `scale(1 -1)` SUR LE GROUPE, pas un second jeu de traits :
 * le battant et son arc changent de côté d'un coup, et le trou ne bouge pas.
 */
export function Ouverture({ ouverture, choisi, actif, onPointerDown, epaisseur = 1.2 }) {
  const b = bornesOuverture(ouverture);
  if (!b) return null;
  const type = typeOuverture(ouverture.k);
  const demi = ouverture.l / 2;
  // Le trou fait l'épaisseur du mur qui le porte, plus un liseré : sur une
  // façade de 50 cm, un masque de cloison laisserait deux bandes de mur.
  const trou = epaisseur + 1;
  const bord = trou / 2;
  // On dessine à plat, autour de l'origine, puis on tourne : la trigonométrie
  // tient dans le `transform`, pas dans chaque trait.
  const pose = `translate(${ouverture.x} ${ouverture.y}) rotate(${ouverture.a})${ouverture.m ? ' scale(1 -1)' : ''}`;
  const teinte = choisi ? 'stroke-accent-vif' : 'stroke-encre-2';
  return (
    <g transform={pose} className={actif ? 'cursor-move' : 'pointer-events-none'} onPointerDown={onPointerDown}>
      <line
        x1={-demi} y1="0" x2={demi} y2="0"
        strokeWidth={trou} strokeLinecap="butt" className="stroke-fond"
      />
      {/* Les tableaux : deux traits courts qui bornent le trou, quel que soit
          le type. Sans eux, une coulissante ressemblerait à un mur manquant. */}
      <line x1={-demi} y1={-bord} x2={-demi} y2={bord} strokeWidth="0.6" className={teinte} />
      <line x1={demi} y1={-bord} x2={demi} y2={bord} strokeWidth="0.6" className={teinte} />

      {type.cle === 'simple' && (
        <>
          <line x1={-demi} y1="0" x2={-demi} y2={-ouverture.l} strokeWidth="0.7" className={teinte} />
          <path
            d={`M ${-demi} ${-ouverture.l} A ${ouverture.l} ${ouverture.l} 0 0 1 ${demi} 0`}
            fill="none" strokeWidth="0.45" strokeDasharray="1.2 1" className={teinte}
          />
        </>
      )}
      {type.cle === 'double' && (
        <>
          <line x1={-demi} y1="0" x2={-demi} y2={-demi} strokeWidth="0.7" className={teinte} />
          <line x1={demi} y1="0" x2={demi} y2={-demi} strokeWidth="0.7" className={teinte} />
          <path
            d={`M ${-demi} ${-demi} A ${demi} ${demi} 0 0 1 0 0`}
            fill="none" strokeWidth="0.45" strokeDasharray="1.2 1" className={teinte}
          />
          <path
            d={`M ${demi} ${-demi} A ${demi} ${demi} 0 0 0 0 0`}
            fill="none" strokeWidth="0.45" strokeDasharray="1.2 1" className={teinte}
          />
        </>
      )}
      {type.cle === 'coulissante' && (
        <line x1={-demi + 0.6} y1={-bord - 0.3} x2={demi - 0.6} y2={-bord - 0.3} strokeWidth="0.8" className={teinte} />
      )}
      {type.cle === 'fenetre' && (
        <>
          <line x1={-demi} y1="-0.5" x2={demi} y2="-0.5" strokeWidth="0.4" className={teinte} />
          <line x1={-demi} y1="0.5" x2={demi} y2="0.5" strokeWidth="0.4" className={teinte} />
        </>
      )}

      {/* Un trait de deux unités ne se vise pas : le calque transparent est le
          seul moyen de cliquer une porte sans bibliothèque de sélection. */}
      <line
        x1={-demi} y1="0" x2={demi} y2="0"
        strokeWidth="4" stroke="transparent"
        className={actif ? 'cursor-pointer' : 'pointer-events-none'}
      />
      {choisi && (
        <circle cx="0" cy="0" r="1.2" className="fill-accent-vif stroke-fond" strokeWidth="0.3" />
      )}
    </g>
  );
}

/**
 * Les deux bouts d'une ouverture choisie : sa largeur se tire, elle ne se retape
 * pas. Le point du milieu, lui, sert à la faire glisser le long des murs.
 */
export function BoutsDOuverture({ ouverture, onPrendre }) {
  const px = useAuPixel();
  const b = bornesOuverture(ouverture);
  if (!b) return null;
  return (
    <g>
      {[['a', b.a], ['b', b.b]].map(([cle, p]) => (
        <circle
          key={cle} cx={p.x} cy={p.y} r={px(4.5)}
          className="fill-accent-vif stroke-fond cursor-pointer" strokeWidth={px(1.2)}
          onPointerDown={(e) => onPrendre(cle, e)}
        />
      ))}
    </g>
  );
}
