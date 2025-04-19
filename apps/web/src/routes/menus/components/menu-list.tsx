import { Link } from "react-router";

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

type MenuListProps = {
  menus: Menu[];
  loading: boolean;
  error: string | null;
};

export function MenuList({ menus, loading, error }: MenuListProps) {
  if (loading) {
    return (
      <div className="text-center py-10">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
    );
  }

  if (menus.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-4">トレーニングメニューがまだありません</p>
        <Link
          to="/menus/new"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          最初のメニューを作成
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4 mt-4">
      {menus.map((menu) => (
        <li key={menu.id} className="border p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">{menu.name}</h2>
            <Link
              to={`/workouts/new?menuId=${menu.id}`}
              className="rounded-lg bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
            >
              トレーニング開始
            </Link>
          </div>
          <p className="text-gray-600">
            作成日:{" "}
            {new Date(menu.created_at).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
            })}
          </p>
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
  );
}
