import { useLoaderData } from "react-router";

import { MenuSelector } from "./components/menu-selector";
import type { SelectableMenu } from "./type";

export { loader } from "./loader";

export default function NewWorkoutSelectMenu() {
  const { menus } = useLoaderData() as { menus: SelectableMenu[] };

  // 条件分岐は不要になり、常にMenuSelectorを表示
  console.log("Route (route.tsx): Rendering MenuSelector with menus from API:", menus);
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
