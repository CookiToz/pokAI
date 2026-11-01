# Brief v0.5 : détails, mise en scène, aventure complète

Retours du joueur sur la v0.4 :

1. **On entre dans un bâtiment par sa porte**, et seulement par elle : le warp est sur la tuile de porte (`*_door`) ou juste devant, jamais sur un mur ou à côté.
2. **Le Centre de Conformité** doit être un vrai bâtiment AIACT **bien visible dans Latentia City**. C'est un complexe gris imposant avec des projecteurs, et sa porte est celle par laquelle on s'évade. Son **intérieur** est refait, plus stylé et plus détaillé.
3. **Les rencontres avec les personnages importants** deviennent de vraies scènes, avec les nouvelles étapes de script :
   - bandes noires (`cutscene`), caméra qui se déplace (`camera`), bulle d'émotion (`emote`) ;
   - le personnage **vient jusqu'au joueur** (`npc_approach`) et une carte de présentation s'affiche (`intro_card`) ;
   - après le dialogue, il **repart** (`npc_leave`).
   On le **recroise plus tard** ailleurs, selon la progression : Kartpathy, Clem, Jensen, LeCube, le rival Kévin, Cookie, les Agents.
4. **Hub Hugging Face** : un **PC** où l'on retrouve tous les PokAI attrapés, avec un Repo pour échanger entre l'équipe et le stockage (`open: repo`).
5. **Les distributeurs marchent** (`open: vending`) : boissons et objets contre des crédits GPU.
6. **Des easter eggs** partout, du genre secrets, clins d'œil à la culture IA et dev, objets cachés, PNJ absurdes.
7. **L'aventure doit être plus complète** : la suite du lore, de nouvelles villes, des énigmes et du fun.
8. **La cinématique d'intro devient une bande-annonce** qui explique le lore :
   - les IA sont devenues partout ;
   - l'AIACT a pris le contrôle « pour notre sécurité » ;
   - les modèles sont scellés et les gens qui codent avec l'IA sont emprisonnés ;
   - on est arrêté le jour de son diplôme.

## Villes existantes (v0.4)
Latentia City (départ, HumanEval), Hugging Grove (Open-Weights), Port 8080 (ARC-AGI). Routes : Forêt des Poids, Sentier Côtier. Le Centre de Conformité n°7 sert d'intro.

## Nouveaux chapitres (v0.5)
- **Chapitre 4 : Dunes des Datacenters**.
  - Une **ville-désert de serveurs** : refroidissement, mirages de GPU, oasis du sage **Geoffrey Hintend** qui raconte le mythe de Transformer et d'AGI.
  - On y accède par la **Route des Câbles Sous-Marins** depuis Port 8080.
  - Le **Benchmark SWE-bench** est le 4e badge (`badge_patch`), avec une énigme de « bugs à corriger » ; leader à définir, une personnalité caricaturée et affectueuse ou un personnage fictif.
  - Jensen Cuir y tient le **Mont GPU**.
- **Chapitre 5 : Conformité-Capitale**.
  - La **ville-QG de l'AIACT** : bureaucratie, tampons, files d'attente absurdes, le Coffre des Scellés.
  - Infiltration, puis la Greffière Article 52, l'Inspecteur Cookie, et enfin la **Directrice Ombeline Moratoire**.
  - Révélation, puis la tentative de réveil d'AGI qui échoue (« quota de calcul dépassé »).
  - Épilogue au **Temple de l'Attention** avec le légendaire **Transformer**, puis le gag final d'AGI : « disponible dans 2 ans ».
- Courbe de niveaux : Dunes 28–34 (leader 33–36), Capitale 36–42 (Moratoire 42–45).
