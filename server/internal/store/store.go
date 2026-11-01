// Package store persists saves and the global Neurodex in SQLite.
package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite" // pure Go SQLite driver, registers "sqlite"
)

// ErrNotFound is returned when a save does not exist.
var ErrNotFound = errors.New("not found")

const schema = `
CREATE TABLE IF NOT EXISTS saves (
	player_id  TEXT PRIMARY KEY,
	data       TEXT NOT NULL CHECK (json_valid(data)),
	updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dex_first (
	form        TEXT PRIMARY KEY,
	player_id   TEXT NOT NULL,
	player_name TEXT NOT NULL,
	at          TEXT NOT NULL
);`

// Store wraps the SQLite database.
type Store struct {
	db  *sql.DB
	now func() time.Time
}

// DexEntry is the first catch of a form.
type DexEntry struct {
	PlayerName string    `json:"playerName"`
	At         time.Time `json:"at"`
}

// Open opens (or creates) the database at path and applies the schema.
// Use ":memory:" for an in-memory database.
func Open(ctx context.Context, path string) (*Store, error) {
	if path != ":memory:" {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return nil, fmt.Errorf("create db dir: %w", err)
		}
	}
	dsn := "file:" + path + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	// SQLite allows a single writer; one connection serialises writes and keeps
	// ":memory:" databases shared across calls.
	db.SetMaxOpenConns(1)
	if _, err := db.ExecContext(ctx, schema); err != nil {
		return nil, errors.Join(fmt.Errorf("apply schema: %w", err), db.Close())
	}
	return &Store{db: db, now: time.Now}, nil
}

// Close closes the database.
func (s *Store) Close() error {
	if err := s.db.Close(); err != nil {
		return fmt.Errorf("close db: %w", err)
	}
	return nil
}

// Ping checks the database is reachable.
func (s *Store) Ping(ctx context.Context) error {
	if err := s.db.PingContext(ctx); err != nil {
		return fmt.Errorf("ping db: %w", err)
	}
	return nil
}

// PutSave inserts or replaces the save of a player. data must be valid JSON.
func (s *Store) PutSave(ctx context.Context, playerID string, data []byte) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO saves (player_id, data, updated_at) VALUES (?, ?, ?)
		ON CONFLICT (player_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
		playerID, string(data), s.now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		return fmt.Errorf("put save %s: %w", playerID, err)
	}
	return nil
}

// GetSave returns the raw JSON save of a player, or ErrNotFound.
func (s *Store) GetSave(ctx context.Context, playerID string) ([]byte, error) {
	var data string
	err := s.db.QueryRowContext(ctx, `SELECT data FROM saves WHERE player_id = ?`, playerID).Scan(&data)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get save %s: %w", playerID, err)
	}
	return []byte(data), nil
}

// RecordCatch registers a catch and reports whether playerID is the first
// player in the world to catch form. The INSERT OR IGNORE on the primary key
// makes this atomic under concurrency. A retry by the same first player
// still returns true, so the call is idempotent.
func (s *Store) RecordCatch(ctx context.Context, playerID, playerName, form string) (bool, error) {
	res, err := s.db.ExecContext(ctx,
		`INSERT OR IGNORE INTO dex_first (form, player_id, player_name, at) VALUES (?, ?, ?, ?)`,
		form, playerID, playerName, s.now().UTC().Format(time.RFC3339Nano))
	if err != nil {
		return false, fmt.Errorf("record catch %s: %w", form, err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("record catch %s: rows affected: %w", form, err)
	}
	if n == 1 {
		return true, nil
	}
	var owner string
	if err := s.db.QueryRowContext(ctx, `SELECT player_id FROM dex_first WHERE form = ?`, form).Scan(&owner); err != nil {
		return false, fmt.Errorf("record catch %s: read owner: %w", form, err)
	}
	return owner == playerID, nil
}

// GlobalDex returns the first catcher of every caught form.
func (s *Store) GlobalDex(ctx context.Context) (map[string]DexEntry, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT form, player_name, at FROM dex_first`)
	if err != nil {
		return nil, fmt.Errorf("global dex: %w", err)
	}
	defer rows.Close()
	out := map[string]DexEntry{}
	for rows.Next() {
		var form, name, at string
		if err := rows.Scan(&form, &name, &at); err != nil {
			return nil, fmt.Errorf("global dex: scan: %w", err)
		}
		t, err := time.Parse(time.RFC3339Nano, at)
		if err != nil {
			return nil, fmt.Errorf("global dex: parse time of %s: %w", form, err)
		}
		out[form] = DexEntry{PlayerName: name, At: t}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("global dex: rows: %w", err)
	}
	return out, nil
}
