import { Link } from "react-router";

export function meta() {
  return [
    { title: "BulkTrack - トレーニング管理アプリ" },
    { name: "description", content: "筋トレの記録、分析、管理を簡単に。" },
  ];
}

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">BulkTrack</h1>
        <p className="mb-6 text-xl text-gray-600">
          筋トレの記録、分析、管理を簡単に。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FeatureCard
          title="トレーニング記録"
          description="ワークアウトを記録して、セット、重量、レップ数を追跡します"
          link="/workouts"
          linkText="トレーニングを記録"
        />
        <FeatureCard
          title="ボリュームログ"
          description="トレーニングボリュームを追跡して進捗を確認"
          link="/volume-log"
          linkText="ログを確認"
        />
        <FeatureCard
          title="メニュー管理"
          description="トレーニングメニューを作成、編集、管理"
          link="/menus"
          linkText="メニューを管理"
        />
      </div>

      <div className="mt-12 text-center">
        <Link
          to="/menus/new"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          メニューを作成
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  link,
  linkText,
}: {
  title: string;
  description: string;
  link: string;
  linkText: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <p className="mb-4 text-gray-600">{description}</p>
      <Link
        to={link}
        className="text-blue-600 hover:text-blue-800 hover:underline"
      >
        {linkText} →
      </Link>
    </div>
  );
}
