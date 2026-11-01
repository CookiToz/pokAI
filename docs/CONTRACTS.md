# Contrats techniques et propriété des fichiers (v0.1)

> À lire par chaque contributeur (humain ou agent) **avant** d'écrire du code.
> Un fichier a **un seul propriétaire**. Pour modifier un fichier qui ne t'appartient pas, demande au lead.

## v0.2 : trois couches
1. **Monde** (Phaser, `scenes/boot-scene.ts`, `scenes/overworld-scene.ts`, `world/**`) : rendu isométrique des `MapDef`, déplacements, PNJ, déclencheurs. Il appelle l'interface **uniquement** via `ui` (`ui-dom/facade.ts`) et les scripts via `story/script-runner.ts`.
2. **Interface** (DOM, `ui-dom/**`) : LatentOS. Elle implémente `UiFacade` avec `provideUi()`.
3. **Logique** (`systems/`, `data/db.ts`, `state/store.ts`) : pure, inchangée.

Entrées : **tout** passe par `input/input.ts`, une pile de calques (`input.push(id, handler)`) où seul le calque du dessus reçoit les actions.
Le monde lit `input.held(action, 'world')` pour les déplacements, et chaque fenêtre de l'interface pousse son calque.
Le code pixel v0.1 est archivé dans `client/legacy-pixel/` : on peut s'en inspirer pour la logique, mais pas le réimporter.

## Fichiers fixés par le lead (ne pas modifier)
- `client/src/data/types.ts`, `client/src/data/tiles.ts`, `client/src/state/types.ts`, `client/src/scenes/{keys,contracts}.ts`
- `client/src/input/**`, `client/src/ui-dom/{tokens.css,dom.ts,facade.ts}`, `client/src/art/svg/{types,index}.ts`, `client/src/story/world-port.ts`
- `client/src/main.ts`, `client/index.html`, `client/vite.config.ts`, `client/tsconfig.json`, `client/package.json`

## Propriété par domaine (v0.2)
| Domaine | Propriétaire | Fichiers |
|---|---|---|
| Systèmes et données | (fini) | `shared/data/*.json` (sauf les cartes et les dialogues), `data/db.ts`, `systems/**`, `state/store.ts`, `net/**` |
| Monde isométrique | agent `iso-world` | `scenes/boot-scene.ts`, `scenes/overworld-scene.ts`, `world/**` |
| Interface shell | agent `ui-shell` | `ui-dom/shell/**`, `story/script-runner.ts`, `story/controls.ts` |
| Interface combat | agent `ui-battle` | `ui-dom/battle/**` |
| Art PokAI et portraits A | agent `art-a` | `art/svg/pokai-a.ts`, `art/svg/portraits-a.ts` |
| Art PokAI et portraits B | agent `art-b` | `art/svg/pokai-b.ts`, `art/svg/portraits-b.ts` |
| Contenu (cartes, dialogues) | (fini) | `shared/data/{maps,dialogues}/*.json` : corrections mineures permises au monde et au shell |
| Serveur | (fini) | `server/**` |

## API des systèmes (implémentée par `systems`, utilisée par tout le monde)

Tout est **pur** : aucun import de Phaser dans `systems/`, `state/` ou `data/db.ts`.

