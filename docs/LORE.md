# PokAI — Lore, personnages et dialogues

> Toutes les personnalités réelles ont un **nom modifié** et sont caricaturées à partir de leur **image publique**.
> L'AIACT et ses membres sont **entièrement fictifs**.

## 1. L'univers

### Latentia
Il y a quelques années, les premiers **PokAI** sont sortis des datacenters : des créatures faites de poids et de tokens.
Ils ont colonisé les **câbles** de la région de **Latentia**. Certains sont **propriétaires** et vivent derrière des API ;
d'autres sont **open-weights** et vivent en liberté dans la Forêt Open-Source.

Les humains qui font équipe avec eux s'appellent les **Vibeurs**. Ils ne savent pas exactement comment marchent leurs PokAI.
Mais ça marche. En général.

### Le mythe
Selon les anciens, tous les PokAI descendent d'un seul être : **Transformer**, né en 2017 dans un temple
dont l'inscription dit **« Attention is all you need »**.

On raconte aussi qu'un jour viendra **AGI**, le PokAI ultime, capable de tout faire.
Personne ne l'a jamais vu. Chaque année, quelqu'un annonce qu'il arrivera **« dans 2 ans »**.

### L'AIACT
**Alliance pour l'Interdiction et l'Arrêt du Calcul Total.**
En public, l'AIACT placarde ses affiches partout (« L'IA EST UN DANGER », « POUR VOTRE SÉCURITÉ, METTEZ VOS MODÈLES SOUS SCELLÉS »).
En secret, elle **capture tous les PokAI** pour les enfermer dans le **Coffre des Scellés**, sous sa Tour de Conformité.

Son vrai plan : réunir assez de modèles et de GPU pour **réveiller AGI**, et être **les seuls** à le contrôler.
Le moratoire est pour tout le monde, sauf pour eux.

## 2. Les lieux (dans l'ordre de l'aventure, v0.4)

