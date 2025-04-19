package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func New() (*sql.DB, error) {
	ctx := context.Background()

	// 環境変数からデータベース接続文字列を取得
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	// PostgreSQLドライバーを使用してNeonに接続
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}

	// コネクションプールの設定
	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Minute)

	// 接続確認
	if err := db.PingContext(ctx); err != nil {
		return nil, err
	}
	return db, nil
}
