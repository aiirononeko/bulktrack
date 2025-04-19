import { Form, useNavigate } from "react-router";
import { useState } from "react";

export function meta() {
  return [
    { title: "新規メニュー作成 - BulkTrack" },
    { name: "description", content: "新しいトレーニングメニューを作成" },
  ];
}

type MenuItem = {
  id: string;
  exercise: string;
  setOrder: number;
  plannedReps: number;
};

export default function NewMenu() {
  const navigate = useNavigate();
  const [menuName, setMenuName] = useState("");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { id: "1", exercise: "", setOrder: 1, plannedReps: 8 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // メニュー項目を追加
  const addMenuItem = () => {
    setMenuItems([
      ...menuItems,
      {
        id: crypto.randomUUID(),
        exercise: "",
        setOrder: menuItems.length + 1,
        plannedReps: 8,
      },
    ]);
  };

  // メニュー項目を削除
  const removeMenuItem = (id: string) => {
    if (menuItems.length <= 1) return;
    
    const updatedItems = menuItems.filter(item => item.id !== id);
    
    // setOrderを再計算
    const reorderedItems = updatedItems.map((item, index) => ({
      ...item,
      setOrder: index + 1,
    }));
    
    setMenuItems(reorderedItems);
  };

  // メニュー項目を更新
  const updateMenuItem = (id: string, field: string, value: string | number) => {
    setMenuItems(
      menuItems.map(item => 
        item.id === id
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!menuName.trim()) {
      setError("メニュー名を入力してください");
      return;
    }
    
    // 空のエクササイズがないか確認
    const hasEmptyExercise = menuItems.some(item => !item.exercise.trim());
    if (hasEmptyExercise) {
      setError("すべてのエクササイズ名を入力してください");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // API URLはCloudflare Workersの環境に合わせて調整
      const response = await fetch("/api/menus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: menuName,
          items: menuItems.map(item => ({
            exercise: item.exercise,
            set_order: item.setOrder,
            planned_reps: item.plannedReps,
          })),
        }),
      });
      
      if (!response.ok) {
        throw new Error("メニューの作成に失敗しました");
      }
      
      // 成功したらメニュー一覧ページに遷移
      navigate("/menus");
    } catch (err) {
      console.error("Error creating menu:", err);
      setError("メニューの作成中にエラーが発生しました");
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">新規メニュー作成</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <Form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="menuName" className="block mb-1 font-medium">
            メニュー名
          </label>
          <input
            id="menuName"
            value={menuName}
            onChange={e => setMenuName(e.target.value)}
            placeholder="Push Day, Pull Day, Legs Day など"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
          {error && !menuName.trim() && (
            <p className="mt-1 text-sm text-red-600">メニュー名は必須です</p>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">エクササイズ</h2>
            <button
              type="button"
              onClick={addMenuItem}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
            >
              + 追加
            </button>
          </div>

          <div className="space-y-4">
            {menuItems.map((item) => (
              <div key={item.id} className="flex items-start gap-4">
                <div className="flex-1">
                  <label htmlFor={`exercise-${item.id}`} className="sr-only">
                    エクササイズ名
                  </label>
                  <input
                    id={`exercise-${item.id}`}
                    value={item.exercise}
                    onChange={e => updateMenuItem(item.id, "exercise", e.target.value)}
                    placeholder="ベンチプレス, スクワットなど"
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div className="w-24">
                  <label htmlFor={`reps-${item.id}`} className="sr-only">
                    目標レップ数
                  </label>
                  <div className="flex items-center">
                    <input
                      id={`reps-${item.id}`}
                      type="number"
                      min="1"
                      max="100"
                      value={item.plannedReps}
                      onChange={e => 
                        updateMenuItem(item.id, "plannedReps", Number.parseInt(e.target.value) || 1)
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                    />
                    <span className="ml-2 text-sm text-gray-500">回</span>
                  </div>
                </div>
                {menuItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMenuItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                    aria-label="削除"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate("/menus")}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "作成中..." : "メニューを作成"}
          </button>
        </div>
      </Form>
    </div>
  );
}
