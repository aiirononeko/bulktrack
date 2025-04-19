import { Link } from "react-router";

export function meta() {
  return [
    { title: "トレーニング記録 - BulkTrack" },
    { name: "description", content: "トレーニングの記録を管理" },
  ];
}

export default function Workouts() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">トレーニング記録</h1>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-4">
          トレーニングを開始するには、メニューを選択してください
        </p>
        <Link
          to="/menus"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          メニュー一覧へ
        </Link>
      </div>
    </div>
  );
}
