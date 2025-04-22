package di

import (
	"log/slog"

	"github.com/aiirononeko/bulktrack/apps/api/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Container は依存性注入コンテナ
type Container struct {
	Config *config.Config
	DB     *pgxpool.Pool
	Logger *slog.Logger
}

// NewContainer は新しいDIコンテナを作成
func NewContainer(cfg *config.Config, db *pgxpool.Pool, logger *slog.Logger) *Container {
	return &Container{
		Config: cfg,
		DB:     db,
		Logger: logger,
	}
}
