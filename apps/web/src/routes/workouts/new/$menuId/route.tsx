import { useLoaderData } from "react-router";
import { WorkoutForm } from "../components/workout-form";

import { action } from "./action";
import { loader } from "./loader";

export { loader, action };

// トレーニング記録画面コンポーネント
export default function WorkoutRecord() {
  const { menuId, menuName, exercises } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{menuName} の記録</h1>
      <WorkoutForm menuId={menuId} initialExercises={exercises} />
    </div>
  );
}
