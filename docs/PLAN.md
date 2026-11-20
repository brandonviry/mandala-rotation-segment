# Plan d’implémentation — Générateur par rotation de segment

## Résumé

Créer dans `01-rotation-segment` une application desktop autonome avec Vite, TypeScript et Canvas 2D. Elle générera des mandalas reproductibles à partir d’une graine, proposera un mode coloriage et un mode couleur, puis exportera le résultat en PNG haute résolution.

L’implémentation restera entièrement contenue dans ce dossier et organisée en sous-dossiers fonctionnels.

## Architecture et implémentation

- Initialiser Vite avec TypeScript sans framework.
- Organiser `src` en sous-dossiers :
  - `core` : types, générateur pseudo-aléatoire, géométrie polaire, réflexion et rotations.
  - `rendering` : rendu Canvas des lignes, polygones et courbes de Bézier.
  - `export` : rendu hors écran et téléchargement PNG.
  - `ui` : état de l’application, contrôles et synchronisation avec l’aperçu.
  - `styles` : mise en page desktop et thèmes.
- Ajouter `tests/unit` pour les calculs et `tests/e2e` pour l’interface et l’export.
- Conserver le `README.md` existant et le compléter avec les commandes d’installation, de développement, de test et de build.

## Modèle et algorithme

Définir une configuration typée comprenant :

- `seed` textuelle ou numérique ;
- `sectionCount`, entier de 4 à 32 ;
- `ringCount`, de 2 à 12 ;
- `pointCount`, de 3 à 48 ;
- primitive `line`, `polygon`, `bezier` ou `mixed` ;
- épaisseur et opacité des traits ;
- mode `coloring` ou `color` ;
- palette, couleur de fond et remplissage ;
- résolution d’export `2048` ou `4096`, avec `4096` par défaut.

Implémenter le pipeline suivant :

1. Convertir la graine en état pseudo-aléatoire stable avec `xmur3` et `mulberry32`.
2. Distribuer les points sur des anneaux concentriques dans une demi-section angulaire.
3. Générer une géométrie normalisée indépendante du Canvas.
4. Relier les points selon la primitive sélectionnée.
5. Réfléchir la géométrie autour de l’axe radial local.
6. Répéter la section `N` fois avec un angle de `2π / N`.
7. Rendre la même géométrie dans le Canvas visible et dans le Canvas hors écran utilisé pour l’export.

Les calculs utiliseront des coordonnées normalisées afin que l’aperçu et le PNG haute résolution restent identiques.

## Interface desktop

- Afficher une barre latérale de paramètres et un grand Canvas carré.
- Mettre à jour l’aperçu instantanément après chaque modification.
- Fournir :
  - saisie de la graine ;
  - bouton « Nouvelle graine » ;
  - réglages des sections, anneaux et points ;
  - choix de la primitive ;
  - épaisseur et opacité ;
  - bascule coloriage/couleur ;
  - palette, fond et remplissage en mode couleur ;
  - résolution et bouton d’export ;
  - boutons de réinitialisation et de randomisation des paramètres.
- En mode coloriage, imposer un fond blanc, des contours noirs et des formes non remplies.
- En mode couleur, permettre les contours et remplissages issus d’une palette modifiable.
- Indiquer clairement les valeurs invalides et empêcher un rendu ou un export incomplet.

## Interfaces internes

- `MandalaConfig` : configuration complète et sérialisable.
- `Point`, `SeedPath` et `MandalaGeometry` : représentation géométrique sans dépendance au DOM.
- `generateMandalaGeometry(config)` : produit une géométrie déterministe.
- `renderMandala(context, geometry, renderOptions)` : dessine sur n’importe quel contexte Canvas 2D.
- `exportMandalaPng(config, resolution)` : génère et télécharge le PNG hors écran.
- Un état central léger pilotera les contrôles sans ajouter de bibliothèque de gestion d’état.

## Tests et critères d’acceptation

- Vérifier qu’une configuration et une graine identiques produisent exactement les mêmes coordonnées.
- Vérifier qu’une graine différente modifie la géométrie.
- Contrôler mathématiquement la réflexion des points.
- Vérifier que les `N` rotations couvrent un tour sans rotation manquante ou supplémentaire.
- Tester les limites de chaque paramètre et le changement de primitive.
- Vérifier que le mode coloriage reste noir sur blanc et sans remplissage.
- Vérifier que le mode couleur applique la palette sélectionnée.
- Tester avec Playwright la modification des contrôles, la nouvelle graine, la réinitialisation et le téléchargement.
- Vérifier que l’export produit un PNG carré aux dimensions 2048 ou 4096 pixels.
- Valider `npm run build`, les tests unitaires et les tests de parcours avant livraison.

## Hypothèses retenues

- La V1 cible les navigateurs desktop récents uniquement.
- Aucun backend, compte utilisateur, stockage local, historique ou partage par URL n’est prévu.
- Le dessin manuel, la génération par couches et l’apprentissage automatique restent hors de ce sous-projet.
- Le PNG est le seul format d’export de la V1.
- L’interface et le code restent isolés dans `01-rotation-segment` sans dépendre des autres sous-projets.
