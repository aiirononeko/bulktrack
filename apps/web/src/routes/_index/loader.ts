import { getAuth } from "@clerk/react-router/ssr.server";
import { redirect } from "react-router";
import { getWeeklyVolumeStats, getWeeklyVolumes } from "~/lib/api";
import type { Route } from "./+types/route";
import {
  DEFAULT_DASHBOARD_SETTINGS,
  getMockWeeklyVolumeStats,
  getMockWeeklyVolumes,
} from "./schema";
import { WeeklyVolumeSchema, WeeklyVolumeStatsSchema, WeeklyVolumeSummarySchema } from "./schema";
import type { DashboardSettings, WeeklyVolume, WeeklyVolumeStats } from "./types";

export async function loader(args: Route.LoaderArgs) {
  // 認証チェック
  const { userId } = await getAuth(args);
  if (!userId) {
    return redirect(`/signin?redirect_url=${args.request.url}`);
  }

  // URLからクエリパラメータを取得していた部分をコメントアウト
  // const url = new URL(args.request.url);
  // const period = (url.searchParams.get("period") as "12weeks" | "52weeks") || "12weeks";
  // const chartType = (url.searchParams.get("chartType") as "line" | "bar") || "line";

  // 固定値を設定
  const period: "12weeks" | "52weeks" = "12weeks";
  const chartType: "line" | "bar" = "bar";

  // ダッシュボード設定
  const settings: DashboardSettings = {
    period,
    chartType,
  };

  // 週数を決定
  const weeksCount = period === "12weeks" ? 12 : 52;

  try {
    // APIから週間ボリュームデータを取得
    const volumeData = await getWeeklyVolumes(args, { weeks: weeksCount });

    // スキーマでバリデーション
    const validatedData = WeeklyVolumeSummarySchema.parse(volumeData);

    // 統計データを取得
    let stats: WeeklyVolumeStats;

    try {
      stats = await getWeeklyVolumeStats(args);
    } catch (statsError) {
      console.warn("Failed to fetch weekly volume stats:", statsError);
      // モックの統計データを使用
      stats = getMockWeeklyVolumeStats();
    }

    // オフライン用にデータをキャッシュ
    if (typeof window !== "undefined" && "localStorage" in window) {
      try {
        localStorage.setItem("weeklyVolumes", JSON.stringify(validatedData.summaries));
        localStorage.setItem("weeklyVolumeStats", JSON.stringify(stats));
        localStorage.setItem("weeklyVolumesLastUpdated", new Date().toISOString());
      } catch (e) {
        console.warn("Failed to cache weekly volumes in localStorage:", e);
      }
    }

    return {
      weeklyVolumes: validatedData.summaries,
      stats,
      settings,
      isOffline: false,
    };
  } catch (error) {
    console.error("Error loading weekly volumes:", error);

    // オフラインモードの処理
    let cachedVolumes: WeeklyVolume[] = [];
    let cachedStats: WeeklyVolumeStats | null = null;
    let isOffline = false;

    if (typeof window !== "undefined" && "localStorage" in window) {
      try {
        const cachedVolumesStr = localStorage.getItem("weeklyVolumes");
        const cachedStatsStr = localStorage.getItem("weeklyVolumeStats");

        if (cachedVolumesStr) {
          cachedVolumes = JSON.parse(cachedVolumesStr);
          isOffline = true;
        }

        if (cachedStatsStr) {
          cachedStats = JSON.parse(cachedStatsStr);
        }
      } catch (e) {
        console.warn("Failed to retrieve cached weekly volumes from localStorage:", e);
      }
    }

    // キャッシュがない場合はモックデータを使用
    if (cachedVolumes.length === 0) {
      cachedVolumes = getMockWeeklyVolumes();
    }

    if (!cachedStats) {
      cachedStats = getMockWeeklyVolumeStats();
    }

    return {
      weeklyVolumes: cachedVolumes,
      stats: cachedStats,
      settings,
      isOffline,
    };
  }
}
