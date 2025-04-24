import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";

import type { ExerciseLastRecord, LastRecordData } from "ts-utils/src/api/types/menus";
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
    // メニュー詳細と前回の記録を並行して取得
    const [menuResponse, lastRecords] = await Promise.all([
      // APIからメニュー詳細を取得
      apiFetch(args, `/menus/${menuId}`).then(async (response) => {
        if (!response.ok) {
          console.error(`Failed to fetch menu: ${response.status} ${response.statusText}`);
          throw new Response("メニュー情報の取得に失敗しました", { status: response.status });
        }
        return response.json();
      }),
      // 前回のトレーニング記録を取得
      getLastRecords(args, menuId).catch((error: unknown) => {
        console.error(`Failed to fetch last records: ${error}`);
        // エラー時は空配列を返す（取得できなくても処理は継続）
        return [] as ExerciseLastRecord[];
      }),
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
      };
    }

    // 前回の記録をマップ（exercise_idをキーに）
    const lastRecordsMap = new Map<string, LastRecordData | null>(
      lastRecords.map((record: ExerciseLastRecord) => [
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

    console.log("lastRecords", lastRecords);

    return {
      menuId,
      menuName: menuData.name || "ワークアウト",
      exercises: exercisesForMenu,
      lastRecords, // 元の形式でも返す
    };
  } catch (error) {
    console.error(`Error fetching menu ${menuId}:`, error);
    if (error instanceof Response) {
      throw error;
    }

    throw new Response("メニュー情報の取得中にエラーが発生しました", { status: 500 });
  }
}

// APIから前回のトレーニング記録を取得する関数
async function getLastRecords(
  args: Route.LoaderArgs,
  menuId: string
): Promise<ExerciseLastRecord[]> {
  const response = await apiFetch(args, `/menus/${menuId}/exercises/last-records`);
  if (!response.ok) {
    throw new Error(`Failed to fetch last records: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
