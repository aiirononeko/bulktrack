package handler

import (
	"encoding/json"
	"net/http"

	"github.com/aiirononeko/bulktrack/apps/api/internal/di"
)

// Server はHTTPサーバーを表す
type Server struct {
	container *di.Container
	mux       *http.ServeMux
}

// NewServer は新しいHTTPサーバーを作成
func NewServer(container *di.Container) *Server {
	s := &Server{
		container: container,
		mux:       http.NewServeMux(),
	}

	// ルートの登録
	s.mux.HandleFunc("GET /health", s.handleHealth)

	return s
}

// ServeHTTP はHTTPリクエストを処理
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

// ヘルスチェックハンドラー
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	// DB接続確認
	if err := s.container.DB.Ping(r.Context()); err != nil {
		http.Error(w, "Database connection error", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
