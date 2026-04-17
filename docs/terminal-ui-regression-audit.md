# Audit Produit — Régressions et Intuitivité après refonte Terminal Métier

Date: 2026-04-16

Périmètre comparé:
- Avant: `before-terminal-ui` (`77d3794363631cc551a57ddcaf053b087f51e8eb`)
- Après: `main` (`a4ce468efac77a89208a7b59ac230faf62e634a1`)

Méthode:
- lecture de `src/App.tsx` avant/après
- lecture des écrans wizard `StepType`, `StepSpace`, `StepOrganize`, `ContentMode` avant/après
- lecture du Dashboard V3 actuel
- comparaison des parcours réellement disponibles, pas seulement de la cohérence visuelle

## Conclusion franche

La refonte a amélioré la cohérence visuelle et la discipline du design system, mais elle a aussi dégradé le produit sur deux axes réels:

1. des usages ont disparu ou sont devenus inaccessibles
2. plusieurs écrans sont devenus plus denses et moins évidents pour un utilisateur normal

Le point le plus grave n’est pas cosmétique: l’application promet encore certains chemins qu’elle n’assure plus réellement, notamment autour des projets legacy et de l’"éditeur classique".

## 1. Audit de régression fonctionnelle

| Sujet | Avant | Après | Régression constatée | Décision | Sévérité |
|---|---|---|---|---|---|
| Édition des projets non-V3 | Un projet legacy pouvait être ouvert et modifié dans l’éditeur à onglets | Un projet legacy affiche un écran de migration avec `Recréer un projet` | Perte nette de fonctionnalité: les projets existants ne sont plus éditables | Restaurer un chemin utile pour exploiter l’existant, ou au minimum proposer une migration assistée | Critique |
| Bouton `Éditeur classique` depuis le Dashboard | Le chemin menait à un éditeur réellement exploitable | Le bouton existe encore dans le Dashboard, mais le classique a été supprimé | Faux chemin produit: promesse d’action non tenue | Supprimer ce bouton ou le remplacer par une action honnête | Critique |
| Synchronisation cloud | Bouton `☁️` visible dans l’en-tête principal, modal CloudSync disponible | Plus aucun accès utilisateur visible à la sync cloud | Fonction utile supprimée sans remplacement | Restaurer si usage réel, sinon retirer la notion du produit et documenter l’arrêt | Critique |
| Bibliothèque de pièces | Bouton `📚 Bibliothèque` visible dans le shell principal | Chemin retiré de l’app | Suppression d’un outil utile de consultation/réemploi | Restaurer si encore utilisée, sinon assumer explicitement sa dépréciation | Important |
| Nouveau projet | Avant: `+ Nouveau projet` ouvrait un wizard dédié avec plus de repères historiques | Après: création vide puis ouverture du wizard V3 | Le nouveau flux est plus strict, mais pas forcément plus compréhensible | Garder le V3, mais réintroduire plus de repères et d’explication au départ | Important |
| Export PDF hors Dashboard | Avant: bouton `PDF` visible dans l’en-tête principal | Après: export disponible surtout dans le Dashboard V3 | Fonction moins accessible selon le contexte | Garder dans le Dashboard, mais clarifier où le PDF est disponible | Important |
| Gestion de projet secondaire | Avant: projets, cloud, PDF, bibliothèque, aide étaient tous visibles en haut | Après: une partie des actions est cachée dans `MoreMenu` ou absente | Perte d’accessibilité de fonctions utiles | Réintroduire un rail d’actions plus explicite | Important |
| Import / export JSON | Avant: export visible via menu secondaire dans un shell riche | Après: toujours présent mais plus discret dans `MoreMenu` | Pas supprimé, mais devenu moins découvrable | Garder, mais rendre l’intention plus explicite qu’un simple `...` | Important |
| Assistant IA legacy | Avant: onglet dédié, toujours monté pour conserver l’historique | Après: plus de chemin équivalent | Suppression complète d’un usage potentiellement utile | Décider explicitement: restaurer une aide guidée légère ou assumer la suppression | Important |
| Contrôle / validation détaillée legacy | Avant: onglet dédié `Contrôle` | Après: warnings et assumptions dans le Dashboard V3 | L’information existe encore partiellement, mais le parcours d’audit est moins séparé et moins explicite | Garder le V3, mais renforcer l’entrée “contrôles / points d’attention” | Amélioration |
| Plans 2D / débit / montage / notice comme parcours distincts | Avant: onglets dédiés avec entrée directe | Après: regroupé dans le Dashboard V3 | Pas forcément perdu, mais les anciens repères ont disparu | Ne pas revenir aux onglets legacy, mais rendre les onglets/tabs du Dashboard plus pédagogiques | Amélioration |

