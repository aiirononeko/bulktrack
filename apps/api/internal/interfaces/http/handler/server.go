package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/aiirononeko/bulktrack/apps/api/internal/application/query"
	"github.com/aiirononeko/bulktrack/apps/api/internal/di"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/middleware"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/service"
	"github.com/google/uuid"
)

// Server はHTTPサーバーを表す
type Server struct {
	container             *di.Container
	menuService           *service.MenuService
	workoutService        *service.WorkoutService
	exerciseService       *service.ExerciseService
	latestSetQueryService query.LatestSetQueryService
	mux                   *http.ServeMux
	logger                *slog.Logger
}

// NewServer は新しいHTTPサーバーを作成
func NewServer(container *di.Container) *Server {
	// サービスの初期化
	menuService := service.NewMenuService(container.DB, container.Logger)
	workoutService := service.NewWorkoutService(container.DB, container.Logger)
	exerciseService := service.NewExerciseService(container.DB, container.Logger)
	latestSetQueryService := query.NewLatestSetQueryService(container.DB, container.Logger)

	s := &Server{
		container:             container,
		menuService:           menuService,
		workoutService:        workoutService,
		exerciseService:       exerciseService,
		latestSetQueryService: latestSetQueryService,
		mux:                   http.NewServeMux(),
		logger:                container.Logger,
	}

	// ミドルウェアの作成
	logging := middleware.LoggingMiddleware(s.logger)
	auth := middleware.ClerkAuth(container.Config, s.logger)

	// ルートの登録
	s.mux.Handle("GET /health", logging(http.HandlerFunc(s.handleHealth)))

	// トレーニングメニュー - 認証必須
	s.mux.Handle("GET /menus", logging(auth(http.HandlerFunc(s.handleListMenus))))
	s.mux.Handle("POST /menus", logging(auth(http.HandlerFunc(s.handleCreateMenu))))
	s.mux.Handle("GET /menus/{id}", logging(auth(http.HandlerFunc(s.handleGetMenu))))
	s.mux.Handle("DELETE /menus/{id}", logging(auth(http.HandlerFunc(s.handleDeleteMenu))))
	s.mux.Handle("PUT /menus/{id}", logging(auth(http.HandlerFunc(s.handleUpdateMenu))))
	s.mux.Handle("GET /menus/{id}/exercises/last-records", logging(auth(http.HandlerFunc(s.handleGetLastRecords))))

	// ワークアウト - 認証必須
	s.mux.Handle("GET /workouts", logging(auth(http.HandlerFunc(s.handleListWorkouts))))
	s.mux.Handle("POST /workouts", logging(auth(http.HandlerFunc(s.handleStartWorkout))))
	s.mux.Handle("GET /workouts/{id}", logging(auth(http.HandlerFunc(s.handleGetWorkout))))

	// セット - 認証必須
	s.mux.Handle("PATCH /sets/{id}", logging(auth(http.HandlerFunc(s.handleUpdateSet))))

	// 種目 - 認証必須
	s.mux.Handle("GET /exercises", logging(auth(http.HandlerFunc(s.handleListExercises))))

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
	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		s.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

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

	// メニュー作成 (userIDStr を渡す)
	resp, err := s.menuService.CreateMenu(r.Context(), req, userIDStr) // userID.String() ではなく userIDStr を渡す
	if err != nil {
		// userID.String() ではなく userIDStr をログに出力
		s.logger.Error("Failed to create menu", slog.Any("error", err), slog.String("user_id", userIDStr), slog.Any("request", req))
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
	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		s.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// メニュー一覧取得 (userIDStr を渡す)
	menus, err := s.menuService.ListMenusByUser(r.Context(), userIDStr) // userID ではなく userIDStr を渡す
	if err != nil {
		// userID.String() ではなく userIDStr をログに出力
		s.logger.Error("Failed to list menus by user", slog.Any("error", err), slog.String("user_id", userIDStr))
		http.Error(w, fmt.Sprintf("Failed to list menus: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(menus)
}

// ワークアウト一覧取得ハンドラー
func (s *Server) handleListWorkouts(w http.ResponseWriter, r *http.Request) {
	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	s.logger.Debug("User ID from context", slog.String("user_id", userIDStr))
	if !ok {
		s.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// ワークアウト一覧取得 (userIDStr を渡す)
	workouts, err := s.workoutService.ListWorkoutsByUser(r.Context(), userIDStr) // userID ではなく userIDStr を渡す
	if err != nil {
		// userID.String() ではなく userIDStr をログに出力
		s.logger.Error("Failed to list workouts by user", slog.Any("error", err), slog.String("user_id", userIDStr))
		http.Error(w, fmt.Sprintf("Failed to list workouts: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(workouts)
}

// ワークアウト開始ハンドラー
func (s *Server) handleStartWorkout(w http.ResponseWriter, r *http.Request) {
	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		s.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// デバッグログ：リクエスト情報
	s.logger.InfoContext(r.Context(), "StartWorkout request received",
		slog.String("user_id", userIDStr),
		slog.String("path", r.URL.Path),
		slog.String("method", r.Method),
		slog.String("content_type", r.Header.Get("Content-Type")))

	// リクエストボディの読み取り
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.logger.Error("Failed to read request body for start workout", slog.Any("error", err))
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// デバッグログ：リクエストボディ
	s.logger.InfoContext(r.Context(), "StartWorkout request body",
		slog.String("user_id", userIDStr),
		slog.String("body", string(body)))

	// リクエストのパース
	var req dto.CreateWorkoutRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.logger.Error("Failed to unmarshal request body for start workout",
			slog.Any("error", err),
			slog.String("body", string(body)))
		http.Error(w, "Invalid request format", http.StatusBadRequest)
		return
	}

	// デバッグログ：パース後のリクエスト
	exercisesCount := 0
	setsCount := 0
	if req.Exercises != nil {
		exercisesCount = len(req.Exercises)
		for _, exercise := range req.Exercises {
			if exercise.Sets != nil {
				setsCount += len(exercise.Sets)
			}
		}
	}

	s.logger.InfoContext(r.Context(), "StartWorkout parsed request",
		slog.String("user_id", userIDStr),
		slog.String("menu_id", req.MenuID.String()),
		slog.Int("exercises_count", exercisesCount),
		slog.Int("total_sets_count", setsCount),
		slog.String("note_length", fmt.Sprintf("%d", len(req.Note))))

	// ワークアウト開始 (userIDStr を渡す)
	// 注意: StartWorkout のシグネチャも変更が必要
	resp, err := s.workoutService.StartWorkout(r.Context(), req, userIDStr)
	if err != nil {
		// userID.String() ではなく userIDStr をログに出力
		s.logger.Error("Failed to start workout",
			slog.Any("error", err),
			slog.String("user_id", userIDStr),
			slog.String("menu_id", req.MenuID.String()),
			slog.Int("exercises_count", exercisesCount))
		http.Error(w, fmt.Sprintf("Failed to start workout: %v", err), http.StatusInternalServerError)
		return
	}

	// デバッグログ：レスポンス情報
	setsInResponse := 0
	if resp != nil && resp.Sets != nil {
		setsInResponse = len(resp.Sets)
	}

	s.logger.InfoContext(r.Context(), "StartWorkout response prepared",
		slog.String("user_id", userIDStr),
		slog.String("workout_id", resp.ID.String()),
		slog.String("menu_id", resp.MenuID.String()),
		slog.String("menu_name", resp.MenuName),
		slog.Int("sets_count", setsInResponse))

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	// デバッグ用にJSONを文字列にエンコードし、ログに出力
	responseJSON, _ := json.MarshalIndent(resp, "", "  ")
	s.logger.InfoContext(r.Context(), "StartWorkout JSON response",
		slog.String("user_id", userIDStr),
		slog.String("workout_id", resp.ID.String()),
		slog.String("response_json", string(responseJSON)))

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
	s.logger.Debug("Workout response", slog.Any("response", resp))
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

// 種目一覧取得ハンドラー
func (s *Server) handleListExercises(w http.ResponseWriter, r *http.Request) {
	exercises, err := s.exerciseService.ListExercises(r.Context())
	if err != nil {
		s.logger.ErrorContext(r.Context(), "Failed to list exercises", slog.Any("error", err))
		http.Error(w, "Failed to retrieve exercises", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(exercises)
}

// 前回のトレーニング記録を取得するエンドポイント
func (s *Server) handleGetLastRecords(w http.ResponseWriter, r *http.Request) {
	// メニューIDの取得
	idStr := strings.TrimPrefix(r.URL.Path, "/menus/")
	idStr = strings.TrimSuffix(idStr, "/exercises/last-records")

	menuID, err := uuid.Parse(idStr)
	if err != nil {
		s.logger.Warn("Invalid menu ID format for last records", slog.String("path", r.URL.Path), slog.String("id_str", idStr), slog.Any("error", err))
		http.Error(w, "Invalid menu ID", http.StatusBadRequest)
		return
	}

	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		s.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 前回のトレーニング記録取得
	records, err := s.latestSetQueryService.ListByMenu(r.Context(), userIDStr, menuID)
	if err != nil {
		s.logger.Error("Failed to get latest records", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		http.Error(w, fmt.Sprintf("Failed to get latest records: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(records)
}

// メニュー更新ハンドラー
func (s *Server) handleUpdateMenu(w http.ResponseWriter, r *http.Request) {
	// メニューIDの取得
	idStr := strings.TrimPrefix(r.URL.Path, "/menus/")
	idStr = strings.TrimSuffix(idStr, "/")

	menuID, err := uuid.Parse(idStr)
	if err != nil {
		s.logger.Warn("Invalid menu ID format for update", slog.String("path", r.URL.Path), slog.String("id_str", idStr), slog.Any("error", err))
		http.Error(w, "Invalid menu ID", http.StatusBadRequest)
		return
	}

	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		s.logger.Error("User ID not found in context for menu update")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// リクエストボディの読み取り
	body, err := io.ReadAll(r.Body)
	if err != nil {
		s.logger.Error("Failed to read request body for update menu", slog.Any("error", err), slog.String("menu_id", menuID.String()))
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// リクエストのパース
	var req dto.MenuUpdateRequest
	if err := json.Unmarshal(body, &req); err != nil {
		s.logger.Error("Failed to unmarshal request body for update menu",
			slog.Any("error", err),
			slog.String("menu_id", menuID.String()),
			slog.String("body", string(body)))
		http.Error(w, "Invalid request format: "+err.Error(), http.StatusBadRequest)
		return
	}

	// メニュー更新
	resp, err := s.menuService.UpdateMenu(r.Context(), menuID, req)
	if err != nil {
		s.logger.Error("Failed to update menu",
			slog.Any("error", err),
			slog.String("menu_id", menuID.String()),
			slog.String("user_id", userIDStr))
		http.Error(w, fmt.Sprintf("Failed to update menu: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