```ts
// data/db.ts : index de shared/data (les cartes et les dialogues sont chargés avec import.meta.glob)
db.form(id): Form              db.line(id): Line            db.lineOfForm(formId): Line
db.move(id): Move              db.item(id): Item            db.trainer(id): Trainer
db.map(id): MapDef             db.script(id): DialogueScript
db.typeChart(atk, def): number db.tokens: TokenCard[]       db.allForms(): Form[]

// systems/rng.ts
createRng(seed: number): Rng   // { next(): number; int(min, max): number; chance(p): boolean; pick<T>(a: T[]): T; seed: number }

// systems/stats.ts
computeStats(form: Form, level: number, ivs: Stats): Stats   // context = PV max
xpForLevel(level: number): number                            // XP totale pour atteindre ce niveau
// systems/pokai.ts
createPokai(formId: string, level: number, rng: Rng): PokaiInstance   // les 4 dernières techniques apprises
grantXp(p: PokaiInstance, amount: number): ProgressEvent[]           // { kind: 'levelup', level } | { kind: 'learn', move, replaced? } | { kind: 'evolve_ready', options: string[] }
pendingEvolution(p: PokaiInstance): string[]                         // Form.id, vide si aucune
evolve(p: PokaiInstance, toFormId: string): void                     // garde le niveau, l'XP, les PV en %, apprend les techniques du nouveau stade
healPokai(p: PokaiInstance): void
maxContext(p: PokaiInstance): number

// systems/battle.ts : moteur déterministe à partir d'une graine, piloté par des événements
new BattleEngine(init: { player: PokaiInstance[]; foe: PokaiInstance[]; kind: 'wild' | 'trainer'; trainerId?: string; vibeurClass: VibeurClass }, rng: Rng)
engine.state: { playerActive: number; foeActive: number; turn: number; over: boolean }
engine.act(action: PlayerAction): BattleEvent[]
// PlayerAction = { kind: 'move'; index: number } | { kind: 'switch'; index: number } | { kind: 'item'; itemId: string; targetUid?: string } | { kind: 'flee' } | { kind: 'onboard' }
// BattleEvent = { kind: 'message'; text } | { kind: 'move_used'; side; moveId } | { kind: 'damage'; side; amount; hp; maxHp; effectiveness }
//   | { kind: 'heal'; side; amount; hp; maxHp } | { kind: 'status'; side; status | null } | { kind: 'stat'; side; stat; stages }
//   | { kind: 'faint'; side } | { kind: 'switch_in'; side; index } | { kind: 'need_switch' } | { kind: 'xp'; uid; amount; events: ProgressEvent[] }
//   | { kind: 'onboard_ready' } | { kind: 'fled' } | { kind: 'end'; outcome: 'won' | 'lost' | 'fled' }
// 'onboard' vérifie que l'adversaire est sauvage et affaibli : émet 'onboard_ready', ou un message de refus.
// La scène lance alors Onboarding.

// systems/onboarding.ts
startOnboarding(target: PokaiInstance, keyTier: 'free' | 'pro' | 'enterprise', vibeurClass, rng): OnboardingState
//   { traits: Trait[3] (cachés), hints: string[] (révélés), hand: TokenCard[], alignment: 0..100, hallucination: 0..100, attemptsLeft }
playCards(s: OnboardingState, cardIds: string[3], rng): OnboardingResult
//   { matched: string[]; missed: string[]; alignment; hallucination; newHint?: string; outcome: 'continue' | 'success' | 'fled' }

// systems/encounters.ts
rollEncounter(map: MapDef, isNight: boolean, rng): { form: string; level: number } | null

// state/store.ts : point d'accès unique à la sauvegarde
game.state: SaveData            game.newGame(name, vibeurClass)   game.save()   game.load(): boolean   game.hasSave(): boolean
game.flag(name): boolean        game.setFlag(name, v = true)      game.addItem(id, n = 1)  game.removeItem(id, n = 1): boolean
game.addPokai(p): 'party' | 'repo'   game.markSeen(formId)   game.markCaught(formId)   game.healParty()
// net/api.ts : synchronisation facultative avec le serveur Go (ne doit jamais bloquer le jeu hors ligne)
api.pushSave(save)   api.pullSave(playerId)   api.reportCatch(formId)   api.globalDex(): Promise<Record<string, string>>  // formId -> premier joueur
```

## Moteur de scripts (`world/story`)
`runScript(scene, scriptId)` exécute les `ScriptStep` de `data/types.ts`. Les étapes `start_battle` et `open` lancent les scènes
de `battle-ui` avec les données de `scenes/contracts.ts`, puis reprennent le script après leur `onDone`.

## API HTTP (serveur Go, port 8080 ; Vite redirige `/api`)
| Méthode | Route | Corps / réponse |
|---|---|---|
| GET | `/api/health` | `{ ok: true, version }` |
| PUT | `/api/save/{playerId}` | `SaveData` → `204` |
| GET | `/api/save/{playerId}` | → `SaveData` ou `404` |
| POST | `/api/dex/catch` | `{ playerId, playerName, form }` → `{ first: boolean }` |
| GET | `/api/dex/global` | → `{ [formId]: { playerName, at } }` |
| GET | `/api/data/validate` | valide `shared/data` (identifiants de formes, techniques, cartes, dialogues) → rapport |
| GET | `/*` | sert `client/dist` (build de production) |
