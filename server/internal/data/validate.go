package data

import (
	"encoding/json"
	"fmt"
	"path"
	"sort"
	"strings"
	"unicode/utf8"
)

const (
	maxLevel    = 100
	maxTeamSize = 6
)

// primary keys of ScriptStep variants (see client/src/data/types.ts).
var stepKinds = setOf("say", "choice", "label", "goto", "if", "set_flag", "give_item",
	"give_pokai", "give_credits", "take_credits", "heal_party", "start_battle",
	"open", "warp", "move_npc", "end",
	"cutscene", "npc_approach", "npc_leave", "intro_card", "camera", "emote")

// auxiliary keys allowed next to a primary key.
var stepAux = setOf("speaker", "portrait", "value", "count", "level", "x", "y", "path")

type index map[string]bool

// validator carries the indexes used to resolve cross references.
type validator struct {
	s        *Set
	r        *Report
	ids      map[string]index
	maps     map[string]*MapDef
	formLine map[string]string
	npcIDs   index
	flagsSet index
	flagRead map[string]string // flag -> first location reading it
}

func validate(s *Set, r *Report) {
	v := &validator{
		s: s, r: r,
		ids:      map[string]index{},
		maps:     map[string]*MapDef{},
		formLine: map[string]string{},
		npcIDs:   index{},
		flagsSet: index{},
		flagRead: map[string]string{},
	}
	v.buildIndexes()
	v.checkTypes()
	v.checkMoves()
	v.checkItems()
	v.checkLines()
	v.checkTrainers()
	v.checkMaps()
	v.checkScripts()
	v.checkFlags()
}

// unique registers ids of a collection and reports duplicates and blanks.
func (v *validator) unique(col, file string, ids []string) index {
	idx := index{}
	for i, id := range ids {
		switch {
		case id == "":
			v.r.errorf(file, fmt.Sprintf("%s[%d]", col, i), "missing id")
		case idx[id]:
			v.r.errorf(file, fmt.Sprintf("%s[%s]", col, id), "duplicate id")
		}
		idx[id] = true
	}
	v.ids[col] = idx
	return idx
}

func (v *validator) buildIndexes() {
	s := v.s
	ids := func(n int, f func(int) string) []string {
		out := make([]string, n)
		for i := range out {
			out[i] = f(i)
		}
		return out
	}
	v.unique(colLines, "pokai.json", ids(len(s.Lines), func(i int) string { return s.Lines[i].ID }))
	var forms []string
	for _, l := range s.Lines {
		for _, f := range l.Forms {
			forms = append(forms, f.ID)
			v.formLine[f.ID] = l.ID
		}
	}
	v.unique(colForms, "pokai.json", forms)
	v.unique(colMoves, "moves.json", ids(len(s.Moves), func(i int) string { return s.Moves[i].ID }))
	v.unique(colItems, "items.json", ids(len(s.Items), func(i int) string { return s.Items[i].ID }))
	v.unique(colTokens, "tokens.json", ids(len(s.Tokens), func(i int) string { return s.Tokens[i].ID }))
	v.unique(colTrainers, "trainers.json", ids(len(s.Trainers), func(i int) string { return s.Trainers[i].ID }))

	mapIdx := index{}
	for i := range s.Maps {
		m := &s.Maps[i]
		switch {
		case m.ID == "":
			v.r.errorf(m.file, "", "map without id")
		case mapIdx[m.ID]:
			v.r.errorf(m.file, "", "duplicate map id %q", m.ID)
		default:
			mapIdx[m.ID] = true
			v.maps[m.ID] = m
		}
		if base := strings.TrimSuffix(path.Base(m.file), ".json"); m.ID != "" && base != m.ID && !strings.Contains(m.file, "maps.json") {
			v.r.warnf(m.file, "", "file name does not match map id %q", m.ID)
		}
		for _, n := range m.Npcs {
			if n.ID != "" {
				v.npcIDs[n.ID] = true
			}
		}
	}
	v.ids[colMaps] = mapIdx

	scriptIdx := index{}
	for _, d := range s.Scripts {
		switch {
		case d.ID == "":
			v.r.errorf(d.file, "", "script without id")
		case scriptIdx[d.ID]:
			v.r.errorf(d.file, "scripts["+d.ID+"]", "duplicate script id")
		}
		scriptIdx[d.ID] = true
	}
	v.ids[colScripts] = scriptIdx
}

