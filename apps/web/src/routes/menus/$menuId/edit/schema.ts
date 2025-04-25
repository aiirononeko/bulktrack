import { z } from "zod";

import type { ID } from "~/lib/api";

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
  exercises: {
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
    exercises:
      menu.items?.map((item) => ({
        id: item.exercise_id,
        sets: item.sets,
        reps: item.reps,
        name: item.exercise_name || "(不明な種目)",
        description: item.exercise_description || "",
      })) || [],
  };
}

// メニュー更新フォームのスキーマ
export const MenuUpdateSchema = z.object({
  name: z.string().min(1, "メニュー名は必須です"),
  description: z.string().optional(),
});

// バリデーション後のデータ型
export type MenuUpdateData = z.infer<typeof MenuUpdateSchema>;

// エラーメッセージの型
export type FormErrors = {
  name?: string[];
  description?: string[];
  _form?: string[];
};
