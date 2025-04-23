import { Link, useLoaderData } from "react-router";

import { MenuList } from "./components/menu-list";

import { loader } from "./loader";

export default function MenusIndexRoute() {
  const { menus } = useLoaderData<typeof loader>();

  return (
    <div className="pt-4 px-4 space-y-6 max-w-screen-lg mx-auto pb-12">
      <h1 className="text-2xl font-bold">トレーニングメニュー一覧</h1>
      <Link
        to="/menus/new"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 border bg-card text-card-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
      >
        新規メニュー作成
      </Link>
      <p className="text-sm text-muted-foreground">
        作成済みのトレーニングメニューを表示・編集します。
      </p>
      <MenuList menus={menus} />
    </div>
  );
}

export { loader };