// ref checks that id exists in collection col. References into a collection
// that was not loaded are skipped (its absence is already reported).
func (v *validator) ref(col, id, file, at, what string) {
	if !v.s.loaded[col] {
		return
	}
	if id == "" {
		v.r.errorf(file, at, "missing %s reference", what)
		return
	}
	if !v.ids[col][id] {
		v.r.errorf(file, at, "unknown %s %q", what, id)
	}
}

func (v *validator) enum(set map[string]bool, val, file, at, what string) {
	if !set[val] {
		v.r.errorf(file, at, "invalid %s %q", what, val)
	}
}

func (v *validator) checkTypes() {
	t := v.s.Types
	if t == nil {
		return
	}
	const file = "types.json"
	seen := index{}
	for i, td := range t.Types {
		v.enum(typeIDs, td.ID, file, fmt.Sprintf("types[%d]", i), "type")
		seen[td.ID] = true
	}
	var undeclared []string
	for _, id := range sortedKeys(typeIDs) {
		if !seen[id] {
			undeclared = append(undeclared, id)
		}
	}
	if len(undeclared) > 0 {
		v.r.warnf(file, "types", "types not declared: %s", strings.Join(undeclared, ", "))
	}
	for _, atk := range sortedKeys(t.Chart) {
		row := t.Chart[atk]
		v.enum(typeIDs, atk, file, "chart", "attacker type")
		for _, def := range sortedKeys(row) {
			mult := row[def]
			v.enum(typeIDs, def, file, "chart."+atk, "defender type")
			if mult < 0 {
				v.r.errorf(file, "chart."+atk+"."+def, "negative multiplier %v", mult)
			}
		}
	}
}

func (v *validator) checkMoves() {
	const file = "moves.json"
	for _, m := range v.s.Moves {
		at := "moves[" + m.ID + "]"
		v.enum(typeIDs, m.Type, file, at+".type", "type")
		v.enum(moveCategories, m.Category, file, at+".category", "category")
		if m.Accuracy < 0 || m.Accuracy > 100 {
			v.r.errorf(file, at+".accuracy", "accuracy %d out of 0..100", m.Accuracy)
		}
		if m.Effect != nil && m.Effect.Status != "" {
			v.enum(statusIDs, m.Effect.Status, file, at+".effect.status", "status")
		}
	}
}

func (v *validator) checkItems() {
	const file = "items.json"
	for _, it := range v.s.Items {
		at := "items[" + it.ID + "]"
		v.enum(itemKinds, it.Kind, file, at+".kind", "kind")
		if len(it.Cures) == 0 {
			continue
		}
		var all string
		if json.Unmarshal(it.Cures, &all) == nil {
			if all != "all" {
				v.r.errorf(file, at+".cures", `cures must be a status list or "all", got %q`, all)
			}
			continue
		}
		var list []string
		if err := json.Unmarshal(it.Cures, &list); err != nil {
			v.r.errorf(file, at+".cures", "invalid cures: %v", err)
			continue
		}
		for _, st := range list {
			v.enum(statusIDs, st, file, at+".cures", "status")
		}
	}
}

func (v *validator) checkLines() {
	const file = "pokai.json"
	dex := map[int]string{}
	for _, l := range v.s.Lines {
		at := "lines[" + l.ID + "]"
		if other, dup := dex[l.DexNo]; dup && l.DexNo != 0 {
			v.r.errorf(file, at+".dexNo", "dexNo %d already used by %q", l.DexNo, other)
		}
		dex[l.DexNo] = l.ID
		v.enum(rarities, l.Rarity, file, at+".rarity", "rarity")
		if l.CatchDifficulty < 1 || l.CatchDifficulty > 5 {
			v.r.errorf(file, at+".catchDifficulty", "catchDifficulty %d out of 1..5", l.CatchDifficulty)
		}
		if len(l.Forms) == 0 {
			v.r.errorf(file, at+".forms", "line has no forms")
		}
		if len(l.Traits) < 3 {
			v.r.warnf(file, at+".traits", "only %d traits, onboarding draws 3", len(l.Traits))
		}
		for _, t := range l.Traits {
			tat := at + ".traits[" + t.ID + "]"
			if len(t.Tokens) == 0 {
				v.r.warnf(file, tat, "trait matches no token")
			}
			for _, tok := range t.Tokens {
				v.ref(colTokens, tok, file, tat+".tokens", "token")
			}
		}
		for _, f := range l.Forms {
			v.checkForm(l, f)
		}
	}
}

