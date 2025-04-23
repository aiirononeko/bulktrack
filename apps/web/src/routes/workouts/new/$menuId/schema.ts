import { z } from "zod";

// ワークアウトセットのスキーマ
export const WorkoutSetSchema = z.object({
  weight_kg: z.coerce.number().min(0, "重量は0以上で入力してください"),
  reps: z.coerce.number().int().min(1, "レップ数は1以上で入力してください"),
  rir: z.coerce.number().min(0).max(10).optional(),
  rpe: z.coerce.number().min(1).max(10).optional(),
});

// エクササイズのスキーマ
export const WorkoutExerciseSchema = z.object({
  exercise_id: z.string().min(1, "エクササイズIDは必須です"),
  sets: z.array(WorkoutSetSchema).min(1, "少なくとも1セットは入力してください"),
});

// ワークアウト作成リクエストのスキーマ
export const WorkoutCreateSchema = z.object({
  menu_id: z.string().min(1, "メニューIDは必須です"),
  exercises: z.array(WorkoutExerciseSchema).min(1, "少なくとも1つのエクササイズを入力してください"),
  note: z.string().optional(),
});

// 型定義
export type WorkoutSet = z.infer<typeof WorkoutSetSchema>;
export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>;
export type WorkoutCreateRequest = z.infer<typeof WorkoutCreateSchema>;

// フォームエラーの型
export interface FormErrors {
  form?: string;
  exercises?: Record<
    number,
    {
      sets?: Record<
        number,
        {
          weight_kg?: string[];
          reps?: string[];
          rir?: string[];
          rpe?: string[];
        }
      >;
    }
  >;
}

// フォーム入力データを変換する関数
export function convertFormDataToApiRequest(formData: any): WorkoutCreateRequest {
  return {
    menu_id: formData.menuId,
    exercises: formData.exercises.map((exercise: any) => ({
      // exercise_id または exerciseId のどちらでも対応
      exercise_id: exercise.exercise_id || exercise.exerciseId,
      sets: exercise.sets.map((set: any) => {
        const result: WorkoutSet = {
          // 直接 weight_kg または weight として送信された場合の対応
          weight_kg:
            set.weight_kg !== undefined
              ? Number(set.weight_kg)
              : set.weight !== undefined
                ? Number(set.weight)
                : 0,
          // 直接 reps として送信された場合の対応
          reps: Number(set.reps) || 0,
        };

        // RIRかRPEのどちらかを設定（直接送信された場合も対応）
        if (set.rir !== undefined && set.rir !== "") {
          result.rir = Number(set.rir);
        } else if (set.RIR !== undefined && set.RIR !== "") {
          result.rir = Number(set.RIR);
        } else if (set.rpe !== undefined && set.rpe !== "") {
          result.rpe = Number(set.rpe);
        } else if (set.RPE !== undefined && set.RPE !== "") {
          result.rpe = Number(set.RPE);
        }

        return result;
      }),
    })),
    note: formData.note || "",
  };
}

// APIレスポンスのZodスキーマ定義
export const MenuItemApiSchema = z.object({
  id: z.string(),
  exercise_id: z.string(),
  exercise_name: z.string(),
  set_order: z.number(),
  planned_sets: z.number().optional(),
  planned_reps: z.number().optional(),
  planned_interval_seconds: z.number().optional(),
});

export const MenuApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  created_at: z.string(),
  items: z.array(MenuItemApiSchema),
});

// APIレスポンスの型定義
export type MenuApiResponse = z.infer<typeof MenuApiSchema>;
export type MenuItemApiResponse = z.infer<typeof MenuItemApiSchema>;

// レスポンスのバリデーション関数
export function validateMenuApiResponse(data: unknown): MenuApiResponse {
  return MenuApiSchema.parse(data);
}
