package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/aiirononeko/bulktrack/apps/api/internal/config"
	"github.com/aiirononeko/bulktrack/apps/api/internal/db"
	"github.com/aiirononeko/bulktrack/apps/api/internal/di"
	httpError "github.com/aiirononeko/bulktrack/apps/api/internal/http"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/handler"
	"github.com/aiirononeko/bulktrack/apps/api/internal/validation"
)

func main() {
	// --- Logger 初期化 ---
	logLevel := slog.LevelInfo // デフォルトは Info
	if os.Getenv("LOG_LEVEL") == "DEBUG" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		AddSource: true,     // ソースコードの位置情報を追加
		Level:     logLevel, // 環境変数でレベルを設定可能に
	}))
	slog.SetDefault(logger) // デフォルトロガーにも設定
	// --- Logger 初期化 完了 ---

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	logger.Info("Starting server...") // ログ出力例

	// 設定読み込み (NewConfig を使用)
	cfg := config.NewConfig()
	if cfg.DatabaseURL == "" { // 簡単なバリデーション例
		logger.Error("Database URL is not configured")
		os.Exit(1)
	}
	logger.Info("Configuration loaded", slog.String("port", cfg.Port))

	// Connect to the database using the New function which reads DATABASE_URL env var
	dbConn, err := db.New() // db.Connect から db.New() に変更し、引数を削除
	if err != nil {
		logger.Error("Failed to connect to database", "error", err)
		os.Exit(1) // 失敗時は終了
	}
	// sql.DB には Close() メソッドがあるので defer はそのまま
	defer dbConn.Close()
	logger.Info("Successfully connected to database")

	// DIコンテナ作成 (NewContainer の引数を修正)
	container := di.NewContainer(cfg, dbConn, logger)

	// バリデータの作成と設定
	container.Validator = validation.New()

	// HTTPサーバーハンドラ作成
	serverHandler := handler.NewServer(container) // NewServer に Container を渡す

	// エラーハンドラーを適用
	errorHandler := httpError.ErrorHandler(serverHandler)

	// HTTPサーバー設定
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      errorHandler, // エラーハンドラーを適用したハンドラを設定
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// サーバーを非同期で起動
	go func() {
		logger.Info("Server listening", slog.String("address", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("Server failed to start", slog.Any("error", err))
			// ここで stop() を呼んで main goroutine を終了させる
			stop()
		}
	}()

	// シャットダウンシグナル待機
	<-ctx.Done()

	// stop() が呼ばれた原因（シグナル or サーバー起動失敗）をログに出力
	if ctx.Err() != nil && !errors.Is(ctx.Err(), context.Canceled) {
		logger.Warn("Shutdown initiated by signal", slog.Any("signal", ctx.Err().Error()))
	} else if ctx.Err() == nil {
		// これはサーバー起動失敗のケース
		logger.Warn("Shutdown initiated due to server start failure")
	}

	// 猶予期間付きでサーバーをシャットダウン
	logger.Info("Shutting down server gracefully...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server forced to shutdown", slog.Any("error", err))
	}

	logger.Info("Server exiting")
}