## 2. Audit d’intuitivité

| Sujet | Avant | Après | Régression constatée | Décision | Sévérité |
|---|---|---|---|---|---|
| Structure de l’écran d’accueil V3 | En-tête riche avec nom projet, stats, actions visibles | Shell plus propre mais plus austère | L’écran est plus cohérent, mais moins auto-explicatif | Réintroduire quelques repères persistants sans revenir au legacy | Important |
| Hiérarchie visuelle du wizard | Le wizard était plus “consumer”, avec CTA et blocs très lisibles | Le wizard est plus “ERP dense” | Pour un novice, l’écran est moins invitant et demande plus d’effort de lecture | Alléger la densité aux points de décision | Important |
| `StepType` | Cartes avec emoji et nom, lecture immédiate | Liste de boutons texte homogènes | La cohérence DS a coûté de la discriminabilité visuelle | Réintroduire des repères visuels sobres par famille de meuble | Important |
| `StepSpace` type de mur | Radios visibles d’un coup | Select compact | Le choix est moins scannable | Revenir à un choix visible ou à un segmented control sobre | Important |
| `StepOrganize` variantes | Boutons/chips rapides, très immédiats | Tableau dense `Configurations types` | Les variantes sont devenues plus cérébrales, moins rapides à saisir | Garder le tableau si besoin métier, mais ajouter une version plus lisible de sélection rapide | Important |
| `StepOrganize` progression hauteur | Barre visuelle `total / utile` immédiatement compréhensible | KPI `Zone totale / Hauteur utile / Écart` | L’information est correcte, mais moins instantanée | Réintroduire un repère visuel simple de remplissage | Important |
| `StepOrganize` CTA contenu | Grand bloc “Je décris ce que je range” très visible | Bouton de toolbar beaucoup plus discret | Le mode guidé est devenu secondaire alors qu’il aide fortement les non-experts | Redonner du poids visuel à cette action | Critique |
| `StepOrganize` édition des zones | Cartes par zone, modèle mental simple | Table dense avec champs inline | Plus efficace pour un profil expert, moins clair pour un utilisateur normal | Garder la table, mais ajouter repères, aide et feedback plus clairs | Important |
| `ContentMode` | Modal simple, compréhensible au premier regard | Tableau compact avec contrôles denses | Fonctionnel, mais plus abstrait et moins rassurant | Rendre la modal plus explicite avec intro, exemples et colonnes plus parlantes | Important |
| Libellés Dashboard | Ancien monde très littéral (`Plans`, `Débit`, `Montage`, `Ctrl`) | Nouveau monde mélange français métier et jargon (`Procurement`, `Assumptions`) | Le vocabulaire n’est pas homogène et perd l’utilisateur | Renommer en français clair, garder le jargon en second niveau | Critique |
| Compréhension du procurement | Avant: moins central mais plus proche des notions de coût/débit | Après: très visible, mais conceptuellement abstrait | On voit le procurement sans savoir quoi en faire | Ajouter définition, règle simple et conséquences actionnables | Critique |
| Compréhension de la façade 2D | Avant: onglet plans séparé, attente explicite de visualisation | Après: façade 2D au centre du Dashboard, mais son rôle n’est pas explicité | On peut voir et cliquer sans comprendre immédiatement l’usage | Ajouter titre, sous-titre et aide contextuelle de sélection | Important |
| Flux wizard → résultat | Avant: flux plus brut mais avec repères classiques autour | Après: passage wizard puis Dashboard dense | La transition manque d’un moment d’atterrissage et d’explication | Ajouter une courte synthèse de fin et les prochaines actions | Critique |
| Feedback de sélection | Avant: cartes, puces, CTA, couleurs plus démonstratives | Après: feedback plus discret et plus sobre | La sobriété nuit parfois au signal | Renforcer l’état sélectionné sur les éléments clés | Important |

## 3. Classement synthétique

### Critique

- Les projets legacy ne sont plus éditables.
- Le bouton `Éditeur classique` promet un chemin qui n’existe plus réellement.
- Le mode guidé `Je décris ce que je range` a perdu sa visibilité alors qu’il aide le plus les non-experts.
- Le vocabulaire du Dashboard mélange français et jargon (`Procurement`, `Assumptions`) sans pédagogie.
- Le flux wizard → résultat manque de transition et de “prochaine étape”.

