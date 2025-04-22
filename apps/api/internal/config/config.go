package config

import (
	"os"
)

// Config アプリケーション設定
type Config struct {
	DatabaseURL string
	Port        string
}

// NewConfig 環境変数から設定を読み込む
func NewConfig() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/bulktrack?sslmode=disable"),
		Port:        getEnv("PORT", "5555"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
