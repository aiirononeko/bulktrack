import { useLoaderData } from "react-router";
import { WorkoutForm } from "../components/workout-form";
import type { MenuExerciseTemplate } from "../types";

import { action } from "./action";
import { loader } from "./loader";

export { loader, action };

// トレーニング記録画面コンポーネント
export default function WorkoutRecord() {
  const { menuId, exercises } = useLoaderData() as {
    menuId: string;
    exercises: MenuExerciseTemplate[];
  };

  console.log(
    "Route ($menuId/route.tsx): Rendering WorkoutForm with menuId:",
    menuId,
    "and exercises:",
    exercises
  );

  const title = menuId === "menu-free" ? "フリーワークアウト記録" : "ワークアウト記録";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      <WorkoutForm menuId={menuId} initialExercises={exercises} />
    </div>
  );
}
