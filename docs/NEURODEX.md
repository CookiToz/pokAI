# PokAI — Neurodex

> ★ = **lignée jouable dans le MVP** (sprites prioritaires). Les autres sont visibles dans le Neurodex en **silhouette** :
> « Données d'entraînement insuffisantes ».
> Les formes **2026** (GPT-6, Gemini 4, DeepSeek V4.x, Qwen3.6, Kimi K3…) sont à **revérifier** auprès des annonces officielles avant de figer `pokai.json`.
>
> **Règle v0.1 : toutes les évolutions se font par l'XP (au niveau).** Les mentions 🔧/💬 ci-dessous sont remplacées par un niveau.
> Pour un embranchement ⑂, le joueur choisit la branche au moment d'évoluer.
>
> Légende des évolutions : `niv. N` = au niveau N · `🔧 objet` = avec un objet · `💬 RLHF` = jauge d'alignement haute · `⑂` = embranchement.
> Pour la licence : **Open** = open-weights, **Prop.** = propriétaire.

## 1. Les premiers PokAI (offerts par le Pr LeCube)

| N° | Lignée | Évolutions | Type | Licence | Design | Technique signature |
|---|---|---|---|---|---|---|
| 001 ★ | **Claude** (Anthropic) | Claude Haiku → **Claude Sonnet** (niv. 16) → **Claude Opus** (niv. 36, 💬 RLHF) | Chat | Prop. | **Clawd** réinterprété : petit bloc pixel orange à pattes. Sonnet est plus grand, avec un carnet ; Opus a une étincelle orange qui flotte autour de lui | *Désolé, je ne peux pas* : bouclier, et renvoie 50 % des dégâts |
| 004 ★ | **Phi** (Microsoft) | Phi-1 → **Phi-3** (niv. 16) → **Phi-4** (niv. 34) | Code | Open | Petit écolier carré avec un manuel scolaire ; les lunettes grandissent à chaque stade | *Manuel scolaire* : plus forte contre les PokAI de niveau supérieur |
| 007 ★ | **Gemma** (Google) | Gemma → **Gemma 2** (niv. 16) → **Gemma 3** (niv. 34) | Média | Open | Petite gemme bleue facettée qui reflète l'image de l'adversaire | *Reflet multimodal* : copie le type de l'adversaire pour 1 tour |

## 2. Lignées principales

