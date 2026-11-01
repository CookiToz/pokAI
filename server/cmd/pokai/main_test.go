package main

import (
	"path/filepath"
	"testing"
)

func TestDefaultsResolveFromRepoRoot(t *testing.T) {
	// Tests run in server/cmd/pokai: defaults must still point at the repo root.
	c, err := parseConfig(nil)
	if err != nil {
		t.Fatal(err)
	}
	root, err := filepath.Abs("../../..")
	if err != nil {
		t.Fatal(err)
	}
	if want := filepath.Join(root, "shared", "data"); c.data != want {
		t.Errorf("data = %s, want %s", c.data, want)
	}
	if want := filepath.Join(root, "server", "data", "pokai.db"); c.db != want {
		t.Errorf("db = %s, want %s", c.db, want)
	}
	if c.addr != ":8080" {
		t.Errorf("addr = %s", c.addr)
	}
}

func TestFlagsOverrideDefaults(t *testing.T) {
	t.Setenv("POKAI_ADDR", ":9000")
	c, err := parseConfig([]string{"-db", "x.db", "-static", ""})
	if err != nil {
		t.Fatal(err)
	}
	if c.addr != ":9000" || c.db != "x.db" || c.static != "" {
		t.Errorf("config = %+v", c)
	}
}
