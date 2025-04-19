package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/aiirononeko/bulktrack/apps/api/internal/db"
)

type Pong struct {
	Message string `json:"message"`
}

func main() {
	log.Printf("Starting server...")

	dbPool, err := db.New()
	if err != nil {
		log.Fatalf("DB init: %v", err)
	}
	defer dbPool.Close()

	log.Printf("Database connection established")

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		// DB がつながるかシンプルにチェック
		if err := dbPool.PingContext(r.Context()); err != nil {
			log.Printf("Database ping failed: %v", err)
			http.Error(w, "db unreachable", http.StatusServiceUnavailable)
			return
		}
		log.Printf("Database ping successful")
		json.NewEncoder(w).Encode(Pong{Message: "pong"})
	})

	port := env("PORT", "8080")
	log.Printf("listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
