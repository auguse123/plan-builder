# CLAUDE.md — Plan Builder

L'Atelier de plans : une SPA **100 % locale** (React 18, Vite 6, Tailwind, TanStack Query), sans
backend. L'utilisateur est non-développeur, francophone : répondre en français, pour et contre.
Code, commentaires et noms en français, comme l'existant.

```bash
npm install && npm run dev   # 5180 · test:run · build · fichier (HTML unique)
```

## Les couches

- **`src/components/outils/equipe/public/PlanPostes.jsx`** (~4 000 lignes) et ses voisins
  `Plan*.jsx` — l'éditeur. **Plus de 400 lignes : ne pas le lire en entier**, `grep -n` puis
  `sed -n a,bp`.
- **`src/lib/outils/equipe/*`** — la géométrie pure (plan, trace, aimant, blocs, ouvertures,
  épaisseurs, pièces, échelle, import…), chacune avec son test. Une règle sans test n'existe pas.
- **`src/lib/local/depot.js`** — ce que faisaient les fonctions Postgres de l'app d'origine
  (`om_plan_patch`, `om_postes_deplacer`, `om_postes_semer`, `om_zones_geometrie`…), en JS pur :
  `(projet, args) → { projet, retour }`, jamais de mutation, **refus par codes stables**
  (`throw new Error('plans_pleins')`) traduits par `omErreurMessage` (`publicApi.js`).
- **`src/lib/local/stockage.js`** — `localStorage` (`atelier-plans:projets`,
  `atelier-plans:projet:<id>`), export/import `.plans.json` (`format`, `version`).
- **`src/lib/outils/equipe/publicApi.js`** — garde les NOMS des hooks d'origine
  (`usePostes`, `usePatchPlan`…) : l'éditeur appelle `useX(jeton)`, le `jeton` est l'id du projet.
- **`src/pages/Projets.jsx`** (accueil) et **`Atelier.jsx`** (un projet ouvert). Pas de routeur :
  `#/projet/<id>`.

## Règles

- **Un format de fichier qui change** : monter `VERSION_FORMAT` (`stockage.js`) et savoir relire
  l'ancien dans `depuisFichier`.
- **Dessin** : seulement les jetons de `tailwind.config.js` (`text-encre`, `bg-surface`,
  `fill-surface-2`…) ; une classe hors thème ne produit rien (des vignettes sont déjà sorties en
  noir pour `fill-fond-2`). Thème clair/sombre par `data-theme`, jamais `dark:`.
- **Un téléchargement passe par `lib/outils/fichier.js`, une impression par
  `lib/outils/impression.js`.** Une question avant un geste irréversible : `demander()`
  (`confirmation.js`), jamais `window.confirm`.
- Tester dans un vrai navigateur (Playwright, Chromium `/opt/pw-browsers/chromium` dans le cloud)
  avant de dire « fait » ; vérifier aussi le fichier `atelier-plans.html` ouvert en `file://`.
