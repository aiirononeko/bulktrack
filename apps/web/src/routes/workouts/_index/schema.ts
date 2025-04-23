import { z } from "zod";

import type { ID } from "~/lib/api";

// APIレスポンスの型定義
export const WorkoutApiSchema = z.object({
  id: z.string(),
  menu_id: z.string(),
  menu_name: z.string(),
  started_at: z.string(),
  note: z.string().optional(),
});

// APIレスポンスの型
export type WorkoutApiResponse = z.infer<typeof WorkoutApiSchema>;

// フロントエンド表示用に整形されたワークアウトの型
export interface FormattedWorkout {
  id: ID;
  title: string;
  date: string;
}

// APIレスポンスをフォーマットする関数
export function formatWorkoutsFromApi(workouts: WorkoutApiResponse[]): FormattedWorkout[] {
  return workouts.map((workout) => ({
    id: workout.id,
    title: workout.menu_name,
    date: new Date(workout.started_at).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  }));
}
