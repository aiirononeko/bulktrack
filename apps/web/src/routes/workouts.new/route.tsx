import { Form, redirect } from "react-router";
import { WorkoutForm } from "./components/workout-form";

export function meta() {
  return [
    { title: "新規ワークアウト - BulkTrack" },
    { name: "description", content: "ワークアウトを新規作成します" },
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
  console.log("新規ワークアウトデータ:", Object.fromEntries(formData));

  // 保存後は一覧ページにリダイレクト
  return redirect("/workouts");
}

export default function NewWorkout() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新規ワークアウト</h1>
      <WorkoutForm />
    </div>
  );
}
