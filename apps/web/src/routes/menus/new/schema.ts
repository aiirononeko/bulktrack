import { z } from "zod";
import type { MenuCreateRequest } from "~/lib/api";

// フォーム入力の種目アイテムの型定義
export interface MenuItemInput {
  exercise_id: string;
  set_order: number;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_interval_seconds: number | null;
}

// フォーム入力の種目アイテムのスキーマ
const MenuItemSchema = z.object({
  exercise_id: z.string().min(1, "種目IDは必須です"),
  set_order: z.number().int().min(0, "順序は0以上の整数である必要があります"),
  planned_sets: z.number().int().nullable(),
  planned_reps: z.number().int().nullable(),
  planned_interval_seconds: z.number().int().nullable(),
});

// フォームから送信されるデータのスキーマ
export const MenuFormSchema = z.object({
  name: z.string().min(1, "メニュー名は必須です"),
  description: z.string().optional(),
  items: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return [] as MenuItemInput[];
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? (parsed as MenuItemInput[]) : ([] as MenuItemInput[]);
      } catch {
        throw new Error("メニュー項目のデータの形式が不正です");
      }
    }),
});

// バリデーション後のデータ型
export type MenuFormData = z.infer<typeof MenuFormSchema>;

// APIリクエストデータに変換する関数
export function toMenuCreateRequest(formData: MenuFormData): MenuCreateRequest {
  const { name, description, items } = formData;

  // 種目データをAPIの形式に変換
  const exercises = items.map((item: MenuItemInput) => ({
    exercise_id: item.exercise_id,
    position: item.set_order,
    sets: item.planned_sets || undefined,
    reps: item.planned_reps || undefined,
    rest_time: item.planned_interval_seconds || undefined,
  }));

  return {
    name,
    description,
    exercises: exercises.length > 0 ? exercises : undefined,
  };
}

// エラーメッセージの型
export type FormErrors = {
  name?: string[];
  description?: string[];
  items?: string[];
  _form?: string[];
};
