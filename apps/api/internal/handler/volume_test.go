package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
	"time"
	"unsafe"

	"log/slog"

	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/dto"
	"github.com/aiirononeko/bulktrack/apps/api/internal/interfaces/http/middleware"
)

// mockVolumeService はテスト用のモックサービス
type mockVolumeService struct {
	getWeeklyVolumesFunc func(ctx context.Context, userID string, weeksCount int32) (*dto.WeeklyVolumeSummaryResponse, error)
}

// GetWeeklyVolumes はモックの実装
func (m *mockVolumeService) GetWeeklyVolumes(ctx context.Context, userID string, weeksCount int32) (*dto.WeeklyVolumeSummaryResponse, error) {
	if m.getWeeklyVolumesFunc != nil {
		return m.getWeeklyVolumesFunc(ctx, userID, weeksCount)
	}
	return &dto.WeeklyVolumeSummaryResponse{}, nil
}

// GetWeeklyVolumeForWeek はモックの実装
func (m *mockVolumeService) GetWeeklyVolumeForWeek(ctx context.Context, userID string, weekStartDate time.Time) (*dto.WeeklySummaryResponse, error) {
	return &dto.WeeklySummaryResponse{}, nil
}

// RecalculateWeeklyVolume はモックの実装
func (m *mockVolumeService) RecalculateWeeklyVolume(ctx context.Context, userID string, weekStartDate time.Time) error {
	return nil
}

// GetWeeklyVolumeStats はモックの実装
func (m *mockVolumeService) GetWeeklyVolumeStats(ctx context.Context, userID string, startDate, endDate time.Time) (*dto.WeeklyVolumeStatsResponse, error) {
	return &dto.WeeklyVolumeStatsResponse{}, nil
}

// TestWeeklyVolume_AuthZ は認可チェックのテスト
func TestWeeklyVolume_AuthZ(t *testing.T) {
	// ハンドラーの作成（実際のサービスは使わない）
	handler := &VolumeHandler{
		logger: slog.Default(),
	}

	// リクエストの作成
	req, err := http.NewRequest("GET", "/v1/weekly-volume", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// レスポンスレコーダーの作成
	rr := httptest.NewRecorder()

	// 認証情報なしでハンドラーを実行
	handler.handleGetWeeklyVolumes(rr, req)

	// 認証エラーを確認
	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected status code %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

// TestWeeklyVolume_MissingWeeks は欠損週がゼロで埋められることをテストする
func TestWeeklyVolume_MissingWeeks(t *testing.T) {
	// モックサービスの作成
	mockService := &mockVolumeService{}

	// 欠損週を含むデータを返すモック関数を設定
	mockService.getWeeklyVolumesFunc = func(ctx context.Context, userID string, weeksCount int32) (*dto.WeeklyVolumeSummaryResponse, error) {
		// 現在の日付から12週間分の日付を生成
		now := time.Now()
		summaries := make([]dto.WeeklySummaryResponse, 12)

		// 全ての週をゼロで初期化
		for i := 0; i < 12; i++ {
			weekStart := now.AddDate(0, 0, -7*i)
			summaries[i] = dto.WeeklySummaryResponse{
				Week:        weekStart.Format(time.RFC3339),
				TotalVolume: 0,
				EstOneRM:    0,
			}
		}

		// いくつかの週にデータを設定（欠損週を作る）
		summaries[0].TotalVolume = 1000 // 今週
		summaries[2].TotalVolume = 800  // 3週間前
		summaries[5].TotalVolume = 1200 // 6週間前
		summaries[11].TotalVolume = 900 // 12週間前

		return &dto.WeeklyVolumeSummaryResponse{
			Summaries: summaries,
		}, nil
	}

	// ハンドラーの作成
	handler := &VolumeHandler{
		logger: slog.Default(),
	}

	// リフレクションを使用してprivateフィールドを設定
	handlerValue := reflect.ValueOf(handler).Elem()
	serviceField := handlerValue.FieldByName("volumeService")

	// フィールドをエクスポートする
	serviceFieldPtr := unsafe.Pointer(serviceField.UnsafeAddr())
	reflect.NewAt(serviceField.Type(), serviceFieldPtr).
		Elem().
		Set(reflect.ValueOf(mockService))

	// リクエストの作成
	req, err := http.NewRequest("GET", "/v1/weekly-volume", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// ユーザーIDをコンテキストに設定
	userID := "test-user-id"
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	// レスポンスレコーダーの作成
	rr := httptest.NewRecorder()

	// ハンドラーを実行
	handler.handleGetWeeklyVolumes(rr, req)

	// 成功レスポンスを確認
	if rr.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, rr.Code)
	}

	// レスポンスボディを確認
	var response dto.WeeklyVolumeSummaryResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	if err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	// 12週間分のデータがあることを確認
	if len(response.Summaries) != 12 {
		t.Errorf("Expected 12 summaries, got %d", len(response.Summaries))
	}

	// 欠損週がゼロで埋められていることを確認
	expectedVolumes := map[int]float64{
		0:  1000, // 今週
		1:  0,    // 先週（欠損）
		2:  800,  // 3週間前
		3:  0,    // 4週間前（欠損）
		4:  0,    // 5週間前（欠損）
		5:  1200, // 6週間前
		6:  0,    // 7週間前（欠損）
		7:  0,    // 8週間前（欠損）
		8:  0,    // 9週間前（欠損）
		9:  0,    // 10週間前（欠損）
		10: 0,    // 11週間前（欠損）
		11: 900,  // 12週間前
	}

	for i, expected := range expectedVolumes {
		if i >= len(response.Summaries) {
			t.Errorf("Missing summary for week %d", i)
			continue
		}

		actual := response.Summaries[i].TotalVolume
		if actual != expected {
			t.Errorf("Week %d: expected volume %f, got %f", i, expected, actual)
		}
	}
}
