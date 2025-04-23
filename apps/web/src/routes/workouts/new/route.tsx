import { useLoaderData } from "react-router";

import { MenuSelector } from "./components/menu-selector";

import { loader } from "./loader";

export default function NewWorkoutSelectMenu() {
  const { menus } = useLoaderData<typeof loader>();

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

export { loader };
