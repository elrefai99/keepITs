package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	redis := NewRedis(env("REDIS_ADDR", "localhost:6379"))

	authService := NewService(redis)

	authHandler := NewHandler(authService)

	mux := http.NewServeMux()

	mux.HandleFunc(
		"POST /auth/device",
		authHandler.CreateDevice,
	)

	mux.HandleFunc(
		"POST /auth/device/token",
		authHandler.Token,
	)

	mux.HandleFunc(
		"POST /auth/device/approve",
		authHandler.Approve,
	)

	server := &http.Server{
		Addr:    env("AUTH_ADDR", ":20150"),
		Handler: mux,
	}

	log.Println(
		"Server running on :20150",
	)

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
