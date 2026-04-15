# Mission d’étude #4 — Catalogue de projets-types (tests manuels)

## 1) Familles de tests réellement pertinentes (au vu du moteur actuel)

Le code actuel justifie de prioriser les 9 familles suivantes :

1. **Mobilier courant (génération nominale)** : couvre les types de meubles déjà exposés dans le wizard V3 (bibliothèque, dressing/armoire, meuble TV, buffet, cuisine, SDB, etc.).
2. **Cas limites (dimensions & segmentation)** : test des bornes, profondeurs minimales, hauteur utile/plinthe, largeur très grande qui force le multi-caissons.
3. **Cas atelier / fabrication** : contrôle des sorties exploitables (débit, perçages, chants, quincaillerie, étapes de montage).
4. **Variantes rapides** : validation de l’interprétation des variantes preset + comportements de fallback quand une propriété n’est pas supportée.
5. **Contenu à ranger** : génération de zones via le mode « Je décris ce que je range » (content analyzer).
6. **Bridge V3 → legacy** : conversion pipeline vers `AppState` historique (cm), cohérence des portes, perçages, chants, metadata intent.
7. **Export PDF** : robustesse des sections, pagination, coûts, données de production et lisibilité globale.
8. **Bibliothèque / pièces standard** : CRUD des pièces standard, liaison d’une pièce générée à une pièce de bibliothèque, import/export de bibliothèque.
9. **Persistance / reprise de projet** : sauvegarde locale, duplication, migration legacy, reprise d’un projet V3, conservation des métadonnées V3.

> Note de cadrage: la base V3 référence aussi des projets avancés (ex. sous-escalier, lit mezzanine), mais leur restitution legacy et UX peut rester partielle selon variantes/modules activés. Ces cas sont inclus plus bas en « à différer/avancés ». 

---

## 2) Catalogue structuré de cas manuels

### Légende
- **Difficulté / intérêt** :
  - **N1** = rapide/nominal
  - **N2** = intermédiaire (multi-zones / options)
  - **N3** = stress / révélateur de défauts

---

## Famille A — Mobilier courant

### A1. Bibliothèque simple (nominal)
- **Objectif**: valider le parcours V3 standard sans alerte.
- **Type de meuble**: bibliothèque.
- **Dimensions d’entrée**: 1200 × 2200 × 300 mm, plinthe 80 mm.
- **Modules / organisation attendus**: 1 zone `shelf_adjustable`, tablettes fixes haut/bas + réglables.
- **Points à vérifier**:
  - conversion mm→cm correcte dans la structure;
  - présence des pièces attendues (joues, tablettes);
  - pas d’erreur bloquante validation.
- **Difficulté / intérêt**: **N1**.

### A2. Bibliothèque avec portes basses
- **Objectif**: tester la couverture partielle des portes (zone basse).
- **Type**: bibliothèque.
- **Dimensions**: 1600 × 2400 × 320 mm, plinthe 80 mm.
- **Modules attendus**: zone basse + zone étagères, `door_override=true`.
- **Points à vérifier**:
  - `doorConfig.position=bas` (ou équivalent de rendu);
  - cohérence découpe façade/hauteur séparation;
  - perçages/charnières présents uniquement si portes activées.
- **Difficulté**: **N2**.

### A3. Dressing penderie + étagères
- **Objectif**: valider cohabitation tringle + étagères.
- **Type**: armoire.
- **Dimensions**: 1800 × 2400 × 580 mm, plinthe 80 mm.
- **Modules attendus**: `hanging_rod_short` + `shelf_adjustable`.
- **Points à vérifier**:
  - min profondeur respectée pour penderie;
  - présence quincaillerie tringle;
  - stabilité suggestions/avertissements.
- **Difficulté**: **N2**.

### A4. Meuble TV avec niche technique
- **Objectif**: tester module `tv_niche` + ventilation + passages câbles.
- **Type**: meuble TV.
- **Dimensions**: 1800 × 600 × 450 mm, plinthe 0.
- **Modules attendus**: `tv_niche` + zones tablettes/tiroirs selon variante.
- **Points à vérifier**:
  - avertissement ventilation si désactivée;
  - présence hardware `cable_pass`;
  - rendu propre en plan/débit.
- **Difficulté**: **N2**.

