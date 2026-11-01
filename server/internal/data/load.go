package data

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Collection names, used as keys in Report.Counts.
const (
	colLines    = "lines"
	colForms    = "forms"
	colMoves    = "moves"
	colTypes    = "types"
	colItems    = "items"
	colTokens   = "tokens"
	colTrainers = "trainers"
	colMaps     = "maps"
	colScripts  = "scripts"
)

// Set is the loaded content of a shared/data directory.
type Set struct {
	Dir      string
	Lines    []Line
	Moves    []Move
	Types    *TypesData
	Items    []Item
	Tokens   []TokenCard
	Trainers []Trainer
	Maps     []MapDef
	Scripts  []DialogueScript

	// loaded records which collections were read successfully, so that
	// references into a missing collection are skipped instead of flooding
	// the report while the data is still being written.
	loaded map[string]bool
	forms  map[string]bool
}

// HasForm reports whether a form id exists in the loaded data.
func (s *Set) HasForm(id string) bool { return s.forms[id] }

// FormCount returns the number of loaded forms.
func (s *Set) FormCount() int { return len(s.forms) }

// Load reads every known file under dir and validates cross references.
// It never fails: unreadable or malformed files become report errors, so a
// partially written data directory still yields a usable (partial) Set.
func Load(dir string) (*Set, *Report) {
	s := &Set{Dir: dir, loaded: map[string]bool{}, forms: map[string]bool{}}
	r := newReport(dir)

	if st, err := os.Stat(dir); err != nil || !st.IsDir() {
		r.errorf("", "", "data directory not found: %s", dir)
		r.finish()
		return s, r
	}

	var pokai struct {
		Lines []Line `json:"lines"`
	}
	if s.readWrapped(r, "pokai.json", colLines, &pokai) {
		s.Lines = pokai.Lines
	}
	var moves struct {
		Moves []Move `json:"moves"`
	}
	if s.readWrapped(r, "moves.json", colMoves, &moves) {
		s.Moves = moves.Moves
	}
	var types TypesData
	if s.readWrapped(r, "types.json", colTypes, &types) {
		s.Types = &types
	}
	var items struct {
		Items []Item `json:"items"`
	}
	if s.readWrapped(r, "items.json", colItems, &items) {
		s.Items = items.Items
	}
	var tokens struct {
		Tokens []TokenCard `json:"tokens"`
	}
	if s.readWrapped(r, "tokens.json", colTokens, &tokens) {
		s.Tokens = tokens.Tokens
	}
	var trainers struct {
		Trainers []Trainer `json:"trainers"`
	}
	if s.readWrapped(r, "trainers.json", colTrainers, &trainers) {
		s.Trainers = trainers.Trainers
	}
	// Chapter files (trainers-*.json) are merged, like the client does.
	extra, err := filepath.Glob(filepath.Join(s.Dir, "trainers-*.json"))
	if err != nil {
		r.warnf("trainers-*.json", "", "glob: %v", err)
	}
	for _, path := range extra {
		var more struct {
			Trainers []Trainer `json:"trainers"`
		}
		if s.readWrapped(r, filepath.Base(path), colTrainers, &more) {
			s.Trainers = append(s.Trainers, more.Trainers...)
		}
	}
	s.readMaps(r)
	s.readScripts(r)

	for _, l := range s.Lines {
		for _, f := range l.Forms {
			if f.ID != "" {
				s.forms[f.ID] = true
			}
		}
	}
	if s.loaded[colLines] {
		s.loaded[colForms] = true
	}

	r.Counts = map[string]int{
		colLines:    len(s.Lines),
		colForms:    len(s.forms),
		colMoves:    len(s.Moves),
		colItems:    len(s.Items),
		colTokens:   len(s.Tokens),
		colTrainers: len(s.Trainers),
		colMaps:     len(s.Maps),
		colScripts:  len(s.Scripts),
	}
	if s.Types != nil {
		r.Counts[colTypes] = len(s.Types.Types)
	}

	validate(s, r)
	r.finish()
	return s, r
}

