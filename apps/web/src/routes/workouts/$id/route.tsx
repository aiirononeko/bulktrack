import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect, useLoaderData, useNavigation } from "react-router";
import { z } from "zod";

import { APIError, apiFetch } from "~/lib/api-client";
import { WorkoutForm } from "../new/components/workout-form";
import type { RecordingExercise, WorkoutSetRecord } from "../new/types";

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
  rir: z.number(),
  rpe: z.number(),
});

const WorkoutApiSchema = z.object({
  id: z.string().uuid(),
  menu_id: z.string().uuid(),
  menu_name: z.string(),
  started_at: z.string(),
  note: z.string().optional(),
  sets: z.array(SetSchema),
});

export type WorkoutResponse = z.infer<typeof WorkoutApiSchema>;

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

    // 検証済みのデータをそのまま返す
    return { workout: workoutResult.data };
  } catch (error) {
    console.error("Error fetching workout details:", error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError("ワークアウト詳細の取得中にエラーが発生しました");
  }
}

export default function WorkoutEditRoute() {
  const { workout } = useLoaderData() as { workout: WorkoutResponse };
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // APIレスポンスの Sets (SetView[]) を WorkoutForm が期待する RecordingExercise[] に変換
  const exercises: RecordingExercise[] = [];
  const exerciseMap = new Map<string, RecordingExercise>();

  for (const set of workout.sets) {
    const exerciseName = set.exercise_name;
    if (!exerciseMap.has(exerciseName)) {
      // RecordingExercise に必要なプロパティをセット
      exerciseMap.set(exerciseName, {
        // id: set.id, // RecordingExercise には exercise_id は不要 (id はメニュー項目ID)
        id: exerciseName, // 仮: 種目名を ID として使用 (本来は Exercise Master ID などが必要)
        name: exerciseName,
        targetSets: 0, // DB から取得したセット数で後で上書き、または初期値
        targetReps: "", // 必要であれば設定
        sets: [],
      });
    }
    const exercise = exerciseMap.get(exerciseName)!;
    exercise.sets.push({
      id: set.id, // セットの UUID をセットのIDとして使う
      setNumber: set.set_order,
      weight: set.weight_kg,
      reps: set.reps,
      rir: set.rir,
      // rpe: set.rpe, // WorkoutSetRecord には RPE はない
      isCompleted: true, // 既存のセットは完了済みとする
    });
    // targetSets を更新 (最大セット数)
    exercise.targetSets = Math.max(exercise.targetSets, set.set_order);
  }

  // Mapから配列に変換し、セットをset_orderでソート
  for (const exercise of exerciseMap.values()) {
    // forEach を for...of に変更
    exercise.sets.sort((a: WorkoutSetRecord, b: WorkoutSetRecord) => a.setNumber - b.setNumber); // 型を追加
    exercises.push(exercise);
  }
  // 種目を元のセット順（最初のセットの set_order）でソート
  exercises.sort((a: RecordingExercise, b: RecordingExercise) => {
    // 型を追加
    const firstSetOrderA = a.sets.length > 0 ? a.sets[0].setNumber : Number.POSITIVE_INFINITY; // Infinity -> Number.POSITIVE_INFINITY
    const firstSetOrderB = b.sets.length > 0 ? b.sets[0].setNumber : Number.POSITIVE_INFINITY; // Infinity -> Number.POSITIVE_INFINITY
    return firstSetOrderA - firstSetOrderB;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{workout.menu_name} 編集</h1>

      <WorkoutForm
        menuId={workout.menu_id}
        workoutId={workout.id} // workoutId を渡す
        initialExercises={exercises}
        lastRecords={[]} // 編集画面では前回記録は使用しない
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

export { action } from "./action";
