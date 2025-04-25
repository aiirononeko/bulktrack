import { type ApiClientContext, apiGet } from "../client";
import type {
  WeeklyVolumeParams,
  WeeklyVolumeStatsResponse,
  WeeklyVolumeSummaryResponse,
} from "../types/volume";

const BASE_PATH = "/v1/weekly-volume";

/**
 * 週間トレーニングボリューム一覧を取得
 */
export async function getWeeklyVolumes(
  args: ApiClientContext,
  params?: WeeklyVolumeParams
): Promise<WeeklyVolumeSummaryResponse> {
  const response = await apiGet<{
    summaries: Array<{
      week: string;
      total_volume: number;
      est_1rm: number;
      exercise_count: number;
      set_count: number;
    }>;
  }>(args, BASE_PATH, params as Record<string, any>);

  // バックエンドのレスポンスをフロントエンドの期待する形式に変換
  return {
    summaries: response.summaries.map((item) => ({
      weekStartDate: item.week,
      totalVolume: item.total_volume,
      estOneRM: item.est_1rm,
      exerciseCount: item.exercise_count,
      setCount: item.set_count,
    })),
  };
}

/**
 * 週間トレーニングボリューム統計を取得
 */
export async function getWeeklyVolumeStats(
  args: ApiClientContext,
  startDate?: string,
  endDate?: string
): Promise<WeeklyVolumeStatsResponse> {
  const params: Record<string, string> = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const response = await apiGet<{
    avg_weekly_volume: number;
    max_weekly_volume: number;
    min_weekly_volume: number;
    max_est_1rm: number;
    avg_exercise_count: number;
    avg_set_count: number;
  }>(args, `${BASE_PATH}/stats`, params);

  // バックエンドのレスポンスをフロントエンドの期待する形式に変換
  return {
    avgWeeklyVolume: response.avg_weekly_volume,
    maxWeeklyVolume: response.max_weekly_volume,
    minWeeklyVolume: response.min_weekly_volume,
    maxEstOneRM: response.max_est_1rm,
    avgExerciseCount: response.avg_exercise_count,
    avgSetCount: response.avg_set_count,
  };
}

/**
 * 特定の週の週間トレーニングボリュームを取得
 */
export async function getWeeklyVolumeForWeek(
  args: ApiClientContext,
  weekDate: string
): Promise<{
  weekStartDate: string;
  totalVolume: number;
  estOneRM: number;
  exerciseCount: number;
  setCount: number;
}> {
  const response = await apiGet<{
    week: string;
    total_volume: number;
    est_1rm: number;
    exercise_count: number;
    set_count: number;
  }>(args, `${BASE_PATH}/${encodeURIComponent(weekDate)}`);

  // バックエンドのレスポンスをフロントエンドの期待する形式に変換
  return {
    weekStartDate: response.week,
    totalVolume: response.total_volume,
    estOneRM: response.est_1rm,
    exerciseCount: response.exercise_count,
    setCount: response.set_count,
  };
}
