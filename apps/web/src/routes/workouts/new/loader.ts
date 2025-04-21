import type { SelectableMenu } from "./type";

export async function menuesLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const menuId = url.searchParams.get("menuId");

  if (!menuId) {
    // menuIdがない場合はメニュー一覧を返す
    const mockMenus: SelectableMenu[] = [
      { id: "menu-1", name: "胸と三頭筋の日", description: "ベンチプレス中心のプッシュ系メニュー" },
      { id: "menu-2", name: "背中と二頭筋の日", description: "デッドリフトとプル系種目" },
      { id: "menu-3", name: "脚の日", description: "スクワットとレッグプレスメイン" },
      { id: "menu-free", name: "フリーワークアウト", description: "メニューを使わずに開始" },
    ];
    return { menus: mockMenus, selectedMenuId: null };
  }

  // menuIdがある場合は、そのメニューに基づいたエクササイズリスト等を返す（今はモック）
  const exercisesForMenu = [
    { id: "ex1", name: "ベンチプレス", sets: 3, reps: 5, weight: 100 },
    // ... menuIdに応じたエクササイズ
  ];
  return { menus: null, selectedMenuId: menuId, exercises: exercisesForMenu };
}
