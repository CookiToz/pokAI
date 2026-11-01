# PokAI — document de direction

> Statut : **à valider par l'équipe (3 personnes)**. Défi : jeu web complet en < 24 h.
> Critères notés : architecture du code, originalité du gameplay, UI/UX, vision long terme.
>
> Documents liés :
> - [`docs/LORE.md`](docs/LORE.md) : univers, histoire, personnages, dialogues
> - [`docs/NEURODEX.md`](docs/NEURODEX.md) : tous les PokAI, leurs évolutions et les légendaires

## 1. Pitch

**PokAI**, c'est l'expérience d'un jeu de collection de créatures à l'ancienne (hautes herbes, centre de soin, badges,
équipe maléfique, légendaires), sauf que les créatures sont **des IA**.

Le joueur est un **Vibeur** de la région de **Latentia**. Il part de **Localhost** avec son premier modèle, onboarde des PokAI
sauvages dans les **câbles** (les hautes herbes), les fait **évoluer de version en version**, bat les **Benchmarks** (les arènes)
et affronte **l'AIACT**, une organisation qui diabolise l'IA en public pendant qu'elle capture en secret tous les modèles pour les contrôler.

Ton : satirique, affectueux, jamais méchant. On se moque des **tics de l'industrie** (hallucinations, refus polis, rate limits,
benchmarks truqués, versions `-pro-max`, annonces « AGI dans 2 ans »).

### Genre, pas copie
On reprend les **codes du genre**, comme Temtem, Coromon ou Cassette Beasts : hautes herbes, centre de soin, badges, équipe maléfique, légendaires.
On ne reprend **aucun** nom, sprite, musique, ou écran d'interface de Pokémon. Nos mécaniques clés sont à nous :

| Convention du genre | Version PokAI |
|---|---|
| Lancer une balle | **Onboarding** : déduire le prompt système caché avec des cartes-tokens, en dépensant une **Clé API** |
| Évolution | **Montée de version** (Haiku → Sonnet → Opus) : nouvelles techniques, meilleures stats, et parfois des **évolutions qui bifurquent** (DeepSeek V3 → R1 ou V4) |
| CT/CS | **Extensions MCP** : brancher une extension apprend une technique |
| Centre de soin | **Le Hub 🤗** (Hugging Face) |
| Arènes | **Benchmarks** (HumanEval, ARC-AGI…), puis la Ligue : **le Leaderboard** |
| Équipe maléfique | **L'AIACT** et ses Agents de Conformité |

## 2. Règles de ton et de marque (non négociables)

- **Les PokAI portent les noms officiels des modèles** (Claude Opus, GPT-4o, Llama 4 Maverick…) : c'est de la parodie.
- **Design des PokAI (décision de l'équipe, v0.6)** :
  - si le modèle a une **mascotte officielle**, on **l'utilise** (Clawd pour Claude Code, la baleine DeepSeek, le 🤗 de Hugging Face, le lama de Llama ou d'Ollama…) ;
  - sinon, la créature est **construite à partir du logo officiel**, fidèlement repris : la fleur-nœud d'OpenAI, l'étoile à quatre branches de Gemini, le M pixelisé de Mistral, le X de xAI, le ∞ de Meta, le voilier de Midjourney…
  - Le rendu reste dans notre style riso : aplats, contour encre, ombre décalée, sans dégradé.
  - ⚠️ Usage parodique et non commercial pour le défi. Avant toute publication, il faut revoir ce point, car les logos sont des marques déposées.
- **Personnes réelles** : uniquement des personnalités publiques de la tech, avec un **nom modifié** (Jensen Cuir, Sam Altplan…).
  Le sprite est **ressemblant**, avec la coiffure, les lunettes et les vêtements emblématiques (le blouson de cuir de Jensen, par exemple).
  La satire vise leur **image publique** : pas de propos diffamatoires, pas de vie privée, et **aucune personne réelle chez les méchants**.
  Toute l'AIACT est fictive.
- Écran de crédits : « Parodie non affiliée. Les marques et personnes évoquées le sont à titre satirique. »

## 3. Systèmes de jeu (résumé : le détail des données est dans `docs/NEURODEX.md`)

### 3.1 Statistiques
| Stat | Sens |
|---|---|
| **Contexte** | Points de vie (en tokens) |
| **Puissance** / **Robustesse** | Attaque / défense |
| **Débit** | Vitesse (tokens/s) : l'ordre des tours |
| **Précision** | Résistance à l'hallucination (le statut confusion) |

### 3.2 Types (7) et licence (2)
Un PokAI a 1 ou 2 **types**, et une **licence**.