func (v *validator) checkForm(l Line, f Form) {
	const file = "pokai.json"
	at := "forms[" + f.ID + "]"
	if n := len(f.Types); n < 1 || n > 2 {
		v.r.errorf(file, at+".types", "must have 1 or 2 types, has %d", n)
	}
	for _, t := range f.Types {
		v.enum(typeIDs, t, file, at+".types", "type")
	}
	v.enum(licences, f.Licence, file, at+".licence", "licence")
	if len(f.Learnset) == 0 {
		v.r.warnf(file, at+".learnset", "empty learnset")
	}
	for i, e := range f.Learnset {
		eat := fmt.Sprintf("%s.learnset[%d]", at, i)
		v.ref(colMoves, e.Move, file, eat, "move")
		if e.Level < 1 || e.Level > maxLevel {
			v.r.errorf(file, eat, "level %d out of 1..%d", e.Level, maxLevel)
		}
	}
	for i, e := range f.Evolutions {
		eat := fmt.Sprintf("%s.evolutions[%d]", at, i)
		v.ref(colForms, e.To, file, eat, "form")
		if e.To == f.ID {
			v.r.errorf(file, eat, "form evolves into itself")
		}
		if line, ok := v.formLine[e.To]; ok && line != l.ID {
			v.r.warnf(file, eat, "evolves into %q from another line %q", e.To, line)
		}
		if e.Level < 1 || e.Level > maxLevel {
			v.r.errorf(file, eat, "level %d out of 1..%d", e.Level, maxLevel)
		}
	}
}

func (v *validator) checkTrainers() {
	const file = "trainers.json"
	for _, t := range v.s.Trainers {
		at := "trainers[" + t.ID + "]"
		if n := len(t.Team); n == 0 || n > maxTeamSize {
			v.r.errorf(file, at+".team", "team size %d out of 1..%d", n, maxTeamSize)
		}
		for i, p := range t.Team {
			pat := fmt.Sprintf("%s.team[%d]", at, i)
			v.ref(colForms, p.Form, file, pat, "form")
			if p.Level < 1 || p.Level > maxLevel {
				v.r.errorf(file, pat, "level %d out of 1..%d", p.Level, maxLevel)
			}
		}
		if t.IntroDialogue != "" {
			v.ref(colScripts, t.IntroDialogue, file, at+".introDialogue", "script")
		}
		if t.DefeatDialogue != "" {
			v.ref(colScripts, t.DefeatDialogue, file, at+".defeatDialogue", "script")
		}
	}
}

func inBounds(m *MapDef, x, y int) bool {
	return x >= 0 && y >= 0 && x < m.Width && y < m.Height
}

func (v *validator) checkMaps() {
	for i := range v.s.Maps {
		v.checkMap(&v.s.Maps[i])
	}
}

