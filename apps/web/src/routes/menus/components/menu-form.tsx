import { Field } from "@base-ui-components/react/field";
import { Form as BaseForm } from "@base-ui-components/react/form";
import { Select } from "@base-ui-components/react/select";
import { useState } from "react"; // useState をインポート
import { useActionData, useSubmit } from "react-router";
import type { MenuDetail } from "./types"; // 作成した型定義ファイルをインポート

// Loader から渡される Exercise の型
interface ExerciseOption {
  id: string;
  name: string;
  description: string;
}

// メニュー項目の型定義 (バックエンドの MenuItemInput に合わせる)
interface MenuItemState {
  id: string; // フロントエンドでのリスト管理用ID (UUID)
  exercise_id: string; // UUID文字列として保持 (将来的に exercise name も保持？)
  set_order: number; // number として保持
  planned_sets?: string | number; // string か number で保持 (入力が空文字の場合もあるため)
  planned_reps?: string | number;
  planned_interval_seconds?: string | number;
}

interface MenuFormProps {
  initialData?: MenuDetail & { description?: string | null }; // description を追加
  isSubmitting?: boolean; // 送信中状態（必要なら）
  exercises: ExerciseOption[]; // exercises props を追加
}

export function MenuForm({ initialData, isSubmitting, exercises }: MenuFormProps) {
  const actionData = useActionData() as { error?: string } | undefined;
  const submit = useSubmit();

  // メニュー項目の状態管理
  const [menuItems, setMenuItems] = useState<MenuItemState[]>(() => {
    if (!initialData?.items) return [];
    // initialData から MenuItemState 配列を生成
    return initialData.items.map((item, index) => ({
      id: crypto.randomUUID(), // 新しいフロントエンドIDを付与
      exercise_id: item.exercise, // types.ts に合わせて exercise を使う (本来はIDだが一旦nameをIDとして使う)
      set_order: item.set_order ?? index + 1, // set_order を使う (なければindex)
      planned_sets: "", // initialData.item に planned_sets はないので空文字
      planned_reps: item.planned_reps?.toString() ?? "", // planned_reps を使う
      planned_interval_seconds: "", // initialData.item に planned_interval_seconds はないので空文字
    }));
  });

  // 項目追加ハンドラ
  const addMenuItem = () => {
    // 新しい項目を追加する際、exercises があれば最初の種目をデフォルト選択する
    const defaultExerciseId = exercises.length > 0 ? exercises[0].id : "";
    setMenuItems([
      ...menuItems,
      {
        id: crypto.randomUUID(),
        exercise_id: defaultExerciseId,
        set_order: menuItems.length + 1,
        planned_sets: "",
        planned_reps: "",
        planned_interval_seconds: "",
      },
    ]);
  };

  // 項目削除ハンドラ
  const removeMenuItem = (idToRemove: string) => {
    setMenuItems(menuItems.filter((item) => item.id !== idToRemove));
    // TODO: set_order を再計算する必要があるかもしれない
  };

  // 項目入力変更ハンドラ
  const handleItemChange = (id: string, field: keyof Omit<MenuItemState, "id">, value: string) => {
    setMenuItems(menuItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // メニュー項目データをJSON文字列として追加
    // バックエンドで扱いやすいように数値フィールドは数値に変換（空文字はnullに）
    const itemsToSend = menuItems.map((item) => ({
      exercise_id: item.exercise_id, // exercise_id を送信
      set_order: Number(item.set_order) || 0,
      planned_sets: item.planned_sets ? Number(item.planned_sets) : null,
      planned_reps: item.planned_reps ? Number(item.planned_reps) : null,
      planned_interval_seconds: item.planned_interval_seconds
        ? Number(item.planned_interval_seconds)
        : null,
    }));

    // Exercise ID が空でないかチェック (任意)
    if (itemsToSend.some((item) => !item.exercise_id)) {
      // TODO: エラーハンドリング (例: actionData にエラーを設定)
      console.error("Exercise ID is required for all items.");
      return; // 送信を中止
    }

    formData.append("items", JSON.stringify(itemsToSend));

    // Description は formData に自動で含まれる (name="description" のため)

    submit(formData, {
      method: initialData ? "patch" : "post", // 編集か新規かでメソッドを切り替え
    });
  };

  return (
    <BaseForm onSubmit={handleSubmit} className="space-y-6">
      {actionData?.error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <span className="block sm:inline">{actionData.error}</span>
        </div>
      )}

      <Field.Root name="name" className="space-y-1">
        <Field.Label>メニュー名</Field.Label>
        <Field.Control
          type="text"
          required
          defaultValue={initialData?.name || ""}
          className="w-full border p-2 rounded" // 簡易スタイル
        />
        <Field.Error className="text-red-500 text-xs" />
      </Field.Root>

      {/* Description Field (追加) */}
      <div className="space-y-1">
        <label htmlFor="menu-description" className="block text-sm font-medium text-gray-700">
          メニュー説明 (任意)
        </label>
        <textarea
          id="menu-description"
          name="description" // name 属性を設定
          defaultValue={initialData?.description || ""} // 編集時の初期値
          placeholder="例: ベンチプレスの重量を伸ばすことに重点"
          className="w-full border p-2 rounded min-h-[80px]" // スタイル調整
          rows={3} // 表示行数の目安
        />
      </div>

      {/* メニュー項目セクション */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">メニュー項目</h2>
        {menuItems.map((item, index) => (
          <div key={item.id} className="flex items-start space-x-2 border p-3 rounded-md">
            {/* Set Order (表示のみ、自動設定) */}
            <div className="w-10 text-center pt-2 font-semibold text-gray-500">{index + 1}</div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* Exercise ID (Base UI Select) */}
              <div className="space-y-1">
                <label
                  htmlFor={`item-${item.id}-exercise_id`}
                  className="block text-sm font-medium text-gray-700"
                >
                  種目
                </label>
                <Select.Root
                  id={`item-${item.id}-exercise_id`}
                  name={`item-${item.id}-exercise_id`}
                  value={item.exercise_id}
                  onValueChange={(newValue) => {
                    if (newValue) {
                      handleItemChange(item.id, "exercise_id", newValue);
                    }
                  }}
                  required
                >
                  <Select.Trigger className="w-full flex justify-between items-center border p-1.5 rounded text-sm bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500">
                    <Select.Value placeholder="種目を選択..." />
                    <Select.Icon className="text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-4 h-4"
                      >
                        <title>選択肢を開閉</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                        />
                      </svg>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner className="z-10" sideOffset={8}>
                      <Select.Popup className="bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                        {exercises.map((exercise) => (
                          <Select.Item
                            key={exercise.id}
                            value={exercise.id}
                            className="px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 data-[selected]:bg-blue-100 data-[highlighted]:bg-gray-100 outline-none"
                          >
                            <Select.ItemText>{exercise.name}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Planned Sets */}
              <Field.Root name={`item-${item.id}-planned_sets`} className="space-y-1">
                <Field.Label className="text-sm">セット数</Field.Label>
                <Field.Control
                  type="number"
                  placeholder="例: 3"
                  value={item.planned_sets}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleItemChange(item.id, "planned_sets", e.target.value)
                  }
                  className="w-full border p-1.5 rounded text-sm"
                  min="1"
                />
                <Field.Error className="text-red-500 text-xs" />
              </Field.Root>

              {/* Planned Reps */}
              <Field.Root name={`item-${item.id}-planned_reps`} className="space-y-1">
                <Field.Label className="text-sm">レップ数</Field.Label>
                <Field.Control
                  type="number"
                  placeholder="例: 10"
                  value={item.planned_reps}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleItemChange(item.id, "planned_reps", e.target.value)
                  }
                  className="w-full border p-1.5 rounded text-sm"
                  min="1"
                />
                <Field.Error className="text-red-500 text-xs" />
              </Field.Root>

              {/* Planned Interval Seconds */}
              <Field.Root
                name={`item-${item.id}-planned_interval_seconds`}
                className="space-y-1 md:col-start-2" // レイアウト調整例
              >
                <Field.Label className="text-sm">インターバル(秒)</Field.Label>
                <Field.Control
                  type="number"
                  placeholder="例: 60"
                  value={item.planned_interval_seconds}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleItemChange(item.id, "planned_interval_seconds", e.target.value)
                  }
                  className="w-full border p-1.5 rounded text-sm"
                  min="0"
                />
                <Field.Error className="text-red-500 text-xs" />
              </Field.Root>
            </div>

            {/* 削除ボタン */}
            <button
              type="button"
              onClick={() => removeMenuItem(item.id)}
              className="text-red-500 hover:text-red-700 p-1 mt-1"
              aria-label={`Remove item ${index + 1}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <title>メニュー項目 {index + 1} を削除</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
            </button>
          </div>
        ))}

        {/* 項目追加ボタン */}
        <button
          type="button"
          onClick={addMenuItem}
          className="w-full border border-dashed border-gray-400 text-gray-600 py-2 rounded hover:bg-gray-50"
        >
          + 項目を追加
        </button>
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "保存中..." : initialData ? "メニューを更新" : "メニューを作成"}
      </button>
    </BaseForm>
  );
}
