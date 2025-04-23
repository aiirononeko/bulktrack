import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import { apiFetch } from "~/lib/api-client";

import type { MenuExerciseTemplate } from "../types";
import type { Route } from "./+types/route";
import { type MenuApiResponse, validateMenuApiResponse } from "./schema";

export async function loader(args: Route.LoaderArgs) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  const menuId = args.params.menuId;
  if (!menuId) {
    console.error("Loader ($menuId/loader.ts): menuId not found in params");
    return redirect("/workouts/new");
  }

  try {
    // APIからメニュー詳細を取得
    const response = await apiFetch(args, `/menus/${menuId}`);
    if (!response.ok) {
      console.error(`Failed to fetch menu: ${response.status} ${response.statusText}`);
      throw new Response("メニュー情報の取得に失敗しました", { status: response.status });
    }

    // APIレスポンスをZodスキーマでバリデーション
    const rawData = await response.json();
    let menuData: MenuApiResponse;

    try {
      menuData = validateMenuApiResponse(rawData);
    } catch (error) {
      console.error("API response validation failed:", error);
      console.error("Received data:", rawData);

      return {
        menuId,
        menuName: "ワークアウト",
        exercises: [],
      };
    }

    // APIレスポンスからExerciseTemplateの形式に変換
    const exercisesForMenu: MenuExerciseTemplate[] = menuData.items.map((item) => ({
      id: item.exercise_id,
      name: item.exercise_name || "不明な種目",
      targetSets: item.planned_sets || 3,
      targetReps: item.planned_reps || 10,
      targetWeight: undefined, // APIレスポンスには重量情報がないため
    }));

    return {
      menuId,
      menuName: menuData.name || "ワークアウト",
      exercises: exercisesForMenu,
    };
  } catch (error) {
    console.error(`Error fetching menu ${menuId}:`, error);
    if (error instanceof Response) {
      throw error;
    }

    throw new Response("メニュー情報の取得中にエラーが発生しました", { status: 500 });
  }
}