func (v *validator) checkMap(m *MapDef) {
	file := m.file
	if m.Width <= 0 || m.Height <= 0 {
		v.r.errorf(file, "", "invalid size %dx%d", m.Width, m.Height)
	}
	if len(m.Rows) != m.Height {
		v.r.errorf(file, "rows", "%d rows, height is %d", len(m.Rows), m.Height)
	}
	unknown := map[string]bool{}
	for y, row := range m.Rows {
		if n := utf8.RuneCountInString(row); n != m.Width {
			v.r.errorf(file, fmt.Sprintf("rows[%d]", y), "row length %d, width is %d", n, m.Width)
		}
		for _, c := range row {
			if _, ok := m.Legend[string(c)]; !ok {
				unknown[string(c)] = true
			}
		}
	}
	for _, c := range sortedKeys(unknown) {
		v.r.errorf(file, "rows", "char %q not in legend", c)
	}

	npcs := index{}
	for _, n := range m.Npcs {
		at := "npcs[" + n.ID + "]"
		if n.ID == "" {
			v.r.errorf(file, "npcs", "npc without id")
		} else if npcs[n.ID] {
			v.r.errorf(file, at, "duplicate npc id")
		}
		npcs[n.ID] = true
		if !inBounds(m, n.X, n.Y) {
			v.r.errorf(file, at, "position (%d,%d) out of map", n.X, n.Y)
		}
		v.enum(directions, n.Facing, file, at+".facing", "direction")
		v.ref(colScripts, n.Dialogue, file, at+".dialogue", "script")
		if n.Trainer != "" {
			v.ref(colTrainers, n.Trainer, file, at+".trainer", "trainer")
		}
		v.readCondition(n.Condition, file, at)
	}
	for i, w := range m.Warps {
		at := fmt.Sprintf("warps[%d]", i)
		if !inBounds(m, w.X, w.Y) {
			v.r.errorf(file, at, "position (%d,%d) out of map", w.X, w.Y)
		}
		v.ref(colMaps, w.To, file, at+".to", "map")
		if target, ok := v.maps[w.To]; ok && !inBounds(target, w.ToX, w.ToY) {
			v.r.errorf(file, at, "target (%d,%d) out of map %q (%dx%d)", w.ToX, w.ToY, w.To, target.Width, target.Height)
		}
	}
	for i, t := range m.Triggers {
		at := fmt.Sprintf("triggers[%d]", i)
		if !inBounds(m, t.X, t.Y) {
			v.r.errorf(file, at, "position (%d,%d) out of map", t.X, t.Y)
		}
		v.ref(colScripts, t.Script, file, at+".script", "script")
		v.readCondition(t.Condition, file, at)
	}
	for i, e := range m.Encounters {
		at := fmt.Sprintf("encounters[%d]", i)
		v.ref(colForms, e.Form, file, at, "form")
		if e.MinLevel < 1 || e.MaxLevel > maxLevel || e.MinLevel > e.MaxLevel {
			v.r.errorf(file, at, "invalid level range %d..%d", e.MinLevel, e.MaxLevel)
		}
		if e.Weight <= 0 {
			v.r.errorf(file, at, "weight must be > 0")
		}
	}
	if m.Hub != nil && !inBounds(m, m.Hub.X, m.Hub.Y) {
		v.r.errorf(file, "hub", "position (%d,%d) out of map", m.Hub.X, m.Hub.Y)
	}
}

func (v *validator) checkScripts() {
	for _, d := range v.s.Scripts {
		v.checkScript(d)
	}
}

