import { z } from "zod";

import type { ID, MenuUpdateRequest } from "~/lib/api";

// APIから取得するメニュー項目の型
export interface MenuItemFromApi {
  exercise_id: string;
  sets: number;
  reps: number;
  exercise_name?: string;
  exercise_description?: string;
}

// APIレスポンスの型
export interface MenuDetailApiResponse {
  id: ID;
  name: string;
  description?: string;
  items?: MenuItemFromApi[];
}

// フォーマット済みのメニュー型
export interface FormattedMenu {
  id: ID;
  name: string;
  description: string;
  items: {
    id: string;
    sets: number;
    reps: number;
    name: string;
    description: string;
  }[];
}

// APIレスポンスをフォーマットする関数
export function formatMenuFromApi(menu: MenuDetailApiResponse): FormattedMenu {
  return {
    id: menu.id,
    name: menu.name,
    description: menu.description || "",
    items:
      menu.items?.map((item) => ({
        id: item.exercise_id,
        sets: item.sets,
        reps: item.reps,
        name: item.exercise_name || "(不明な種目)",
        description: item.exercise_description || "",
      })) || [],
  };
}

// フォーム入力の種目アイテムの型定義 (メニュー作成からコピー)
export interface MenuItemInput {
  exercise_id: string;
  set_order: number;
  planned_sets: number | null;
  planned_reps: number | null;
  planned_interval_seconds: number | null;
}

// メニュー更新フォームのスキーマ
export const MenuUpdateSchema = z.object({
  name: z.string().min(1, "メニュー名は必須です"),
  description: z.string().optional(),
  items: z
    .string() // フォームからはJSON文字列として送られてくる想定
    .optional()
    .transform((val) => {
      if (!val) return [] as MenuItemInput[];
      try {
        const parsed = JSON.parse(val);
        // TODO: ここで MenuItemInput のスキーマを使ったバリデーションを追加するとより堅牢
        return Array.isArray(parsed) ? (parsed as MenuItemInput[]) : ([] as MenuItemInput[]);
      } catch {
        throw new Error("メニュー項目のデータの形式が不正です");
      }
    }),
});

// バリデーション後のデータ型
export type MenuUpdateData = z.infer<typeof MenuUpdateSchema>;

// APIリクエストデータに変換する関数 (メニュー作成からコピー&修正)
export function toMenuUpdateRequest(formData: MenuUpdateData): MenuUpdateRequest {
  const { name, description, items } = formData;

  // 種目データをAPIの形式に変換
  const mappedItems = items.map((item: MenuItemInput) => ({
    exercise_id: item.exercise_id,
    set_order: item.set_order,
    planned_sets: item.planned_sets ?? undefined,
    planned_reps: item.planned_reps ?? undefined,
    planned_interval_seconds: item.planned_interval_seconds ?? undefined,
  }));

  return {
    name,
    description: description || undefined,
    items: mappedItems.length > 0 ? mappedItems : [],
  };
}

// エラーメッセージの型
export type FormErrors = {
  name?: string[];
  description?: string[];
  items?: string[];
  _form?: string[];
};
