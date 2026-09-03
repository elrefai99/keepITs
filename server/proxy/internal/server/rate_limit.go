package server

import (
	"sync"
	"time"
)

const (
	rateLimit  = 100
	rateWindow = time.Minute
)

type Visitor struct {
	Count int
	Reset time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	clients map[string]*Visitor
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		limit:   limit,
		clients: make(map[string]*Visitor),
		window:  window,
	}
}
