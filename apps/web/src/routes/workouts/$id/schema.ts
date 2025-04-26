import { z } from "zod";

// 送信されるフォームデータの型スキーマ
export const SetDataSchema = z.object({
  set_id: z.string().uuid(),
  weight_kg: z.number(),
  reps: z.number(),
  rir: z.number().optional(),
  rpe: z.number().optional(),
});

export const ExerciseDataSchema = z.object({
  exercise_id: z.string(), // TODO: UUID であるべきか確認
  sets: z.array(SetDataSchema),
});

export const WorkoutFormSchema = z.object({
  menuId: z.string().uuid(),
  exercises: z.array(ExerciseDataSchema),
});
