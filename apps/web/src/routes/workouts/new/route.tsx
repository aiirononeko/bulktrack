import { redirect, useLoaderData } from "react-router";
import { MenuSelector } from "./components/menu-selector";
import { WorkoutForm } from "./components/workout-form";
import { menuesLoader } from "./loader";
import type { SelectableMenu } from "./type";

export { menuesLoader as loader };

// フォーム送信アクション
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();

  // ここでデータを処理、保存
  console.log("新規ワークアウトデータ:", Object.fromEntries(formData));

  // 保存後は一覧ページにリダイレクト
  return redirect("/workouts");
}

export default function NewWorkout() {
  const { menus, selectedMenuId, exercises } = useLoaderData() as {
    menus: SelectableMenu[] | null;
    selectedMenuId: string | null;
    exercises?: any[]; // TODO: exercisesの型を定義
  };

  return (
    <div>
      {!selectedMenuId ? (
        <>
          <h1 className="text-2xl font-bold mb-6">トレーニングメニュー選択</h1>
          <p className="text-sm text-muted-foreground mb-4">
            開始するトレーニングメニューを選択してください。
          </p>
          <MenuSelector menus={menus || []} />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-6">新規ワークアウト</h1>
          <WorkoutForm />
        </>
      )}
    </div>
  );
}
