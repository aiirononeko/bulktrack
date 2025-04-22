import { Link, useLoaderData } from "react-router";
import { MenuList } from "../components/menu-list";
import { loader } from "./loader";
import type { MenuSummary } from "./type";

export { loader };

// TODO: loaderから受け取るデータの型定義
interface Menu {
  id: string;
  name: string;
}

export default function MenusIndexRoute() {
  const { menus } = useLoaderData() as { menus: MenuSummary[] };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">トレーニングメニュー一覧</h1>
        <Link
          to="/menus/new"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          新規メニュー作成
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        作成済みのトレーニングメニューを表示・編集します。
      </p>
      <MenuList menus={menus} />
    </div>
  );
}
