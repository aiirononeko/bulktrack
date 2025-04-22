package db

import (
	"context"
	// "database/sql" // 削除
	"fmt"
	"os"
	"time" // pgxpool.Config で使用

	// _ "github.com/jackc/pgx/v5/stdlib" // 削除
	"github.com/jackc/pgx/v5/pgxpool" // 追加
)

func New() (*pgxpool.Pool, error) { // 戻り値を *pgxpool.Pool に変更
	ctx := context.Background()

	// 環境変数からデータベース接続文字列を取得
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	// pgxpool.ParseConfig で設定をパース
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	// 必要に応じてプール設定を追加（例）
	config.MaxConns = 10                      // 最大接続数
	config.MaxConnIdleTime = 30 * time.Minute // アイドル接続の最大時間

	// pgxpool.NewWithConfig でプールを作成
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// 接続確認 (Ping はプール作成時に行われるため、通常は不要ですが、念のため追加しても良い)
	if err := pool.Ping(ctx); err != nil {
		pool.Close() // エラー時はプールを閉じる
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return pool, nil // *pgxpool.Pool を返す
}
