import { Outlet } from "react-router";

export function meta() {
  return [
    { title: "メニュー管理 - BulkTrack" },
    { name: "description", content: "トレーニングメニューの作成・編集・管理" },
  ];
}

export default function MenusLayout() {
  // ここにメニューセクション共通のレイアウト（ヘッダー、サイドバーなど）を追加できます
  return (
    <div>
      <Outlet />
    </div>
  );
}
