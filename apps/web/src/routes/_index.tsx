import { Link } from "react-router";
import type { HeadersFunction } from "react-router";

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
        <div className="rounded-lg border p-4">
          <div className="p-4">
            <h2 className="text-xl font-bold">ワークアウト</h2>
            <p className="text-sm text-gray-500">
              筋トレやウェイトトレーニングのセッションを記録します。
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div>
                <Link
                  to="/workouts"
                  className="text-blue-600 hover:underline block"
                >
                  一覧を見る
                </Link>
              </div>
              <div>
                <Link
                  to="/workouts/new"
                  className="text-blue-600 hover:underline block"
                >
                  新規作成
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="p-4">
            <h2 className="text-xl font-bold">トレーニングメニュー</h2>
            <p className="text-sm text-gray-500">
              頻繁に行うトレーニングパターンをメニューとして保存します。
            </p>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              <div>
                <Link
                  to="/menus"
                  className="text-blue-600 hover:underline block"
                >
                  一覧を見る
                </Link>
              </div>
              <div>
                <Link
                  to="/menus/new"
                  className="text-blue-600 hover:underline block"
                >
                  新規作成
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="p-4">
            <h2 className="text-xl font-bold">ボリューム記録</h2>
            <p className="text-sm text-gray-500">
              部位ごとの週間トレーニング量を確認します。
            </p>
          </div>
          <div className="p-4">
            <Link
              to="/volume-log"
              className="text-blue-600 hover:underline block"
            >
              ボリューム記録を見る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 