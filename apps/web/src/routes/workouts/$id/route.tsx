import { getAuth } from "@clerk/react-router/ssr.server";
import { useLoaderData, useParams } from "react-router";
import { redirect } from "react-router";
import { z } from "zod";
import { APIError, apiFetch } from "~/lib/api-client";
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

// バックエンドAPIのレスポンス型定義
const SetSchema = z.object({
  id: z.string().uuid(),
  exercise_name: z.string(),
  set_order: z.number(),
  weight_kg: z.number(),
  reps: z.number(),
  rir: z.number().nullable(),
  rpe: z.number().nullable(),
});

const WorkoutApiSchema = z.object({
  id: z.string().uuid(),
  menu_id: z.string().uuid(),
  menu_name: z.string(),
  started_at: z.string(),
  note: z.string().optional(),
  sets: z.array(SetSchema),
});

// データローダー
export async function loader(args: { params: { id: string }; request: Request; context: any }) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const { id } = args.params;

  try {
    // APIからワークアウト詳細を取得
    const response = await apiFetch(args, `/workouts/${id}`);

    if (!response.ok) {
      console.error(`Failed to fetch workout details: ${response.status} ${response.statusText}`);
      throw new APIError("ワークアウト詳細の取得に失敗しました");
    }

    // APIレスポンスを取得して検証
    const data = await response.json();
    const workoutResult = WorkoutApiSchema.safeParse(data);

    if (!workoutResult.success) {
      console.error("API response validation failed:", workoutResult.error);
      throw new APIError("APIレスポンスの形式が正しくありません");
    }

    const apiWorkout = workoutResult.data;

    // バックエンドからのデータをフロントエンドの期待する形式に変換
    // sets配列からexercisesを作成（種目ごとにグループ化）
    const exerciseMap = new Map<string, Exercise>();

    for (const set of apiWorkout.sets) {
      const exerciseName = set.exercise_name;

      if (!exerciseMap.has(exerciseName)) {
        exerciseMap.set(exerciseName, {
          id: set.id, // 最初のセットのIDを種目IDとして使用
          name: exerciseName,
          sets: 0,
          reps: 0,
          weight: 0,
        });
      }

      const exercise = exerciseMap.get(exerciseName)!;
      exercise.sets += 1;
      exercise.reps = set.reps; // 最後のセットのレップ数を使用
      exercise.weight = set.weight_kg; // 最後のセットの重量を使用
    }

    // Map から配列に変換
    const exercises = Array.from(exerciseMap.values());

    return {
      workout: {
        id: apiWorkout.id,
        title: apiWorkout.menu_name,
        date: new Date(apiWorkout.started_at).toLocaleDateString(),
        exercises: exercises,
      } as Workout,
    };
  } catch (error) {
    console.error("Error fetching workout details:", error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError("ワークアウト詳細の取得中にエラーが発生しました");
  }
}

export default function Component() {
  const { workout } = useLoaderData() as { workout: Workout };

  return (
    <div>
      <WorkoutDetail workout={workout} />
    </div>
  );
}
