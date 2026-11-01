package api

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// spaHandler serves the built client from dir. Unknown paths fall back to
// index.html so client-side routes work; paths with a file extension that do
// not exist get a real 404 instead of HTML.
func spaHandler(dir string) http.Handler {
	files := http.FileServer(http.Dir(dir))
	index := filepath.Join(dir, "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clean := path.Clean("/" + r.URL.Path)
		// Any stat error (missing file, ENOTDIR for "/a.js/x", ...) means
		// "not a servable file" and falls through to the SPA fallback.
		if st, err := os.Stat(filepath.Join(dir, filepath.FromSlash(clean))); err == nil && !st.IsDir() {
			files.ServeHTTP(w, r)
			return
		}
		if clean != "/" && strings.Contains(path.Base(clean), ".") {
			http.NotFound(w, r)
			return
		}
		if _, err := os.Stat(index); err != nil {
			writeError(w, http.StatusNotFound, "client not built: run the client build to create "+dir)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, index)
	})
}
