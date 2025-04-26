import { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { VolumeDashboard } from "./components/volume-dashboard";

import { loader } from "./loader";

export default function Component() {
  const { weeklyVolumes, stats, settings, isOffline } = useLoaderData<typeof loader>();

  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  // ネットワーク状態の監視
  useEffect(() => {
    const handleOnline = () => {
      // オンラインに戻ったらページを再読み込み
      navigate(".", { replace: true });
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [navigate]);

  // エラーハンドリング
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setError(new Error(e.message));
    };

    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div className="pt-4 px-4 space-y-6 max-w-screen-lg mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-muted-foreground">最近のトレーニング状況を確認しましょう。</p>
      </div>

      {/* VolumeDashboardコンポーネントを表示 */}
      <VolumeDashboard
        weeklyVolumes={weeklyVolumes}
        stats={stats}
        settings={settings}
        isOffline={isOffline}
        error={error}
      />
    </div>
  );
}

export { loader };
