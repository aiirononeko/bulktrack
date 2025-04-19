import { Form, redirect } from "react-router";
import { MenuForm } from "./components/menu-form";

export function meta() {
  return [
    { title: "新規メニュー作成 - BulkTrack" },
    { name: "description", content: "トレーニングメニューを新規作成します" },
  ];
}

// データローダー
export async function loader() {
  // 必要なデータを読み込む
  return {
    exercises: [], // 利用可能なエクササイズリスト
  };
}

// フォーム送信アクション
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();

  // ここでデータを処理、保存
  console.log("新規メニューデータ:", Object.fromEntries(formData));

  // 保存後は一覧ページにリダイレクト
  return redirect("/menus");
}

export default function NewMenu() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新規メニュー作成</h1>
      <MenuForm />
    </div>
  );
}
