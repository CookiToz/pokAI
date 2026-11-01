// Command pokai runs the PokAI game server: saves, global Neurodex, data
// validation and the built client.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"pokai/server/internal/api"
	"pokai/server/internal/store"
)

// version is overridable at build time: -ldflags "-X main.version=1.2.3".
var version = "0.1.0"

type config struct {
	addr, db, data, static string
}

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(log)
	if err := run(log, os.Args[1:]); err != nil {
		log.Error("fatal", slog.Any("err", err))
		os.Exit(1)
	}
}

func run(log *slog.Logger, args []string) error {
	cfg, err := parseConfig(args)
	if errors.Is(err, flag.ErrHelp) {
		return nil
	}
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.Open(ctx, cfg.db)
	if err != nil {
		return fmt.Errorf("open store: %w", err)
	}
	defer func() {
		if err := st.Close(); err != nil {
			log.Error("close store", slog.Any("err", err))
		}
	}()

	srv := api.New(st, api.Config{
		Version:   version,
		DataDir:   cfg.data,
		StaticDir: cfg.static,
		Logger:    log,
	})
	httpSrv := &http.Server{
		Addr:              cfg.addr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("listening", slog.String("addr", cfg.addr), slog.String("db", cfg.db),
			slog.String("data", cfg.data), slog.String("static", cfg.static), slog.String("version", version))
		errCh <- httpSrv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("listen: %w", err)
	case <-ctx.Done():
	}
	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	return nil
}

// parseConfig reads flags, falling back to POKAI_* env vars, then to defaults
// relative to the repository root (so the server works from the repo root,
// from server/, or from anywhere inside the repo).
func parseConfig(args []string) (config, error) {
	root := findRepoRoot()
	fs := flag.NewFlagSet("pokai", flag.ContinueOnError)
	var c config
	fs.StringVar(&c.addr, "addr", env("POKAI_ADDR", ":8080"), "listen address (env POKAI_ADDR)")
	fs.StringVar(&c.db, "db", env("POKAI_DB", filepath.Join(root, "server", "data", "pokai.db")), "SQLite database file (env POKAI_DB)")
	fs.StringVar(&c.data, "data", env("POKAI_DATA", filepath.Join(root, "shared", "data")), "shared data directory (env POKAI_DATA)")
	fs.StringVar(&c.static, "static", env("POKAI_STATIC", filepath.Join(root, "client", "dist")), "client build to serve, empty disables (env POKAI_STATIC)")
	if err := fs.Parse(args); err != nil {
		return config{}, fmt.Errorf("parse flags: %w", err)
	}
	return c, nil
}

func env(key, def string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return def
}

// findRepoRoot walks up from the working directory to the first directory
// holding both shared/ and server/. It falls back to the working directory.
func findRepoRoot() string {
	wd, err := os.Getwd()
	if err != nil {
		return "."
	}
	for dir := wd; ; {
		if isDir(filepath.Join(dir, "shared")) && isDir(filepath.Join(dir, "server")) {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return wd
		}
		dir = parent
	}
}

func isDir(p string) bool {
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}