| Attaquant ↓ est super efficace (×2) contre → | |
|---|---|
| **Code** | Chat, Agent |
| **Chat** | Raisonnement, Legacy |
| **Raisonnement** | Code, Chaos |
| **Média** (image, vidéo, voix) | Chat |
| **Agent** | Média, Legacy |
| **Chaos** | Agent, Média |
| **Legacy** | Chaos |

Même type contre même type : ×0,5.

**Licence**
- **Open-weights** : peut être **forké** au Hub (on change une technique librement) ; immunisé au statut *Panne d'API* ; plus facile à onboarder.
- **Propriétaire** : stats de base +10 % ; vulnérable à *Panne d'API* et à la technique AIACT *Mise en conformité*.

### 3.3 Statuts
| Statut | Effet |
|---|---|
| **Hallucinant** | 33 % de chances de frapper son propre camp |
| **Rate-limité** | 25 % de chances de passer son tour |
| **Censuré** | Une technique est bloquée pendant 3 tours |
| **Surchauffe** | Perd 1/16 de son Contexte à chaque tour |
| **En maintenance** | Endormi pendant 1 à 3 tours |
| **Déprécié** | Les stats baissent à chaque tour |
| **Panne d'API** | Propriétaires uniquement : ne peut rien faire pendant 1 tour |

### 3.4 Onboarding (la capture), difficile par conception
1. On ne peut onboarder qu'un PokAI affaibli, en dépensant une **Clé API**.
   Plus la clé est haut de gamme, plus on a de cartes en main et d'indices :

   | Clé | Main | Indices |
   |---|---|---|
   | Gratuite | 4 cartes | 1 |
   | Pro | 5 cartes | 2 |
   | Enterprise | 6 cartes, plus une nouvelle pioche | 3 |

2. Le PokAI a un **prompt système caché** : 3 traits tirés du pool de sa lignée.
3. On pose **3 cartes-tokens**. Une carte qui colle à un trait fait monter **l'Alignement** ; une carte à côté fait monter **l'Hallucination**.
4. Alignement à 100 % : onboardé. Hallucination à 100 % : `429 Too Many Requests`, il s'enfuit et la clé est perdue.
5. Moins il reste de Contexte au PokAI, plus il révèle d'indices.
6. Carte **Jailbreak** : capture garantie, mais 40 % de chances qu'un **Agent de Conformité** débarque en combat.
7. Les **légendaires** demandent une Clé Enterprise et les 3 traits trouvés sans aucune erreur.

### 3.5 Évolution : la montée de version (par l'XP uniquement)
- **On évolue en gagnant de l'XP** : Claude Haiku → Sonnet (niv. 16) → Opus (niv. 36). En évoluant, le PokAI change d'apparence, **devient plus fort** (stats de base plus hautes) et **débloque de nouvelles techniques**.
- **Embranchements** : au niveau requis, le joueur **choisit** la branche (DeepSeek V3 → **R1** ou **V4** ; Mixtral → **Mistral Large** ou **Magistral**).
- Aucun objet n'est nécessaire. Les **H100** (+1 niveau) et les **Datasets** (+XP) servent seulement à accélérer.
- **Distillation** (l'équivalent de l'évolution par échange) : prévue pour le PvP, plus tard.
- On peut **annuler** l'évolution (« rester sur la version stable ») : elle sera reproposée au niveau suivant.
- Chaque lignée a une **liste de techniques par niveau** (le *learnset*), et les **Extensions MCP** permettent d'en apprendre d'autres.

