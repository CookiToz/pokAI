package data

import "fmt"

// Issue is one problem found in the data.
type Issue struct {
	File    string `json:"file,omitempty"`
	Path    string `json:"path,omitempty"`
	Message string `json:"message"`
}

func (i Issue) String() string {
	loc := i.File
	if i.Path != "" {
		loc += " " + i.Path
	}
	if loc == "" {
		return i.Message
	}
	return loc + ": " + i.Message
}

// Report is the result of loading and validating a data directory.
// OK is true when there are no errors (warnings are allowed).
type Report struct {
	OK       bool           `json:"ok"`
	Dir      string         `json:"dir"`
	Counts   map[string]int `json:"counts"`
	Missing  []string       `json:"missing"`
	Errors   []Issue        `json:"errors"`
	Warnings []Issue        `json:"warnings"`
}

func newReport(dir string) *Report {
	return &Report{Dir: dir, Counts: map[string]int{}, Missing: []string{}, Errors: []Issue{}, Warnings: []Issue{}}
}

func (r *Report) errorf(file, path, format string, args ...any) {
	r.Errors = append(r.Errors, Issue{File: file, Path: path, Message: fmt.Sprintf(format, args...)})
}

func (r *Report) warnf(file, path, format string, args ...any) {
	r.Warnings = append(r.Warnings, Issue{File: file, Path: path, Message: fmt.Sprintf(format, args...)})
}

func (r *Report) finish() { r.OK = len(r.Errors) == 0 }
