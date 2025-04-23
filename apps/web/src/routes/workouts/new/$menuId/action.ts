import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { apiFetch } from "~/lib/api-client";

import type { Route } from "./+types/route";
import { WorkoutCreateSchema, convertFormDataToApiRequest } from "./schema";

export async function action(args: Route.ActionArgs) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const formData = await args.request.formData();
  const menuId = args.params.menuId;
  if (!menuId) {
    return { error: "メニューIDが指定されていません。" };
  }

  // FormDataからワークアウトデータを取得
  const workoutDataJson = formData.get("workout");
  if (!workoutDataJson || typeof workoutDataJson !== "string") {
    return { error: "ワークアウトデータが見つかりません。" };
  }

  try {
    // JSONをパース
    console.log("Raw workout data JSON:", workoutDataJson);
    const formWorkoutData = JSON.parse(workoutDataJson);
    console.log("Parsed form workout data:", formWorkoutData);

    // フォームデータをAPI用のリクエスト形式に変換
    const requestData = convertFormDataToApiRequest(formWorkoutData);
    console.log("Converted request data:", JSON.stringify(requestData, null, 2));

    // Zodスキーマでバリデーション
    const validationResult = WorkoutCreateSchema.safeParse(requestData);

    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error);
      return {
        error: "ワークアウトデータの検証に失敗しました。",
        validationErrors: validationResult.error.flatten(),
      };
    }

    console.log("Validated request data:", JSON.stringify(validationResult.data, null, 2));

    // APIエンドポイントにPOSTリクエストを送信
    const requestBody = JSON.stringify(validationResult.data);
    console.log("Request body being sent to API:", requestBody);

    const response = await apiFetch(args, "/workouts", {
      method: "POST",
      body: requestBody,
    });

    console.log("API response status:", response.status);
    console.log("API response status text:", response.statusText);

    if (!response.ok) {
      let errorMessage = "ワークアウトの保存に失敗しました。";
      try {
        const errorData = (await response.json()) as { message?: string };
        console.error("API error response:", errorData);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        console.error("Error parsing error response:", parseError);
        // レスポンスをテキストとして読み取ってログに出力
        try {
          const errorText = await response.text();
          console.error("Error response text:", errorText);
        } catch (textError) {
          console.error("Could not read error response as text:", textError);
        }
      }
      return { error: errorMessage };
    }

    // 成功レスポンスの内容をログに出力
    try {
      const responseClone = response.clone();
      const responseData = await responseClone.json();
      console.log("Successful API response data:", responseData);
    } catch (parseError) {
      console.error("Error parsing success response:", parseError);
    }

    // 成功時はワークアウト一覧ページへリダイレクト
    return redirect("/workouts");
  } catch (error) {
    console.error("Workout data parsing or saving error:", error);
    return { error: "データの処理中にエラーが発生しました。" };
  }
}
