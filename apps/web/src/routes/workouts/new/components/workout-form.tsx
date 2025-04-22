import { Field } from "@base-ui-components/react/field";
import { Form as BaseForm } from "@base-ui-components/react/form";
import { useEffect, useState } from "react";
import { useActionData, useSubmit } from "react-router";
import type { MenuExerciseTemplate } from "../types";

// 強度指標モード (RIR or RPE)
type IntensityMode = "rir" | "rpe";

// WorkoutFormのpropsの型を定義
interface WorkoutFormProps {
  menuId: string;
  initialExercises: MenuExerciseTemplate[];
}

interface WorkoutSet {
  id: string; // ユニークなID (例: uuid)
  weight: string;
  reps: string;
  rir: string; // RIRの値
  rpe: string; // RPEの値 (追加)
}

interface ExerciseLog {
  exerciseId: string; // MenuExerciseTemplate の ID と紐付ける
  exerciseName: string;
  sets: WorkoutSet[];
}

// WorkoutForm コンポーネント
export function WorkoutForm({ menuId, initialExercises }: WorkoutFormProps) {
  console.log("WorkoutForm received menuId:", menuId);
  console.log("WorkoutForm received initialExercises:", initialExercises);

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [errors, setErrors] = useState({});
  const [intensityMode, setIntensityMode] = useState<IntensityMode>("rir"); // 強度指標モードのState (デフォルトRIR)

  const actionData = useActionData() as { error?: string } | undefined;
  const submit = useSubmit();

  // 初期化ロジック
  useEffect(() => {
    const initialLogs = initialExercises.map((exercise) => ({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: Array.from({ length: 3 }, () => ({
        id: crypto.randomUUID(),
        weight: "",
        reps: "",
        rir: "",
        rpe: "", // rpe も初期化
      })),
    }));
    setExerciseLogs(initialLogs);
  }, [initialExercises]);

  // セット追加
  const handleAddSet = (exerciseLogIndex: number) => {
    const newSet: WorkoutSet = {
      id: crypto.randomUUID(),
      weight: "",
      reps: "",
      rir: "",
      rpe: "", // rpe も追加
    };
    const updatedLogs = [...exerciseLogs];
    updatedLogs[exerciseLogIndex].sets.push(newSet);
    setExerciseLogs(updatedLogs);
  };

  // 入力値変更
  const handleInputChange = (
    exerciseLogIndex: number,
    setIndex: number,
    field: keyof Omit<WorkoutSet, "id">,
    value: string
  ) => {
    const updatedLogs = [...exerciseLogs];
    const targetSet = updatedLogs[exerciseLogIndex].sets[setIndex];

    // rir/rpe フィールドの場合、現在のモードに基づいて更新
    if (field === "rir") {
      targetSet.rir = value;
      // 反対側のモードの値はクリアする（任意）
      // targetSet.rpe = "";
    } else if (field === "rpe") {
      targetSet.rpe = value;
      // 反対側のモードの値はクリアする（任意）
      // targetSet.rir = "";
    } else {
      // weight, reps はそのまま更新
      targetSet[field] = value;
    }

    setExerciseLogs(updatedLogs);
  };

  // フォーム送信
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();

    // 送信する exerciseLogs を準備 (rir/rpeを整理)
    const logsToSend = exerciseLogs.map((log) => ({
      ...log,
      sets: log.sets.map((set) => {
        // 送信データを作成。現在のモードに応じてrir/rpeを設定
        const setData: Partial<WorkoutSet> & { weight: string; reps: string } = {
          id: set.id,
          weight: set.weight,
          reps: set.reps,
          rir: intensityMode === "rir" ? set.rir : "", // モードに合わせて値を設定、他方は空文字 or null
          rpe: intensityMode === "rpe" ? set.rpe : "", // モードに合わせて値を設定、他方は空文字 or null
        };
        // API が null を期待する場合、空文字を null に変換
        // if (setData.rir === "") setData.rir = null;
        // if (setData.rpe === "") setData.rpe = null;
        return setData;
      }),
    }));

    formData.append(
      "workout",
      JSON.stringify({
        menuId,
        exercises: logsToSend, // 整理したデータを送信
      })
    );

    submit(formData, { method: "post" });
  };

  return (
    <BaseForm onSubmit={handleFormSubmit} className="space-y-6">
      {/* エラー表示 */}
      {actionData?.error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <span className="block sm:inline">{actionData.error}</span>
        </div>
      )}

      {/* RIR/RPE 選択UI */}
      <div className="mb-4 p-3 border rounded-md bg-gray-50">
        <div id="intensity-mode-label" className="block text-sm font-medium text-gray-700 mb-2">
          強度指標の入力モード:
        </div>
        <div
          className="flex items-center space-x-4"
          role="radiogroup"
          aria-labelledby="intensity-mode-label"
        >
          <label className="flex items-center">
            <input
              id="intensity-mode-rir"
              type="radio"
              name="intensityMode"
              value="rir"
              checked={intensityMode === "rir"}
              onChange={() => setIntensityMode("rir")}
              className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
            />
            <span className="ml-2 text-sm text-gray-700">RIR (Reps in Reserve)</span>
          </label>
          <label className="flex items-center">
            <input
              id="intensity-mode-rpe"
              type="radio"
              name="intensityMode"
              value="rpe"
              checked={intensityMode === "rpe"}
              onChange={() => setIntensityMode("rpe")}
              className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
            />
            <span className="ml-2 text-sm text-gray-700">RPE (Rating of Perceived Exertion)</span>
          </label>
        </div>
      </div>

      {/* 各エクササイズのログ */}
      {exerciseLogs.map((log, exerciseIndex) => (
        <div key={log.exerciseId} className="border rounded-lg p-4 shadow-sm mb-4">
          <div className="mb-2">
            <h3 className="text-lg font-semibold">{log.exerciseName}</h3>
          </div>
          <div className="space-y-4">
            {log.sets.map((set, setIndex) => (
              <div key={set.id} className="flex items-center space-x-2">
                <label
                  htmlFor={`weight-${exerciseIndex}-${setIndex}`}
                  className="w-10 text-right shrink-0 pr-2"
                >{`Set ${setIndex + 1}`}</label>
                {/* Weight Field */}
                <Field.Root
                  name={`exercises[${exerciseIndex}].sets[${setIndex}].weight`}
                  className="flex-1"
                >
                  <Field.Label className="sr-only">Weight</Field.Label>
                  <Field.Control
                    id={`weight-${exerciseIndex}-${setIndex}`}
                    type="number"
                    placeholder="Weight (kg)"
                    value={set.weight}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange(exerciseIndex, setIndex, "weight", e.target.value)
                    }
                    className="w-full border p-2 rounded"
                  />
                  <Field.Error className="text-red-500 text-xs" />
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
                    className="w-full border p-2 rounded"
                  />
                  <Field.Error className="text-red-500 text-xs" />
                </Field.Root>

                {/* RIR Field (条件付き表示) */}
                {intensityMode === "rir" && (
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
                      className="w-full border p-2 rounded"
                      min="0"
                      step="0.5" // RIRは0.5刻みも考慮
                    />
                    <Field.Error className="text-red-500 text-xs" />
                  </Field.Root>
                )}

                {/* RPE Field (条件付き表示) */}
                {intensityMode === "rpe" && (
                  <Field.Root
                    name={`exercises[${exerciseIndex}].sets[${setIndex}].rpe`}
                    className="flex-1"
                  >
                    <Field.Label className="sr-only">RPE</Field.Label>
                    <Field.Control
                      type="number"
                      placeholder="RPE"
                      value={set.rpe}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange(exerciseIndex, setIndex, "rpe", e.target.value)
                      }
                      className="w-full border p-2 rounded"
                      min="1"
                      max="10"
                      step="0.5" // RPEの範囲と刻み
                    />
                    <Field.Error className="text-red-500 text-xs" />
                  </Field.Root>
                )}
              </div>
            ))}
            {/* セット追加ボタン */}
            <button
              type="button"
              onClick={() => handleAddSet(exerciseIndex)}
              className="mt-2 border px-2 py-1 rounded text-sm"
            >
              セット追加
            </button>
          </div>
        </div>
      ))}

      {/* 送信ボタン */}
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        ワークアウトを記録
      </button>
    </BaseForm>
  );
}
