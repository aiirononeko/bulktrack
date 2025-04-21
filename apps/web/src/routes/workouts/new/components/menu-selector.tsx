import { Link } from "react-router";
import type { SelectableMenu } from "../type";

type MenuSelectorProps = {
  menus: SelectableMenu[];
};

export function MenuSelector({ menus }: MenuSelectorProps) {
  if (!menus || menus.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
        <p className="text-muted-foreground mb-4">利用可能なメニューがありません。</p>
        <Link
          to="/menus/new" // メニュー作成ページへのリンク
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          メニューを作成
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {menus.map((menu) => (
        <Link
          key={menu.id}
          // 選択したメニューIDをクエリパラメータとして付与
          to={`/workouts/new?menuId=${menu.id}`}
          className="block rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="p-4">
            <h3 className="text-base font-semibold mb-1">{menu.name}</h3>
            {menu.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{menu.description}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
