import { useLoaderData } from "react-router";
import { MenuSelector } from "./components/menu-selector";
import type { SelectableMenu } from "./type";

// ローダーをこのファイル内に定義
export async function loader() {
  // menuId は不要になったので削除
  console.log("Loader (route.tsx): Fetching menu list.");
  // モックデータやAPIからメニュー一覧を取得
  const mockMenus: SelectableMenu[] = [
    { id: "menu-1", name: "胸と三頭筋の日", description: "ベンチプレス中心のプッシュ系メニュー" },
    { id: "menu-2", name: "背中と二頭筋の日", description: "デッドリフトとプル系種目" },
    { id: "menu-3", name: "脚の日", description: "スクワットとレッグプレスメイン" },
    { id: "menu-free", name: "フリーワークアウト", description: "メニューを使わずに開始" },
  ];
  return { menus: mockMenus }; // menus のみを返す
}

// アクションは記録画面に移動させるので削除 (必要なら後で $menuId.tsx に追加)
// export async function action({ request }: { request: Request }) { ... }

export default function NewWorkoutSelectMenu() {
  // コンポーネント名を変更
  const { menus } = useLoaderData() as { menus: SelectableMenu[] };

  // 条件分岐は不要になり、常にMenuSelectorを表示
  console.log("Route (route.tsx): Rendering MenuSelector with menus:", menus);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">トレーニングメニュー選択</h1>
      <p className="text-sm text-muted-foreground mb-4">
        開始するトレーニングメニューを選択してください。
      </p>
      <MenuSelector menus={menus} />
    </div>
  );
}
