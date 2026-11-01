# Serveur PokAI

Serveur Go : sauvegardes, Neurodex mondial (premier joueur à onboarder chaque forme), validation de `shared/data` et
service du build client (`client/dist`). SQLite via `modernc.org/sqlite` (pur Go, pas de cgo).

## Lancer

```sh
cd server
go run ./cmd/pokai          # ou : make run
make test                   # go vet + go test ./...
make build                  # binaire ./pokai
```

Les chemins par défaut sont résolus depuis la racine du dépôt, qu'on lance depuis la racine ou depuis `server/`.

| Flag | Env | Défaut |
|---|---|---|
| `-addr` | `POKAI_ADDR` | `:8080` |
| `-db` | `POKAI_DB` | `server/data/pokai.db` (dossier créé au besoin) |
| `-data` | `POKAI_DATA` | `shared/data` |
| `-static` | `POKAI_STATIC` | `client/dist` (vide = désactivé) |

En dev, Vite (port 5173) redirige `/api` vers `:8080`.

## Routes

| Méthode | Route | Corps → réponse |
|---|---|---|
| GET | `/api/health` | `{ ok, version }` |
| PUT | `/api/save/{playerId}` | `SaveData` (JSON, `version: 1`, ≤ 256 Ko) → `204` |
| GET | `/api/save/{playerId}` | → `SaveData` ou `404` |
| POST | `/api/dex/catch` | `{ playerId, playerName, form }` → `{ first }` |
| GET | `/api/dex/global` | → `{ [formId]: { playerName, at } }` |
| GET | `/api/data/validate` | relit `shared/data` et renvoie `{ ok, counts, missing, errors, warnings }` |
| GET | `/*` | fichiers de `client/dist`, sinon `index.html` (SPA) |

- `playerId` : `^[a-zA-Z0-9_-]{6,64}$`. `playerName` : 1 à 32 caractères imprimables.
- `form` doit exister dans les données chargées (si aucune forme n'est chargée, tout id `snake_case` est accepté).
- `first` est vrai pour le premier joueur du monde à onboarder la forme (et le reste s'il renvoie la requête).
- Erreurs toujours en JSON : `{ "error": "..." }`.
- Les routes d'écriture (PUT save, POST catch) sont limitées par IP : rafale de 20, puis 2 par seconde (`429` + `Retry-After`).

## Validation des données

`/api/data/validate` (et le log au démarrage) vérifie notamment : ids en double, formes citées par les évolutions,
dresseurs et rencontres, techniques des learnsets, tokens des traits, scripts cités par les PNJ, déclencheurs et dresseurs,
cibles des warps (carte existante et coordonnées dans la carte), légende des cartes, labels des `goto`/`choice`,
et drapeaux lus mais jamais posés (avertissement). Un fichier absent est un avertissement et les références vers lui ne sont
pas vérifiées : le serveur démarre même avec des données incomplètes.

## Arborescence

```
cmd/pokai/        main : flags, résolution des chemins, arrêt propre (SIGINT/SIGTERM)
internal/api/     routes, handlers, middlewares (logs slog, recover, rate limit), fichiers statiques
internal/store/   SQLite : tables saves et dex_first
internal/data/    chargement et validation de shared/data (fixtures dans testdata/)
```
