import { useLoaderData, useNavigate, redirect, Form, useActionData, useNavigation } from "react-router";
import { useState } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export function meta() {
  return [
    { title: "トレーニング記録 - BulkTrack" },
    { name: "description", content: "トレーニングを記録する" },
  ];
}

interface Workout {
  id: string;
  menu_id: string;
  menu_name: string;
  started_at: string;
  note?: string;
  sets: Array<{
    id: string;
    exercise: string;
    set_order: number;
    weight_kg: number;
    reps: number;
    rpe?: number;
  }>;
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { id } = params;
  
  if (!id) {
    return redirect("/workouts");
  }
  
  try {
    // ワークアウト情報取得
    const apiUrl = `${context.cloudflare.env.API_URL || "http://localhost:8080"}/workouts/${id}`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error("ワークアウトの取得に失敗しました");
    }
    
    const workout = await response.json() as Workout;
    return { workout, error: null };
  } catch (err) {
    console.error("Error fetching workout:", err);
    return { workout: null, error: "ワークアウトの読み込み中にエラーが発生しました" };
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get("_action") as string;
  const url = new URL(request.url);
  const currentPath = url.pathname;
  
  if (action === "update_set") {
    const setId = formData.get("setId") as string;
    const weightKg = Number.parseFloat(formData.get("weightKg") as string);
    const reps = Number.parseInt(formData.get("reps") as string, 10);
    const rpe = Number.parseFloat(formData.get("rpe") as string || "0");
    
    try {
      // セット更新API呼び出し
      const apiUrl = `${context.cloudflare.env.API_URL || "http://localhost:8080"}/sets/${setId}`;
      const response = await fetch(apiUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight_kg: weightKg,
          reps: reps,
          rpe: rpe || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error("セットの更新に失敗しました");
      }
      
      // ページをリロードして最新データを表示
      return redirect(currentPath);
    } catch (err) {
      console.error("Error updating set:", err);
      return { success: false, error: "セットの更新中にエラーが発生しました" };
    }
  }
  
  return { success: false, error: "不明なアクション" };
}

export default function WorkoutDetail() {
  const { workout, error } = useLoaderData<{ workout: Workout | null, error: string | null }>();
  const actionData = useActionData<{ success?: boolean, error?: string }>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  
  // フォームの送信状態を確認
  const isSubmitting = navigation.state === "submitting";
  
  if (!workout) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">トレーニング記録</h1>
        </div>
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate("/workouts")}
            className="rounded-lg bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700"
          >
            トレーニング一覧に戻る
          </button>
        </div>
      </div>
    );
  }
  
  const startDate = new Date(workout.started_at);
  
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">トレーニング記録</h1>
        <button
          type="button"
          onClick={() => navigate("/workouts")}
          className="rounded-lg bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700"
        >
          完了
        </button>
      </div>
      
      {actionData?.error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-200">
          {actionData.error}
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">{workout.menu_name}</h2>
          <span className="text-gray-600 dark:text-gray-300">
            {startDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })}
            {' '}
            {startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {workout.note && (
          <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
            <p className="text-gray-700 dark:text-gray-200">{workout.note}</p>
          </div>
        )}
        
        <h3 className="font-medium mb-3 mt-4 dark:text-white">エクササイズ</h3>
        
        <div className="space-y-6">
          {workout.sets.map((set) => (
            <div key={set.id} className="border-t dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium dark:text-white">{set.exercise}</h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">セット {set.set_order}</span>
              </div>
              
              {editingSetId === set.id ? (
                <Form method="post">
                  <input type="hidden" name="_action" value="update_set" />
                  <input type="hidden" name="setId" value={set.id} />
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor={`weight-${set.id}`} className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                        重量 (kg)
                      </label>
                      <input
                        id={`weight-${set.id}`}
                        name="weightKg"
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={set.weight_kg || ""}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor={`reps-${set.id}`} className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                        回数
                      </label>
                      <input
                        id={`reps-${set.id}`}
                        name="reps"
                        type="number"
                        min="0"
                        defaultValue={set.reps || ""}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor={`rpe-${set.id}`} className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                        RPE (任意)
                      </label>
                      <input
                        id={`rpe-${set.id}`}
                        name="rpe"
                        type="number"
                        step="0.5"
                        min="0"
                        max="10"
                        defaultValue={set.rpe || ""}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setEditingSetId(null)}
                      disabled={isSubmitting}
                      className="px-3 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? "保存中..." : "保存"}
                    </button>
                  </div>
                </Form>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 dark:text-gray-400">重量</span>
                      <span className="font-medium dark:text-white">{set.weight_kg} kg</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500 dark:text-gray-400">回数</span>
                      <span className="font-medium dark:text-white">{set.reps}</span>
                    </div>
                    {set.rpe && (
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500 dark:text-gray-400">RPE</span>
                        <span className="font-medium dark:text-white">{set.rpe}</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setEditingSetId(set.id)}
                    disabled={isSubmitting}
                    className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    編集
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 