### A5. Meuble chaussures
- **Objectif**: valider `shoe_rack_inclined`.
- **Type**: meuble chaussures.
- **Dimensions**: 1000 × 1200 × 300 mm, plinthe 0.
- **Modules attendus**: `shoe_rack_inclined` + éventuelles tablettes.
- **Points à vérifier**:
  - tablettes inclinées générées;
  - compatibilité profondeur;
  - aucune collision dimensionnelle.
- **Difficulté**: **N2**.

### A6. Banquette coffre
- **Objectif**: valider module `bench_storage`.
- **Type**: banquette coffre.
- **Dimensions**: 1400 × 500 × 500 mm, plinthe 0.
- **Modules attendus**: `bench_storage`.
- **Points à vérifier**:
  - pièces `assise/coffre/traverse` générées;
  - door/abattant fallback cohérent (si non modélisé finement).
- **Difficulté**: **N2**.

### A7. Meuble salle de bain
- **Objectif**: valider preset SDB + matériau humide.
- **Type**: meuble salle de bain.
- **Dimensions**: 1000 × 650 × 450 mm.
- **Modules attendus**: étagères + éventuellement tiroirs.
- **Points à vérifier**:
  - matériau sélectionné conservé;
  - coût/poids plausibles;
  - export PDF propre.
- **Difficulté**: **N1**.

### A8. Cuisine bas + colonne (2 projets)
- **Objectif**: couvrir cuisine bas et configuration haute/colonne.
- **Type**: cuisine.
- **Dimensions**:
  - Bas: 600 × 720 × 560 mm;
  - Colonne: 600 × 2200 × 580 mm.
- **Modules attendus**: tablettes + tiroirs/portes selon variant.
- **Points à vérifier**:
  - comportement plinthe;
  - cohérence hauteurs utiles;
  - hardware charnières/coulisses si pertinent.
- **Difficulté**: **N2**.

### A9. Commode
- **Objectif**: tester dominante tiroirs (`drawer_stack`).
- **Type**: commode.
- **Dimensions**: 1000 × 900 × 500 mm.
- **Modules attendus**: 1+ zones `drawer_stack`.
- **Points à vérifier**:
  - nombre de façades tiroirs;
  - avertissement large tiroir > 800 mm;
  - perçages/hardware cohérents.
- **Difficulté**: **N2**.

### A10. Vestiaire d’entrée
- **Objectif**: tester combinaison penderie courte + niches.
- **Type**: vestiaire entrée.
- **Dimensions**: 1200 × 2100 × 580 mm.
- **Modules attendus**: `hanging_rod_short` + `shelf_adjustable`.
- **Points à vérifier**:
  - équilibre zones;
  - compréhension UX des paramètres de zone.
- **Difficulté**: **N2**.

### A11. Cave à vin
- **Objectif**: valider `wine_rack` et pièces `croisillon`.
- **Type**: cave à vin.
- **Dimensions**: 800 × 2000 × 400 mm.
- **Modules attendus**: `wine_rack` (+ tablettes support).
- **Points à vérifier**:
  - génération rangées/colonnes;
  - absence d’erreurs de collision;
  - débit lisible.
- **Difficulté**: **N2**.

---

## Famille B — Cas limites

### B1. Meuble très large (segmentation multi-caissons)
- **Objectif**: forcer découpe en plusieurs corps.
- **Type**: bibliothèque.
- **Dimensions**: 4000 × 2200 × 300 mm.
- **Attendu**: plusieurs bodies, somme des largeurs conservée.
- **À vérifier**: pas de perte mm→cm, shared boundaries cohérentes.
- **Difficulté**: **N3**.

### B2. Meuble très haut
- **Objectif**: tester hauteur proche plafond et bandeau/plinthe.
- **Type**: placard.
- **Dimensions**: 1600 × 2950 × 600 mm, plinthe 80.
- **Attendu**: zones stables, pas de dépassement.
- **À vérifier**: validation et lisibilité montage.
- **Difficulté**: **N3**.

### B3. Meuble très peu profond
- **Objectif**: déclencher contraintes profondeur modules.
- **Type**: armoire.
- **Dimensions**: 1000 × 2200 × 350 mm.
- **Attendu**: erreur pour penderie (min 550 mm).
- **À vérifier**: sévérité bloquante bien remontée.
- **Difficulté**: **N3**.