### Important

- La bibliothèque de pièces a disparu.
- La sync cloud a disparu.
- Plusieurs actions utiles sont moins visibles qu’avant.
- `StepType`, `StepSpace`, `StepOrganize` sont plus denses et moins immédiatement lisibles.
- La façade 2D est présente mais son utilité n’est pas explicitée.
- L’édition des zones en tableau est plus froide et plus technique que l’ancien modèle par cartes.

### Amélioration

- Le PDF n’est pas perdu, mais son point d’accès est moins évident selon le contexte.
- Le contrôle / validation existe encore, mais il manque un repère explicite.
- Le shell V3 gagnerait à afficher davantage de contexte projet sans retomber dans le bruit du legacy.

## 4. Plan de correction minimaliste

Objectif:
- ne pas refaire une refonte complète
- conserver le Dashboard V3 et le DS
- réparer les régressions les plus coûteuses
- remettre des repères explicites là où la sobriété est devenue contre-productive

### Correction 1 — arrêter le faux chemin `Éditeur classique`

Problème utilisateur:
- le Dashboard propose un bouton qui mène vers un monde supprimé

Cause probable:
- suppression du classique dans `App.tsx` sans nettoyage du contrat d’action côté `Dashboard`

Solution proposée:
- supprimer le bouton `Éditeur classique`
- le remplacer par `Modifier le projet` si l’intention est de revenir au wizard
- si une reprise legacy est vraiment nécessaire, afficher un libellé honnête: `Projet legacy requis`

Fichiers impactés:
- `src/components/result/Dashboard.tsx`
- `src/App.tsx`

Décision:
- à faire immédiatement

### Correction 2 — rendre les projets legacy à nouveau exploitables

Problème utilisateur:
- un ancien projet n’est plus modifiable du tout

Cause probable:
- décision de suppression totale de l’éditeur classique sans migration fonctionnelle

Solution proposée:
- option minimale: ajouter une migration assistée qui pré-remplit le wizard V3 à partir du projet existant quand c’est possible
- fallback honnête: proposer `Dupliquer en V3` plutôt que `Recréer un projet`, avec reprise des dimensions, matériau et nom

Fichiers impactés:
- `src/App.tsx`
- `src/hooks/useProjectRepository.ts`
- potentiellement `src/lib/normalizeProject.ts` ou une petite couche de préremplissage V3

Décision:
- prioritaire si des projets legacy existent réellement

### Correction 3 — redonner de la visibilité au mode guidé de rangement

Problème utilisateur:
- l’utilisateur normal ne voit plus assez clairement l’action qui l’aide le plus

Cause probable:
- conversion du CTA central en simple bouton de toolbar pour rester très DS

Solution proposée:
- conserver le DS, mais réintroduire un bloc d’appel sobre dans `StepOrganize`
- exemple: `Panel borderless` ou `AlertStrip kind="info"` avec CTA primaire `Décrire ce que je range`
- garder le bouton de toolbar en secondaire

Fichiers impactés:
- `src/components/wizard/StepOrganize.tsx`
- `src/components/wizard/ContentMode.tsx`

Décision:
- à faire immédiatement

### Correction 4 — réintroduire des repères de lecture dans `StepOrganize`

Problème utilisateur:
- variantes, remplissage vertical et édition des zones demandent trop d’effort de compréhension

Cause probable:
- densification générale en tableau/KPI sans assez de mise en récit

Solution proposée:
- ajouter un court texte d’intention au-dessus des variantes
- réintroduire un indicateur visuel simple de remplissage hauteur en plus des KPI
- renommer les colonnes de façon plus directe si besoin
- renforcer l’état sélectionné de la variante active

Fichiers impactés:
- `src/components/wizard/StepOrganize.tsx`

Décision:
- à faire rapidement

### Correction 5 — rendre `StepType` plus discriminant sans revenir aux emojis

Problème utilisateur:
- la liste des types se lit comme un mur de libellés

Cause probable:
- suppression des icônes sans remplacement par un autre code visuel

Solution proposée:
- ajouter un sous-libellé par type ou une catégorisation visuelle discrète
- utiliser un petit pictogramme SVG monochrome si nécessaire
- renforcer l’état hover/sélection dans le cadre DS

Fichiers impactés:
- `src/components/wizard/StepType.tsx`

Décision:
- important, faible coût

