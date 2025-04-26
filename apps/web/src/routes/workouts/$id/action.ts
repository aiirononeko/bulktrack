import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { APIError, apiFetch } from "~/lib/api-client";
import { WorkoutFormSchema } from "./schema"; // スキーマをインポート

type ActionArgs = {
  request: Request;
  params: { id: string }; // workoutId を params から取得
  context: any; // TODO: 正しい型に置き換える (Cloudflare context?)
};

export async function action(args: ActionArgs) {
  const { request, params, context } = args;
  const workoutId = params.id;

  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    // ログインページにリダイレクト (適切な URL に)
    return redirect(`/signin?redirect_url=${request.url}`);
  }

  // FormData から workout JSON を取得
  const formData = await request.formData();
  const workoutJson = formData.get("workout") as string | null;

  if (!workoutJson) {
    return { error: "フォームデータが見つかりません" };
  }

  let parsedData: any;
  try {
    parsedData = JSON.parse(workoutJson);
  } catch (e) {
    return { error: "フォームデータの形式が不正です" };
  }

  // Zod でバリデーション
  const validationResult = WorkoutFormSchema.safeParse(parsedData);
  if (!validationResult.success) {
    console.error("Form validation failed:", validationResult.error.flatten());
    return {
      validationErrors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { exercises } = validationResult.data;
  const apiCalls: Promise<Response>[] = [];
  let hasError = false;

  // 各セットに対して PATCH /sets/{setId} を呼び出す
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      const setId = set.set_id;
      const payload = {
        weight_kg: set.weight_kg,
        reps: set.reps,
        rir: set.rir,
        rpe: set.rpe,
      };

      // API呼び出し (エラーハンドリングは Promise.all の後で)
      const call = apiFetch(args, `/sets/${setId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      });
      apiCalls.push(call);
    }
  }

  try {
    const responses = await Promise.all(apiCalls);

    // 各レスポンスをチェック
    for (const response of responses) {
      if (!response.ok) {
        hasError = true;
        console.error(`Failed to update set: ${response.status} ${response.statusText}`);
        // 詳細なエラーメッセージを取得試行
        try {
          const errorBody = await response.json();
          console.error("Error body:", errorBody);
        } catch {}
      }
    }

    if (hasError) {
      return { error: "一部のセットの更新に失敗しました" };
    }

    // 成功したらワークアウト一覧ページにリダイレクト
    // TODO: 成功メッセージを表示するなど、より良いUXを検討
    return redirect("/workouts");
  } catch (error) {
    console.error("Error updating sets:", error);
    let errorMessage = "セットの更新中に予期せぬエラーが発生しました";
    if (error instanceof APIError) {
      errorMessage = error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}
