# Plan Builder — l'Atelier de plans

Dessiner et gérer des plans de bureaux : murs, pièces, portes et fenêtres, zones, postes,
salles, mobilier, cotes, export SVG/PNG, impression à l'échelle. **Aucun compte, aucun serveur,
aucune base** : les projets restent dans le navigateur de la machine et s'échangent en fichier.

## L'utiliser sans rien installer

`npm run fichier` fabrique **`atelier-plans.html`** : un seul fichier (scripts, styles et police
dedans) qui s'ouvre d'un double-clic dans Chrome, Edge ou Firefox.

## Le développer

Il faut [Node.js](https://nodejs.org) 20 ou plus.

```bash
npm install        # la première fois
npm run dev        # http://localhost:5180
npm run test:run   # les tests
npm run fichier    # le fichier unique atelier-plans.html
```

## Ce qu'il faut savoir

- **Un projet = un lieu** (un client, un immeuble), jusqu'à six plans (étages).
- **Les projets vivent dans le navigateur, à l'adresse où l'app est ouverte** (`localhost:5180`
  et le fichier `atelier-plans.html` ne partagent pas leurs projets). Vider les données du site
  les efface : **« Exporter »** donne un fichier `.plans.json`, **« Importer »** le relit.
- Le fond de plan (photo ou scan à décalquer) reste aussi dans le navigateur.
- **Pas de poste attitré** à une personne : il n'y a pas d'équipe ici.

## D'où vient le code

Copié le 2026-10-13 de « Qui vient au bureau » (`auguse123/qui-vient-au-bureau`, commit `9390bb8`),
qui garde sa propre version de l'éditeur : les deux évoluent séparément.
