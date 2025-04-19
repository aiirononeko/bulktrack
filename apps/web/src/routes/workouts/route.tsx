import { Link } from "react-router";
import { WorkoutList } from "./components/workout-list";

export function meta() {
  return [
    { title: "トレーニング記録 - BulkTrack" },
    { name: "description", content: "トレーニングの記録を管理" },
  ];
}

// ローダー関数も必要に応じて追加できます
export async function loader() {
  // ワークアウトデータを取得する処理
  return {
    workouts: [], // サンプルデータ（実際はAPI等から取得）
  };
}

export default function Workouts() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">トレーニング記録</h1>
        <Link
          to="/workouts/new"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          新規作成
        </Link>
      </div>

      <WorkoutList />
    </div>
  );
}