func (v *validator) checkScript(d DialogueScript) {
	file := d.file
	base := "scripts[" + d.ID + "]"
	if len(d.Steps) == 0 {
		v.r.warnf(file, base, "script has no steps")
	}
	labels := index{}
	for _, st := range d.Steps {
		if raw, ok := st["label"]; ok {
			var l string
			if err := json.Unmarshal(raw, &l); err == nil {
				if labels[l] {
					v.r.errorf(file, base, "duplicate label %q", l)
				}
				labels[l] = true
			}
		}
	}
	str := func(raw json.RawMessage, at, what string) (string, bool) {
		var out string
		if err := json.Unmarshal(raw, &out); err != nil {
			v.r.errorf(file, at, "%s must be a string", what)
			return "", false
		}
		return out, true
	}
	gotoLabel := func(raw json.RawMessage, at string) {
		if l, ok := str(raw, at, "goto"); ok && !labels[l] {
			v.r.errorf(file, at, "goto unknown label %q", l)
		}
	}

	for i, st := range d.Steps {
		at := fmt.Sprintf("%s.steps[%d]", base, i)
		var kinds []string
		for _, k := range sortedKeys(st) {
			switch {
			case k == "goto" && st["if"] != nil:
			case stepKinds[k]:
				kinds = append(kinds, k)
			case !stepAux[k]:
				v.r.warnf(file, at, "unknown key %q", k)
			}
		}
		if len(kinds) != 1 {
			v.r.errorf(file, at, "step must have exactly one action, has %v", kinds)
			continue
		}
		raw := st[kinds[0]]
		switch kinds[0] {
		case "goto":
			gotoLabel(raw, at)
		case "if":
			v.readCondition(raw, file, at)
			if g, ok := st["goto"]; ok {
				gotoLabel(g, at)
			} else {
				v.r.errorf(file, at, "if without goto")
			}
		case "choice":
			var opts []struct {
				Label string          `json:"label"`
				Goto  json.RawMessage `json:"goto"`
			}
			if err := json.Unmarshal(raw, &opts); err != nil || len(opts) == 0 {
				v.r.errorf(file, at, "choice must be a non-empty list")
				continue
			}
			for _, o := range opts {
				gotoLabel(o.Goto, at+".choice")
			}
		case "set_flag":
			if f, ok := str(raw, at, "set_flag"); ok {
				v.flagsSet[f] = true
			}
		case "give_item":
			if id, ok := str(raw, at, "give_item"); ok {
				v.ref(colItems, id, file, at, "item")
			}
		case "give_pokai":
			if id, ok := str(raw, at, "give_pokai"); ok {
				v.ref(colForms, id, file, at, "form")
			}
		case "start_battle":
			if id, ok := str(raw, at, "start_battle"); ok {
				v.ref(colTrainers, id, file, at, "trainer")
			}
		case "open":
			if id, ok := str(raw, at, "open"); ok {
				v.enum(openTargets, id, file, at, "open target")
			}
		case "warp":
			v.checkWarpStep(st, raw, file, at)
		case "move_npc":
			if id, ok := str(raw, at, "move_npc"); ok && v.s.loaded[colMaps] && !v.npcIDs[id] {
				v.r.errorf(file, at, "unknown npc %q", id)
			}
			var dirs []string
			if err := json.Unmarshal(st["path"], &dirs); err != nil {
				v.r.errorf(file, at, "move_npc needs a path of directions")
			}
			for _, dir := range dirs {
				v.enum(directions, dir, file, at+".path", "direction")
			}
		}
	}
}

func (v *validator) checkWarpStep(st map[string]json.RawMessage, raw json.RawMessage, file, at string) {
	var id string
	if err := json.Unmarshal(raw, &id); err != nil {
		v.r.errorf(file, at, "warp must be a map id")
		return
	}
	v.ref(colMaps, id, file, at, "map")
	var x, y int
	errX := json.Unmarshal(st["x"], &x)
	errY := json.Unmarshal(st["y"], &y)
	if errX != nil || errY != nil {
		v.r.errorf(file, at, "warp needs integer x and y")
		return
	}
	if m, ok := v.maps[id]; ok && !inBounds(m, x, y) {
		v.r.errorf(file, at, "target (%d,%d) out of map %q", x, y, id)
	}
}

// readCondition records the flags a FlagCondition reads.
func (v *validator) readCondition(raw json.RawMessage, file, at string) {
	if len(raw) == 0 || string(raw) == "null" {
		return
	}
	var c struct {
		Flag *string           `json:"flag"`
		All  []json.RawMessage `json:"all"`
		Any  []json.RawMessage `json:"any"`
		Not  json.RawMessage   `json:"not"`
	}
	if err := json.Unmarshal(raw, &c); err != nil {
		v.r.errorf(file, at, "invalid condition: %v", err)
		return
	}
	switch {
	case c.Flag != nil:
		if _, seen := v.flagRead[*c.Flag]; !seen {
			v.flagRead[*c.Flag] = file + " " + at
		}
	case c.All != nil || c.Any != nil:
		for _, sub := range append(c.All, c.Any...) {
			v.readCondition(sub, file, at)
		}
	case c.Not != nil:
		v.readCondition(c.Not, file, at)
	default:
		v.r.errorf(file, at, "condition needs flag, all, any or not")
	}
}

// checkFlags warns about flags read by conditions but never set by a script.
// Some flags may be set by game code, hence a warning only.
func (v *validator) checkFlags() {
	for _, f := range sortedKeys(v.flagRead) {
		if !v.flagsSet[f] {
			v.r.warnf("", v.flagRead[f], "flag %q is read but never set by a script", f)
		}
	}
}

func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
