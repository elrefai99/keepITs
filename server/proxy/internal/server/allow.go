package server

import "time"

func (r *RateLimiter) AllowIpAddress(ip string) (bool, int, time.Duration) {
	r.mu.Lock()
	r.mu.Unlock()

	now := time.Now()

	Visitor, exists := r.clients[ip]

}
