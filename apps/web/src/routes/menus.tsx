import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/menus";

export function meta() {
  return [
    { title: "トレーニングメニュー - BulkTrack" },
    { name: "description", content: "トレーニングメニューの管理" },
  ];
}

interface Menu {
  id: string;
  name: string;
  created_at: string;
  items: {
    id: string;
    exercise: string;
    set_order: number;
    planned_reps: number;
  }[];
}

export async function loader({ context }: Route.LoaderArgs) {
  try {
    // APIリクエスト
    const apiUrl = `${context.cloudflare.env.API_URL || "http://localhost:8080"}/menus`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error("メニューの取得に失敗しました");
    }
    
    const data = await response.json() as Menu[];
    return { menus: data, error: null };
  } catch (err) {
    console.error("Error fetching menus:", err);
    return { menus: [], error: "メニューの読み込み中にエラーが発生しました" };
  }
}

export default function Menus() {
  const { menus, error } = useLoaderData<{ menus: Menu[], error: string | null }>();
  const loading = false;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">トレーニングメニュー</h1>
        <Link
          to="/menus/new"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          新規メニュー作成
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p>読み込み中...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      ) : menus.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">トレーニングメニューがまだありません</p>
          <Link
            to="/menus/new"
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            最初のメニューを作成
          </Link>
        </div>
      ) : (
        <ul className="space-y-4 mt-4">
          {menus.map((menu: Menu) => (
            <li key={menu.id} className="border p-4 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold">{menu.name}</h2>
              <p className="text-gray-600">作成日: {new Date(menu.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })}</p>
              <h3 className="font-medium mt-2">メニュー項目:</h3>
              <ul className="list-disc pl-5 mt-1">
                {menu.items.map((item) => (
                  <li key={item.id}>
                    {item.exercise} - {item.set_order}セット × {item.planned_reps}回
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
