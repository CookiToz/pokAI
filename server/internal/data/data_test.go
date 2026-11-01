package data

import (
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadGoodFixture(t *testing.T) {
	set, rep := Load(filepath.Join("testdata", "good"))
	if !rep.OK {
		t.Fatalf("expected ok report, errors: %v", rep.Errors)
	}
	if len(rep.Warnings) != 0 {
		t.Errorf("unexpected warnings: %v", rep.Warnings)
	}
	want := map[string]int{
		colLines: 1, colForms: 2, colMoves: 2, colTypes: 7, colItems: 3,
		colTokens: 4, colTrainers: 1, colMaps: 2, colScripts: 3,
	}
	for k, n := range want {
		if rep.Counts[k] != n {
			t.Errorf("count %s = %d, want %d", k, rep.Counts[k], n)
		}
	}
	if !set.HasForm("claude_sonnet") || set.HasForm("claude_opus") {
		t.Error("HasForm gives wrong answers")
	}
}

func TestLoadBrokenFixtureReportsEveryBrokenRef(t *testing.T) {
	set, rep := Load(filepath.Join("testdata", "broken"))
	if rep.OK {
		t.Fatal("expected errors")
	}
	if set.FormCount() != 1 {
		t.Errorf("FormCount = %d, want 1 (duplicate collapsed)", set.FormCount())
	}
	all := issuesText(rep.Errors)
	expected := []string{
		`duplicate id`,
		`unknown form "claude_opus"`,
		`unknown move "ghost_move"`,
		`unknown token "nope_token"`,
		`unknown form "gpt_99"`,
		`unknown script "missing_script"`,
		`unknown script "nope_script"`,
		`unknown map "nowhere"`,
		`target (0,5) out of map "route_1"`,
		`unknown form "ghost"`,
		`char "?" not in legend`,
		`unknown trainer "ghost_trainer"`,
		`goto unknown label "nolabel"`,
		`dialogues/bad.json: invalid JSON`,
	}
	for _, e := range expected {
		if !strings.Contains(all, e) {
			t.Errorf("missing error %q in:\n%s", e, all)
		}
	}
	// items.json and types.json are missing: reported once, refs skipped.
	if strings.Contains(all, `unknown item "anything"`) {
		t.Error("references into a missing collection must be skipped")
	}
	if strings.Join(rep.Missing, ",") != "types.json,items.json" {
		t.Errorf("Missing = %v", rep.Missing)
	}
}

func TestLoadMissingDirDoesNotPanic(t *testing.T) {
	set, rep := Load(filepath.Join(t.TempDir(), "nope"))
	if rep.OK || len(rep.Errors) != 1 {
		t.Fatalf("want one error, got %v", rep.Errors)
	}
	if set.FormCount() != 0 {
		t.Error("expected empty set")
	}
}

func TestDecodeManyLayouts(t *testing.T) {
	cases := map[string]int{
		`{"id":"a","steps":[]}`:               1,
		`[{"id":"a"},{"id":"b"}]`:             2,
		`{"scripts":[{"id":"a"},{"id":"b"}]}`: 2,
	}
	for in, n := range cases {
		got, err := decodeMany([]byte(in), "scripts")
		if err != nil || len(got) != n {
			t.Errorf("decodeMany(%s) = %d, %v; want %d", in, len(got), err, n)
		}
	}
}

func issuesText(is []Issue) string {
	var b strings.Builder
	for _, i := range is {
		b.WriteString(i.String())
		b.WriteByte('\n')
	}
	return b.String()
}
