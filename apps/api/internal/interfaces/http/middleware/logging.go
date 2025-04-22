package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

// responseWriter はステータスコードを記録するための http.ResponseWriter ラッパー
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(statusCode int) {
	rw.status = statusCode
	rw.ResponseWriter.WriteHeader(statusCode)
}

// LoggingMiddleware はリクエスト情報をログに出力するミドルウェア
func LoggingMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// レスポンスライターをラップしてステータスコードを取得
			rw := &responseWriter{ResponseWriter: w, status: http.StatusOK} // デフォルトは 200 OK

			// 次のハンドラーを呼び出し
			next.ServeHTTP(rw, r)

			duration := time.Since(start)

			// ログ出力
			logger.Info("Request processed",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", rw.status),
				slog.Duration("duration", duration),
				slog.String("remote_addr", r.RemoteAddr), // 必要であればクライアントIPも記録
			)
		})
	}
}
