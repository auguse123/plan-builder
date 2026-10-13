/** @type {import('tailwindcss').Config} */
//
// Un seul vocabulaire. Ce fichier ne déclare QUE ce que l'app utilise : le
// squelette du gabarit d'origine (les `hsl(--background)`, `--card`, `--popover`,
// `--primary`, `--muted`, `--destructive`, huit `--sidebar-*` alors qu'il n'y avait
// pas de barre latérale, cinq `--chart-*`, une rampe `aquamarine` de 50 à 950) est
// parti : rien ne le lisait, et c'est lui qui donnait à l'app son air de modèle
// généré. Ce qui reste se lit d'un écran.
//
// Règle : une valeur qui n'a pas de nom ici n'a pas le droit d'exister dans une
// classe. Pas de `text-[13px]`, pas de `rounded-[10px]`, pas de `duration-[200ms]`.
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontSize: {
        // Sept pas, plus un. Tout `text-[13.5px]` est une dette, pas une nuance.
        micro:  ['11px', { lineHeight: '14px', fontWeight: '500' }],
        // Le nom d'une colonne, d'une section de rail, d'un groupe : capitales
        // espacées (la casse est posée par `index.css`). Nomme, ne se lit pas.
        etiquette: ['11px', { lineHeight: '14px', letterSpacing: '0.06em', fontWeight: '600' }],
        appui:  ['12px', { lineHeight: '17px' }],
        corps:  ['13px', { lineHeight: '19px' }],
        section:['15px', { lineHeight: '21px', fontWeight: '600' }],
        titre:  ['22px', { lineHeight: '28px', fontWeight: '600' }],
        chiffre:['28px', { lineHeight: '32px', fontWeight: '600' }],
        // Le septième existe pour une raison technique, pas esthétique : sous
        // 16 px, iOS Safari zoome sur le champ au focus et ne dézoome jamais.
        saisie: ['16px', { lineHeight: '22px' }],
      },
      colors: {
        fond: 'var(--om-fond)',
        surface: { DEFAULT: 'var(--om-surface)', 2: 'var(--om-surface-2)' },
        ligne: { DEFAULT: 'var(--om-ligne)', fine: 'var(--om-ligne-fine)' },
        // `encre-3` et `accent` se prennent aussi en filet (`border-accent/50`) :
        // un survol de carte, le bord d'un badge.
        encre: {
          DEFAULT: 'var(--om-encre)', 2: 'var(--om-encre-2)',
          3: 'color-mix(in oklch, var(--om-encre-3) calc(<alpha-value> * 100%), transparent)',
        },
        accent: {
          DEFAULT: 'color-mix(in oklch, var(--om-accent) calc(<alpha-value> * 100%), transparent)',
          vif: 'var(--om-accent-vif)', doux: 'var(--om-accent-doux)',
        },
        // Ces deux-là se prennent aussi en voile (`bg-alerte/15`) : une
        // variable CSS seule ne sait pas s'éclaircir, `color-mix` le fait.
        // Sans lui, `bg-alerte/15` ne produisait AUCUN fond — le télétravail
        // « d'après le rythme » était invisible.
        danger: 'color-mix(in oklch, var(--om-danger) calc(<alpha-value> * 100%), transparent)',
        alerte: 'color-mix(in oklch, var(--om-alerte) calc(<alpha-value> * 100%), transparent)',
        entete: 'var(--om-entete)',
        voile: 'var(--om-voile)',
        // Le bloc de code : un lien à copier se lit sur fond sombre dans les
        // deux thèmes — c'est ce qui le désigne comme « à prendre tel quel ».
        code: 'var(--om-code-fond)',
        'code-encre': 'var(--om-code-encre)',
        // Le papier d'une affiche : hors thème, par nature (voir `index.css`).
        papier: {
          DEFAULT: 'var(--om-papier)',
          encre: 'var(--om-papier-encre)',
          'encre-2': 'var(--om-papier-encre-2)',
          'encre-3': 'var(--om-papier-encre-3)',
          ligne: 'var(--om-papier-ligne)',
          accent: 'var(--om-papier-accent)',
        },
        selection: { DEFAULT: 'var(--om-selection)', forte: 'var(--om-selection-forte)' },
      },
      // Quatre rayons uniformes (voir `index.css`) : ils se coupent par un côté
      // sans piège — `rounded-l-controle`, `rounded-t-surface`.
      borderRadius: {
        interne: 'var(--r-interne)',
        controle: 'var(--r-controle)',
        surface: 'var(--r-surface)',
        pastille: 'var(--r-pastille)',
      },
      // Deux profondeurs. Une carte n'en a aucune : elle a une ligne.
      boxShadow: {
        pose: 'var(--om-ombre-pose)',
        flottant: 'var(--om-ombre-flottant)',
      },
      transitionTimingFunction: { om: 'var(--om-courbe)' },
      transitionDuration: { court: '110ms', moyen: '160ms', long: '240ms' },
      keyframes: {
        // Le vocabulaire de mouvement de l'app, entier. Rien n'entre sans venir
        // d'un de ces quatre gestes.
        'om-fondu':   { from: { opacity: '0' }, to: { opacity: '1' } },
        'om-monte':   { from: { opacity: '0', transform: 'translateY(6px)' },
                        to:   { opacity: '1', transform: 'none' } },
        'om-surgit':  { from: { opacity: '0', transform: 'translateY(-4px) scale(.98)' },
                        to:   { opacity: '1', transform: 'none' } },
        'om-glisse':  { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'om-pulse':   { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
      },
      animation: {
        fondu:  'om-fondu var(--om-t-moyen) var(--om-courbe)',
        monte:  'om-monte var(--om-t-long) var(--om-courbe)',
        surgit: 'om-surgit var(--om-t-court) var(--om-courbe)',
        glisse: 'om-glisse var(--om-t-long) var(--om-courbe)',
        // Squelettes de chargement : lent exprès, une attente ne clignote pas.
        souffle: 'om-pulse 1.6s var(--om-courbe) infinite',
      },
    },
  },
  plugins: [],
};
