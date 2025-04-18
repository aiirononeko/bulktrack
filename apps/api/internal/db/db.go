package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	"cloud.google.com/go/cloudsqlconn"
	"cloud.google.com/go/cloudsqlconn/postgres/pgxv5"
	_ "github.com/jackc/pgx/v5/stdlib"
)

func New() (*sql.DB, error) {
	ctx := context.Background()

	// Dialer は内部で生成される。必要なオプションだけ渡す
	cleanup, err := pgxv5.RegisterDriver(
		"cloudsql-postgres",
		cloudsqlconn.WithIAMAuthN(), // パスワードレス / IAM 認証
	)
	if err != nil {
		return nil, err
	}
	// ★ まだ使わないならコンパイラ対策で無視する
	_ = cleanup
	// 将来 main.go で defer cleanup() する場合は戻り値に含める設計にすると良い

	dsn := fmt.Sprintf(
		"host=%s user=%s dbname=%s sslmode=disable",
		os.Getenv("DB_CONNECTION_NAME"), // 例: project:region:instance
		os.Getenv("DB_USER"),
		os.Getenv("DB_NAME"),
	)

	db, err := sql.Open("cloudsql-postgres", dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetConnMaxIdleTime(30 * time.Minute)

	// 接続確認
	if err := db.PingContext(ctx); err != nil {
		return nil, err
	}
	return db, nil
}
