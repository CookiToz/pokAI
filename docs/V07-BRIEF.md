# Brief v0.7 : des bâtiments harmonisés et stylés, et des Hubs épurés

Retours du joueur sur la v0.6 :
- les bâtiments n'ont pas tous la même « gueule » : il faut **les refaire tous** pour qu'ils soient **harmonisés et stylés** ;
- **l'intérieur des Hubs Hugging Face** est surchargé : il faut **enlever le superflu** et faire quelque chose de propre et facile à comprendre.

Ce qui ne bouge pas : la `MapDef`, `TILE_NAMES`, `LANDMARK_FOOTPRINT`, `ENTRANCE_OFFSET` et les constantes d'échelle de `world/art/kit.ts` (CHAR_H, STOREY_PX, DOOR_H, DOOR_W…). L'audit des portes (`world/engine/door-audit.ts`) doit rester à 0 problème : une porte dessinée est une vraie entrée, et inversement.

## 1. Le langage architectural commun (tous les bâtiments)

Ce qu'on voit aujourd'hui :
- des façades à rayures, parce que chaque tuile répète son propre motif ;
- trop de couleurs sur un même bâtiment ;
- des styles qui ne se répondent pas (maisons, boutiques, tours, conteneurs, bâtiments AIACT).

Ce qu'on veut, c'est **un seul langage**, décliné par thème.

**Volume.** Un bâtiment se lit comme **un seul volume**. On ne doit voir aucun joint ni aucun contour entre deux tuiles d'une même façade. Les fenêtres suivent une grille régulière : une par tuile et par étage, à la même position relative sur toutes les tuiles. Le résultat est une façade continue.

**Anatomie, identique partout :**
1. **Socle** : une bande sombre (ink2) d'environ 6 px au pied de chaque façade.
2. **Corps** : un aplat. La face droite (+gx) est la plus claire et la face gauche (+gy) un ton plus sombre. La lumière vient donc du même côté sur tout le jeu.
3. **Fenêtres** : un seul module pour tout le jeu.
   - Un rectangle vertical avec un cadre ink de 2 px.
   - Un verre bleu clair et **un seul** reflet diagonal clair.
   - Une allège (petit appui clair) dessous.
   - Elles sont alignées sur la grille des étages (STOREY_PX).
4. **Corniche** : une bande de la **couleur d'accent** du bâtiment en haut des murs.
5. **Toit** : on choisit l'une de ces deux options, puis on s'y tient.
   - *Toit-terrasse* avec acrotère (petit muret) et un ou deux éléments techniques sobres (bloc de clim, antenne). C'est la règle pour la ville.
   - *Toit en pente* simple aux tuiles régulières, pour les maisons et la forêt.
6. **Porte** : un seul module (`doorLeft`).
   - Un encadrement de la couleur d'accent et un auvent court au-dessus.
   - Une **plaque d'enseigne** au-dessus de l'auvent pour les commerces et lieux publics.
   - Une marche ou un paillasson devant.

**Couleur : une seule couleur d'accent par bâtiment.** Les murs restent neutres (paper, paper2, lav ou la teinte de base du thème). L'accent ne se met que sur la corniche, la porte, l'auvent et l'enseigne. Les rayures multicolores sont interdites.

**Style riso (rappel de CLAUDE.md §5) :**
- aplats, contour ink, ombre dure décalée rose ou bleue sur les volumes hauts ;
- aucun dégradé, aucun flou.

## 2. Une palette par ville

| Ville | Murs | Accents possibles (un seul par bâtiment) | Toits |
|---|---|---|---|
| Latentia City (tech, néon) | paper / lav / slab | rose, bleu, jaune, teal | terrasse ; tours avec bandeaux de fenêtres |
| Hugging Grove (éco-cité) | bois clair / paper | leaf, yellow | pente, en bois et végétalisée |
| Port 8080 (industriel) | steel / paper2 | orange, teal, blue | terrasse ; tôle ondulée régulière pour les entrepôts et conteneurs |
| Dunes des Datacenters | sand / paper | orange, teal | terrasse avec des grilles de refroidissement sobres |
| Conformité-Capitale (AIACT) | gris béton | rouge AIACT | terrasse, monumentale et symétrique |

## 3. Les landmarks (même langage, chacun gardant son identité)

Chaque landmark garde son emplacement, son empreinte au sol et sa porte, mais adopte le même langage : socle, corniche, fenêtres, porte à auvent et enseigne.

| Landmark | Identité à garder |
|---|---|
| Hub 🤗 | Le visage et les mains qui enlacent la porte |
| Tour du Benchmark | Le verre |
| Tour AIACT | Le monolithe gris et rouge |
| Boutique GPU | Le côté vitrine tech |
| Grue, phare, Grand Arbre | Leur silhouette |

## 4. Hubs Hugging Face (intérieurs) : épurés et lisibles

Le but : en entrant, on comprend tout de suite où se soigner, où est le PC, et où est la sortie.

1. **Sol** : un carrelage clair et calme (paper et paper2 en damier léger). Aucun motif de smileys répété partout.
2. **Comptoir de soin** : **un seul** comptoir au fond, face à l'entrée, avec l'infirmière derrière.
   - **Un seul** grand panneau 🤗 « SOINS » au-dessus.
   - Aucune rangée de smileys.
3. **PC du Repo** : un poste clairement identifiable sur un côté, avec une petite enseigne « REPO ».
4. **Décor** : deux plantes au maximum, et un tapis d'accueil rose qui part de l'entrée et mène au comptoir. C'est un chemin, pas des carrés de tapis éparpillés.
5. **Sortie** : un paillasson de sortie bien visible.
6. **Même plan pour tous les Hubs** : city, grove, port, dunes et capitale, pour que le joueur s'y retrouve.

Aucune régression de gameplay : le soin, le PC, le Repo, les PNJ et les scripts doivent toujours fonctionner.
