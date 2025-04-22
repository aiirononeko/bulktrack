import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { apiFetch } from "~/lib/api-client";
import type { Route } from "./+types/route";
import type { WorkoutApiResponse } from "./types";

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  try {
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

      // エラー時は空の配列を返す
      return { workouts: [] };
    }

    // APIレスポンスを取得
    const workouts = (await response.json()) as WorkoutApiResponse[];
    console.log("Successfully fetched workouts:", workouts);

    // クライアント側で日付のフォーマットを調整
    const formattedWorkouts = workouts.map((workout) => ({
      id: workout.id,
      title: workout.menu_name,
      date: new Date(workout.started_at).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }));

    return { workouts: formattedWorkouts };
  } catch (error) {
    console.error("Error fetching workouts:", error);
    return { workouts: [] };
  }
}
