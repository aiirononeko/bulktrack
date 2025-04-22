import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request, params, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const menuId = params.menuId;

  // FormDataからワークアウトデータを取得
  const workoutDataJson = formData.get("workout");

  if (!workoutDataJson || typeof workoutDataJson !== "string") {
    // エラーハンドリング
    return { error: "ワークアウトデータが見つかりません。" };
  }

  try {
    const workoutData = JSON.parse(workoutDataJson);
    console.log(`Saving workout data for menuId: ${menuId}`, workoutData);

    // Cloudflare環境変数からAPIのURLを取得
    const env = context.cloudflare.env;
    const baseUrl = env?.API_URL || "http://localhost:5555";
    const apiUrl = `${baseUrl}/workouts`;

    console.log(`Using API URL: ${apiUrl}`);

    // APIエンドポイントにPOSTリクエストを送信
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        menu_id: menuId, // APIの期待するキー名に合わせる
        exercises: workoutData.exercises.map(
          (exercise: {
            exerciseId: string;
            sets: Array<{ weight: string; reps: string; rir: string }>;
          }) => ({
            exercise_id: exercise.exerciseId,
            sets: exercise.sets.map((set: { weight: string; reps: string; rir: string }) => ({
              weight_kg: Number.parseFloat(set.weight) || 0,
              reps: Number.parseInt(set.reps, 10) || 0,
              rir: Number.parseInt(set.rir, 10) || null,
            })),
          })
        ),
        recorded_at: new Date().toISOString(), // 記録日時
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      return { error: errorData.message || "ワークアウトの保存に失敗しました。" };
    }

    // 成功時はワークアウト一覧ページへリダイレクト
    return redirect("/workouts");
  } catch (error) {
    console.error("Workout data parsing or saving error:", error);
    return { error: "データの処理中にエラーが発生しました。" };
  }
}
