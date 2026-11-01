# Brief v0.3 : « ce n'est pas Pokémon en IA, c'est un autre jeu »

Retours du joueur sur la v0.2 (validés), et décisions prises :

## 1. Nouvelle intro : l'évasion du Centre de Conformité n°7 (AIACT)
- Plus de Maman, plus de village de départ, plus de professeur qui offre un starter.
- Le jour de sa remise de diplôme, le joueur a été **arrêté par l'AIACT pour « vibe coding sans licence »**. Il se réveille dans une **cellule** du Centre de Conformité n°7.
- Un **PokAI scellé** lui parle à travers le mur (par le chat de LatentOS). Dans le bloc des cellules, **trois PokAI sont scellés** (claude_haiku, phi_1, gemma) : le joueur **en libère un**, c'est son premier PokAI (`open: starter_choice`, présenté comme « libérer un modèle »).
- **Tutoriel en infiltration** : des gardes de l'AIACT patrouillent (`patrol` + `sightRange`). S'ils voient le joueur, c'est un combat de dresseur (premiers combats). Le joueur trouve des Clés API dans un casier, un terminal pour pirater une porte, un Agent qui dort…
- La sortie débouche directement dans la **mégapole Latentia City**.
- Le rival n'est plus « Kévin le voisin » : c'est un **co-détenu** qui s'évade en même temps et qui veut les mêmes modèles.

## 2. Monde : mégapole + autoroutes de données
- **Latentia City** (`kind: 'city'`) : une **grande ville** (~64×56) en quartiers.
  - Gratte-ciel du Silicon District, restaurants (« Le Token Bistro », « Prompt & Pasta »), magasin de vêtements (« Merch & Swag », sweats de conférence), boutique de GPU de Jensen Cuir, cafés, place centrale avec un écran géant.
  - Le **Hub Hugging Face** : un **bâtiment unique et stylisé** en forme de 🤗 géant (visage jaune, deux mains qui enlacent l'entrée). Il se reconnaît au premier coup d'œil, c'est une réinterprétation et non le fichier du logo.
  - Le **Benchmark HumanEval** est une tour de verre, et la Tour de Conformité de l'AIACT, grise, se voit au loin.
- **Routes = autoroutes de données** (`kind: 'route'`).
  - Voies lumineuses avec des **paquets de données qui circulent**, et des bretelles de fibre optique.
  - Les **zones de câbles** et les **flux de data** sont les zones de rencontre.
  - Des ponts au-dessus des flux, des panneaux d'autoroute satiriques (« Sortie 404 », « Péage : 3 tokens »).
- Port 8080 reste une ville secondaire, plus loin.
- **Beaucoup de PNJ** :
  - des **citoyens ambiants** qui se promènent (`ambient: true`, `wander`), comme des livreurs, des touristes ou des devs qui lisent leur téléphone ;
  - des PNJ utiles qui restent fixes ;
  - plus de méchants (gardes, Agents, Inspecteur Cookie) et plus de gentils (résistance pro-open-source, Clem Delangouste au Hub, Jensen Cuir…).
  - Les PNJ importants (méchants, personnages clés) **ne se promènent pas**.

## 3. Déplacement
- Vue isométrique conservée, mais **déplacement libre en 8 directions aligné sur l'écran** : haut = haut de l'écran. Les collisions restent sur la grille de tuiles (boîte au niveau des pieds).
- Les rencontres se déclenchent à chaque tuile de câble traversée.
- Animations de marche **vraies** : cycle de 4 images (`world/art/char-contract.ts`), légère inclinaison, petites particules de data aux pieds en courant. On court en maintenant Retour ou B.

## 4. Character design
Les personnages actuels sont « sans goût ». Il faut des **silhouettes fortes** : proportions chibi assumées, coiffures et accessoires très typés, palette par personnage, et une ombre riso décalée. Les personnalités doivent se reconnaître (LORE.md §3) et rester affectueuses.

## 5. Combat : effets de statut et équilibrage
- Beaucoup plus de techniques appliquent des **statuts** (Surchauffe = le poison, Hallucinant = la confusion, Rate-limité = la paralysie, En maintenance = le sommeil, Censuré, Déprécié, Panne d'API).
- Les effets doivent être **lisibles** en combat : une puce de statut, une ligne de log à chaque tour, des dégâts de Surchauffe en fin de tour.
- **Équilibrage**, vérifié par simulation :
  - les 3 starters ont des chances proches face au premier garde et au rival ;
  - les niveaux des PokAI sauvages suivent la progression (prison niv. 3–5, ville et autoroute 1 niv. 4–8, autour de Port 8080 niv. 9–13) ;
  - aucune technique ne gagne seule les premiers combats.

## 6. Audio (100 % procédural en WebAudio, aucun fichier)
- Une **musique d'ambiance légère** qui **change de morceau régulièrement** en ville et sur les routes.
- Des **musiques de combat** distinctes : sauvage, dresseur, AIACT, leader. Un jingle de victoire, un jingle d'évolution, une piste de prison tendue.
- Des **effets sonores** sur toute l'interface et en combat. Les volumes se règlent dans Réglages, et le son se déverrouille au premier geste du joueur.

## 7. Casting v0.3 (identifiants de sprites, partagés entre les cartes et les personnages)
Les identifiants existants restent valides : player, kevin (devient le **co-détenu rival**), kartpathy, nurse_hugging, clerk, gourou, agent_conformite, nadelta, kid, scientist, sailor, stagiaire, vibeur_a, vibeur_b, lecube (en ville, pas en prof), mom (plus utilisée).

Nouveaux identifiants :

| Id | Rôle | Se promène ? |
|---|---|---|
| `guard_aiact` | Garde du Centre : casquette grise, lampe torche, gilet « CONFORME » | patrouille |
| `guard_aiact_2` | Garde variante : grande, chignon, talkie-walkie | patrouille |
| `inspector_cookie` | Admin AIACT : imperméable beige, lunettes rondes, sac de cookies | non |
| `greffiere_article52` | Admin AIACT : pile de dossiers, stylo à l'oreille | non |
| `directrice_moratoire` | Cheffe AIACT : tailleur anthracite, chignon serré, gros tampon | non |
| `jensen_cuir` | Jensen Huang : blouson de cuir noir, cheveux poivre et sel | non |
| `clem_delangouste` | Clem Delangue : barbe courte, sweat jaune avec un smiley qui fait un câlin | non |
| `resistance_dev` | Résistance open source : bandana, sticker « open weights » | non |
| `chef` | Restaurant « Le Token Bistro » | non |
| `fashion_clerk` | « Merch & Swag » | non |
| `barista` | Café | non |
| `delivery_rider` | Citoyen livreur : casque, sac cube | oui |
| `tourist` | Citoyen : appareil photo, chemise hawaïenne | oui |
| `dev_phone` | Citoyen dev, les yeux rivés au téléphone | oui |
| `citizen_a`, `citizen_b`, `citizen_c`, `citizen_d` | Citoyens variés et typés | oui |
