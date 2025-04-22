package middleware

import (
	"context"
	"net/http"
	"strings"

	"log/slog"

	"github.com/aiirononeko/bulktrack/apps/api/internal/config"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
)

type contextKey string

const UserIDKey contextKey = "userID"

// GetUserIDFromContext はコンテキストからユーザーIDを取得します
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}

// ClerkAuth はClerkによる認証を行うミドルウェアです
func ClerkAuth(cfg *config.Config, logger *slog.Logger) func(next http.Handler) http.Handler {
	// Clerk APIキーの設定
	clerk.SetKey(cfg.ClerkSecretKey)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Authorizationヘッダーからトークンを取得
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				logger.Debug("認証トークンがありません")
				http.Error(w, "認証トークンが必要です", http.StatusUnauthorized)
				return
			}

			// Bearer プレフィックスを削除
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader { // プレフィックスが削除されていない場合
				logger.Debug("不正なAuthorizationヘッダー形式です")
				http.Error(w, "不正なAuthorizationヘッダー形式です", http.StatusUnauthorized)
				return
			}

			// トークンを検証
			claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
				Token: token,
			})
			if err != nil {
				logger.Error("トークン検証エラー", "error", err)
				http.Error(w, "認証に失敗しました", http.StatusUnauthorized)
				return
			}

			// ユーザーIDをコンテキストに保存
			userID := claims.Subject
			ctx := context.WithValue(r.Context(), UserIDKey, userID)

			logger.Debug("認証成功",
				"userID", userID,
				"sessionID", claims.SessionID)

			// 認証済みリクエストを次のハンドラに渡す
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
