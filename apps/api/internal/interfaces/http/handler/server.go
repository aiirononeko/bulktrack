package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/aiirononeko/bulktrack/apps/api/internal/di"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/middleware"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/service"
	"github.com/google/uuid"
)

// Server はHTTPサーバーを表す
type Server struct {
	container      *di.Container
	menuService    *service.MenuService
	workoutService *service.WorkoutService
	mux            *http.ServeMux
	logger         *slog.Logger
}

// NewServer は新しいHTTPサーバーを作成
func NewServer(container *di.Container) *Server {
	// サービスの初期化
	menuService := service.NewMenuService(container.DB, container.Logger)
	workoutService := service.NewWorkoutService(container.DB, container.Logger)

	s := &Server{
		container:      container,
		menuService:    menuService,
		workoutService: workoutService,
		mux:            http.NewServeMux(),
		logger:         container.Logger,
	}

	// ロギングミドルウェアを作成
	logging := middleware.LoggingMiddleware(s.logger)

	// ルートの登録 (ミドルウェアでラップ)
	s.mux.Handle("GET /health", logging(http.HandlerFunc(s.handleHealth)))

	// トレーニングメニュー (ミドルウェアでラップ)
	s.mux.Handle("GET /menus", logging(http.HandlerFunc(s.handleListMenus)))
	s.mux.Handle("POST /menus", logging(http.HandlerFunc(s.handleCreateMenu)))
	s.mux.Handle("GET /menus/{id}", logging(http.HandlerFunc(s.handleGetMenu)))
	s.mux.Handle("DELETE /menus/{id}", logging(http.HandlerFunc(s.handleDeleteMenu)))

	// ワークアウト (ミドルウェアでラップ)
	s.mux.Handle("GET /workouts", logging(http.HandlerFunc(s.handleListWorkouts)))
	s.mux.Handle("POST /workouts", logging(http.HandlerFunc(s.handleStartWorkout)))
	s.mux.Handle("GET /workouts/{id}", logging(http.HandlerFunc(s.handleGetWorkout)))

	// セット (ミドルウェアでラップ)
	s.mux.Handle("PATCH /sets/{id}", logging(http.HandlerFunc(s.handleUpdateSet)))

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
		s.logger.Error("Database connection ping failed", slog.Any("error", err))
		http.Error(w, "Database connection error", http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// メニュー作成ハンドラー
func (s *Server) handleCreateMenu(w http.ResponseWriter, r *http.Request) {
	// リクエストボディの読み取り
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.logger.Error("Failed to read request body", slog.Any("error", err))
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// リクエストのパース
	var req dto.CreateMenuRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.logger.Error("Failed to unmarshal request body", slog.Any("error", err), slog.String("body", string(body)))
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// ユーザーID取得 (認証は実装予定)
	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111") // テストユーザーID

	// メニュー作成
	resp, err := s.menuService.CreateMenu(r.Context(), req, userID)
	if err != nil {
		s.logger.Error("Failed to create menu", slog.Any("error", err), slog.String("user_id", userID.String()), slog.Any("request", req))
		http.Error(w, fmt.Sprintf("Failed to create menu: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// メニュー取得ハンドラー
func (s *Server) handleGetMenu(w http.ResponseWriter, r *http.Request) {
	// メニューIDの取得
	idStr := strings.TrimPrefix(r.URL.Path, "/menus/")
	idStr = strings.TrimSuffix(idStr, "/")

	menuID, err := uuid.Parse(idStr)
	if err != nil {
		s.logger.Warn("Invalid menu ID format", slog.String("path", r.URL.Path), slog.String("id_str", idStr), slog.Any("error", err))
		http.Error(w, "Invalid menu ID", http.StatusBadRequest)
		return
	}

	// メニュー取得
	resp, err := s.menuService.GetMenuWithItems(r.Context(), menuID)
	if err != nil {
		s.logger.Error("Failed to get menu", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		http.Error(w, fmt.Sprintf("Failed to get menu: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// メニュー削除ハンドラー
func (s *Server) handleDeleteMenu(w http.ResponseWriter, r *http.Request) {
	// メニューIDの取得
	idStr := strings.TrimPrefix(r.URL.Path, "/menus/")
	idStr = strings.TrimSuffix(idStr, "/")

	menuID, err := uuid.Parse(idStr)
	if err != nil {
		s.logger.Warn("Invalid menu ID format for delete", slog.String("path", r.URL.Path), slog.String("id_str", idStr), slog.Any("error", err))
		http.Error(w, "Invalid menu ID", http.StatusBadRequest)
		return
	}

	// メニュー削除
	if err := s.menuService.DeleteMenu(r.Context(), menuID); err != nil {
		s.logger.Error("Failed to delete menu", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		http.Error(w, fmt.Sprintf("Failed to delete menu: %v", err), http.StatusInternalServerError)
		return
	}

	// 削除成功のレスポンス
	w.WriteHeader(http.StatusNoContent)
}

// メニュー一覧取得ハンドラー
func (s *Server) handleListMenus(w http.ResponseWriter, r *http.Request) {
	// ユーザーID取得 (認証は実装予定)
	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111") // テストユーザーID

	// メニュー一覧取得
	menus, err := s.menuService.ListMenusByUser(r.Context(), userID)
	if err != nil {
		s.logger.Error("Failed to list menus by user", slog.Any("error", err), slog.String("user_id", userID.String()))
		http.Error(w, fmt.Sprintf("Failed to list menus: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(menus)
}

// ワークアウト一覧取得ハンドラー
func (s *Server) handleListWorkouts(w http.ResponseWriter, r *http.Request) {
	// ユーザーID取得 (認証は実装予定)
	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111") // テストユーザーID

	// ワークアウト一覧取得
	workouts, err := s.workoutService.ListWorkoutsByUser(r.Context(), userID)
	if err != nil {
		s.logger.Error("Failed to list workouts by user", slog.Any("error", err), slog.String("user_id", userID.String()))
		http.Error(w, fmt.Sprintf("Failed to list workouts: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workouts)
}

// ワークアウト開始ハンドラー
func (s *Server) handleStartWorkout(w http.ResponseWriter, r *http.Request) {
	// リクエストボディの読み取り
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.logger.Error("Failed to read request body for start workout", slog.Any("error", err))
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// リクエストのパース
	var req dto.CreateWorkoutRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.logger.Error("Failed to unmarshal request body for start workout", slog.Any("error", err), slog.String("body", string(body)))
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// ユーザーID取得 (認証は実装予定)
	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111") // テストユーザーID

	// ワークアウト開始
	resp, err := s.workoutService.StartWorkout(r.Context(), req, userID)
	if err != nil {
		s.logger.Error("Failed to start workout", slog.Any("error", err), slog.String("user_id", userID.String()), slog.Any("request", req))
		http.Error(w, fmt.Sprintf("Failed to start workout: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// ワークアウト詳細取得ハンドラー
func (s *Server) handleGetWorkout(w http.ResponseWriter, r *http.Request) {
	// ワークアウトIDの取得
	idStr := strings.TrimPrefix(r.URL.Path, "/workouts/")
	idStr = strings.TrimSuffix(idStr, "/")

	workoutID, err := uuid.Parse(idStr)
	if err != nil {
		s.logger.Warn("Invalid workout ID format", slog.String("path", r.URL.Path), slog.String("id_str", idStr), slog.Any("error", err))
		http.Error(w, "Invalid workout ID", http.StatusBadRequest)
		return
	}

	// ワークアウト取得
	resp, err := s.workoutService.GetWorkoutWithSets(r.Context(), workoutID)
	if err != nil {
		s.logger.Error("Failed to get workout with sets", slog.Any("error", err), slog.String("workout_id", workoutID.String()))
		http.Error(w, fmt.Sprintf("Failed to get workout: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// セット更新ハンドラー
func (s *Server) handleUpdateSet(w http.ResponseWriter, r *http.Request) {
	// セットIDの取得
	idStr := strings.TrimPrefix(r.URL.Path, "/sets/")
	idStr = strings.TrimSuffix(idStr, "/")

	setID, err := uuid.Parse(idStr)
	if err != nil {
		s.logger.Warn("Invalid set ID format", slog.String("path", r.URL.Path), slog.String("id_str", idStr), slog.Any("error", err))
		http.Error(w, "Invalid set ID", http.StatusBadRequest)
		return
	}

	// リクエストボディの読み取り
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.logger.Error("Failed to read request body for update set", slog.Any("error", err), slog.String("set_id", setID.String()))
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// リクエストのパース (UpdateSetRequest DTOを使用)
	var req dto.UpdateSetRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.logger.Error("Failed to unmarshal request body for update set", slog.Any("error", err), slog.String("set_id", setID.String()), slog.String("body", string(body)))
		http.Error(w, "Invalid request format: "+err.Error(), http.StatusBadRequest)
		return
	}

	// セット更新 (修正された UpdateSetRequest を渡す)
	resp, err := s.workoutService.UpdateSet(r.Context(), setID, req)
	if err != nil {
		// エラーレスポンスを改善 (例: どのセットの更新に失敗したか)
		s.logger.Error("Failed to update set", slog.Any("error", err), slog.String("set_id", setID.String()), slog.Any("request", req))
		http.Error(w, fmt.Sprintf("Failed to update set (ID: %s): %v", setID, err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
