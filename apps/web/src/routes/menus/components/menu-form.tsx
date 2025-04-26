import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useActionData, useSubmit } from "react-router";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import type { MenuDetail } from "./types";

// Loader から渡される Exercise の型
interface ExerciseOption {
  id: string;
  name: string;
  description: string;
}

// 種目の型
interface MenuItem {
  id: string;
  exercise_id: string;
  set_order: number;
  planned_sets: string | number | null;
  planned_reps: string | number | null;
  planned_interval_seconds: string | number | null;
}

// 種目のZodスキーマ
const menuItemSchema = z.object({
  id: z.string(),
  exercise_id: z.string().min(1, "種目を選択してください"),
  set_order: z.number(),
  planned_sets: z.union([z.string(), z.number(), z.null()]).optional().nullable(),
  planned_reps: z.union([z.string(), z.number(), z.null()]).optional().nullable(),
  planned_interval_seconds: z.union([z.string(), z.number(), z.null()]).optional().nullable(),
});

// フォーム全体のZodスキーマ
const formSchema = z.object({
  name: z.string().min(1, "メニュー名は必須です"),
  description: z.string().optional().nullable(),
  menuItems: z.array(menuItemSchema),
});

interface MenuFormProps {
  initialData?: MenuDetail & { description?: string | null };
  isSubmitting?: boolean;
  exercises: ExerciseOption[];
}

export function MenuForm({ initialData, isSubmitting, exercises }: MenuFormProps) {
  const actionData = useActionData();
  const submit = useSubmit();

  // フォームの状態管理
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    if (!initialData?.items) return [];

    return initialData.items.map((item, index) => ({
      id: item.id ?? crypto.randomUUID(),
      exercise_id: item.exercise_id,
      set_order: item.set_order ?? index + 1,
      planned_sets: item.planned_sets ?? null,
      planned_reps: item.planned_reps ?? null,
      planned_interval_seconds: item.planned_interval_seconds ?? null,
    }));
  });

  const form = useForm({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      menuItems: menuItems,
    },
  });

  // メニュー項目の追加
  const addMenuItem = () => {
    const newItem: MenuItem = {
      id: crypto.randomUUID(),
      exercise_id: exercises.length > 0 ? exercises[0].id : "",
      set_order: menuItems.length + 1,
      planned_sets: null,
      planned_reps: null,
      planned_interval_seconds: null,
    };

    const updatedItems = [...menuItems, newItem];
    setMenuItems(updatedItems);
    form.setValue("menuItems", updatedItems, { shouldValidate: true });
  };

  // メニュー項目の削除
  const removeMenuItem = (idToRemove: string) => {
    const updatedItems = menuItems.filter((item) => item.id !== idToRemove);

    // set_orderを再計算
    const reorderedItems = updatedItems.map((item, index) => ({
      ...item,
      set_order: index + 1,
    }));

    setMenuItems(reorderedItems);
    form.setValue("menuItems", reorderedItems, { shouldValidate: true });
  };

  // フォーム送信処理
  const onSubmit = (values: any) => {
    const formData = new FormData();
    formData.append("name", values.name);

    if (values.description) {
      formData.append("description", values.description);
    }

    // メニュー項目データをJSON文字列として追加
    const itemsToSend = menuItems.map((item) => ({
      exercise_id: item.exercise_id,
      set_order: Number(item.set_order) || 0,
      planned_sets: item.planned_sets ? Number(item.planned_sets) : null,
      planned_reps: item.planned_reps ? Number(item.planned_reps) : null,
      planned_interval_seconds: item.planned_interval_seconds
        ? Number(item.planned_interval_seconds)
        : null,
    }));

    formData.append("items", JSON.stringify(itemsToSend));

    submit(formData, {
      method: initialData ? "patch" : "post",
    });
  };

  // フィールド値の更新
  const updateField = (id: string, field: string, value: string | number) => {
    const updatedItems = menuItems.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setMenuItems(updatedItems);
    form.setValue("menuItems", updatedItems, { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {actionData?.error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
            role="alert"
          >
            <span className="block sm:inline">{actionData.error}</span>
          </div>
        )}

        {/* メニュー名 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メニュー名</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* メニュー説明 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>メニュー説明 (任意)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="例: ベンチプレスの重量を伸ばすことに重点"
                  value={field.value || ""}
                  rows={3}
                />
              </FormControl>
              <FormDescription>トレーニングの目的や特徴を記入してください</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 種目セクション */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">種目</h2>
            <Button
              type="button"
              onClick={addMenuItem}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>種目追加</span>
            </Button>
          </div>

          {menuItems.map((item, index) => (
            <div key={item.id} className="border p-4 rounded-md space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">種目 #{index + 1}</h3>
                <Button
                  type="button"
                  onClick={() => removeMenuItem(item.id)}
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 種目選択 */}
                <div className="space-y-2">
                  <label htmlFor={`exercise-${item.id}`} className="text-sm font-medium">
                    種目
                  </label>
                  <Select
                    value={item.exercise_id}
                    onValueChange={(value: string) => updateField(item.id, "exercise_id", value)}
                  >
                    <SelectTrigger id={`exercise-${item.id}`}>
                      <SelectValue placeholder="種目を選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      {exercises.map((exercise) => (
                        <SelectItem key={exercise.id} value={exercise.id}>
                          {exercise.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* セット数 */}
                <div className="space-y-2">
                  <label htmlFor={`sets-${item.id}`} className="text-sm font-medium">
                    セット数
                  </label>
                  <Input
                    id={`sets-${item.id}`}
                    type="number"
                    placeholder="例: 3"
                    value={item.planned_sets || ""}
                    onChange={(e) => updateField(item.id, "planned_sets", e.target.value)}
                    min={1}
                  />
                </div>

                {/* レップ数 */}
                <div className="space-y-2">
                  <label htmlFor={`reps-${item.id}`} className="text-sm font-medium">
                    レップ数
                  </label>
                  <Input
                    id={`reps-${item.id}`}
                    type="number"
                    placeholder="例: 10"
                    value={item.planned_reps || ""}
                    onChange={(e) => updateField(item.id, "planned_reps", e.target.value)}
                    min={1}
                  />
                </div>

                {/* インターバル */}
                <div className="space-y-2 md:col-start-2">
                  <label htmlFor={`interval-${item.id}`} className="text-sm font-medium">
                    インターバル(秒)
                  </label>
                  <Input
                    id={`interval-${item.id}`}
                    type="number"
                    placeholder="例: 60"
                    value={item.planned_interval_seconds || ""}
                    onChange={(e) =>
                      updateField(item.id, "planned_interval_seconds", e.target.value)
                    }
                    min={0}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* 項目が一つもない場合 */}
          {menuItems.length === 0 && (
            <div className="text-center p-8 border border-dashed rounded-md">
              <p className="text-muted-foreground mb-4">まだメニュー項目がありません</p>
              <Button type="button" onClick={addMenuItem} variant="secondary" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                項目を追加する
              </Button>
            </div>
          )}
        </div>

        {/* 送信ボタン */}
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {initialData ? "メニューを更新" : "メニューを作成"}
        </Button>
      </form>
    </Form>
  );
}
