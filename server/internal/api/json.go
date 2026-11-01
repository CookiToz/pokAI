package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
)

type errorBody struct {
	Error string `json:"error"`
}

// writeJSON writes v as a JSON response. A failed write means the client went
// away; it is logged since nothing else can be done.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Default().Warn("write response", slog.Any("err", err))
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorBody{Error: msg})
}

// errBodyTooLarge is returned by readBody when the limit is exceeded.
var errBodyTooLarge = errors.New("request body too large")

// readBody reads at most limit bytes of the request body.
func readBody(w http.ResponseWriter, r *http.Request, limit int64) ([]byte, error) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, limit))
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return nil, errBodyTooLarge
	}
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}
	return body, nil
}

// writeBodyError maps a readBody error to a response.
func writeBodyError(w http.ResponseWriter, err error, limit int64) {
	if errors.Is(err, errBodyTooLarge) {
		writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("body exceeds %d bytes", limit))
		return
	}
	writeError(w, http.StatusBadRequest, "could not read body")
}
