import { Link } from "react-router";
import type { MenuSummary } from "../_index/types";

interface MenuListProps {
  menus: MenuSummary[];
}

export function MenuList({ menus }: MenuListProps) {
  if (menus.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
        <p className="text-muted-foreground mb-4">作成済みのメニューがありません。</p>
        <Link
          to="/menus/new"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          最初のメニューを作成
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {menus.map((menu) => (
        <Link
          key={menu.id}
          to={`/menus/${menu.id}/edit`}
          className="block p-6 bg-card rounded-lg border hover:shadow-md transition-shadow duration-200"
        >
          <h3 className="text-lg font-semibold mb-2">{menu.name}</h3>
          {menu.description ? (
            <p className="text-sm text-muted-foreground mt-1">{menu.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">説明がありません</p>
          )}
        </Link>
      ))}
    </div>
  );
}
