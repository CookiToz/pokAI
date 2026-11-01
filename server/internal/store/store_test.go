package store

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
)

func openTemp(t *testing.T) *Store {
	t.Helper()
	s, err := Open(context.Background(), filepath.Join(t.TempDir(), "sub", "test.db"))
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() {
		if err := s.Close(); err != nil {
			t.Errorf("close: %v", err)
		}
	})
	return s
}

func TestSaveRoundTrip(t *testing.T) {
	ctx := context.Background()
	s := openTemp(t)
	if _, err := s.GetSave(ctx, "player1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
	for _, body := range []string{`{"version":1,"credits":1}`, `{"version":1,"credits":2}`} {
		if err := s.PutSave(ctx, "player1", []byte(body)); err != nil {
			t.Fatalf("put: %v", err)
		}
		got, err := s.GetSave(ctx, "player1")
		if err != nil || string(got) != body {
			t.Fatalf("get = %s, %v; want %s", got, err, body)
		}
	}
}

func TestPutSaveRejectsInvalidJSON(t *testing.T) {
	if err := openTemp(t).PutSave(context.Background(), "player1", []byte("{nope")); err == nil {
		t.Fatal("expected json_valid constraint error")
	}
}

func TestRecordCatchFirstOnly(t *testing.T) {
	ctx := context.Background()
	s := openTemp(t)
	first, err := s.RecordCatch(ctx, "alice1", "Alice", "claude_haiku")
	if err != nil || !first {
		t.Fatalf("alice first = %v, %v", first, err)
	}
	if first, err := s.RecordCatch(ctx, "bobby1", "Bob", "claude_haiku"); err != nil || first {
		t.Fatalf("bob first = %v, %v", first, err)
	}
	if first, err := s.RecordCatch(ctx, "alice1", "Alice", "claude_haiku"); err != nil || !first {
		t.Fatalf("alice retry should stay first: %v, %v", first, err)
	}
	dex, err := s.GlobalDex(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(dex) != 1 || dex["claude_haiku"].PlayerName != "Alice" || dex["claude_haiku"].At.IsZero() {
		t.Fatalf("dex = %+v", dex)
	}
}

func TestRecordCatchConcurrent(t *testing.T) {
	ctx := context.Background()
	s := openTemp(t)
	const n = 32
	var firsts atomic.Int32
	var wg sync.WaitGroup
	errs := make(chan error, n)
	for i := range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			first, err := s.RecordCatch(ctx, fmt.Sprintf("player%03d", i), "P", "gpt_4o")
			if err != nil {
				errs <- err
				return
			}
			if first {
				firsts.Add(1)
			}
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Error(err)
	}
	if got := firsts.Load(); got != 1 {
		t.Fatalf("%d players got first, want exactly 1", got)
	}
}
