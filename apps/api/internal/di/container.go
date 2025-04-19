package di

import (
	"context"
	"log"

	"github.com/aiirononeko/bulktrack/apps/api/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Container は依存性注入コンテナ
type Container struct {
	Config *config.Config
	DB     *pgxpool.Pool
}

// NewContainer は新しいDIコンテナを作成
func NewContainer(cfg *config.Config) *Container {
	// データベース接続
	dbPool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	return &Container{
		Config: cfg,
		DB:     dbPool,
	}
}
