# Mandala — Atelier radial

Application web de génération de mandalas déterministes par rotation d'un segment graine. Réalisée avec Vite, TypeScript et Canvas 2D, sans framework ni backend.

Une même graine reproduit toujours exactement le même dessin, et l'export PNG haute résolution est identique à l'aperçu.

## Fonctionnalités

- Graine textuelle ou numérique, avec bouton « Nouvelle graine ».
- Réglages du nombre de sections (4 à 32), d'anneaux (2 à 12) et de points (3 à 48).
- Primitives : ligne, polygone, courbe de Bézier ou mixte.
- Mode coloriage (noir sur blanc, sans remplissage) et mode couleur (palette, fond et remplissage modifiables).
- Export PNG carré en 2048 ou 4096 pixels.

## Démarrage

Prérequis : Node.js 20 ou version ultérieure et [pnpm](https://pnpm.io) 10.

```bash
pnpm install
pnpm dev
```

Le serveur de développement écoute sur `http://127.0.0.1:4173`.

## Commandes

```bash
pnpm dev             # serveur de développement
pnpm typecheck       # vérification TypeScript stricte
pnpm test:unit       # tests du moteur géométrique (Vitest)
pnpm test:e2e        # tests de l'interface (Playwright)
pnpm test            # tous les tests
pnpm build           # build de production dans dist/
pnpm preview         # aperçu local du build
```

Pour la première exécution des tests de navigateur :

```bash
pnpm exec playwright install chromium
```

## Architecture

- `src/core` : types, validation, générateur pseudo-aléatoire et géométrie normalisée.
- `src/rendering` : rendu des chemins sur Canvas 2D.
- `src/export` : génération et téléchargement des PNG haute résolution.
- `src/ui` : état central et paramètres initiaux.
- `src/styles` : direction visuelle de l'atelier.
- `tests/unit` : déterminisme, transformations et limites de configuration.
- `tests/e2e` : contrôles, modes de rendu, validation et export.
- `docs/PLAN.md` : spécification d'implémentation complète.

## Principe

Un « segment graine » est construit entre le centre et le bord du mandala. Il est réfléchi pour former une section symétrique, puis reproduit par rotations successives autour du centre.

1. Placer des points pseudo-aléatoires sur des cercles concentriques entre le centre et l'extérieur.
2. Relier ces points avec des lignes, des polygones ou des courbes de Bézier.
3. Réfléchir le segment par rapport à un axe pour obtenir une section symétrique.
4. Choisir un nombre de sections `N`.
5. Répéter la section avec un pas angulaire de `2π / N`.

Par exemple, un pas de `π / 6` produit douze sections.

En Wolfram Mathematica, le même principe s'écrit :

```mathematica
MakeMandala[seed_, angle_] :=
  Graphics[GeometricTransformation[seed,
    Table[RotationMatrix[a], {a, 0, 2 Pi - angle, angle}]]]
```

## Garanties vérifiées par les tests

- Toutes les sections utilisent le même centre.
- Les rotations couvrent exactement un tour complet.
- Le motif reste symétrique quand le nombre de sections change.
- Une même graine reproduit le même dessin.

## Déploiement

Site statique : aucun backend ni variable d'environnement.

- Framework : Vite
- Commande de build : `pnpm build`
- Dossier de sortie : `dist`

## Références

- [Creating Mandalas — Wolfram Community](https://community.wolfram.com/groups/-/m/t/1011591)
- [Code that generates a mandala — Mathematica Stack Exchange](https://mathematica.stackexchange.com/questions/136974/code-that-generates-a-mandala)
- [Xeratol — archive sur les mandalas](https://xeratol.com/archives/130)