### B4. Meuble suspendu
- **Objectif**: tester `suspended_override` / wall mount.
- **Type**: étagère murale.
- **Dimensions**: 1200 × 500 × 250 mm, plinthe 0.
- **Attendu**: hardware de fixation murale (`wall_mount`).
- **À vérifier**: absence plinthe, montage mural explicite.
- **Difficulté**: **N2**.

### B5. Portes lourdes (largeur forte)
- **Objectif**: stresser charnières et couverture portes.
- **Type**: placard.
- **Dimensions**: 1800 × 2400 × 600 mm.
- **Attendu**: 2 portes / demi-recouvrement (ou règle preset).
- **À vérifier**: quincaillerie charnières quantité plausible.
- **Difficulté**: **N3**.

### B6. Nombreuses zones manuelles
- **Objectif**: tester stabilité UI + pipeline sur 8–10 zones.
- **Type**: bibliothèque.
- **Dimensions**: 1200 × 2400 × 320 mm.
- **Attendu**: génération sans crash.
- **À vérifier**: somme des hauteurs = hauteur utile, UI fluide.
- **Difficulté**: **N3**.

---

## Famille C — Cas atelier / fabrication

### C1. Contrôle chants visibles
- **Objectif**: vérifier edge banding des pièces visibles.
- **Type**: bibliothèque.
- **Entrée**: A1.
- **Attendu**: chants sur joues/tablettes visibles, pas sur fond si non requis.
- **À vérifier**: onglet débit + notices chants.
- **Difficulté**: **N2**.

### C2. Contrôle perçage système 32
- **Objectif**: vérifier perçages sur joues avec tablettes réglables.
- **Type**: bibliothèque.
- **Entrée**: A1 ou A3.
- **Attendu**: `drilling_count` > 0 sur joues concernées.
- **À vérifier**: cohérence quantités/perçages au plan de perçage.
- **Difficulté**: **N2**.

### C3. Quincaillerie tiroirs
- **Objectif**: vérifier sorties quincaillerie sur `drawer_stack`.
- **Type**: commode.
- **Entrée**: A9.
- **Attendu**: coulisses + poignées + vis associées.
- **À vérifier**: quantités alignées au nombre de tiroirs.
- **Difficulté**: **N2**.

### C4. Débit multi-panneaux / rendement
- **Objectif**: valider nesting et rendement sur gros projet.
- **Type**: bibliothèque très large.
- **Entrée**: B1.
- **Attendu**: plusieurs panneaux, rendement calculé, pièces non placées explicites.
- **À vérifier**: métriques stabilité, aucune pièce perdue silencieusement.
- **Difficulté**: **N3**.

---

## Famille D — Variantes rapides

### D1. Variante « plus de tiroirs »
- **Objectif**: vérifier mapping variante → zones.
- **Type**: commode/buffet.
- **Dimensions**: 1200 × 900 × 500 mm.
- **Attendu**: augmentation `drawer_stack`.
- **À vérifier**: cohérence nombre tiroirs / hauteur zone.
- **Difficulté**: **N2**.

### D2. Variante avec propriétés non supportées
- **Objectif**: valider warnings de fallback (`vitrage`, `pateres`, etc.).
- **Type**: vestiaire/placard.
- **Dimensions**: 1200 × 2100 × 580 mm.
- **Attendu**: warning explicite, génération dégradée mais stable.
- **À vérifier**: message compréhensible pour l’utilisateur.
- **Difficulté**: **N3**.

### D3. Variante avec portes désactivées
- **Objectif**: vérifier `door_override=false`.
- **Type**: placard.
- **Dimensions**: 1000 × 2200 × 600 mm.
- **Attendu**: pas de pièces `porte`, pas de `doorConfig`.
- **À vérifier**: absence hardware charnières.
- **Difficulté**: **N2**.

---

## Famille E — Contenu à ranger

### E1. Bibliothèque orientée livres
- **Objectif**: tester conversion contenu → zones étagères.
- **Type**: bibliothèque.
- **Dimensions**: 1400 × 2200 × 320 mm.
- **Contenu**: livres poches + BD + classeurs.
- **Attendu**: majorité `shelf_adjustable` avec hauteurs adaptées.
- **À vérifier**: pertinence ergonomique des zones.
- **Difficulté**: **N2**.

