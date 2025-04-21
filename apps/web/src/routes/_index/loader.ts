import type { WeeklyVolume } from "./type";

export async function weeklyVolumeLoader() {
  const mockWeeklyVolumes: WeeklyVolume[] = [
    { weekStartDate: "2025-04-14", totalVolume: 15000 },
    { weekStartDate: "2025-04-07", totalVolume: 14500 },
    { weekStartDate: "2025-03-31", totalVolume: 13800 },
    { weekStartDate: "2025-03-24", totalVolume: 14200 },
  ];
  return { weeklyVolumes: mockWeeklyVolumes };
}
