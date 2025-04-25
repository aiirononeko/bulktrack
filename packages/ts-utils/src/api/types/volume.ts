/**
 * 週間トレーニングボリュームのパラメータ
 */
export interface WeeklyVolumeParams {
  weeks?: number;
}

/**
 * 週間トレーニングボリュームのレスポンス
 */
export interface WeeklyVolume {
  weekStartDate: string;
  totalVolume: number;
  estOneRM: number;
  exerciseCount: number;
  setCount: number;
}

/**
 * 週間トレーニングボリュームのサマリーレスポンス
 */
export interface WeeklyVolumeSummaryResponse {
  summaries: WeeklyVolume[];
}

/**
 * 週間トレーニングボリュームの統計レスポンス
 */
export interface WeeklyVolumeStatsResponse {
  avgWeeklyVolume: number;
  maxWeeklyVolume: number;
  minWeeklyVolume: number;
  maxEstOneRM: number;
  avgExerciseCount: number;
  avgSetCount: number;
}