import type { HeadersFunction } from "react-router";
import { FeatureCard } from "./components/feature-card";

export const headers: HeadersFunction = () => {
  return {
    "Cache-Control": "max-age=300, stale-while-revalidate=604800",
  };
};

export default function Component() {
  return (
    <div className="pt-4 px-4 space-y-4 max-w-screen-lg mx-auto pb-12">
      <h1 className="text-2xl font-bold">BulkTrack</h1>
      <p className="text-sm text-gray-500">
        筋トレ管理アプリケーション。自分のトレーニングを記録して、進捗を確認しましょう。
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <FeatureCard
          title="ワークアウト"
          description="筋トレやウェイトトレーニングのセッションを記録します。"
          links={[
            { to: "/workouts", label: "一覧を見る" },
            { to: "/workouts/new", label: "新規作成" },
          ]}
        />

        <FeatureCard
          title="トレーニングメニュー"
          description="頻繁に行うトレーニングパターンをメニューとして保存します。"
          links={[
            { to: "/menus", label: "一覧を見る" },
            { to: "/menus/new", label: "新規作成" },
          ]}
        />

        <FeatureCard
          title="ボリューム記録"
          description="部位ごとの週間トレーニング量を確認します。"
          links={[{ to: "/volume-log", label: "ボリューム記録を見る" }]}
        />
      </div>
    </div>
  );
}