### E2. Dressing mixte vêtements
- **Objectif**: mix penderie courte/longue + tablettes.
- **Type**: armoire.
- **Dimensions**: 1800 × 2400 × 580 mm.
- **Contenu**: chemises, manteaux, boîtes.
- **Attendu**: zones penderie + étagères.
- **À vérifier**: compromis hauteur/profondeur cohérent.
- **Difficulté**: **N2**.

### E3. Entrée familiale (chaussures + vestes)
- **Objectif**: tester mix `shoe_rack_inclined` + penderie.
- **Type**: vestiaire entrée.
- **Dimensions**: 1400 × 2200 × 400 mm.
- **Contenu**: chaussures nombreuses + vestes.
- **Attendu**: alerte éventuelle profondeur vestes, zones mixtes.
- **À vérifier**: messages d’arbitrage compréhensibles.
- **Difficulté**: **N3**.

---

## Famille F — Bridge V3 → legacy

### F1. Cohérence dimensionnelle mm→cm
- **Objectif**: confirmer conversion globale.
- **Type**: bibliothèque.
- **Entrée**: 800 × 1800 × 300 mm.
- **Attendu**: projet legacy 80 × 180 × 30 cm.
- **À vérifier**: pièces cohérentes et sans arrondis destructifs.
- **Difficulté**: **N2**.

### F2. Bridge portes placard
- **Objectif**: mapping door layout V3 vers `doorConfig` legacy.
- **Type**: placard.
- **Entrée**: 1100 × 2000 × 600 mm.
- **Attendu**: `doorConfig` défini + pièces portes.
- **À vérifier**: count/poseType alignés à la sortie V3.
- **Difficulté**: **N2**.

### F3. Bridge suspension / mur
- **Objectif**: propagation quincaillerie murale.
- **Type**: étagère murale.
- **Entrée**: 800 × 400 × 250 mm.
- **Attendu**: `hardwareList` avec catégorie `wall_mount`.
- **À vérifier**: présence en dashboard + export PDF.
- **Difficulté**: **N2**.

---

## Famille G — Export PDF

### G1. PDF projet simple
- **Objectif**: vérifier génération nominale.
- **Type**: bibliothèque A1.
- **Attendu**: couverture, dimensions, résumé, panneaux.
- **À vérifier**: accents/encodage, pagination, nom de fichier daté.
- **Difficulté**: **N1**.

### G2. PDF projet complexe
- **Objectif**: tester pagination longue + tableaux multiples.
- **Type**: B1 + C4.
- **Attendu**: multi-pages stables, pieds de page corrects.
- **À vérifier**: pas de chevauchement texte/tableaux.
- **Difficulté**: **N3**.

### G3. PDF avec coûts + quincaillerie
- **Objectif**: vérifier sections coût et hardware.
- **Type**: commode/cuisine.
- **Attendu**: coût total HT, tableaux hardware.
- **À vérifier**: cohérence quantités/coûts.
- **Difficulté**: **N2**.

---

## Famille H — Bibliothèque / pièces standard

### H1. CRUD pièce standard utilisateur
- **Objectif**: add/update/delete pièce standard.
- **Type**: bibliothèque pièces.
- **Entrée**: créer tablette custom 600×250×18.
- **Attendu**: persistance locale + édition.
- **À vérifier**: IDs user_, affichage manager.
- **Difficulté**: **N1**.

### H2. Liaison pièce générée → pièce standard
- **Objectif**: verrouiller une pièce sur standard part.
- **Type**: bibliothèque.
- **Entrée**: lier une tablette réglable à une référence standard.
- **Attendu**: dimensions héritées de la pièce standard, `locked=true`.
- **À vérifier**: pas d’écrasement lors régénération.
- **Difficulté**: **N3**.

### H3. Export / import bibliothèque
- **Objectif**: robustesse transfert bibliothèque.
- **Type**: bibliothèque pièces.
- **Entrée**: exporter JSON, reset, réimport.
- **Attendu**: pas de doublons seeds, ajout user correct.
- **À vérifier**: compte de pièces avant/après.
- **Difficulté**: **N2**.

---

## Famille I — Persistance / reprise de projet

### I1. Sauvegarde / reprise simple
- **Objectif**: vérifier cycle create → save → reload.
- **Type**: tout projet nominal.
- **Attendu**: état strictement conservé.
- **À vérifier**: nom, dimensions, bodies, pièces.
- **Difficulté**: **N1**.

