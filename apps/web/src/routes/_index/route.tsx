import { Link, useLoaderData } from "react-router";

import { VolumeDashboard } from "./components/volume-dashboard";
import { weeklyVolumeLoader } from "./loader";
import type { WeeklyVolume } from "./types";

export { weeklyVolumeLoader as loader };

export default function Component() {
  const { weeklyVolumes } = useLoaderData() as {
    weeklyVolumes: WeeklyVolume[];
  };

  return (
    <div className="pt-4 px-4 space-y-6 max-w-screen-lg mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">最近のトレーニング状況を確認しましょう。</p>
      </div>

      {/* VolumeDashboardコンポーネントを表示 */}
      <VolumeDashboard weeklyVolumes={weeklyVolumes} />

      {/* トレーニング開始とメニュー管理へのボタン風リンク */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/workouts/new" className="block">
          <button
            type="button"
            className="w-full h-auto p-4 text-center rounded-lg border bg-card text-card-foreground shadow-md hover:shadow-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="block text-lg font-semibold mb-1">トレーニング開始</span>
            <span className="block text-xs text-muted-foreground">
              新しいワークアウトセッションを開始します。
            </span>
          </button>
        </Link>
        <Link to="/menus" className="block">
          <button
            type="button"
            className="w-full h-auto p-4 text-center rounded-lg border bg-card text-card-foreground shadow-md hover:shadow-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="block text-lg font-semibold mb-1">メニュー管理</span>
            <span className="block text-xs text-muted-foreground">
              トレーニングメニューを作成・編集します。
            </span>
          </button>
        </Link>
      </div>
    </div>
  );
}
