import { z } from "zod";

// 週次ボリュームデータのスキーマ
export const WeeklyVolumeSchema = z.object({
  weekStartDate: z.string(),
  totalVolume: z.number().positive(),
});

// レスポンスデータ型
export type WeeklyVolume = z.infer<typeof WeeklyVolumeSchema>;

// モックデータを生成する関数
export function getMockWeeklyVolumes(): WeeklyVolume[] {
  return [
    { weekStartDate: "2025-04-14", totalVolume: 15000 },
    { weekStartDate: "2025-04-07", totalVolume: 14500 },
    { weekStartDate: "2025-03-31", totalVolume: 13800 },
    { weekStartDate: "2025-03-24", totalVolume: 14200 },
  ];
}
