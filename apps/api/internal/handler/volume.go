package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/middleware"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/service"
)

// VolumeHandler は週間トレーニングボリューム関連のハンドラーを提供する
type VolumeHandler struct {
	volumeService *service.VolumeService
	logger        *slog.Logger
}

// NewVolumeHandler は新しいVolumeHandlerを作成する
func NewVolumeHandler(volumeService *service.VolumeService, logger *slog.Logger) *VolumeHandler {
	return &VolumeHandler{
		volumeService: volumeService,
		logger:        logger,
	}
}

// RegisterRoutes はルートを登録する
func (h *VolumeHandler) RegisterRoutes(mux *http.ServeMux, logging, auth func(http.Handler) http.Handler) {
	// 週間ボリューム取得エンドポイント
	mux.Handle("GET /v1/weekly-volume", logging(auth(http.HandlerFunc(h.handleGetWeeklyVolumes))))
	mux.Handle("GET /v1/weekly-volume/{week}", logging(auth(http.HandlerFunc(h.handleGetWeeklyVolumeForWeek))))
	mux.Handle("GET /v1/weekly-volume/stats", logging(auth(http.HandlerFunc(h.handleGetWeeklyVolumeStats))))
	mux.Handle("POST /v1/weekly-volume/recalculate", logging(auth(http.HandlerFunc(h.handleRecalculateWeeklyVolume))))
}

