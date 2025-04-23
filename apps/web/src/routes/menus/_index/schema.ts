import type { Menu } from "ts-utils";
import { z } from "zod";

// メニュー項目のAPIレスポンススキーマ
export const MenuItemApiSchema = z.object({
  id: z.string(),
  exercise_id: z.string().optional(),
  exercise_name: z.string().optional(),
  set_order: z.number().optional(),
  planned_sets: z.number().optional(),
  planned_reps: z.number().optional(),
  planned_interval_seconds: z.number().optional(),
});

// メニューのAPIレスポンススキーマ
export const MenuApiSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  created_at: z.string().optional(),
  user_id: z.string().optional(),
  items: z.array(MenuItemApiSchema).optional(),
});
//   .passthrough(); // 未知のプロパティも許容

// メニュー一覧のAPIレスポンススキーマ
export const MenuListApiSchema = z.array(MenuApiSchema);

// APIレスポンスの型定義
export type MenuApiResponse = z.infer<typeof MenuApiSchema>;
export type MenuItemApiResponse = z.infer<typeof MenuItemApiSchema>;
export type MenuListApiResponse = z.infer<typeof MenuListApiSchema>;

// より安全なAPIレスポンスバリデーション関数
export function validateMenuListApiResponse(data: unknown): MenuListApiResponse {
  // safeParseを使用してエラー処理を追加
  const result = MenuListApiSchema.safeParse(data);
  if (!result.success) {
    console.error("API response validation failed:", result.error);
    console.error("Received API data:", data);
    // 最低限必要なフィールドだけのエンプティオブジェクトを返す
    return [];
  }
  return result.data;
}

// APIレスポンスをフロントエンド表示用に整形する関数
export function formatMenusFromApi(menus: MenuApiResponse[]): Menu[] {
  return menus.map(
    (menu) =>
      ({
        id: menu.id,
        name: menu.name,
        description: menu.description || "",
        createdAt: menu.created_at
          ? new Date(menu.created_at).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : new Date().toLocaleDateString("ja-JP"),
        exerciseCount: menu.items?.length || 0,
        user_id: menu.user_id || "",
      }) as unknown as Menu
  );
}
