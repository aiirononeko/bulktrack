package middleware

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"log/slog"
)

// テスト用のRSA鍵ペアを生成
func generateTestKeyPair() (*rsa.PrivateKey, *rsa.PublicKey) {
	privateKey, _ := rsa.GenerateKey(rand.Reader, 2048)
	return privateKey, &privateKey.PublicKey
}

// テスト用のJWTトークンを生成
func generateTestToken(claims JWTClaims, privateKey *rsa.PrivateKey) string {
	// ヘッダー
	header := map[string]string{
		"alg": "RS256",
		"typ": "JWT",
	}
	headerJSON, _ := json.Marshal(header)
	headerBase64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	// ペイロード
	payloadJSON, _ := json.Marshal(claims)
	payloadBase64 := base64.RawURLEncoding.EncodeToString(payloadJSON)

	// 署名（テスト用に簡略化）
	signedData := headerBase64 + "." + payloadBase64
	signature := "dummySignature" // 実際の署名は複雑なため、テスト用に簡略化

	// トークンの組み立て
	return signedData + "." + signature
}

// テスト用のハンドラー
func testHandler(t *testing.T, expectedUserID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := GetUserIDFromContext(r.Context())
		if !ok {
			t.Error("Expected user ID in context, but not found")
		}
		if userID != expectedUserID {
			t.Errorf("Expected user ID %s, got %s", expectedUserID, userID)
		}
		w.WriteHeader(http.StatusOK)
	})
}

// モックJWTConfig
func mockJWTConfig() *JWTConfig {
	_, publicKey := generateTestKeyPair()
	return &JWTConfig{
		PublicKey: publicKey,
		Issuer:    "https://clerk.bulktrack.example.com",
		Audience:  "bulktrack-api",
		ClockSkew: 2 * time.Minute,
	}
}

// MockTokenVerifier はトークン検証のモック
type MockTokenVerifier struct {
	ExpectedError  error
	ExpectedClaims *JWTClaims
}

// VerifyToken はモックの実装
func (m *MockTokenVerifier) VerifyToken(tokenString string, config *JWTConfig) (*JWTClaims, error) {
	if m.ExpectedError != nil {
		return nil, m.ExpectedError
	}
	return m.ExpectedClaims, nil
}

// TestAuth_ValidJWT は有効なJWTトークンのテスト
func TestAuth_ValidJWT(t *testing.T) {
	// テスト用のユーザーID
	userID := "user_123"

	// モックの設定
	claims := &JWTClaims{
		Subject:   userID,
		Issuer:    "https://clerk.bulktrack.example.com",
		Audience:  []string{"bulktrack-api"},
		ExpiresAt: time.Now().Add(1 * time.Hour).Unix(),
		IssuedAt:  time.Now().Unix(),
	}
	mockVerifier := &MockTokenVerifier{
		ExpectedClaims: claims,
	}

	// JWTConfigの作成
	jwtConfig := mockJWTConfig()

	// ミドルウェアの作成
	logger := slog.Default()
	middleware := AuthWithVerifier(jwtConfig, mockVerifier, logger)

	// リクエストの作成
	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer valid.jwt.token")

	// レスポンスレコーダーの作成
	rr := httptest.NewRecorder()

	// ミドルウェアを適用したハンドラーの実行
	middleware(testHandler(t, userID)).ServeHTTP(rr, req)

	// レスポンスの検証
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, status)
	}
}

// TestAuth_InvalidJWT は無効なJWTトークンのテスト
func TestAuth_InvalidJWT(t *testing.T) {
	// モックの設定
	mockVerifier := &MockTokenVerifier{
		ExpectedError: ErrInvalidToken,
	}

	// JWTConfigの作成
	jwtConfig := mockJWTConfig()

	// ミドルウェアの作成
	logger := slog.Default()
	middleware := AuthWithVerifier(jwtConfig, mockVerifier, logger)

	// リクエストの作成
	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer invalid.jwt.token")

	// レスポンスレコーダーの作成
	rr := httptest.NewRecorder()

	// ミドルウェアを適用したハンドラーの実行
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Handler should not be called for invalid token")
	})
	middleware(handler).ServeHTTP(rr, req)

	// レスポンスの検証
	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("Expected status code %d, got %d", http.StatusUnauthorized, status)
	}
}

