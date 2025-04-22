import type { LoaderFunctionArgs } from "react-router";

import type { WorkoutApiResponse } from "./types";

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    const baseUrl = env?.API_URL || "http://localhost:5555";
    const apiUrl = `${baseUrl}/workouts`;

    console.log(`Fetching workouts from: ${apiUrl}`);

    const response = await fetch(apiUrl);

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