### Correction 6 — rendre `StepSpace` plus scannable

Problème utilisateur:
- le type de mur est devenu moins évident à choisir

Cause probable:
- remplacement des radios visibles par un `Select`

Solution proposée:
- revenir à un groupe de choix visibles compatible DS
- à défaut, ajouter une aide très claire sous le champ

Fichiers impactés:
- `src/components/wizard/StepSpace.tsx`

Décision:
- faible coût, bon gain

### Correction 7 — clarifier le Dashboard en français métier simple

Problème utilisateur:
- `Procurement`, `Assumptions` et certains codes métier ne disent pas immédiatement quoi regarder

Cause probable:
- vocabulaire interne/technique exposé comme libellé primaire

Solution proposée:
- renommer les éléments visibles:
  - `Procurement` → `Approvisionnement`
  - `Assumptions` → `Hypothèses`
- garder le terme technique en aide secondaire si nécessaire
- ajouter une phrase courte: “Achat”, “Achat + retouche”, “Débit panneau”

Fichiers impactés:
- `src/components/result/Dashboard.tsx`
- composants annexes d’affichage procurement si nécessaire

Décision:
- à faire immédiatement

### Correction 8 — expliciter la façade 2D et la sélection

Problème utilisateur:
- on voit la façade, mais on ne comprend pas forcément ce qu’on peut faire avec

Cause probable:
- priorité donnée à la densité informative, pas à l’onboarding local de la vue

Solution proposée:
- sous `Vue Façade`, ajouter un sous-texte du type:
  `Cliquez une zone ou une pièce pour voir son détail à droite`
- rendre l’état sélectionné plus évident côté façade et inspector
- afficher une aide vide plus pédagogique quand rien n’est sélectionné

Fichiers impactés:
- `src/components/result/Dashboard.tsx`
- `src/components/result/Facade2DView.tsx`

Décision:
- important

### Correction 9 — remettre un rail d’actions projet plus explicite

Problème utilisateur:
- import/export/aide/projets sont plus cachés qu’avant

Cause probable:
- simplification extrême du shell V3 et transfert d’actions vers `MoreMenu`

Solution proposée:
- garder un shell compact, mais afficher explicitement:
  - `Mes projets`
  - `Exporter`
  - `Importer`
  - `Aide`
- éviter le simple bouton `...` comme point d’entrée principal

Fichiers impactés:
- `src/App.tsx`
- `src/components/MoreMenu.tsx`

Décision:
- à faire si l’on constate des utilisateurs perdus sur la gestion de projet

### Correction 10 — ajouter une transition claire entre wizard et résultat

Problème utilisateur:
- après `Générer`, on arrive dans un Dashboard dense sans explication de lecture

Cause probable:
- le pipeline technique est bon, mais il n’y a pas de moment d’atterrissage produit

Solution proposée:
- ajouter en haut du Dashboard un résumé initial ou une bannière courte:
  - type de meuble
  - dimensions retenues
  - prochaine action conseillée: `Vérifier la façade`, `Contrôler l’approvisionnement`, `Exporter le PDF`

Fichiers impactés:
- `src/components/result/Dashboard.tsx`

Décision:
- à faire rapidement

## 5. Décisions recommandées

### À faire tout de suite

- retirer ou renommer `Éditeur classique`
- rendre les projets legacy exploitables via duplication/migration V3
- redonner de la visibilité au mode `Je décris ce que je range`
- franciser et expliciter `Procurement` / `Assumptions`
- ajouter une transition claire entre wizard et résultat

### À faire ensuite

- rendre `StepType` plus discriminant
- rendre `StepSpace` plus scannable
- expliciter la façade 2D
- remettre un rail d’actions projet plus clair

### À ne pas refaire

- revenir à l’ancien shell visuel global
- réintroduire tous les onglets legacy
- casser le DS pour retrouver artificiellement l’ancien look

## Verdict

La refonte n’est pas “mauvaise” sur le plan visuel, mais elle a trop privilégié la cohérence système au détriment de la lisibilité produit et de certains usages réels.

Le vrai sujet n’est pas de revenir en arrière. Le vrai sujet est de réparer trois erreurs:

1. avoir supprimé des chemins utiles sans alternative suffisante
2. avoir gardé des promesses d’interface devenues fausses
3. avoir rendu plusieurs étapes plus denses que pédagogiques

Une correction ciblée sur ces points suffira probablement à retrouver un produit plus clair sans refaire toute l’interface.
