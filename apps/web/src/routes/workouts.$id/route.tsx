import { useLoaderData, useParams } from "react-router";
import { WorkoutDetail } from "./components/workout-detail";

// 型定義をインポートまたは定義
type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
};

type Workout = {
  id: string;
  title: string;
  date: string;
  exercises: Exercise[];
};

export function meta({ params }: { params: { id: string } }) {
  return [
    { title: `ワークアウト #${params.id} - BulkTrack` },
    { name: "description", content: "ワークアウト詳細" },
  ];
}

// データローダー
export async function loader({ params }: { params: { id: string } }) {
  // ワークアウト詳細データを取得
  return {
    workout: {
      id: params.id,
      title: `サンプルワークアウト ${params.id}`,
      date: new Date().toLocaleDateString(),
      exercises: [],
    } as Workout,
  };
}

export default function Component() {
  const { workout } = useLoaderData() as { workout: Workout };

  return <WorkoutDetail workout={workout} />;
}