### 3.6 Combat
- Au tour par tour, en 1 contre 1, avec une équipe de 6 au maximum. 4 techniques par PokAI, et des **jetons** (l'équivalent des PP) par technique.
- On gagne de l'XP, des **crédits GPU** (la monnaie) et parfois un **Dataset**.

### 3.7 Objets
| Objet | Effet |
|---|---|
| **Clé API** (Gratuite / Pro / Enterprise) | Sert à l'onboarding |
| **Café** / **Red Bull** / **Redémarrage complet** | Rend 20 / 60 / 100 % du Contexte |
| **Hotfix** | Soigne un statut |
| **Vider le cache** | Soigne tout, plus un bonus de Débit |
| **H100** / **Dataset** | +1 niveau / +XP (accélèrent l'évolution, ne la remplacent pas) |
| **Extension MCP** | Apprend une technique (l'équivalent d'une CT) |

### 3.8 Vibeurs : classes et compétences
On choisit une classe au départ, puis on débloque une compétence à chaque badge.

| Classe | Passif |
|---|---|
| **Prompt Engineer** | Une carte de plus en main pendant l'onboarding |
| **Vibe Coder** | Les techniques Code coûtent 0 jeton, avec 10 % de chances de bug |
| **Doomer** | Ses PokAI ont +20 % de Robustesse, et refusent parfois d'attaquer |
| **Accélérationniste** | Évolution 5 niveaux plus tôt, mais l'Hallucination monte plus vite |

Compétences : *Lire la doc* (révèle un trait), *Ctrl+Z* (annule un tour, une fois par combat), *Stack Overflow* (un indice, mais −moral),
*Ouvrir un ticket* (soin lent sur la carte), *Mode avion* (fuite garantie), *Prompt système* (choisit le premier trait cherché).

## 4. Carte

La région de **Latentia** : 1 carte en tuiles découpée en zones.
- **Câbles** : les hautes herbes, avec des rencontres aléatoires et des PokAI différents selon la zone.
- **Hub 🤗** dans chaque ville : on y soigne ses PokAI et on y gère le stockage (le **Repo**).
- **Le Store** : la boutique.

L'ordre des lieux et le contenu de chaque zone sont dans `docs/LORE.md`.

## 5. Direction artistique (v0.2 : flat vectoriel, isométrique, LatentOS)

- **Style « riso flat »** : illustration vectorielle à aplats, contour encre `#1d1a2b`, peu d'encres (papier crème, rose fluo, bleu riso, jaune),
  et une **ombre décalée « mal repérée »** (même silhouette, décalée de +4/+4 px, en rose ou bleu) comme signature visuelle. Tout l'art est du **SVG écrit en code** (`client/src/art/svg/`).
- **Monde isométrique** (Phaser) : tuiles en losange 64×32, bâtiments et arbres en volumes, profondeur triée. Les cartes restent les mêmes grilles `MapDef` : seule la projection change.
- **Interface LatentOS** (DOM et CSS, au-dessus du canvas) : le jeu est un faux système d'exploitation.
  - **Barre du haut** : heure, crédits GPU, zone.
  - **Dock d'apps** : Équipe, Sac, Model Hub (le Neurodex), Badges, Réglages.
  - **Dialogues** : une **messagerie** (bulles, avatar, texte qui s'affiche token par token).
  - **Combat** : un **chat duel** face à face. Les PV sont une **fenêtre de contexte** qui se remplit de tokens, et les techniques sont des **suggestions de prompt**.
  Ce layout ne doit **pas** rappeler un écran de Pokémon.
- **Manette et clavier** : `client/src/input/` unifie les deux (Gamepad API). Un **aide-commandes contextuel** (en bas à droite) affiche les touches du périphérique actif (clavier, Xbox, PlayStation, Switch), et un panneau « Commandes » complet s'ouvre avec H ou Select.
- **Polices** : *IBM Plex Sans* (interface), *IBM Plex Mono* (logs et tokens), *Bricolage Grotesque* (titres).
- **Jetons de design** : `client/src/ui-dom/tokens.css`, les seules couleurs, polices et rayons autorisés.

### Anti-slop : interdit dans l'UI
Dégradés, glassmorphism, ombres floues, coins arrondis au-delà de 4 px, emojis en guise d'icônes (sauf 🤗 pour le Hub), police Inter,
illustrations générées par IA, layouts « carte centrée + bouton violet ». Ombres **dures** et décalées uniquement.

## 6. Stack et architecture

| Couche | Choix |
|---|---|
| Client | **TypeScript + Vite**. **Phaser 3** pour le monde isométrique seulement ; **DOM/CSS** (LatentOS) pour toute l'interface |
| Serveur | **Go** (`net/http` + `coder/websocket`) : sauvegardes, Neurodex mondial (premier joueur à onboarder chaque PokAI), classement, puis PvP asynchrone |
| Données | Du JSON dans `shared/data/` : **source de vérité unique**, lue par le client et le serveur |
| Stockage | SQLite côté serveur ; sauvegarde locale en secours côté client |

```
WebGame/
├── CLAUDE.md
├── docs/                 # LORE.md, NEURODEX.md
├── shared/
│   ├── data/             # pokai.json, moves.json, types.json, items.json, tokens.json,
│   │                     # trainers.json, dialogues/*.json, encounters.json
│   └── schema/           # JSON Schema de chaque fichier de données
├── client/
│   ├── src/
│   │   ├── scenes/       # Boot, Title, Overworld, Battle, Onboarding, Evolution, Neurodex, Hub, Store, Dialogue
│   │   ├── systems/      # logique PURE : combat, onboarding, évolution, XP, rencontres. Aucun import Phaser
│   │   ├── story/        # drapeaux d'histoire, scripts d'événements, moteur de dialogue
│   │   ├── ui/           # boîte de dialogue « token par token », menus, barres
│   │   ├── net/          # client API et WebSocket
│   │   └── data/         # chargement et typage de shared/data
│   └── public/assets/    # tilesets, sprites, cartes Tiled, sons
└── server/
    ├── cmd/pokai/        # main.go
    └── internal/
        ├── api/          # handlers HTTP
        ├── game/         # résolution de combat (mêmes règles que client/systems, pour le PvP)
        ├── store/        # SQLite
        └── data/         # chargement de shared/data
```

### Règles d'architecture
- **Le contenu est fait de données** : un PokAI, une technique, un dresseur ou un dialogue, c'est du JSON, pas du code.
- Les dialogues sont des **scripts déclaratifs** (texte, choix, conditions sur des drapeaux, effets : `give_item`, `start_battle`, `set_flag`).
- `client/src/systems/` est **pur** et testé : les scènes appellent les systèmes, jamais l'inverse.
- Le combat est **déterministe à partir d'une graine** : le serveur peut rejouer et valider un combat PvP.

### Conventions
- TS : `strict`, pas de `any` ; fichiers en `kebab-case`, classes en `PascalCase`.
- Go : `gofmt`, erreurs remontées et jamais ignorées.
- Le texte du jeu est en **français** ; le code et les commentaires en anglais ; les identifiants de données en `snake_case` (`claude_haiku`).
- Un commit par feature ; `main` doit toujours compiler.

## 7. Périmètre en 24 h

Le **contenu écrit** (lore, Neurodex complet) peut être énorme. Ce qui limite, ce sont **les sprites**. Donc :
- **MVP : 20 lignées jouables** (marquées ★ dans `NEURODEX.md`), soit environ 45 formes avec les évolutions.
- Les autres PokAI apparaissent dans le Neurodex en **silhouette** : « Données d'entraînement insuffisantes ». Ça montre la vision long terme dans le jeu même.

**MVP (obligatoire)**
- [ ] Localhost, Route 1, Port 8080, Forêt Open-Source, Désert des Datacenters, Tour de Conformité (AIACT).
- [ ] Choix du premier PokAI, rival, Professeur, Hub, Store, câbles avec rencontres par zone.
- [ ] Combat complet (types, statuts, XP, évolutions, learnsets).
- [ ] Onboarding par cartes-tokens et Clés API.
- [ ] 3 Benchmarks, l'histoire de l'AIACT avec dialogues, combat final contre la Directrice, rencontre avec le légendaire.
- [ ] Neurodex, sauvegarde.

**Bonus si on a le temps** : Cloud City et 4e Benchmark, le Leaderboard (Top 4 et Champion), PvP asynchrone, Extensions MCP, musique 8-bit.

**Répartition proposée**
| Personne | Domaine |
|---|---|
| A | Carte et histoire : Overworld, cartes Tiled, moteur de dialogue et de scripts, PNJ, drapeaux d'histoire |
| B | Systèmes et serveur : combat, onboarding, évolution, données JSON, tests, serveur Go |
| C | Visuel et interface : sprites des PokAI et des personnages, écrans de combat, Neurodex, menus, animation d'évolution |

**Jalons** : H6 on marche dans Localhost et on combat dans les câbles · H12 onboarding, évolution et premier Benchmark · H18 histoire de l'AIACT jusqu'au boss · H22 gel des fonctionnalités, correction de bugs et démo.

## 8. Vision long terme (pour le pitch)
- **Mises à jour au rythme de l'actualité** : chaque vraie sortie de modèle ajoute une forme, et un PokAI réellement retiré devient Fantôme.
- **Événements en direct** : « panne mondiale de l'API » (les propriétaires sont KO ce week-end), « fuite de poids » (un légendaire open-weights apparaît).
- Échanges et **Distillation** entre joueurs, Leaderboard saisonnier, Benchmarks créés par les joueurs.
- Nouvelles régions : **Shenzhenia** (lignées chinoises), **Hexagonia** (BLOOM, Mistral, LeCube…).
- Mode « Labo » : créer sa propre startup d'IA et entraîner son propre modèle (jeu de gestion).

## 9. Points à valider par l'équipe
1. La liste des 20 lignées ★ du MVP.
2. L'onboarding par cartes-tokens et Clés API : assez original et assez difficile ?
3. Les personnalités caricaturées et le rôle de chacune (voir `LORE.md`).
4. La DA v0.2 : flat vectoriel riso, monde isométrique, interface LatentOS.
5. Ce qui entre dans le MVP et ce qui est bonus.
