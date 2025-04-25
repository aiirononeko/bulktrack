export type WeeklyVolume = {
  weekStartDate: string;
  totalVolume: number;
  estOneRM?: number;
  exerciseCount?: number;
  setCount?: number;
};

export type WeeklyVolumeSummary = {
  summaries: WeeklyVolume[];
};

export type WeeklyVolumeStats = {
  avgWeeklyVolume: number;
  maxWeeklyVolume: number;
  minWeeklyVolume: number;
  maxEstOneRM: number;
  avgExerciseCount: number;
  avgSetCount: number;
};

export type ChartPeriod = "12weeks" | "52weeks";
export type ChartType = "line" | "bar";

export type DashboardSettings = {
  period: ChartPeriod;
  chartType: ChartType;
};
