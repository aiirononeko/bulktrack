package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/aiirononeko/bulktrack/apps/api/internal/di"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/service"
	"github.com/google/uuid"
)

// Server はHTTPサーバーを表す
type Server struct {
	container      *di.Container
	menuService    *service.MenuService
	workoutService *service.WorkoutService
	summaryService *service.SummaryService
	mux            *http.ServeMux
}

// NewServer は新しいHTTPサーバーを作成
func NewServer(container *di.Container) *Server {
	// サービスの初期化
	menuService := service.NewMenuService(container.DB)
	workoutService := service.NewWorkoutService(container.DB)
	summaryService := service.NewSummaryService(container.DB)

	s := &Server{
		container:      container,
		menuService:    menuService,
		workoutService: workoutService,
		summaryService: summaryService,
		mux:            http.NewServeMux(),
	}

	// ルートの登録
	s.mux.HandleFunc("GET /health", s.handleHealth)

	// トレーニングメニュー
	s.mux.HandleFunc("GET /menus", s.handleListMenus)
	s.mux.HandleFunc("POST /menus", s.handleCreateMenu)
	s.mux.HandleFunc("GET /menus/{id}", s.handleGetMenu)
	s.mux.HandleFunc("DELETE /menus/{id}", s.handleDeleteMenu)

	// ワークアウト
	s.mux.HandleFunc("GET /workouts", s.handleListWorkouts)
	s.mux.HandleFunc("POST /workouts", s.handleStartWorkout)
	s.mux.HandleFunc("GET /workouts/{id}", s.handleGetWorkout)

	// セット
	s.mux.HandleFunc("PATCH /sets/{id}", s.handleUpdateSet)

	// トレーニングボリューム統計
	s.mux.HandleFunc("GET /stats/weekly", s.handleGetCurrentWeekStats)
	s.mux.HandleFunc("GET /stats/weekly/history", s.handleGetWeeklyStatsHistory)

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

// メニュー作成ハンドラー
func (s *Server) handleCreateMenu(w http.ResponseWriter, r *http.Request) {
	// リクエストボディの読み取り
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// リクエストのパース
	var req dto.CreateMenuRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// ユーザーID取得 (認証は実装予定)
	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111") // テストユーザーID

	// メニュー作成
	resp, err := s.menuService.CreateMenu(r.Context(), req, userID)
	if err != nil {
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
		http.Error(w, "Invalid menu ID", http.StatusBadRequest)
		return
	}

	// メニュー取得
	resp, err := s.menuService.GetMenuWithItems(r.Context(), menuID)
	if err != nil {
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
		http.Error(w, "Invalid menu ID", http.StatusBadRequest)
		return
	}

	// メニュー削除
	if err := s.menuService.DeleteMenu(r.Context(), menuID); err != nil {
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
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// リクエストのパース
	var req dto.CreateWorkoutRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// ユーザーID取得 (認証は実装予定)
	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111") // テストユーザーID

	// ワークアウト開始
	resp, err := s.workoutService.StartWorkout(r.Context(), req, userID)
	if err != nil {
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
		http.Error(w, "Invalid workout ID", http.StatusBadRequest)
		return
	}

	// ワークアウト取得
	resp, err := s.workoutService.GetWorkoutWithSets(r.Context(), workoutID)
	if err != nil {
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
		http.Error(w, "Invalid set ID", http.StatusBadRequest)
		return
	}

	// リクエストボディの読み取り
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// リクエストのパース
	var req dto.UpdateSetRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// セット更新
	resp, err := s.workoutService.UpdateSet(r.Context(), setID, req)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update set: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// 週間トレーニングボリューム統計取得ハンドラー
func (s *Server) handleGetCurrentWeekStats(w http.ResponseWriter, r *http.Request) {
	// ユーザーID取得 (認証は実装予定)
	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111") // テストユーザーID

	// 現在週のトレーニングボリューム取得
	summary, err := s.summaryService.GetCurrentWeeklySummary(r.Context(), userID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get current week stats: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

// 過去の週間トレーニングボリューム履歴取得ハンドラー
func (s *Server) handleGetWeeklyStatsHistory(w http.ResponseWriter, r *http.Request) {
	// ユーザーID取得 (認証は実装予定)
	userID := uuid.MustParse("11111111-1111-1111-1111-111111111111") // テストユーザーID

	// クエリパラメータからlimitを取得（デフォルトは12週間）
	limitStr := r.URL.Query().Get("limit")
	limit := int32(12)
	if limitStr != "" {
		var limitInt int
		_, err := fmt.Sscanf(limitStr, "%d", &limitInt)
		if err == nil && limitInt > 0 {
			limit = int32(limitInt)
		}
	}

	// 週間統計履歴取得
	summaries, err := s.summaryService.GetRecentWeeklySummaries(r.Context(), userID, limit)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get weekly stats history: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(dto.WeeklyVolumeSummaryResponse{Summaries: summaries})
}