// handleGetWeeklyVolumes は週間ボリューム一覧を取得するハンドラー
func (h *VolumeHandler) handleGetWeeklyVolumes(w http.ResponseWriter, r *http.Request) {
	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		h.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// クエリパラメータから週数を取得（デフォルトは12週）
	weeksCountStr := r.URL.Query().Get("weeks")
	weeksCount := int32(12) // デフォルト値
	if weeksCountStr != "" {
		count, err := strconv.ParseInt(weeksCountStr, 10, 32)
		if err != nil {
			h.logger.Warn("Invalid weeks count parameter", slog.String("weeks", weeksCountStr), slog.Any("error", err))
			http.Error(w, "Invalid weeks count parameter", http.StatusBadRequest)
			return
		}
		weeksCount = int32(count)
	}

	// 週間ボリューム一覧を取得
	volumes, err := h.volumeService.GetWeeklyVolumes(r.Context(), userIDStr, weeksCount)
	if err != nil {
		h.logger.Error("Failed to get weekly volumes", slog.Any("error", err), slog.String("user_id", userIDStr), slog.Int("weeks_count", int(weeksCount)))
		http.Error(w, fmt.Sprintf("Failed to get weekly volumes: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=900, stale-while-revalidate") // 15分キャッシュ
	json.NewEncoder(w).Encode(volumes)
}

// handleGetWeeklyVolumeForWeek は特定の週の週間ボリュームを取得するハンドラー
func (h *VolumeHandler) handleGetWeeklyVolumeForWeek(w http.ResponseWriter, r *http.Request) {
	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		h.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// URLから週の日付を取得
	weekStr := r.PathValue("week")
	if weekStr == "" {
		h.logger.Warn("Week parameter is required")
		http.Error(w, "Week parameter is required", http.StatusBadRequest)
		return
	}

	// 日付をパース
	weekTime, err := time.Parse(time.RFC3339, weekStr)
	if err != nil {
		h.logger.Warn("Invalid week format", slog.String("week", weekStr), slog.Any("error", err))
		http.Error(w, "Invalid week format. Expected RFC3339 format (e.g. 2025-04-21T00:00:00Z)", http.StatusBadRequest)
		return
	}

	// 週間ボリュームを取得
	volume, err := h.volumeService.GetWeeklyVolumeForWeek(r.Context(), userIDStr, weekTime)
	if err != nil {
		h.logger.Error("Failed to get weekly volume for week", slog.Any("error", err), slog.String("user_id", userIDStr), slog.String("week", weekStr))
		http.Error(w, fmt.Sprintf("Failed to get weekly volume for week: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=900, stale-while-revalidate") // 15分キャッシュ
	json.NewEncoder(w).Encode(volume)
}

// handleGetWeeklyVolumeStats は週間ボリューム統計を取得するハンドラー
func (h *VolumeHandler) handleGetWeeklyVolumeStats(w http.ResponseWriter, r *http.Request) {
	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		h.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// クエリパラメータから期間を取得
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

	// デフォルト値の設定（開始日：3ヶ月前、終了日：今日）
	endDate := time.Now()
	startDate := endDate.AddDate(0, -3, 0)

	// 開始日のパース
	if startDateStr != "" {
		parsedStartDate, err := time.Parse(time.RFC3339, startDateStr)
		if err != nil {
			h.logger.Warn("Invalid start_date format", slog.String("start_date", startDateStr), slog.Any("error", err))
			http.Error(w, "Invalid start_date format. Expected RFC3339 format (e.g. 2025-01-01T00:00:00Z)", http.StatusBadRequest)
			return
		}
		startDate = parsedStartDate
	}

	// 終了日のパース
	if endDateStr != "" {
		parsedEndDate, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			h.logger.Warn("Invalid end_date format", slog.String("end_date", endDateStr), slog.Any("error", err))
			http.Error(w, "Invalid end_date format. Expected RFC3339 format (e.g. 2025-04-25T00:00:00Z)", http.StatusBadRequest)
			return
		}
		endDate = parsedEndDate
	}

	// 週間ボリューム統計を取得
	stats, err := h.volumeService.GetWeeklyVolumeStats(r.Context(), userIDStr, startDate, endDate)
	if err != nil {
		h.logger.Error("Failed to get weekly volume stats", slog.Any("error", err), slog.String("user_id", userIDStr), slog.Time("start_date", startDate), slog.Time("end_date", endDate))
		http.Error(w, fmt.Sprintf("Failed to get weekly volume stats: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "max-age=900, stale-while-revalidate") // 15分キャッシュ
	json.NewEncoder(w).Encode(stats)
}

// handleRecalculateWeeklyVolume は週間ボリュームを再計算するハンドラー
func (h *VolumeHandler) handleRecalculateWeeklyVolume(w http.ResponseWriter, r *http.Request) {
	// コンテキストからユーザーIDを取得
	userIDStr, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		h.logger.Error("User ID not found in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// リクエストボディから週の日付を取得
	var req struct {
		Week string `json:"week"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("Invalid request body", slog.Any("error", err))
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// 日付をパース
	weekTime, err := time.Parse(time.RFC3339, req.Week)
	if err != nil {
		h.logger.Warn("Invalid week format", slog.String("week", req.Week), slog.Any("error", err))
		http.Error(w, "Invalid week format. Expected RFC3339 format (e.g. 2025-04-21T00:00:00Z)", http.StatusBadRequest)
		return
	}

	// 週間ボリュームを再計算
	if err := h.volumeService.RecalculateWeeklyVolume(r.Context(), userIDStr, weekTime); err != nil {
		h.logger.Error("Failed to recalculate weekly volume", slog.Any("error", err), slog.String("user_id", userIDStr), slog.String("week", req.Week))
		http.Error(w, fmt.Sprintf("Failed to recalculate weekly volume: %v", err), http.StatusInternalServerError)
		return
	}

	// 再計算後の週間ボリュームを取得
	volume, err := h.volumeService.GetWeeklyVolumeForWeek(r.Context(), userIDStr, weekTime)
	if err != nil {
		h.logger.Error("Failed to get weekly volume after recalculation", slog.Any("error", err), slog.String("user_id", userIDStr), slog.String("week", req.Week))
		http.Error(w, fmt.Sprintf("Failed to get weekly volume after recalculation: %v", err), http.StatusInternalServerError)
		return
	}

	// レスポンス返却
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(volume)
}
