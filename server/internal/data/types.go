// Package data loads and cross-validates the JSON game data in shared/data.
//
// The Go structs mirror client/src/data/types.ts, but only the fields the
// server needs to validate references are declared. Unknown fields are ignored.
package data

import "encoding/json"

// Valid enum values, mirrored from client/src/data/types.ts.
var (
	typeIDs   = setOf("chat", "code", "reasoning", "media", "agent", "chaos", "legacy")
	licences  = setOf("open", "proprietary")
	statusIDs = setOf("hallucinating", "rate_limited", "censored", "overheat",
		"maintenance", "deprecated", "api_outage")
	moveCategories = setOf("damage", "status", "heal", "shield", "buff", "debuff")
	itemKinds      = setOf("api_key", "heal", "status_heal", "boost", "key_item")
	rarities       = setOf("common", "uncommon", "rare", "legendary")
	directions     = setOf("up", "down", "left", "right")
	openTargets    = setOf("store", "starter_choice", "neurodex", "party", "repo", "vending")
)

func setOf(vals ...string) map[string]bool {
	m := make(map[string]bool, len(vals))
	for _, v := range vals {
		m[v] = true
	}
	return m
}

// LearnsetEntry is a move learnt at a given level.
type LearnsetEntry struct {
	Level int    `json:"level"`
	Move  string `json:"move"`
}

// Evolution points to the next form.
type Evolution struct {
	To    string `json:"to"`
	Level int    `json:"level"`
}

// Form is one version of a PokAI line.
type Form struct {
	ID           string          `json:"id"`
	Name         string          `json:"name"`
	Stage        int             `json:"stage"`
	Types        []string        `json:"types"`
	Licence      string          `json:"licence"`
	Learnset     []LearnsetEntry `json:"learnset"`
	Evolutions   []Evolution     `json:"evolutions"`
	Unobtainable bool            `json:"unobtainable"`
}

// Trait is part of a hidden system prompt; it matches some token cards.
type Trait struct {
	ID     string   `json:"id"`
	Tokens []string `json:"tokens"`
}

// Line is an evolution family.
type Line struct {
	ID              string  `json:"id"`
	DexNo           int     `json:"dexNo"`
	Rarity          string  `json:"rarity"`
	CatchDifficulty int     `json:"catchDifficulty"`
	Traits          []Trait `json:"traits"`
	Forms           []Form  `json:"forms"`
}

// MoveEffect holds the optional effect of a move.
type MoveEffect struct {
	Status string `json:"status"`
}

// Move is a battle technique.
type Move struct {
	ID       string      `json:"id"`
	Type     string      `json:"type"`
	Category string      `json:"category"`
	Accuracy int         `json:"accuracy"`
	Effect   *MoveEffect `json:"effect"`
}

// TypeDef is one entry of types.json.
type TypeDef struct {
	ID string `json:"id"`
}

// TypesData is types.json.
type TypesData struct {
	Types []TypeDef                     `json:"types"`
	Chart map[string]map[string]float64 `json:"chart"`
}

// Item is a bag item. Cures is either a list of statuses or the string "all".
type Item struct {
	ID    string          `json:"id"`
	Kind  string          `json:"kind"`
	Cures json.RawMessage `json:"cures"`
}

// TokenCard is an onboarding card.
type TokenCard struct {
	ID string `json:"id"`
}

// TrainerPokai is one member of a trainer team.
type TrainerPokai struct {
	Form  string `json:"form"`
	Level int    `json:"level"`
}

// Trainer is an NPC that battles.
type Trainer struct {
	ID             string         `json:"id"`
	Team           []TrainerPokai `json:"team"`
	IntroDialogue  string         `json:"introDialogue"`
	DefeatDialogue string         `json:"defeatDialogue"`
}

// MapNpc is a character placed on a map.
type MapNpc struct {
	ID        string          `json:"id"`
	X         int             `json:"x"`
	Y         int             `json:"y"`
	Facing    string          `json:"facing"`
	Dialogue  string          `json:"dialogue"`
	Trainer   string          `json:"trainer"`
	Condition json.RawMessage `json:"condition"`
}

// MapWarp teleports the player to another map.
type MapWarp struct {
	X   int    `json:"x"`
	Y   int    `json:"y"`
	To  string `json:"to"`
	ToX int    `json:"toX"`
	ToY int    `json:"toY"`
}

// MapTrigger runs a script when stepped on.
type MapTrigger struct {
	X         int             `json:"x"`
	Y         int             `json:"y"`
	Script    string          `json:"script"`
	Condition json.RawMessage `json:"condition"`
}

// EncounterEntry is a wild encounter on cable tiles.
type EncounterEntry struct {
	Form     string  `json:"form"`
	MinLevel int     `json:"minLevel"`
	MaxLevel int     `json:"maxLevel"`
	Weight   float64 `json:"weight"`
}

// Point is a tile coordinate.
type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// MapDef is one tile map.
type MapDef struct {
	ID         string            `json:"id"`
	Width      int               `json:"width"`
	Height     int               `json:"height"`
	Rows       []string          `json:"rows"`
	Legend     map[string]string `json:"legend"`
	Npcs       []MapNpc          `json:"npcs"`
	Warps      []MapWarp         `json:"warps"`
	Triggers   []MapTrigger      `json:"triggers"`
	Encounters []EncounterEntry  `json:"encounters"`
	Hub        *Point            `json:"hub"`

	file string
}

// DialogueScript is a declarative story script. Steps are kept raw because
// ScriptStep is a union discriminated by its keys.
type DialogueScript struct {
	ID    string                       `json:"id"`
	Steps []map[string]json.RawMessage `json:"steps"`

	file string
}
