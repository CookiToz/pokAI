// Package api exposes the PokAI HTTP API (see docs/CONTRACTS.md).
package api

import (
	"log/slog"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"pokai/server/internal/data"
	"pokai/server/internal/store"
)

// Config configures a Server.
type Config struct {
	Version   string
	DataDir   string // shared/data
	StaticDir string // client/dist; empty disables static serving
	RateLimit RateLimit
	Logger    *slog.Logger
}

// Server holds the API dependencies.
type Server struct {
	cfg     Config
	store   *store.Store
	log     *slog.Logger
	limiter *limiter
	data    atomic.Pointer[data.Set]
	report  atomic.Pointer[data.Report]
}

// New builds a Server and loads the game data once.
func New(st *store.Store, cfg Config) *Server {
	if cfg.Logger == nil {
		cfg.Logger = slog.Default()
	}
	if cfg.RateLimit == (RateLimit{}) {
		cfg.RateLimit = DefaultRateLimit
	}
	s := &Server{
		cfg:     cfg,
		store:   st,
		log:     cfg.Logger,
		limiter: newLimiter(cfg.RateLimit, time.Now),
	}
	s.ReloadData()
	return s
}

// ReloadData re-reads the data directory and swaps the in-memory index.
func (s *Server) ReloadData() *data.Report {
	set, rep := data.Load(s.cfg.DataDir)
	s.data.Store(set)
	s.report.Store(rep)
	s.log.Info("data loaded",
		slog.String("dir", rep.Dir),
		slog.Bool("ok", rep.OK),
		slog.Any("counts", rep.Counts),
		slog.Int("errors", len(rep.Errors)),
		slog.Int("warnings", len(rep.Warnings)),
	)
	return rep
}

// Handler returns the root handler with middleware applied.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("PUT /api/save/{playerId}", s.limiter.wrap(s.handlePutSave))
	mux.HandleFunc("GET /api/save/{playerId}", s.handleGetSave)
	mux.HandleFunc("POST /api/dex/catch", s.limiter.wrap(s.handleCatch))
	mux.HandleFunc("GET /api/dex/global", s.handleGlobalDex)
	mux.HandleFunc("GET /api/data/validate", s.handleValidate)
	mux.Handle("/", s.fallback())
	return logRequests(s.log, recoverPanics(s.log, mux))
}

// fallback handles everything no API pattern matched: unknown /api routes
// get a JSON 404, other GET/HEAD requests are served from the client build.
func (s *Server) fallback() http.Handler {
	var static http.Handler
	if s.cfg.StaticDir != "" {
		static = spaHandler(s.cfg.StaticDir)
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api" || strings.HasPrefix(r.URL.Path, "/api/"):
			writeError(w, http.StatusNotFound, "no such route")
		case static == nil:
			writeError(w, http.StatusNotFound, "static serving disabled")
		case r.Method != http.MethodGet && r.Method != http.MethodHead:
			w.Header().Set("Allow", "GET, HEAD")
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		default:
			static.ServeHTTP(w, r)
		}
	})
}
