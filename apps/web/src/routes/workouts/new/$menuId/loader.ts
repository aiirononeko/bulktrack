import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import type { MenuExerciseTemplate } from "../type";

export async function loader({ params }: LoaderFunctionArgs) {
  const menuId = params.menuId;

  if (!menuId) {
    console.error("Loader ($menuId/loader.ts): menuId not found in params");
    return redirect("/workouts/new");
  }

  console.log("Loader ($menuId/loader.ts): Found menuId:", menuId, ", returning exercises.");

  if (menuId === "menu-free") {
    console.log("Loader ($menuId/loader.ts): Free workout selected, returning empty exercises.");
    return { menuId, exercises: [] };
  }

  // TODO: APIから選択されたメニューのエクササイズを取得
  let exercisesForMenu: MenuExerciseTemplate[] = [];
  if (menuId === "menu-1") {
    exercisesForMenu = [
      { id: "ex1", name: "ベンチプレス", targetSets: 3, targetReps: 5, targetWeight: 100 },
      { id: "ex2", name: "インクラインダンベルプレス", targetSets: 3, targetReps: 8 },
      { id: "ex3", name: "ケーブルクロスオーバー", targetSets: 3, targetReps: 12 },
    ];
  } else if (menuId === "menu-2") {
    exercisesForMenu = [
      { id: "ex4", name: "デッドリフト", targetSets: 1, targetReps: 5, targetWeight: 150 },
      { id: "ex5", name: "懸垂", targetSets: 3, targetReps: "AMRAP" },
      { id: "ex6", name: "ダンベルロウ", targetSets: 3, targetReps: 10 },
    ];
  } else {
    console.warn("Loader ($menuId/loader.ts): Unknown menuId, returning sample exercise.");
    exercisesForMenu = [{ id: "ex-other", name: "サンプル種目", targetSets: 3, targetReps: 10 }];
  }

  return { menuId, exercises: exercisesForMenu };
}