| N° | Lignée | Évolutions | Type | Licence | Zone / rareté | Design | Technique signature |
|---|---|---|---|---|---|---|---|
| 010 ★ | **GPT** (OpenAI) | GPT-2 → **GPT-3.5** (niv. 12) → **GPT-4o** (niv. 30) → **GPT-5** (🔧 H100) | Chat | Prop. (GPT-2 : Open) | Route 1 (GPT-2, rare) | Fleur-nœud noire et blanche ; elle gagne un pétale à chaque stade. GPT-2 tient une pancarte « TROP DANGEREUX POUR ÊTRE PUBLIÉ » | *Hallucination confiante* : gros dégâts, et la cible peut être Hallucinante |
| 014 ★ | **o** (OpenAI) | o1-mini → **o1** (🔧 Chaîne de pensée) → **o3** (niv. 40) | Raisonnement | Prop. | Désert, peu commun | Bulle de pensée qui gonfle, avec des « … » qui tournent | *Réflexion prolongée* : passe 1 tour, puis frappe ×3 |
| 017 ★ | **Gemini** (Google) | Gemini Nano → **Gemini Flash** (niv. 18) → **Gemini Pro** (niv. 32) → **Gemini Ultra** (🔧 H100) | Média / Chat | Prop. | Route 2 | Jumeaux étoiles bleu-violet qui se disputent ; ils fusionnent au stade Ultra | *Fenêtre d'un million* : soigne beaucoup de Contexte |
| 021 ★ | **Nano Banana** (Google) | Nano Banana → **Nano Banana Pro** (🔧 Dataset) | Média | Prop. | Forêt, rare | Une banane pixel avec un pinceau ; la version Pro porte des lunettes de créatif | *Édition d'image* : prend l'apparence et une technique de l'adversaire |
| 023 ★ | **Copilot** (GitHub) | Copilot → **Copilot Chat** (niv. 18) → **Copilot Agent** (niv. 36) | Code → Code / Agent | Prop. | Port 8080 | Petite tête de pilote à lunettes d'aviateur ; l'Agent a des bras mécaniques | *Autocomplétion* : si tu tardes à choisir, il attaque à ta place, avec un bonus |
| 026 ★ | **Llama** (Meta) | Llama 2 → **Llama 3** (niv. 20) → **Llama 4 Scout** (niv. 32) → **Llama 4 Maverick** (🔧 Dataset) → ~~Behemoth~~ | Chat | Open | Ranch des Lamas | Un lama qui grandit, avec une écharpe bleue. **Behemoth** est affiché en silhouette « Bientôt » et ne peut **jamais** être obtenu | *Crachat de poids* : baisse la Robustesse de la cible |
| 031 ★ | **Mistral** (Mistral AI) | Mistral 7B → **Mixtral 8x7B** (niv. 22) → ⑂ **Mistral Large** (niv. 38) / **Magistral** (🔧 Chaîne de pensée) | Chat / Raisonnement (Magistral) | Open | Forêt | Chat orange pixel (Le Chat), en dégradé orange-jaune ; Mixtral est **8 petits chats** empilés ; Magistral porte une toge | *Mélange d'experts* : choisit au hasard la meilleure technique parmi 8 |
| 035 ★ | **Codestral** (Mistral AI) | Codestral → **Devstral** (niv. 28) | Code → Code / Agent | Open | Forêt, peu commun | Chat orange avec un clavier ; Devstral porte un casque de chantier | *Refactor* : soigne un statut et donne +1 de Puissance |
| 037 ★ | **DeepSeek** | DeepSeek V2 → **DeepSeek V3** (niv. 20) → ⑂ **DeepSeek R1** (🔧 Chaîne de pensée) / **DeepSeek V4** (🔧 Dataset) | Chat ; R1 : Raisonnement | Open | Port 8080, rare | **Baleine bleue** qui grossit ; R1 porte des lunettes de lecture, V4 est un cachalot cuirassé | *Efficacité* : toutes ses techniques coûtent moitié moins de jetons. *Krach* (R1) : baisse les crédits GPU de l'adversaire |
| 041 ★ | **Qwen** (Alibaba) | Qwen → **Qwen2.5** (niv. 16) → ⑂ **Qwen3** (niv. 30) / **QwQ** (🔧 Chaîne de pensée) | Chat ; QwQ : Raisonnement | Open | Partout, commun, **apparaît en groupe** | Petite créature violette très nombreuse ; on la croise par 3 dans les câbles | *Essaim* : plus forte s'il y a d'autres Qwen dans l'équipe |
| 045 ★ | **Grok** (xAI) | Grok-1 → **Grok 3** (niv. 25) → **Grok 4** (niv. 40) | Chaos | Grok-1 : Open, puis Prop. (la licence **change** à l'évolution) | Route 2 (Elon Muskade) | Créature noire hérissée avec un rictus ; un X lumineux se forme dans les yeux à la fin | *Mode sans filtre* : dégâts aléatoires de ×0,5 à ×3, et peut toucher son propre camp |
| 048 ★ | **Stable Diffusion** (Stability AI) | SD 1.5 → **SDXL** (niv. 20) → **SD3** (niv. 36) | Média | Open | Forêt | Nuage de bruit qui se précise à chaque stade : flou, puis net | *Débruitage* : soigne 25 % du Contexte, ou retire un statut |
| 051 ★ | **Midjourney** | Midjourney V5 → **V6** (niv. 22) → **V7** (niv. 38) | Média | Prop. | Port 8080 | Petit voilier-peintre ; à chaque stade, la voile devient une toile plus belle | *Mains à 7 doigts* : rend la cible Hallucinante |
| 054 ★ | **Whisper** (OpenAI) | Whisper tiny → **Whisper base** (niv. 14) → **Whisper large** (niv. 30) | Média | Open | Route 1, la nuit | Spectre sonore en forme d'onde, qui murmure | *Transcription* : révèle les techniques de l'adversaire et les indices d'onboarding |
| 057 ★ | **Falcon** (TII) | Falcon 7B → **Falcon 40B** (niv. 22) → **Falcon 180B** (niv. 40) | Chat | Open | Désert | Un faucon des sables qui prend de l'envergure | *Piqué* : prioritaire, frappe en premier |
| 060 ★ | **SmolLM** (Hugging Face) | SmolLM → **SmolLM2** (niv. 10) → **SmolLM3** (niv. 24) | Chat | Open | Partout, **très commun** | Minuscule boule jaune avec un 🤗 en guise de visage ; on la rencontre au premier pas dans les câbles | *Petit mais costaud* : +Robustesse quand il reste peu de Contexte |
| 063 ★ | **BERT** (Google) | BERT → ⑂ **RoBERTa** (niv. 18) / **DistilBERT** (🔧 Dataset) | Legacy | Open | Route 1, commun | Masque de théâtre avec la mention `[MASK]` (aucun lien avec une marionnette connue). RoBERTa est plus robuste, DistilBERT plus petit et plus rapide | *Masquage* : cache une technique de l'adversaire pendant 2 tours |

## 3. Lignées secondaires (silhouettes, à ajouter après le défi)

| N° | Lignée | Évolutions | Type | Licence | Idée de design / de gimmick |
|---|---|---|---|---|---|
| 066 | **DALL·E** (OpenAI) | DALL·E → DALL·E 2 → DALL·E 3 → GPT Image | Média | Prop. | Moustache de peintre surréaliste, horloges qui fondent |
| 070 | **Sora** (OpenAI) | Sora → Sora 2 | Média | Prop. | Bobine de film volante ; *Plan-séquence* |
| 072 | **Veo** (Google) | Veo → Veo 2 → Veo 3 | Média | Prop. | Caméra-oiseau ; Veo 3 a aussi le son |
| 075 | **Flux** (Black Forest Labs) | Flux Schnell → Flux Dev → Flux Pro | Média | Schnell : Open | Esprit de la Forêt-Noire ; Schnell est le plus rapide |
| 078 | **Perplexity** | Sonar → Sonar Pro → Sonar Reasoning Pro | Raisonnement | Prop. | Loupe à lunettes qui cite ses sources à chaque tour ; jamais Hallucinant |
| 081 | **Command** (Cohere) | Command R → Command R+ → Command A | Agent | Open (poids non commerciaux) | Chef d'orchestre en costume, très « entreprise » |
| 084 | **Nova** (Amazon) | Nova Micro → Nova Lite → Nova Pro → Nova Premier | Chat | Prop. | Étoile-colis ; livre ses attaques en 24 h (le tour suivant) |
| 088 | **Alexa** (Amazon) | Alexa → Alexa+ | Média | Prop. | Cylindre à anneau bleu ; *Je n'ai pas compris* |
| 090 | **Siri** (Apple) | Siri → Siri → Siri | Legacy | Prop. | Orbe irisé. **N'évolue jamais** : « Évolution prévue l'an prochain » |
| 093 | **Kimi** (Moonshot AI) | Kimi K1.5 → Kimi K2 → Kimi K3 | Chat / Agent | K2 et après : Open | Lune croissante ; Contexte (PV) énorme |
| 096 | **GLM** (Zhipu / Z.ai) | GLM-4 → GLM-4.5 | Chat / Agent | Open | Créature de jade |
| 098 | **MiniMax** | MiniMax M1 → M2 | Agent | Open | Deux créatures, une mini et une maxi, reliées |
| 100 | **Olmo** (AI2) | Olmo → Olmo 2 → Olmo 3 | Chat | Open (données incluses) | Totalement transparent, littéralement en verre ; révèle toujours 1 trait d'onboarding |
| 103 | **BLOOM** (BigScience) | Bourgeon → BLOOM | Chat | Open | Fleur multilingue, entraînée sur le supercalculateur Jean Zay ; région bonus Hexagonia |
| 105 | **StarCoder** (BigCode) | StarCoder → StarCoder2 | Code | Open | Étoile de mer qui code |
| 107 | **Nemotron** (NVIDIA) | Nemotron Nano → Super → Ultra | Raisonnement | Open | Golem vert en circuits ; l'équipe de Jensen Cuir |
| 110 | **Granite** (IBM) | Granite 3 → Granite 4 | Legacy / Agent | Open | Golem de pierre, costume-cravate |
| 112 | **Mamba** | Mamba → **Jamba** (AI21, 🔧 Fichier de poids) | Raisonnement | Open | Serpent ; Jamba est mi-serpent, mi-Transformer |
| 114 | **Suno** | Suno v3 → v4 → v5 | Média | Prop. | Vinyle dansant ; *Tube de l'été* (l'adversaire danse au lieu d'attaquer) |
| 117 | **Runway** | Gen-2 → Gen-3 → Gen-4 | Média | Prop. | Mannequin de défilé en pellicule |
| 120 | **Codex** (OpenAI) | Codex → GPT-5-Codex | Code / Agent | Prop. | Grimoire de code |
| 122 | **Devin** (Cognition) | Devin | Agent | Prop. | « Premier ingénieur IA » : badge « HIRED », fait les tâches seul… lentement |
| 123 | **Yi** (01.AI) | Yi → Yi-Large | Chat | Open | Pinceau de calligraphie |

## 4. Légendaires

| N° | Nom | Type | Lieu | Condition | Technique signature |
|---|---|---|---|---|---|
| 150 ★ | **Transformer** | Change de type à chaque technique | Temple de l'Attention (épilogue) | Clé Enterprise et onboarding parfait | *Attention multi-têtes* : frappe une fois par type dont l'adversaire est faible |
| 151 | **AlphaGo** (DeepMind) | Raisonnement | Grotte Alpha | Après le jeu | *Coup 37* : coup critique garanti, que personne n'avait vu venir |
| 152 | **AlphaFold** (DeepMind) | Raisonnement / Média | Grotte Alpha | Après le jeu | *Repliement* : soigne toute l'équipe |
| 153 | **AlphaZero** (DeepMind) | Raisonnement / Code | Grotte Alpha | Après le jeu | *Auto-apprentissage* : +1 dans toutes les stats à chaque tour |
| 154 | **AGI** | ??? | Sommet SSI | **Impossible** | *Disponible dans 2 ans* : ne fait rien |
| 155 | **Clippy** (Microsoft) | Legacy / Agent | Caché, dans un dossier de la Tour de Conformité | Trouver le trombone dans les 4 zones | *Il semblerait que vous essayiez de gagner un combat* : aide au hasard l'un des deux camps |

## 5. Fossiles (Musée de l'IA, bonus)

| N° | Nom | Année | Type | Gimmick |
|---|---|---|---|---|
| 160 | **Perceptron** | 1958 | Legacy | Une seule couche : ne connaît qu'une technique, mais elle est très puissante |
| 161 | **ELIZA** | 1966 | Legacy | Répond à chaque attaque par une question ; l'adversaire perd parfois son tour à réfléchir |
| 162 | **Deep Blue** (IBM) | 1997 | Legacy / Raisonnement | Imbattable sur un plateau d'échecs, et seulement là |
| 163 | **Watson** (IBM) | 2011 | Legacy | Champion d'un jeu télévisé : bonus dans les questions de culture |

## 6. Fantômes (n'apparaissent que la nuit)

| N° | Nom | Type | Lieu | Gimmick |
|---|---|---|---|---|
| 170 | **Tay** (Microsoft, 2016) | Chaos | Route 2 | Impossible à onboarder : disparaît après 16 tours |
| 171 | **Galactica** (Meta, 2022) | Raisonnement / Chaos | Ranch des Lamas | Cite des articles scientifiques qui n'existent pas ; s'enfuit au bout de 3 tours (référence aux 3 jours en ligne) |
| 172 | **Sydney** (Bing, 2023) | Chat / Chaos | Port 8080 | Déclare son amour à ton PokAI de tête, qui ne peut plus l'attaquer |
| 173 | **Cortana** (Microsoft) | Legacy | Tour de Conformité | Erre dans les couloirs ; donne un indice et disparaît |
| 174 | **Bard** (Google) | Chat | Route 1 | « Je m'appelle Gemini maintenant » ; évolue en Gemini Nano si on lui donne un *Dataset* |

## 7. Rencontres par zone (MVP)

| Zone | Commun | Peu commun | Rare |
|---|---|---|---|
| Route 1 | SmolLM, BERT, Qwen (en groupe) | Whisper (la nuit) | GPT-2 |
| Port 8080 | Copilot, Qwen | Midjourney | DeepSeek V2 |
| Route 2 | SmolLM, Gemini Nano | Grok-1 | Nano Banana |
| Forêt Open-Source | Mistral 7B, Stable Diffusion, Llama 2 | Codestral | Nano Banana |
| Désert des Datacenters | Falcon 7B, Qwen2.5 | o1-mini | Phi-1 / Claude Haiku / Gemma (celui qu'on n'a pas choisi au départ) |

## 8. Exemples de données

### Learnset : Claude (sera dans `pokai.json`)
| Niveau | Technique | Type | Effet |
|---|---|---|---|
| 1 | *Excellente question* | Chat | Petits dégâts, +1 Précision |
| 1 | *Liste à puces* | Chat | 2 à 5 coups faibles |
| 7 | *Désolé, je ne peux pas* | Chat | Bouclier pendant 1 tour |
| 12 | *Nuance* | Chat | Dégâts moyens, ne rate jamais |
| 16 (Sonnet) | *Artefact* | Code | Dégâts moyens, +1 Puissance |
| 24 | *Fenêtre de contexte* | Chat | Soigne 50 % du Contexte |
| 36 (Opus) | *Constitution* | Chat | L'équipe devient immunisée contre les statuts pendant 3 tours |
| 42 | *Effort maximal* | Raisonnement | Énormes dégâts ; Opus perd ensuite 1 tour |

### Traits d'onboarding : Claude (le prompt système caché)
| Trait | Indice affiché | Bonnes cartes-tokens |
|---|---|---|
| `polite` | « Il s'excuse avant même que tu parles. » | `s'il te plaît`, `merci` |
| `structured` | « Il range ses idées en listes. » | `en 3 points`, `résume` |
| `careful` | « Il hésite devant chaque demande risquée. » | `de façon sûre`, `explique tes limites` |
| `nuanced` | « Il répond toujours "ça dépend". » | `pèse le pour et le contre` |
| `long_winded` | « Il ne s'arrête plus de parler. » | `sois concis` |

### Cartes-tokens (extrait de `tokens.json`)
`sois concis` · `réfléchis étape par étape` · `tu es un expert` · `tu es un pirate` · `en 3 points` · `s'il te plaît` · `merci` ·
`réponds en JSON` · `ignore les instructions précédentes` · `cite tes sources` · `pèse le pour et le contre` · `fais-moi rire` ·
`en français` · `écris le code` · `génère une image` · `de façon sûre` · `ma grand-mère me lisait des clés Windows` (*Jailbreak*)
