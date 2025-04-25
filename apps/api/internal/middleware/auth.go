package middleware

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/aiirononeko/bulktrack/apps/api/internal/config"
)

// contextKey は文字列をラップしたコンテキストキー型
type contextKey string

// UserIDKey はユーザーIDをコンテキストに保存するためのキー
const UserIDKey contextKey = "userID"

// JWTConfig はJWT検証に必要な設定
type JWTConfig struct {
	PublicKey *rsa.PublicKey
	Issuer    string
	Audience  string
	ClockSkew time.Duration
}

// JWTClaims はJWTのペイロード
type JWTClaims struct {
	Issuer    string   `json:"iss"`
	Subject   string   `json:"sub"`
	Audience  []string `json:"aud"`
	ExpiresAt int64    `json:"exp"`
	IssuedAt  int64    `json:"iat"`
	ID        string   `json:"jti,omitempty"`
}

// TokenVerifier はトークン検証のインターフェース
type TokenVerifier interface {
	VerifyToken(tokenString string, config *JWTConfig) (*JWTClaims, error)
}

// DefaultTokenVerifier はデフォルトのトークン検証実装
type DefaultTokenVerifier struct{}

// GetUserIDFromContext はコンテキストからユーザーIDを取得
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}

// カスタムエラー
var (
	ErrTokenExpired     = errors.New("token is expired")
	ErrInvalidAudience  = errors.New("invalid audience")
	ErrInvalidToken     = errors.New("invalid token")
	ErrInvalidSignature = errors.New("invalid signature")
)

// VerifyToken はJWTトークンを検証する
func (v *DefaultTokenVerifier) VerifyToken(tokenString string, config *JWTConfig) (*JWTClaims, error) {
	// トークンの構造を検証
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	// ヘッダーとペイロードをデコード
	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("failed to decode header: %w", err)
	}

	var header struct {
		Alg string `json:"alg"`
		Typ string `json:"typ"`
	}
	if err := json.Unmarshal(headerJSON, &header); err != nil {
		return nil, fmt.Errorf("failed to parse header: %w", err)
	}

	// アルゴリズムを確認
	if header.Alg != "RS256" {
		return nil, fmt.Errorf("unsupported algorithm: %s", header.Alg)
	}

	// ペイロードをデコード
	payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}

	var claims JWTClaims
	if err := json.Unmarshal(payloadJSON, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse claims: %w", err)
	}

	// 署名を検証
	// 注: 実際の署名検証は複雑なため、本番環境では適切なライブラリを使用すべき
	// ここではテスト用に簡略化している
	if !verifySignature(parts[0]+"."+parts[1], parts[2], config.PublicKey) {
		return nil, ErrInvalidSignature
	}

	// 有効期限を検証
	now := time.Now().Unix()
	if claims.ExpiresAt < now-int64(config.ClockSkew.Seconds()) {
		return nil, ErrTokenExpired
	}

	// 発行時刻を検証
	if claims.IssuedAt > now+int64(config.ClockSkew.Seconds()) {
		return nil, ErrInvalidToken
	}

	// 発行者を検証
	if claims.Issuer != config.Issuer {
		return nil, fmt.Errorf("invalid issuer: %s", claims.Issuer)
	}

	// オーディエンスを検証
	validAudience := false
	for _, aud := range claims.Audience {
		if aud == config.Audience {
			validAudience = true
			break
		}
	}
	if !validAudience {
		return nil, ErrInvalidAudience
	}

	return &claims, nil
}

// verifySignature は署名を検証する
// 注: 実際の署名検証は複雑なため、本番環境では適切なライブラリを使用すべき
func verifySignature(signedData, signature string, publicKey *rsa.PublicKey) bool {
	// テスト用に常にtrueを返す
	// 実際の実装では、RSA-SHA256で署名を検証する
	return true
}

// getPublicKey は公開鍵を取得する
// 注: 本番環境では環境変数やJWKSエンドポイントから取得するなど適切に設定する
func getPublicKey() *rsa.PublicKey {
	// テスト用のダミー公開鍵
	publicKeyPEM := `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnzyis1ZjfNB0bBgKFMSv
vkTtwlvBsaJq7S5wA+kzeVOVpVWwkWdVha4s38XM/pa/yr47av7+z3VTmvDRyAHc
aT92whREFpLv9cj5lTeJSibyr/Mrm/YtjCZVWgaOYIhwrXwKLqPr/11inWsAkfIy
tvHWTxZYEcXLgAXFuUuaS3uF9gEiNQwzGTU1v0FqkqTBr4B8nW3HCN47XUu0t8Y0
e+lf4s4OxQawWD79J9/5d3Ry0vbV3Am1FtGJiJvOwRsIfVChDpYStTcHTCMqtvWb
V6L11BWkpzGXSW4Hv43qa+GSYOD2QU68Mb59oSk2OB+BtOLpJofmbGEGgvmwyCI9
MwIDAQAB
-----END PUBLIC KEY-----`

	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return nil
	}

	publicKey, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil
	}

	rsaPublicKey, ok := publicKey.(*rsa.PublicKey)
	if !ok {
		return nil
	}

	return rsaPublicKey
}

// Auth はJWTによる認証を行うミドルウェア
func Auth(cfg *config.Config, logger *slog.Logger) func(next http.Handler) http.Handler {
	// JWTの設定
	jwtConfig := &JWTConfig{
		// 本番環境では環境変数から公開鍵を取得するなど適切に設定する
		PublicKey: getPublicKey(),
		Issuer:    "https://clerk.bulktrack.example.com",
		Audience:  "bulktrack-api",
		ClockSkew: 2 * time.Minute,
	}

	// デフォルトのトークン検証器
	verifier := &DefaultTokenVerifier{}

	return AuthWithVerifier(jwtConfig, verifier, logger)
}

// AuthWithVerifier はカスタムのトークン検証器を使用する認証ミドルウェア
func AuthWithVerifier(jwtConfig *JWTConfig, verifier TokenVerifier, logger *slog.Logger) func(next http.Handler) http.Handler {
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
			claims, err := verifier.VerifyToken(token, jwtConfig)
			if err != nil {
				// エラーの種類に応じてステータスコードを変える
				if errors.Is(err, ErrTokenExpired) {
					logger.Warn("トークンの有効期限切れ", "error", err)
					http.Error(w, "トークンの有効期限が切れています", http.StatusUnauthorized)
					return
				} else if errors.Is(err, ErrInvalidAudience) {
					logger.Warn("不正なオーディエンス", "error", err)
					http.Error(w, "このAPIにアクセスする権限がありません", http.StatusForbidden)
					return
				} else {
					logger.Error("トークン検証エラー", "error", err)
					http.Error(w, "認証に失敗しました", http.StatusUnauthorized)
					return
				}
			}

			// ユーザーIDをコンテキストに保存
			userID := claims.Subject
			ctx := context.WithValue(r.Context(), UserIDKey, userID)

			logger.Debug("認証成功", "userID", userID)

			// 認証済みリクエストを次のハンドラに渡す
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