// readWrapped decodes a single top-level file such as pokai.json.
func (s *Set) readWrapped(r *Report, name, col string, dst any) bool {
	raw, err := os.ReadFile(filepath.Join(s.Dir, name))
	if errors.Is(err, fs.ErrNotExist) {
		r.Missing = append(r.Missing, name)
		r.warnf(name, "", "file missing, references into %s are not checked", col)
		return false
	}
	if err != nil {
		r.errorf(name, "", "read: %v", err)
		return false
	}
	if err := json.Unmarshal(raw, dst); err != nil {
		r.errorf(name, "", "invalid JSON: %v", err)
		return false
	}
	s.loaded[col] = true
	return true
}

// listJSON returns the sorted .json files of a sub directory, relative to the
// data dir. ok is false when the directory does not exist.
func (s *Set) listJSON(r *Report, sub string) (files []string, ok bool) {
	entries, err := os.ReadDir(filepath.Join(s.Dir, sub))
	if errors.Is(err, fs.ErrNotExist) {
		r.Missing = append(r.Missing, sub+"/")
		r.warnf(sub+"/", "", "directory missing")
		return nil, false
	}
	if err != nil {
		r.errorf(sub+"/", "", "read dir: %v", err)
		return nil, false
	}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".json") {
			files = append(files, sub+"/"+e.Name())
		}
	}
	sort.Strings(files)
	return files, true
}

// decodeMany accepts three layouts for one file: a single object, a JSON
// array of objects, or an object wrapping the array under key.
func decodeMany(raw []byte, key string) ([]json.RawMessage, error) {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) > 0 && trimmed[0] == '[' {
		var arr []json.RawMessage
		if err := json.Unmarshal(trimmed, &arr); err != nil {
			return nil, fmt.Errorf("decode array: %w", err)
		}
		return arr, nil
	}
	var obj map[string]json.RawMessage
	if err := json.Unmarshal(trimmed, &obj); err != nil {
		return nil, fmt.Errorf("decode object: %w", err)
	}
	if inner, ok := obj[key]; ok {
		if _, hasID := obj["id"]; !hasID {
			var arr []json.RawMessage
			if err := json.Unmarshal(inner, &arr); err != nil {
				return nil, fmt.Errorf("decode %q: %w", key, err)
			}
			return arr, nil
		}
	}
	return []json.RawMessage{trimmed}, nil
}

func (s *Set) readMaps(r *Report) {
	files, ok := s.listJSON(r, "maps")
	if !ok {
		return
	}
	s.loaded[colMaps] = true
	for _, name := range files {
		raw, err := os.ReadFile(filepath.Join(s.Dir, name))
		if err != nil {
			r.errorf(name, "", "read: %v", err)
			continue
		}
		items, err := decodeMany(raw, "maps")
		if err != nil {
			r.errorf(name, "", "invalid JSON: %v", err)
			continue
		}
		for i, it := range items {
			var m MapDef
			if err := json.Unmarshal(it, &m); err != nil {
				r.errorf(name, fmt.Sprintf("[%d]", i), "invalid map: %v", err)
				continue
			}
			m.file = name
			s.Maps = append(s.Maps, m)
		}
	}
}

func (s *Set) readScripts(r *Report) {
	files, ok := s.listJSON(r, "dialogues")
	if !ok {
		return
	}
	s.loaded[colScripts] = true
	for _, name := range files {
		raw, err := os.ReadFile(filepath.Join(s.Dir, name))
		if err != nil {
			r.errorf(name, "", "read: %v", err)
			continue
		}
		items, err := decodeMany(raw, "scripts")
		if err != nil {
			r.errorf(name, "", "invalid JSON: %v", err)
			continue
		}
		for i, it := range items {
			var d DialogueScript
			if err := json.Unmarshal(it, &d); err != nil {
				r.errorf(name, fmt.Sprintf("[%d]", i), "invalid script: %v", err)
				continue
			}
			d.file = name
			s.Scripts = append(s.Scripts, d)
		}
	}
}
