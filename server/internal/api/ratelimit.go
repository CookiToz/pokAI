package api

import (
	"net/http"
	"strconv"
	"sync"
	"time"
)

// RateLimit configures the per-IP token bucket on write routes.
type RateLimit struct {
	Rate  float64 // tokens refilled per second
	Burst float64 // bucket capacity
}

// DefaultRateLimit allows bursts of 20 writes, refilled at 2 per second.
var DefaultRateLimit = RateLimit{Rate: 2, Burst: 20}

type bucket struct {
	tokens float64
	last   time.Time
}

// limiter is an in-memory token bucket keyed by client IP.
type limiter struct {
	cfg       RateLimit
	now       func() time.Time
	mu        sync.Mutex
	buckets   map[string]*bucket
	lastSweep time.Time
}

func newLimiter(cfg RateLimit, now func() time.Time) *limiter {
	return &limiter{cfg: cfg, now: now, buckets: map[string]*bucket{}, lastSweep: now()}
}

// allow takes one token for key. It returns false and the wait before the
// next token when the bucket is empty.
func (l *limiter) allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	l.sweep(now)

	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: l.cfg.Burst, last: now}
		l.buckets[key] = b
	}
	b.tokens = min(l.cfg.Burst, b.tokens+now.Sub(b.last).Seconds()*l.cfg.Rate)
	b.last = now
	if b.tokens >= 1 {
		b.tokens--
		return true, 0
	}
	if l.cfg.Rate <= 0 {
		return false, time.Minute
	}
	return false, time.Duration((1 - b.tokens) / l.cfg.Rate * float64(time.Second))
}

// sweep drops buckets that are full again, so memory stays bounded.
func (l *limiter) sweep(now time.Time) {
	if now.Sub(l.lastSweep) < time.Minute || l.cfg.Rate <= 0 {
		return
	}
	l.lastSweep = now
	full := time.Duration(l.cfg.Burst / l.cfg.Rate * float64(time.Second))
	for k, b := range l.buckets {
		if now.Sub(b.last) > full {
			delete(l.buckets, k)
		}
	}
}

func (l *limiter) wrap(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ok, wait := l.allow(clientIP(r))
		if !ok {
			secs := int(wait/time.Second) + 1
			w.Header().Set("Retry-After", strconv.Itoa(secs))
			writeError(w, http.StatusTooManyRequests, "429 Too Many Requests: rate limited, retry later")
			return
		}
		next(w, r)
	}
}
