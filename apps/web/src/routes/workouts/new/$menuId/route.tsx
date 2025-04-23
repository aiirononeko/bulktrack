import { useLoaderData } from "react-router";

import type { ExerciseLastRecord } from "ts-utils/src/api/types/menus";

import { WorkoutForm } from "../components/workout-form";
import type { MenuExerciseTemplate } from "../types";

import { action } from "./action";
import { loader } from "./loader";

// ワークアウト作成ページの型定義
interface LoaderData {
  menuId: string;
  menuName: string;
  exercises: MenuExerciseTemplate[];
  lastRecords: ExerciseLastRecord[];
}

export default function WorkoutNewRoute() {
  const { menuId, menuName, exercises, lastRecords } = useLoaderData() as LoaderData;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{menuName}</h1>

      <WorkoutForm menuId={menuId} initialExercises={exercises} lastRecords={lastRecords} />
    </div>
  );
}

export { loader, action };