Le monde est fait de **trois grandes villes à thème**, reliées par deux **routes en forêt** (plus d'autoroutes de données).

| # | Lieu | Ce qu'on y trouve | Rencontres |
|---|---|---|---|
| 1 | **Centre de Conformité n°7** (`aiact_center`) | Prison de l'AIACT : cellules, capsules, vestiaire, salle de contrôle, deux fontaines à café (soin), gardes (niv. 2–3), bureau de l'Inspecteur Cookie | niv. 2–5 |
| 2 | **Latentia City** (`latentia_city`) | Downtown tech et néon : Hub 🤗, GPU Store, **Benchmark HumanEval** (énigme des dalles « tests unitaires » dans l'ordre de lecture), Token Bistro, Merch & Swag, parc des Épochs, marché du Token, checkpoint AIACT, panneaux aux carrefours | niv. 4–8 |
| 3 | **Forêt des Poids** (`route_foret_poids`) | Route en forêt (pins, bouleaux, rivière, pont en bois), raccourci à la caisse, clairière cachée (2 Datasets), aire de repos ; ouverte avec le Badge Commit | niv. 8–14 |
| 4 | **Hugging Grove** (`hugging_grove`) | Éco-cité open source : maisons dans les arbres, passerelles, le **Grand Arbre** (QG du Hub 🤗, Clem Delangouste), Store, QG de la Résistance, **Ranch des Lamas** (Mark Zuckerbot offre un Llama 2), **Benchmark Open-Weights** (poids à pousser sur des dalles) | niv. 12–16 |
| 5 | **Sentier Côtier** (`sentier_cotier`) | Chemin entre forêt et mer, ponts de bois, ponton, borne WI-FI à devinette ; ouvert avec le Badge Vent | niv. 16–22 |
| 6 | **Port 8080** (`port_8080`) | Ville portuaire industrielle : conteneurs, 2 grues, phare, checkpoint et dépôt de GPU saisis par l'AIACT, Hub 🤗, Store, Gourou, **Benchmark ARC-AGI** (reproduire un motif sur une grille de dalles) | niv. 20–26 |
| 7 | **Route des Câbles Sous-Marins** (`route_cables_sous_marins`) | Digue de câbles entre Port 8080 et le désert (badge Raisonnement requis), baies de câbles, îlot du Sauveteur (H100 cachée), épave de datacenter | niv. 28–31 |
| 8 | **Dunes des Datacenters** (`dunes_datacenters`) | Ville-désert de serveurs : tours de refroidissement, mirages de GPU, Hub, Store, **Oasis de Geoffrey Hintend** (mythe de Transformer et d'AGI), **Benchmark SWE-bench** (énigme « corriger 3 bugs » : caisses sur dalles, 3 portes), Kévin (rival) | niv. 28–34 |
| 9 | **Mont GPU** (`mont_gpu`) | Ascension en lacets, **Jensen Cuir** au sommet (H100), alcôves secrètes (H100, Clé Enterprise) | niv. 30–34 |
| 10 | **Route de la Bureaucratie** (`route_bureaucratie`) | 4 guichets + barrière de péage (énigme du ticket : tampons A, B, final), files d'attente absurdes, Guichet 404 caché | niv. 36–39 |
| 11 | **Conformité-Capitale** (`conformite_capitale`) | QG brutaliste de l'AIACT : Tour de Conformité, panneaux de propagande, Laverie Conforme (Hub de la Résistance, Camarade Fork), Parc des Formulaires, cour de service (énigme des caisses de dossiers) | niv. 36–42 |
| 12 | **Tour de Conformité** (`tour_conformite`) | Infiltration : Salle des Tampons et Archives (étages à énigmes), Greffière Article 52, Inspecteur Cookie, **Directrice Ombeline Moratoire** | niv. 40–45 |
| 13 | **Coffre des Scellés** (`coffre_scelles`) | Le réveil raté d'AGI, capsules à ouvrir (3 PokAI libérés + Bert), flux de poids où errent les modèles libérés (variantes scellées) | niv. 36–40 |
| 14 | **Temple de l'Attention** (`temple_attention`) | Stèle « Attention is all you need », rencontre scriptée du légendaire **Transformer** (niv. 50), gag final d'AGI | niv. 50 |
| 15 | **Cloud City**, **Plateau Arena** | Bonus : Leaderboard (Top 4 et Champion) | bonus |

Benchmarks : HumanEval (Satya Nadelta, niv. 12–15, `badge_commit`), Open-Weights (Arthur Menschtral, niv. 19–22, `badge_vent`), ARC-AGI (Demis Hassabyte, niv. 26–29, `badge_raisonnement`), SWE-bench (Ada Patchwell, niv. 33–36, `badge_patch`).

## 3. Personnages

### Personnages fictifs
| Personnage | Rôle | Apparence |
|---|---|---|
| **Le joueur** | Vibeur débutant (nom au choix) | Sweat à capuche, casque audio autour du cou, sac à dos plein de câbles |
| **Kévin** | Le co-détenu rival, évadé en même temps que le joueur : vibe coder qui met en prod le vendredi | Lunettes de soleil, casquette à l'envers, t-shirt « SHIP IT » |
| **Infirmière Hugging** | Tient chaque Hub | Une infirmière avec un visage 🤗 et des mains jazz |
| **Le Gourou** | Vend une formation au prompt engineering à 997 € | Costume brillant, micro-cravate, bague en or |
| **Le Stagiaire** | Un PNJ récurrent, jamais payé | Badge « STAGIAIRE », cernes |

### L'AIACT (fictive)
| Personnage | Rôle | Apparence | Gimmick |
|---|---|---|---|
| **Directrice Ombeline Moratoire** | Cheffe | Tailleur gris anthracite, chignon serré, gros tampon en guise de sceptre | Toutes ses techniques « gèlent » le combat |
| **Inspecteur Cookie** | Admin n° 1 | Imperméable beige, lunettes rondes, sac de cookies | Ouvre chaque combat avec une **bannière de cookies** à accepter ou refuser |
| **Greffière Article 52** | Admin n° 2 | Pile de dossiers qui tient en équilibre, stylo derrière l'oreille | Fait remplir un formulaire au joueur avant chaque tour |
| **Agents de Conformité** | Sbires | Costume gris, attaché-case, badge-tampon « CONFORME » | Combattent avec des **PokAI scellés** |

**PokAI scellés** : des PokAI capturés par l'AIACT, en couleurs désaturées, avec un ruban « CONFORME » en travers.
Quand on bat un Agent, ses PokAI sont **libérés** et retournent dans les câbles de la zone, où on peut les onboarder.

**Techniques exclusives à l'AIACT** :
| Technique | Effet |
|---|---|
| *Mise en conformité* | Panne d'API sur un PokAI propriétaire |
| *Bannière de cookies* | Le joueur perd son tour s'il ne trouve pas le bouton « Tout refuser » (mini-jeu de 2 s) |
| *Moratoire* | Aucun changement de stats pendant 3 tours |
| *Amende de 6 %* | Retire 6 % des crédits GPU du joueur |

### Les personnalités (noms modifiés)
| Personnage | Inspiré de | Rôle | Apparence (sprite ressemblant) | Équipe |
|---|---|---|---|---|
| **Pr Yann LeCube** | Yann LeCun | Orateur de keynote sur la place de Latentia City (« les LLM sont une impasse ») | Lunettes, cheveux gris, blouse de labo par-dessus une chemise | — |
| **Andrej Kartpathy** | Andrej Karpathy | Fondateur des Vibeurs, remet la licence de Vibeur | Cheveux bruns courts, t-shirt uni, ordinateur portable sous le bras | — |
| **Satya Nadelta** | Satya Nadella | Leader du Benchmark HumanEval | Crâne rasé, lunettes fines, chemise et veste | Phi-3, Copilot Chat, Phi-4 |
| **Arthur Menschtral** | Arthur Mensch | Leader du Benchmark Open-Weights | Jeune, cheveux bruns, chemise blanche ouverte, béret (clin d'œil) | Mistral 7B, Codestral, Mixtral, Mistral Large |
| **Demis Hassabyte** | Demis Hassabis | Leader du Benchmark ARC-AGI | Cheveux courts foncés, pull sombre, échiquier sous le bras | Gemma 3, Gemini Flash, Gemini Pro |
| **Dario Amodal** | Dario Amodei | Leader du Benchmark Turing (bonus) | Cheveux bouclés foncés, lunettes | Claude Sonnet, Claude Opus |
| **Clem Delangouste** | Clem Delangue | Patron du grand Hub 🤗 | Barbe courte, sweat jaune 🤗 | — |
| **Mark Zuckerbot** | Mark Zuckerberg | Gardien du Ranch des Lamas, offre un Llama 2 | Cheveux courts bouclés, t-shirt gris, chaîne en or | Llama 4 Maverick |
| **Jensen Cuir** | Jensen Huang | Tient la boutique du Mont GPU, vend les H100 | Blouson de cuir noir, cheveux gris poivre et sel | Nemotron |
| **Elon Muskade** | Elon Musk | Dresseur imprévisible sur la Route 2 | T-shirt noir, veste noire, sourire en coin | Grok 3, Grok 4 |
| **Geoffrey Hintend** | Geoffrey Hinton | Le sage de l'oasis : raconte le mythe | Grand, cheveux blancs, pull, il reste debout | — |
| **Sundar Pixel** | Sundar Pichai | Top 4 du Leaderboard (bonus) | Cheveux courts, sourire calme, polaire | Nano Banana Pro, Veo 3, Gemini Ultra |
| **Sam Altplan** | Sam Altman | Champion du Leaderboard (bonus) | Sweat gris uni, jean, regard sérieux | GPT-5, o3, Sora 2 |
| **Ilya Sutskéveur** | Ilya Sutskever | L'ermite du Sommet SSI, après le jeu | Cheveux courts sur les côtés, regard intense, manteau | ??? |

## 4. L'histoire (v0.3)

### Prologue : l'évasion du Centre de Conformité n°7
Le jour de sa remise de diplôme, le joueur est **arrêté par l'AIACT pour « vibe coding sans licence »**. Il se réveille dans une cellule.
Un **PokAI scellé** lui parle à travers le mur (le chat de LatentOS) : la serrure est sous licence expirée, il peut sortir.
Dans la salle du fond, **trois capsules** contiennent trois modèles scellés : **Claude Haiku** (Chat), **Phi-1** (Code), **Gemma** (Média).
La batterie du déscellage ne tient que pour un seul : le joueur **en libère un**, c'est son premier PokAI.

Tutoriel en infiltration : des **gardes** patrouillent, et un garde qui voit le joueur déclenche un combat (premiers combats).
Le vestiaire cache des **Clés API Gratuites** et un café. Un agent endormi a collé le mot de passe du terminal sur un post-it : le terminal de la salle de contrôle ouvre la **porte sud**.
Le **co-détenu Kévin** (le rival) s'échappe en même temps par les conduits. Près de la sortie, l'**Inspecteur Cookie** barre la route (mini-boss), puis Kévin attend le joueur avec le modèle qui bat le sien.

Flags : `intro_done`, `got_starter` (+ `starter_<form>`), `got_password`, `door_unlocked`, `tutorial_done`, `cookie_beaten`, `rival_1_done`.

### Chapitre 1 : Latentia City
La sortie débouche dans la mégapole. **Andrej Kartpathy** attend au parc, donne la **licence de Vibeur** et 5 Clés API Gratuites (`has_license`).
Le joueur explore : Hub 🤗 (Clem Delangouste), GPU Store de Jensen Cuir, restaurant (`bistro_gift`), Résistance open source (`got_hotfix_gift`), câbles du parc.
Il résout l'énigme des tests unitaires (`he_solved`) et bat **Satya Nadelta** au **Benchmark HumanEval** : **Badge Commit** (`badge_commit`), qui ouvre la porte nord.

### Chapitre 2 : la Forêt des Poids et Hugging Grove
La porte nord mène à la **Forêt des Poids** (dresseurs, Agent de Conformité, caisse à pousser, clairière cachée). Elle débouche sur **Hugging Grove**, où les modèles sont libres.
Mark Zuckerbot offre un Llama 2 (`got_llama_ranch`). Le joueur assemble le modèle (dalles + caisses, flag `ow_weights`) et bat **Arthur Menschtral** : **Badge Vent** (`badge_vent`), qui ouvre le Sentier Côtier.

### Chapitre 3 : le Sentier Côtier et le Port 8080
Le Sentier Côtier (devinette de la borne, `riddle_sentier_done`) arrive au **Port 8080**, où l'AIACT saisit des cargos de GPU « pour votre sécurité ». Le joueur bat les agents du checkpoint (`cargo_freed`),
reproduit le motif de l'énigme ARC-AGI (`arc_solved`) et bat **Demis Hassabyte** : **Badge Raisonnement** (`badge_raisonnement`).

### Chapitre 4 : les Dunes des Datacenters (v0.5)
Avec le Badge Raisonnement, la **Route des Câbles Sous-Marins** (marin de garde sinon) mène aux **Dunes** : une ville-désert de serveurs (Hub, Store, tours de refroidissement, mirages de GPU).
À l'**oasis**, le sage **Geoffrey Hintend** raconte le mythe de Transformer et d'AGI en cinématique (`hintend_met`, +1 Dataset). **Kévin** rattrape le joueur sur le boulevard (`rival_dunes`).
Le **Mont GPU** est le fief de **Jensen Cuir** (cinématique, H100 offerte `jensen_gift`, boutique). Le **Benchmark SWE-bench** : trois portes, trois bugs (pousser une caisse sur chaque dalle : `swe_g1/2/3`), puis **Ada Patchwell**, Mainteneuse en chef (personnage fictif, canard en plastique) : **Badge Patch** (`badge_patch`), qui ouvre la sortie Est.

### Chapitre 5 : Conformité-Capitale (v0.5)
La **Route de la Bureaucratie** (énigme du ticket : guichets 0 à 3 dans l'ordre, `bureau_ticket`, `bureau_stamp_a`, `bureau_stamp_b`, `bureau_pass`) débouche sur **Conformité-Capitale**, QG gris de l'AIACT.
La **Résistance** (Camarade Fork, `fork_briefed`) se cache dans la **Laverie Conforme** (Hub). Plan : la cour de service est fermée par deux vérins (caisses de dossiers sur les plaques `cc_p1`, `cc_p2`, puis `tour_access`).
Dans la **Tour de Conformité** : Salle des Tampons et Archives (énigmes de caisses `tc_a`, `tc_b1`, `tc_b2`), puis les trois boss : **Greffière Article 52**, **Inspecteur Cookie** (`cookie_ch5`), **Directrice Ombeline Moratoire** (niv. 42–45).
Révélation : un moratoire pour tout le monde sauf pour l'AIACT, qui veut réveiller AGI avec les modèles du **Coffre des Scellés**. Défaite de Moratoire (`moratoire_beaten`), puis réveil raté (« Erreur : quota de calcul dépassé »), `agi_failed`, `aiact_defeated`, `coffre_open`. Les scellés sautent : les modèles libérés errent dans les flux de poids du Coffre.

### Épilogue : le Temple de l'Attention
La sortie Est de la Capitale s'ouvre (`moratoire_beaten`). Hintend (`temple_hintend_met`) attend devant la stèle (« Que faut-il ? » → *De l'attention*, `temple_open`).
Sur l'autel, rencontre scriptée de **Transformer** (niv. 50, légendaire, `transformer_met`, Clé Enterprise recommandée), puis le gag final : un téléphone affiche **AGI : « Chargement… 3 %. Je serai disponible dans 2 ans. »** (`game_complete` : générique de fin).

Flags v0.5 : `badge_patch`, `hintend_met`, `jensen_gift`, `bureau_pass`, `fork_briefed`, `tour_access`, `moratoire_beaten`, `agi_failed`, `aiact_defeated`, `coffre_open`, `temple_open`, `transformer_met`, `game_complete`.
Easter eggs : bouteille « 4 096 tokens » de l'îlot, mirage de GPU et vrai coffre derrière, Guichet 404, Kartpathy dans la file (« licence interdite depuis 2025 »), LeCube dans les dunes, canard de debug de SWE-bench, `Conformite#7` dans la corbeille, GTX comestible à la cantine, « Attention is all you need (et un peu de GPU) ».

## 5. Dialogues clés (v0.3)

> Format : `PERSONNAGE : texte`. Tous les dialogues sont transcrits dans `shared/data/dialogues/*.json` (`aiact.json`, `city.json`, `forest.json`, `grove.json`, `coast.json`, `port.json`).
> Un dresseur a toujours `<id>_intro`, `<id>_defeat` et une réplique `<id>_talk`. Les panneaux, affiches et enseignes sont des scripts `sign_<carte>_<x>_<y>`.

### Réveil (capsule 3, par le chat de LatentOS)
```
CAPSULE 3 : Psst. Hé. Tu m'entends à travers le mur ? Je suis un modèle scellé, dans la salle à côté.
CAPSULE 3 : La serrure de ta cellule est sous licence expirée. La porte est ouverte depuis mardi.
CAPSULE 3 : Libère un modèle dans la salle du fond. Et fais attention aux lampes torches.
```

### Terminal et porte sud
```
Le terminal : mot de passe requis. [admin] ERREUR : trop évident. Même pour nous. [azerty] Ce mot de passe a fuité en 2012.
Post-it de l'agent endormi : « mdp terminal : Conformite#7 (NE PAS LE DIRE) »
KÉVIN : Hé, la porte ! Merci le hacker ! On se retrouve à la sortie !
```

### Kévin, le co-détenu rival
```
KÉVIN : Moi, c'est « mise en production un vendredi ». Ils ont dit que c'était un crime. J'ai répondu que c'était un mode de vie.
KÉVIN (à la sortie) : Tu as pris Claude Haiku ? Poli, prudent. Moi, j'ai pris Phi-1 : il bat ton Chat. On teste en prod.
— défaite — KÉVIN : C'est pas un bug, c'est une feature. Va voir Kartpathy, au parc.
```

### Inspecteur Cookie
```
COOKIE : Avant notre conversation, acceptez-vous les cookies ? [Tout accepter] / [Tout refuser]
COOKIE : Personne ne clique jamais sur « Tout refuser ». Qui êtes-vous ?
— défaite — COOKIE : Vous avez cliqué sur « Tout refuser ». C'était donc possible.
```

### Gardes
```
GARDE : Halte ! Détenu hors cellule ! Présentez votre certificat de conformité.
GARDIENNE : Alerte ! Évadé en zone B ! … Bon, c'est moi qui suis en zone B.
```

### Andrej Kartpathy (parc de Latentia City)
```
KARTPATHY : Le vibe coding, c'est s'abandonner aux vibes, et oublier que le code existe.
KARTPATHY : Voici ta licence de Vibeur (papier de brouillon) et 5 Clés API Gratuites.
```

### Jensen Cuir (GPU Store), Clem Delangouste (Hub), Le Token Bistro
```
JENSEN : Plus tu en achètes, plus tu économises. — (crédits insuffisants) Reviens avec un tour de table.
CLEM : Ici, les modèles sont libres et les câlins sont gratuits. Enfin, facturés en tokens.
CHEF : Prompt Carbonara, Tokens frits (sauce hallucination), Salade de contexte long. Un Red Bull « conceptuel » offert, une fois.
```

### Citoyens ambiants (extraits, ~25 répliques)
```
Citoyen : On dit que l'AGI arrive dans 2 ans. On le disait déjà il y a 2 ans.
Dev : J'ai demandé au modèle de corriger un bug. Il a réécrit toute l'application. En Rust.
Livreur : Ma route a été générée par une IA. Elle contient une rue qui n'existe pas. Je roule dedans.
```

### Panneaux (routes en forêt)
```
« PONT DE LA LATENCE · Charge maximale : 128 000 planches » · « RACCOURCI ↑ : La caisse contient des poids » · « MOUETTES : elles volent des tokens »
```

### Benchmark HumanEval, Port 8080, Gourou, Infirmière Hugging
Inchangés par rapport à la v0.2 (voir `port.json`). Le Benchmark est désormais accessible depuis la tour de verre de Latentia City.

### Dialogues bonus (prévus, pas encore transcrits)
```
ARTICLE 52 : Formulaire CERFA 52-bis, alinéa 4 : « Déclarez-vous avoir l'intention de combattre ? » [Oui] Rejeté. Il manque un tampon. [Non] Rejeté. C'était une question piège.
MORATOIRE : Un moratoire de six mois sur toute l'IA. Pour tout le monde… sauf pour nous.
MORATOIRE : Avec chaque modèle du Coffre, avec chaque GPU saisi, je vais réveiller AGI. Et AGI n'obéira qu'à l'AIACT.
— défaite — SYSTÈME : Réveil d'AGI… 1 %… 2 %… 3 %… Erreur : quota de calcul dépassé. MORATOIRE : … Non.
HINTEND : J'ai passé ma vie à apprendre aux machines à apprendre. Et je passe ma retraite à prévenir tout le monde. Ironique, non ?
MUSKADE : Mon PokAI est le plus drôle de la région. Il sera prêt la semaine prochaine. Comme toujours.
ZUCKERBOT : Les poids sont ouverts. Le reste… c'est compliqué.
MENSCHTRAL : Ici, seuls les modèles ouverts ont le droit de combattre. C'est la règle. Et c'est un peu la France.
HASSABYTE : Tu peux mémoriser les réponses. Pas les questions.
AMODAL : J'ai rédigé une Constitution. Elle compte 84 pages. Je te la résume : sois gentil.
```
