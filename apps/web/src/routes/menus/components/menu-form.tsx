import { Field } from "@base-ui-components/react/field";
import { Form as BaseForm } from "@base-ui-components/react/form";
import { useActionData, useSubmit } from "react-router";
import type { MenuDetail } from "./types"; // 作成した型定義ファイルをインポート

interface MenuFormProps {
  initialData?: MenuDetail; // 編集時に初期データを渡す
  isSubmitting?: boolean; // 送信中状態（必要なら）
}

export function MenuForm({ initialData, isSubmitting }: MenuFormProps) {
  const actionData = useActionData() as { error?: string } | undefined;
  const submit = useSubmit();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // TODO: バリデーション (zodなど)

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
        {/* FormErrorの代わりにFieldErrorを使用 */}
        <Field.Error className="text-red-500 text-xs" />
      </Field.Root>

      {/* TODO: メニュー項目（エクササイズ）を追加・編集するUIを実装 */}
      <p className="text-sm text-gray-500">(メニュー項目の編集機能は未実装です)</p>

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
