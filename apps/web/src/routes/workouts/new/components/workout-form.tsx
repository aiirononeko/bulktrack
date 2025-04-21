import { Field } from "@base-ui-components/react/field";
import { Form } from "@base-ui-components/react/form";
import { useEffect, useState } from "react";
import type { MenuExerciseTemplate } from "../type";

// WorkoutFormのpropsの型を定義
interface WorkoutFormProps {
  menuId: string;
  initialExercises: MenuExerciseTemplate[];
}

interface WorkoutSet {
  id: string; // ユニークなID (例: uuid)
  weight: string;
  reps: string;
  rir: string;
}

interface ExerciseLog {
  exerciseId: string; // MenuExerciseTemplate の ID と紐付ける
  exerciseName: string;
  sets: WorkoutSet[];
}

// WorkoutForm コンポーネントを props を受け取るように変更
export function WorkoutForm({ menuId, initialExercises }: WorkoutFormProps) {
  // 初期エクササイズをログに出力して確認
  console.log("WorkoutForm received menuId:", menuId);
  console.log("WorkoutForm received initialExercises:", initialExercises);

  // ログを管理するためのState
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  // base-ui の Form でエラーを管理する場合に使用
  const [errors, setErrors] = useState({}); // エラー状態を追加

  // initialExercises が変更されたら exerciseLogs を初期化する
  useEffect(() => {
    const initialLogs = initialExercises.map((exercise) => ({
      exerciseId: exercise.id, // プロパティ名を修正
      exerciseName: exercise.name, // プロパティ名を修正
      // 初期セットを3つ生成 (空の値で)
      sets: Array.from({ length: 3 }, () => ({
        id: crypto.randomUUID(),
        weight: "",
        reps: "",
        rir: "",
      })),
    }));
    setExerciseLogs(initialLogs);
  }, [initialExercises]); // initialExercises を依存配列に追加

  // セット追加のハンドラ
  const handleAddSet = (exerciseLogIndex: number) => {
    const newSet: WorkoutSet = {
      id: crypto.randomUUID(), // Reactのkey用にユニークIDを生成
      weight: "",
      reps: "",
      rir: "",
    };
    const updatedLogs = [...exerciseLogs];
    updatedLogs[exerciseLogIndex].sets.push(newSet);
    setExerciseLogs(updatedLogs);
  };

  // 入力値変更のハンドラ
  const handleInputChange = (
    exerciseLogIndex: number,
    setIndex: number,
    field: keyof Omit<WorkoutSet, "id">,
    value: string
  ) => {
    const updatedLogs = [...exerciseLogs];
    updatedLogs[exerciseLogIndex].sets[setIndex][field] = value;
    setExerciseLogs(updatedLogs);
    // 入力時にエラーをクリアする（必要に応じて）
    // onClearErrors を Form に渡す場合は不要
    // setErrors(prev => ({ ...prev, [`exercises[${exerciseLogIndex}].sets[${setIndex}].${field}`]: undefined }));
  };

  // TODO: フォーム送信処理
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: バリデーション (例: zod)
    // const formData = new FormData(event.currentTarget);
    // const result = schema.safeParse(Object.fromEntries(formData as any));
    // if (!result.success) {
    //   setErrors(result.error.flatten().fieldErrors);
    //   return;
    // }
    console.log("Submitting workout log:", exerciseLogs);
    // ここでAPIにデータを送信する
  };

  // initialExercises をもとに初期ログ状態を生成するロジックは useEffect で実装

  return (
    // base-ui の Form コンポーネントを使用
    <Form
      onSubmit={handleSubmit}
      className="space-y-6"
      errors={errors} // エラー状態を渡す
      onClearErrors={setErrors} // エラークリア関数を渡す
    >
      {exerciseLogs.map((log, exerciseIndex) => (
        // Card を div と Tailwind クラスに置き換え
        <div key={log.exerciseId} className="border rounded-lg p-4 shadow-sm mb-4">
          {/* CardHeader を div と Tailwind クラスに置き換え */}
          <div className="mb-2">
            {/* CardTitle を h3 と Tailwind クラスに置き換え */}
            <h3 className="text-lg font-semibold">{log.exerciseName}</h3>
          </div>
          {/* CardContent を div と Tailwind クラスに置き換え */}
          <div className="space-y-4">
            {log.sets.map((set, setIndex) => (
              <div key={set.id} className="flex items-center space-x-2">
                {/* Set ラベルに htmlFor を追加し、最初の input に id を設定 */}
                <label
                  htmlFor={`weight-${exerciseIndex}-${setIndex}`}
                  className="w-10 text-right shrink-0 pr-2"
                >{`Set ${setIndex + 1}`}</label>
                <Field.Root
                  name={`exercises[${exerciseIndex}].sets[${setIndex}].weight`}
                  className="flex-1"
                >
                  <Field.Label className="sr-only">Weight</Field.Label>
                  <Field.Control
                    id={`weight-${exerciseIndex}-${setIndex}`} // id を追加
                    type="number"
                    placeholder="Weight (kg)"
                    value={set.weight}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange(exerciseIndex, setIndex, "weight", e.target.value)
                    }
                    className="w-full border p-2 rounded" // 簡易的なスタイル
                  />
                  <Field.Error className="text-red-500 text-xs" /> {/* エラー表示 */}
                </Field.Root>
                {/* Reps Field */}
                <Field.Root
                  name={`exercises[${exerciseIndex}].sets[${setIndex}].reps`}
                  className="flex-1"
                >
                  <Field.Label className="sr-only">Reps</Field.Label>
                  <Field.Control
                    type="number"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange(exerciseIndex, setIndex, "reps", e.target.value)
                    }
                    className="w-full border p-2 rounded" // 簡易的なスタイル
                  />
                  <Field.Error className="text-red-500 text-xs" /> {/* エラー表示 */}
                </Field.Root>
                {/* RIR Field */}
                <Field.Root
                  name={`exercises[${exerciseIndex}].sets[${setIndex}].rir`}
                  className="flex-1"
                >
                  <Field.Label className="sr-only">RIR</Field.Label>
                  <Field.Control
                    type="number"
                    placeholder="RIR"
                    value={set.rir}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange(exerciseIndex, setIndex, "rir", e.target.value)
                    }
                    className="w-full border p-2 rounded" // 簡易的なスタイル
                    min="0"
                  />
                  <Field.Error className="text-red-500 text-xs" /> {/* エラー表示 */}
                </Field.Root>
              </div>
            ))}
            {/* ネイティブの button 要素に変更 */}
            <button
              type="button"
              onClick={() => handleAddSet(exerciseIndex)}
              className="mt-2 border px-2 py-1 rounded text-sm" // 簡易的なスタイル
            >
              セット追加
            </button>
          </div>
        </div>
      ))}

      {/* TODO: エクササイズ追加ボタン (フリーワークアウト用) */}

      {/* ネイティブの button 要素に変更 */}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" // 簡易的なスタイル
      >
        ワークアウトを記録
      </button>
    </Form>
  );
}
