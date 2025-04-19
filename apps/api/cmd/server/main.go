package main

import (
	"log"
	"net/http"
	"os"

	"github.com/aiirononeko/bulktrack/apps/api/internal/config"
	"github.com/aiirononeko/bulktrack/apps/api/internal/di"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/handler"
)

func main() {
	// 設定の読み込み
	cfg := config.NewConfig()

	// DIコンテナの初期化とサーバー設定
	app := handler.NewServer(di.NewContainer(cfg))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s...", port)
	if err := http.ListenAndServe(":"+port, app); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
