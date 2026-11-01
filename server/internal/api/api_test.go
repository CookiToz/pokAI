package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"pokai/server/internal/store"
)

const goodData = "../data/testdata/good"

type testEnv struct {
	t   *testing.T
	srv *Server
	h   http.Handler
}

func newEnv(t *testing.T, dataDir, staticDir string, rl RateLimit) *testEnv {
	t.Helper()
	st, err := store.Open(context.Background(), filepath.Join(t.TempDir(), "pokai.db"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() {
		if err := st.Close(); err != nil {
			t.Errorf("close: %v", err)
		}
	})
	srv := New(st, Config{
		Version: "test", DataDir: dataDir, StaticDir: staticDir, RateLimit: rl,
		Logger: slog.New(slog.NewTextHandler(io.Discard, nil)),
	})
	return &testEnv{t: t, srv: srv, h: srv.Handler()}
}

func (e *testEnv) do(method, path, body string) *httptest.ResponseRecorder {
	e.t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	e.h.ServeHTTP(rec, req)
	return rec
}

func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode %q: %v", rec.Body.String(), err)
	}
	return v
}

func expectStatus(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != want {
		t.Fatalf("status = %d, want %d, body %s", rec.Code, want, rec.Body.String())
	}
}

func TestHealth(t *testing.T) {
	e := newEnv(t, goodData, "", RateLimit{})
	rec := e.do(http.MethodGet, "/api/health", "")
	expectStatus(t, rec, http.StatusOK)
	got := decode[healthResponse](t, rec)
	if !got.OK || got.Version != "test" {
		t.Fatalf("health = %+v", got)
	}
}

func TestValidPlayerID(t *testing.T) {
	cases := map[string]bool{
		"abc123":                true,
		"A-b_C-123456":          true,
		strings.Repeat("a", 64): true,
		"abc12":                 false,
		strings.Repeat("a", 65): false,
		"abc 123":               false,
		"abc/123":               false,
		"abcdé12":               false,
		"":                      false,
	}
	for id, want := range cases {
		if got := ValidPlayerID(id); got != want {
			t.Errorf("ValidPlayerID(%q) = %v, want %v", id, got, want)
		}
	}
}

func TestSaveRoundTrip(t *testing.T) {
	e := newEnv(t, goodData, "", RateLimit{})
	expectStatus(t, e.do(http.MethodGet, "/api/save/player1", ""), http.StatusNotFound)

	save := `{ "version": 1, "playerName": "Vibeur", "credits": 42 }`
	rec := e.do(http.MethodPut, "/api/save/player1", save)
	expectStatus(t, rec, http.StatusNoContent)

	rec = e.do(http.MethodGet, "/api/save/player1", "")
	expectStatus(t, rec, http.StatusOK)
	got := decode[map[string]any](t, rec)
	if got["playerName"] != "Vibeur" || got["credits"] != float64(42) {
		t.Fatalf("save = %v", got)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("content type %q", ct)
	}
}

func TestPutSaveRejects(t *testing.T) {
	e := newEnv(t, goodData, "", RateLimit{})
	cases := []struct {
		name, path, body string
		status           int
	}{
		{"bad id", "/api/save/abc", `{"version":1}`, http.StatusBadRequest},
		{"not json", "/api/save/player1", `{nope`, http.StatusBadRequest},
		{"array", "/api/save/player1", `[1]`, http.StatusBadRequest},
		{"no version", "/api/save/player1", `{"playerName":"x"}`, http.StatusBadRequest},
		{"wrong version", "/api/save/player1", `{"version":2}`, http.StatusBadRequest},
		{"string version", "/api/save/player1", `{"version":"1"}`, http.StatusBadRequest},
		{"too large", "/api/save/player1", `{"version":1,"pad":"` + strings.Repeat("x", maxSaveBytes) + `"}`, http.StatusRequestEntityTooLarge},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := e.do(http.MethodPut, c.path, c.body)
			expectStatus(t, rec, c.status)
			if decode[errorBody](t, rec).Error == "" {
				t.Error("missing error message")
			}
		})
	}
}

func TestCatchFirstAndGlobalDex(t *testing.T) {
	e := newEnv(t, goodData, "", RateLimit{})
	catch := func(id, name, form string) *httptest.ResponseRecorder {
		return e.do(http.MethodPost, "/api/dex/catch",
			`{"playerId":"`+id+`","playerName":"`+name+`","form":"`+form+`"}`)
	}
	rec := catch("alice1", "Alice", "claude_haiku")
	expectStatus(t, rec, http.StatusOK)
	if !decode[catchResponse](t, rec).First {
		t.Fatal("alice should be first")
	}
	rec = catch("bobby1", "Bob", "claude_haiku")
	expectStatus(t, rec, http.StatusOK)
	if decode[catchResponse](t, rec).First {
		t.Fatal("bob should not be first")
	}
	expectStatus(t, catch("bobby1", "Bob", "claude_opus"), http.StatusBadRequest) // unknown form
	expectStatus(t, catch("bob", "Bob", "claude_haiku"), http.StatusBadRequest)   // bad id
	expectStatus(t, catch("bobby1", "", "claude_haiku"), http.StatusBadRequest)   // empty name
	expectStatus(t, catch("bobby1", "Bob", "Claude-Haiku"), http.StatusBadRequest)

	rec = e.do(http.MethodGet, "/api/dex/global", "")
	expectStatus(t, rec, http.StatusOK)
	dex := decode[map[string]store.DexEntry](t, rec)
	if len(dex) != 1 || dex["claude_haiku"].PlayerName != "Alice" {
		t.Fatalf("dex = %+v", dex)
	}
}

