import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import type { Exercise } from "ts-utils/src/api/types/exercises";

import type { ExerciseLastRecord, LastRecordData } from "ts-utils/src/api/types/menus";
import { apiFetch } from "~/lib/api-client";

import { getExercises, getLastRecords, getMenu } from "~/lib/api";
import type { MenuExerciseTemplate } from "../types";
import type { Route } from "./+types/route";
import { type MenuApiResponse, validateMenuApiResponse } from "./schema";

interface LoaderData {
  menuId: string;
  menuName: string;
  exercises: MenuExerciseTemplate[];
  lastRecords: ExerciseLastRecord[];
  allExercises: Exercise[];
}

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
    // メニュー詳細と前回の記録を並行して取得
    const [menuResponse, lastRecordsResponse, allExercisesResponse] = await Promise.all([
      getMenu(args, menuId),
      getLastRecords(args, menuId),
      getExercises(args),
    ]);

    // APIレスポンスをZodスキーマでバリデーション
    let menuData: MenuApiResponse;
    try {
      menuData = validateMenuApiResponse(menuResponse);
    } catch (error) {
      console.error("API response validation failed:", error);
      console.error("Received data:", menuResponse);

      return {
        menuId,
        menuName: "ワークアウト",
        exercises: [],
        lastRecords: [],
        allExercises: allExercisesResponse ?? [],
      };
    }

    // 前回の記録をマップ（exercise_idをキーに）
    const lastRecordsMap = new Map<string, LastRecordData | null>(
      lastRecordsResponse.map((record: ExerciseLastRecord) => [
        record.exercise_id,
        record.last_records?.[0] || null,
      ])
    );

    // APIレスポンスからExerciseTemplateの形式に変換
    const exercisesForMenu: MenuExerciseTemplate[] = menuData.items.map((item) => {
      // 前回の記録があれば重量を設定
      const lastRecord = lastRecordsMap.get(item.exercise_id);

      return {
        id: item.exercise_id,
        name: item.exercise_name || "不明な種目",
        targetSets: item.planned_sets || 3,
        targetReps: item.planned_reps || 10,
        targetWeight: lastRecord ? lastRecord.weight_kg : undefined,
      };
    });

    console.log("lastRecords", lastRecordsResponse);

    return {
      menuId,
      menuName: menuData.name || "ワークアウト",
      exercises: exercisesForMenu,
      lastRecords: lastRecordsResponse,
      allExercises: allExercisesResponse ?? [],
    };
  } catch (error) {
    console.error(`Error fetching menu ${menuId}:`, error);
    if (error instanceof Response) {
      throw error;
    }

    throw new Response("メニュー情報の取得中にエラーが発生しました", { status: 500 });
  }
}
