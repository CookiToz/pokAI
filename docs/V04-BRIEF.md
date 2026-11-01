# Brief v0.4 : grandes villes à thème, forêts, mise en scène

Retours du joueur sur la v0.3 (validés), et décisions prises par le lead :

## 1. Structure du monde : uniquement de grandes villes à thème, reliées par des routes en forêt
- **Les autoroutes de données bleues sont supprimées** : on ne comprenait pas ce que c'était. Les routes deviennent des **forêts simples et lisibles**.
  - Sentier, pins et bouleaux, rivière et pont en bois, rondins, parterres de fleurs.
  - Les **câbles dans l'herbe** restent la zone de rencontre.
- **Trois grandes villes**, chacune avec son thème visuel, son Hub et son Benchmark (arène) :
  1. **Latentia City**, la ville de départ : downtown tech et néon.
     - Hub Hugging Face, **Benchmark HumanEval** (Satya Nadelta, badge `badge_commit`).
     - La prison du Centre de Conformité y débouche.
  2. **Hugging Grove** : une éco-cité open source dans la forêt.
     - Maisons dans les arbres et passerelles.
     - Le **Grand Arbre** (`lm_great_tree`) est le QG du Hub.
     - **Benchmark Open-Weights** (Arthur Menschtral, badge `badge_vent`) : seuls les PokAI open-weights peuvent y combattre.
  3. **Port 8080** : une ville portuaire industrielle.
     - Conteneurs, grues, phare.
     - L'AIACT saisit des cargos de GPU.
     - **Benchmark ARC-AGI** (Demis Hassabyte, badge `badge_raisonnement`).
- **Routes** :
  - **Forêt des Poids** relie Latentia City à Hugging Grove.
  - **Sentier Côtier** relie Hugging Grove à Port 8080.
- **Panneaux directionnels** (`signpost`) à chaque sortie et à chaque croisement : « ← Hugging Grove 2 km · Port 8080 → ».
- La **minimap** affiche les sorties et les lieux importants (`MapDef.exits`, `MapDef.landmarks`).

## 2. Énigmes
- Mécaniques génériques (`MapDef.gates/switches/pushables`) :
  - des **dalles interrupteur** qui s'activent sous le joueur ou sous une caisse ;
  - des **caisses à pousser** ;
  - des **portes** liées à un drapeau.
- Chaque Benchmark est une **arène à énigme stylée** qu'il faut résoudre avant d'atteindre le leader :
  - **HumanEval** : des dalles « tests unitaires » à allumer dans le bon ordre.
  - **Open-Weights** : pousser les « poids » (des caisses) sur les dalles pour assembler le modèle.
  - **ARC-AGI** : reproduire un motif sur une grille de dalles.
- On trouve aussi des énigmes plus légères sur les routes : un raccourci derrière une caisse, un coffre caché, une devinette au terminal (par script).

## 3. Mise en scène
- **Une cinématique d'intro** au lancement d'une nouvelle partie, d'environ 40 s, que l'on peut passer. Elle est animée en code (SVG et CSS) dans le style riso : le boom de l'IA, la montée de l'AIACT, l'arrestation le jour du diplôme, les modèles scellés, puis le titre.
- **Création du personnage** juste après : **corps masculin ou féminin**, teint, coiffure, couleur des cheveux, couleur du haut et du bas, accessoire. Le résultat apparaît sur le sprite du monde et sur le portrait.
- **Les Hubs** ont des intérieurs stylés (`hub_floor`, `hub_reception`, `repo_shelf`) à la gloire du 🤗. **Les arènes** aussi (`arena_floor`, `arena_line`, `scoreboard`).
- **Vague 2** (après la correction de l'équipe en cours) :
  - **animations d'attaque** par type, et **animation d'évolution** spectaculaire ;
  - décors de duel propres à chaque arène ;
  - **progression** « dopamine bien dosée » : succès, récompenses régulières, courbe de difficulté vérifiée.

## 4. Design des PokAI
- Les **évolutions doivent changer réellement de design** : nouvelle silhouette, nouvelle posture et de nouveaux éléments, et pas seulement « le même plus gros avec un accessoire ».
- On garde l'identité de la lignée (couleurs de la marque, motif) d'un stade à l'autre.
