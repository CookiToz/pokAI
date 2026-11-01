package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"pokai/server/internal/store"
)

const (
	maxSaveBytes  = 256 << 10
	maxCatchBytes = 4 << 10
	maxNameRunes  = 32
	maxFormLen    = 64
	saveVersion   = 1
)

var (
	playerIDPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{6,64}$`)
	formIDPattern   = regexp.MustCompile(`^[a-z0-9_]+$`)
)

// ValidPlayerID reports whether id is an acceptable player id.
func ValidPlayerID(id string) bool { return playerIDPattern.MatchString(id) }

// validPlayerName accepts 1..32 printable runes.
func validPlayerName(name string) bool {
	n := utf8.RuneCountInString(name)
	if n == 0 || n > maxNameRunes || !utf8.ValidString(name) {
		return false
	}
	for _, r := range name {
		if !unicode.IsPrint(r) {
			return false
		}
	}
	return true
}

func (s *Server) internalError(w http.ResponseWriter, r *http.Request, err error) {
	s.log.ErrorContext(r.Context(), "handler failed", slog.String("path", r.URL.Path), slog.Any("err", err))
	writeError(w, http.StatusInternalServerError, "internal error")
}

type healthResponse struct {
	OK      bool   `json:"ok"`
	Version string `json:"version"`
	Error   string `json:"error,omitempty"`
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if err := s.store.Ping(r.Context()); err != nil {
		s.log.ErrorContext(r.Context(), "health", slog.Any("err", err))
		writeJSON(w, http.StatusServiceUnavailable, healthResponse{Version: s.cfg.Version, Error: "database unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, healthResponse{OK: true, Version: s.cfg.Version})
}

func (s *Server) handlePutSave(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("playerId")
	if !ValidPlayerID(id) {
		writeError(w, http.StatusBadRequest, "invalid playerId")
		return
	}
	body, err := readBody(w, r, maxSaveBytes)
	if err != nil {
		writeBodyError(w, err, maxSaveBytes)
		return
	}
	var probe struct {
		Version json.RawMessage `json:"version"`
	}
	if err := json.Unmarshal(body, &probe); err != nil {
		writeError(w, http.StatusBadRequest, "body must be a JSON object")
		return
	}
	if string(probe.Version) != "1" {
		writeError(w, http.StatusBadRequest, "unsupported save version, expected 1")
		return
	}
	var compact bytes.Buffer
	if err := json.Compact(&compact, body); err != nil {
		writeError(w, http.StatusBadRequest, "body must be valid JSON")
		return
	}
	if err := s.store.PutSave(r.Context(), id, compact.Bytes()); err != nil {
		s.internalError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleGetSave(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("playerId")
	if !ValidPlayerID(id) {
		writeError(w, http.StatusBadRequest, "invalid playerId")
		return
	}
	save, err := s.store.GetSave(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "no save for this player")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, json.RawMessage(save))
}

type catchRequest struct {
	PlayerID   string `json:"playerId"`
	PlayerName string `json:"playerName"`
	Form       string `json:"form"`
}

type catchResponse struct {
	First bool `json:"first"`
}

func (s *Server) handleCatch(w http.ResponseWriter, r *http.Request) {
	body, err := readBody(w, r, maxCatchBytes)
	if err != nil {
		writeBodyError(w, err, maxCatchBytes)
		return
	}
	var req catchRequest
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "body must be {playerId, playerName, form}")
		return
	}
	req.PlayerName = strings.TrimSpace(req.PlayerName)
	switch {
	case !ValidPlayerID(req.PlayerID):
		writeError(w, http.StatusBadRequest, "invalid playerId")
		return
	case !validPlayerName(req.PlayerName):
		writeError(w, http.StatusBadRequest, "invalid playerName (1 to 32 printable characters)")
		return
	case len(req.Form) > maxFormLen || !formIDPattern.MatchString(req.Form):
		writeError(w, http.StatusBadRequest, "invalid form id")
		return
	}
	// Only enforce existence once forms are loaded: while the data is being
	// written the server must not reject every catch.
	if set := s.data.Load(); set != nil && set.FormCount() > 0 && !set.HasForm(req.Form) {
		writeError(w, http.StatusBadRequest, "unknown form")
		return
	}
	first, err := s.store.RecordCatch(r.Context(), req.PlayerID, req.PlayerName, req.Form)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, catchResponse{First: first})
}

func (s *Server) handleGlobalDex(w http.ResponseWriter, r *http.Request) {
	dex, err := s.store.GlobalDex(r.Context())
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, dex)
}

// handleValidate reloads shared/data from disk, so the report always reflects
// the current files, and returns the validation report.
func (s *Server) handleValidate(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.ReloadData())
}