func TestCatchAcceptsAnyFormWithoutData(t *testing.T) {
	e := newEnv(t, filepath.Join(t.TempDir(), "missing"), "", RateLimit{})
	rec := e.do(http.MethodPost, "/api/dex/catch", `{"playerId":"alice1","playerName":"Alice","form":"whatever"}`)
	expectStatus(t, rec, http.StatusOK)
}

func TestValidateRoute(t *testing.T) {
	e := newEnv(t, "../data/testdata/broken", "", RateLimit{})
	rec := e.do(http.MethodGet, "/api/data/validate", "")
	expectStatus(t, rec, http.StatusOK)
	rep := decode[struct {
		OK     bool              `json:"ok"`
		Errors []json.RawMessage `json:"errors"`
	}](t, rec)
	if rep.OK || len(rep.Errors) == 0 {
		t.Fatalf("expected a failing report, got %s", rec.Body.String())
	}
}

func TestRateLimitOnWrites(t *testing.T) {
	e := newEnv(t, goodData, "", RateLimit{Rate: 0.001, Burst: 2})
	for range 2 {
		expectStatus(t, e.do(http.MethodPut, "/api/save/player1", `{"version":1}`), http.StatusNoContent)
	}
	rec := e.do(http.MethodPut, "/api/save/player1", `{"version":1}`)
	expectStatus(t, rec, http.StatusTooManyRequests)
	if rec.Header().Get("Retry-After") == "" {
		t.Error("missing Retry-After")
	}
	// reads are not limited
	expectStatus(t, e.do(http.MethodGet, "/api/save/player1", ""), http.StatusOK)
}

func TestLimiterRefills(t *testing.T) {
	now := time.Unix(0, 0)
	l := newLimiter(RateLimit{Rate: 1, Burst: 1}, func() time.Time { return now })
	if ok, _ := l.allow("ip"); !ok {
		t.Fatal("first call must pass")
	}
	if ok, wait := l.allow("ip"); ok || wait <= 0 {
		t.Fatalf("second call must be limited, wait %v", wait)
	}
	now = now.Add(time.Second)
	if ok, _ := l.allow("ip"); !ok {
		t.Fatal("bucket should refill")
	}
	if ok, _ := l.allow("other"); !ok {
		t.Fatal("buckets are per key")
	}
}

func TestUnknownAPIRouteIsJSON404(t *testing.T) {
	e := newEnv(t, goodData, "", RateLimit{})
	for _, p := range []string{"/api/nope", "/api/save/player1/extra"} {
		rec := e.do(http.MethodGet, p, "")
		expectStatus(t, rec, http.StatusNotFound)
		if decode[errorBody](t, rec).Error == "" {
			t.Errorf("%s: missing JSON error", p)
		}
	}
}

func TestPanicRecovery(t *testing.T) {
	h := recoverPanics(slog.New(slog.NewTextHandler(io.Discard, nil)), http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	expectStatus(t, rec, http.StatusInternalServerError)
}

func TestStaticSPAFallback(t *testing.T) {
	dir := t.TempDir()
	write := func(name, body string) {
		t.Helper()
		p := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("index.html", "<html>pokai</html>")
	write("assets/app.js", "console.log(1)")
	e := newEnv(t, goodData, dir, RateLimit{})

	cases := []struct {
		path   string
		status int
		body   string
	}{
		{"/", http.StatusOK, "pokai"},
		{"/neurodex/12", http.StatusOK, "pokai"},
		{"/assets/app.js", http.StatusOK, "console.log"},
		{"/assets/missing.js", http.StatusNotFound, ""},
		{"/etc/passwd", http.StatusOK, "pokai"},                 // no such file: SPA fallback
		{"/../../etc/passwd", http.StatusTemporaryRedirect, ""}, // mux cleans the path first
	}
	for _, c := range cases {
		rec := e.do(http.MethodGet, c.path, "")
		if rec.Code != c.status || !strings.Contains(rec.Body.String(), c.body) {
			t.Errorf("GET %s = %d %q, want %d containing %q", c.path, rec.Code, rec.Body.String(), c.status, c.body)
		}
	}
	expectStatus(t, e.do(http.MethodPost, "/neurodex", ""), http.StatusMethodNotAllowed)
}