### I2. Duplication et renommage
- **Objectif**: valider duplicate + metadata index.
- **Type**: projet existant.
- **Attendu**: nouvel ID, nom clone, historique conservé.
- **À vérifier**: `createdAt/updatedAt`, bodyCount.
- **Difficulté**: **N1**.

### I3. Projet V3 avec metadata conservée
- **Objectif**: vérifier `saveV3` puis `save` legacy ultérieur.
- **Type**: projet V3.
- **Attendu**: metadata v3 préservée après autosave.
- **À vérifier**: reprise wizard V3 au reload.
- **Difficulté**: **N2**.

### I4. Migration legacy v1
- **Objectif**: robustesse migration clé historique.
- **Type**: projet legacy importé.
- **Attendu**: conversion vers stockage version 2.
- **À vérifier**: absence perte données, projet courant défini.
- **Difficulté**: **N3**.

---

## 3) Ordre recommandé d’exécution

### Parcours début (prise en main + confiance)
1. A1 Bibliothèque simple
2. A4 Meuble TV
3. A7 Salle de bain
4. G1 PDF simple
5. I1 Sauvegarde/reprise
6. H1 CRUD pièce standard

### Parcours intermédiaire (couverture fonctionnelle)
1. A3 Dressing penderie + étagères
2. A9 Commode (tiroirs)
3. D1 Variante tiroirs
4. E1 Contenu à ranger (livres)
5. F2 Bridge portes placard
6. G3 PDF coûts + hardware
7. I3 Persistance V3

### Parcours stress test (bugs probables)
1. B1 Très large multi-caissons
2. B3 Très peu profond (erreurs bloquantes)
3. B6 Nombreuses zones
4. C4 Débit multi-panneaux
5. D2 Variantes non supportées + warnings
6. G2 PDF complexe multipage
7. H2 Liaison standard part verrouillée
8. I4 Migration legacy v1

---

## 4) Cas les plus révélateurs de bugs probables

Priorité haute (à exécuter systématiquement à chaque release) :
- **B1** (segmentation largeur extrême).
- **B3** (validation profondeur bloquante).
- **B6** (stabilité UI et somme des zones).
- **C4** (nesting / pièces non placées).
- **F1/F2/F3** (bridge V3→legacy: dimensions, portes, wall mount).
- **G2** (PDF complexe et pagination).
- **I3/I4** (persistance V3 + migration legacy).
- **H2** (verrouillage pièce standard sous régénération).

Pourquoi: ces cas ciblent les zones où le code combine le plus de transformations (intent → layout → structure → geometry → bridge → export/persist).

---

## 5) Cas les plus révélateurs d’incohérences UX

- **D2**: warnings variantes non supportées (clarté du « ce que l’outil a réellement fait »).
- **E2/E3**: contenu à ranger (l’utilisateur juge la pertinence métier, pas juste la validité technique).
- **B6**: édition de nombreuses zones (ergonomie de correction des hauteurs).
- **A2**: portes basses (compréhension de la couverture de porte).
- **G3**: lisibilité métier du PDF pour un artisan/client.

---

## 6) Cas probablement trop avancés aujourd’hui (à différer si besoin)

À garder dans un lot « exploration », pas en campagne bloquante de release :

1. **Sous-escalier complet paramétrique** (géométrie fine des pans biais, retraits locaux) : le type existe côté catalogue V3 mais l’exhaustivité de modélisation peut rester partielle selon variante réelle.
2. **Lit cabane / mezzanine structurel complet** (assemblages et sécurité avancés) : utile, mais hors cœur « caisson/panneaux ».
3. **Variantes nécessitant composants explicitement non supportés** (`vitrage`, `pateres`, abattants compacts, position caisson gauche/droite détaillée) : aujourd’hui gérées en fallback avec warning, pas en rendu complet.
4. **Contraintes chantier complexes multi-obstacles** (`site_constraints` riches) : modèle de données présent, mais couverture UX/fabrication potentiellement incomplète pour un usage production strict.

---

## 7) Synthèse opérationnelle

- Ce catalogue fournit une **base manuelle réaliste** pour valider l’app en profondeur sans automatisation.
- Pour un cycle rapide, exécuter d’abord le **parcours début**, puis 4 cas du **stress test** (B1, B3, G2, I3).
- Pour une release majeure, exécuter **l’intégralité des 9 familles**.
