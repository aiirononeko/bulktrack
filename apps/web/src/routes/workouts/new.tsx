import { Form, useLoaderData, useNavigate, redirect, useSearchParams, useActionData, useNavigation } from "react-router";
import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export function meta() {
  return [
    { title: "トレーニング開始 - BulkTrack" },
    { name: "description", content: "新しいトレーニングを開始" },
  ];
}

interface Menu {
  id: string;
  name: string;
  created_at: string;
  items: Array<{
    id: string;
    exercise: string;
    set_order: number;
    planned_reps: number;
  }>;
}

interface Workout {
  id: string;
  menu_id: string;
  menu_name: string;
  started_at: string;
  note?: string;
  sets: Array<{
    id: string;
    exercise: string;
    set_order: number;
    weight_kg: number;
    reps: number;
    rpe?: number;
  }>;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const menuId = url.searchParams.get("menuId");
  
  if (!menuId) {
    // メニューIDがない場合はメニュー一覧にリダイレクト
    return redirect("/menus");
  }
  
  try {
    // メニュー情報取得
    const apiUrl = `${context.cloudflare.env.API_URL || "http://localhost:8080"}/menus/${menuId}`;
    const menuResponse = await fetch(apiUrl);
    
    if (!menuResponse.ok) {
      throw new Error("メニューの取得に失敗しました");
    }
    
    const menu = await menuResponse.json() as Menu;
    return { menu, error: null };
  } catch (err) {
    console.error("Error fetching menu:", err);
    return { menu: null, error: "メニューの読み込み中にエラーが発生しました" };
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const menuId = formData.get("menuId") as string;
  const note = formData.get("note") as string;
  
  if (!menuId) {
    return { success: false, error: "メニューIDが指定されていません" };
  }
  
  try {
    // ワークアウト開始API呼び出し
    const apiUrl = `${context.cloudflare.env.API_URL || "http://localhost:8080"}/workouts`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        menu_id: menuId,
        note: note || "",
      }),
    });
    
    if (!response.ok) {
      throw new Error("ワークアウトの開始に失敗しました");
    }
    
    const workout = await response.json() as Workout;
    return redirect(`/workouts/${workout.id}`);
  } catch (err) {
    console.error("Error starting workout:", err);
    return { success: false, error: "ワークアウトの開始中にエラーが発生しました" };
  }
}

export default function NewWorkout() {
  const { menu, error } = useLoaderData<{ menu: Menu | null, error: string | null }>();
  const actionData = useActionData<{ success?: boolean, error?: string }>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const menuId = searchParams.get("menuId");
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  
  // フォームの送信状態を確認
  const isSubmitting = navigation.state === "submitting";
  
  useEffect(() => {
    if (!menuId) {
      navigate("/menus");
    }
  }, [menuId, navigate]);
  
  if (!menu) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">トレーニング開始</h1>
        </div>
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate("/menus")}
            className="rounded-lg bg-gray-600 px-4 py-2 font-medium text-white hover:bg-gray-700"
          >
            メニュー一覧に戻る
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">トレーニング開始</h1>
      </div>
      
      {actionData?.error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-200">
          {actionData.error}
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 dark:text-white">{menu.name}</h2>
        <div className="border-t dark:border-gray-700 pt-4">
          <h3 className="font-medium mb-2 dark:text-white">メニュー内容:</h3>
          <ul className="list-disc pl-5">
            {menu.items.map((item) => (
              <li key={item.id} className="mb-1 dark:text-gray-200">
                {item.exercise} - {item.planned_reps}回 × {item.set_order}セット
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <Form method="post" className="space-y-6">
        <input type="hidden" name="menuId" value={menuId || ""} />
        
        <div>
          <label htmlFor="note" className="block mb-1 font-medium dark:text-white">
            メモ（任意）
          </label>
          <textarea
            id="note"
            name="note"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="今日の体調や目標など"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 min-h-24 text-gray-900 dark:text-white"
          />
        </div>
        
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate("/menus")}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? "開始中..." : "トレーニングを開始"}
          </button>
        </div>
      </Form>
    </div>
  );
} 