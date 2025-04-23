import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import { z } from "zod";

import { APIError, apiFetch } from "~/lib/api-client";
import type { Route } from "./+types/route";
import { WorkoutApiSchema, formatWorkoutsFromApi } from "./schema";

export async function loader(args: Route.LoaderArgs) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  try {
    // APIからワークアウト一覧を取得
    const response = await apiFetch(args, "/workouts");

    if (!response.ok) {
      console.error(`Failed to fetch workouts: ${response.status} ${response.statusText}`);

      // APIからのエラーレスポンスを確認
      try {
        const errorBody = await response.json();
        console.error("Error details:", errorBody);
      } catch (e) {
        // JSONパース失敗
      }

      throw new APIError("ワークアウト一覧の取得に失敗しました");
    }

    // APIレスポンスを取得して検証
    const data = await response.json();
    const workoutsResult = z.array(WorkoutApiSchema).safeParse(data);

    if (!workoutsResult.success) {
      console.error("API response validation failed:", workoutsResult.error);
      throw new APIError("APIレスポンスの形式が正しくありません");
    }

    // フォーマット済みのワークアウト一覧を返す
    const formattedWorkouts = formatWorkoutsFromApi(workoutsResult.data);
    return { workouts: formattedWorkouts };
  } catch (error) {
    console.error("Error fetching workouts:", error);

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError("ワークアウト一覧の取得中にエラーが発生しました");
  }
}