// TestAuth_ExpiredJWT は期限切れのJWTトークンのテスト
func TestAuth_ExpiredJWT(t *testing.T) {
	// モックの設定
	mockVerifier := &MockTokenVerifier{
		ExpectedError: ErrTokenExpired,
	}

	// JWTConfigの作成
	jwtConfig := mockJWTConfig()

	// ミドルウェアの作成
	logger := slog.Default()
	middleware := AuthWithVerifier(jwtConfig, mockVerifier, logger)

	// リクエストの作成
	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer expired.jwt.token")

	// レスポンスレコーダーの作成
	rr := httptest.NewRecorder()

	// ミドルウェアを適用したハンドラーの実行
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Handler should not be called for expired token")
	})
	middleware(handler).ServeHTTP(rr, req)

	// レスポンスの検証
	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("Expected status code %d, got %d", http.StatusUnauthorized, status)
	}
}

// TestAuth_WrongAudience は不正なオーディエンスのJWTトークンのテスト
func TestAuth_WrongAudience(t *testing.T) {
	// モックの設定
	mockVerifier := &MockTokenVerifier{
		ExpectedError: ErrInvalidAudience,
	}

	// JWTConfigの作成
	jwtConfig := mockJWTConfig()

	// ミドルウェアの作成
	logger := slog.Default()
	middleware := AuthWithVerifier(jwtConfig, mockVerifier, logger)

	// リクエストの作成
	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "Bearer wrong.audience.token")

	// レスポンスレコーダーの作成
	rr := httptest.NewRecorder()

	// ミドルウェアを適用したハンドラーの実行
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Handler should not be called for wrong audience token")
	})
	middleware(handler).ServeHTTP(rr, req)

	// レスポンスの検証
	if status := rr.Code; status != http.StatusForbidden {
		t.Errorf("Expected status code %d, got %d", http.StatusForbidden, status)
	}
}

// TestAuth_NoToken は認証トークンがない場合のテスト
func TestAuth_NoToken(t *testing.T) {
	// JWTConfigの作成
	jwtConfig := mockJWTConfig()

	// ミドルウェアの作成
	logger := slog.Default()
	middleware := AuthWithVerifier(jwtConfig, &DefaultTokenVerifier{}, logger)

	// リクエストの作成（認証トークンなし）
	req := httptest.NewRequest("GET", "/api/test", nil)

	// レスポンスレコーダーの作成
	rr := httptest.NewRecorder()

	// ミドルウェアを適用したハンドラーの実行
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Handler should not be called when no token is provided")
	})
	middleware(handler).ServeHTTP(rr, req)

	// レスポンスの検証
	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("Expected status code %d, got %d", http.StatusUnauthorized, status)
	}
}

// TestAuth_InvalidAuthHeader は不正な認証ヘッダーのテスト
func TestAuth_InvalidAuthHeader(t *testing.T) {
	// JWTConfigの作成
	jwtConfig := mockJWTConfig()

	// ミドルウェアの作成
	logger := slog.Default()
	middleware := AuthWithVerifier(jwtConfig, &DefaultTokenVerifier{}, logger)

	// リクエストの作成（Bearerプレフィックスなし）
	req := httptest.NewRequest("GET", "/api/test", nil)
	req.Header.Set("Authorization", "invalid-format-token")

	// レスポンスレコーダーの作成
	rr := httptest.NewRecorder()

	// ミドルウェアを適用したハンドラーの実行
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Handler should not be called for invalid auth header")
	})
	middleware(handler).ServeHTTP(rr, req)

	// レスポンスの検証
	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("Expected status code %d, got %d", http.StatusUnauthorized, status)
	}
}
