import { z } from "zod";
import type { WeeklyVolume, WeeklyVolumeSummary, WeeklyVolumeStats, ChartPeriod, ChartType, DashboardSettings } from "./types";

// 週次ボリュームデータのスキーマ
export const WeeklyVolumeSchema = z.object({
  weekStartDate: z.string(),
  totalVolume: z.number().nonnegative(),
  estOneRM: z.number().nonnegative().optional(),
  exerciseCount: z.number().nonnegative().int().optional(),
  setCount: z.number().nonnegative().int().optional(),
});

// 週次ボリュームサマリーのスキーマ
export const WeeklyVolumeSummarySchema = z.object({
  summaries: z.array(WeeklyVolumeSchema),
});

// 週次ボリューム統計のスキーマ
export const WeeklyVolumeStatsSchema = z.object({
  avgWeeklyVolume: z.number().nonnegative(),
  maxWeeklyVolume: z.number().nonnegative(),
  minWeeklyVolume: z.number().nonnegative(),
  maxEstOneRM: z.number().nonnegative(),
  avgExerciseCount: z.number().nonnegative(),
  avgSetCount: z.number().nonnegative(),
});

// チャート期間のスキーマ
export const ChartPeriodSchema = z.enum(["12weeks", "52weeks"]);

// チャートタイプのスキーマ
export const ChartTypeSchema = z.enum(["line", "bar"]);

// ダッシュボード設定のスキーマ
export const DashboardSettingsSchema = z.object({
  period: ChartPeriodSchema,
  chartType: ChartTypeSchema,
});

// デフォルトのダッシュボード設定
export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  period: "12weeks",
  chartType: "line",
};

// モックデータを生成する関数
export function getMockWeeklyVolumes(): WeeklyVolume[] {
  return [
    { weekStartDate: "2025-04-14", totalVolume: 15000, estOneRM: 120, exerciseCount: 5, setCount: 25 },
    { weekStartDate: "2025-04-07", totalVolume: 14500, estOneRM: 115, exerciseCount: 4, setCount: 22 },
    { weekStartDate: "2025-03-31", totalVolume: 13800, estOneRM: 110, exerciseCount: 5, setCount: 20 },
    { weekStartDate: "2025-03-24", totalVolume: 14200, estOneRM: 112, exerciseCount: 4, setCount: 21 },
    { weekStartDate: "2025-03-17", totalVolume: 13500, estOneRM: 108, exerciseCount: 4, setCount: 19 },
    { weekStartDate: "2025-03-10", totalVolume: 13000, estOneRM: 105, exerciseCount: 3, setCount: 18 },
    { weekStartDate: "2025-03-03", totalVolume: 12800, estOneRM: 102, exerciseCount: 4, setCount: 17 },
    { weekStartDate: "2025-02-24", totalVolume: 12500, estOneRM: 100, exerciseCount: 3, setCount: 16 },
    { weekStartDate: "2025-02-17", totalVolume: 12000, estOneRM: 98, exerciseCount: 3, setCount: 15 },
    { weekStartDate: "2025-02-10", totalVolume: 11800, estOneRM: 95, exerciseCount: 3, setCount: 14 },
    { weekStartDate: "2025-02-03", totalVolume: 11500, estOneRM: 92, exerciseCount: 3, setCount: 13 },
    { weekStartDate: "2025-01-27", totalVolume: 11000, estOneRM: 90, exerciseCount: 2, setCount: 12 },
  ];
}

// モックデータをサマリー形式で取得する関数
export function getMockWeeklyVolumeSummary(): WeeklyVolumeSummary {
  return {
    summaries: getMockWeeklyVolumes(),
  };
}

// モック統計データを生成する関数
export function getMockWeeklyVolumeStats(): WeeklyVolumeStats {
  return {
    avgWeeklyVolume: 12966.67,
    maxWeeklyVolume: 15000,
    minWeeklyVolume: 11000,
    maxEstOneRM: 120,
    avgExerciseCount: 3.58,
    avgSetCount: 17.67,
  };
}
