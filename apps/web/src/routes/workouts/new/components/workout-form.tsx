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
  rpe: string; // RPEの値
}

interface ExerciseLog {
  exerciseId: string; // MenuExerciseTemplate の ID と紐付ける
  exerciseName: string;
  sets: WorkoutSet[];
}

// エラーの型定義
interface FormErrors {
  form?: string;
}

// WorkoutForm コンポーネント
export function WorkoutForm({ menuId, initialExercises }: WorkoutFormProps) {
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [intensityMode, setIntensityMode] = useState<IntensityMode>("rir");

  const actionData = useActionData() as { error?: string; validationErrors?: any } | undefined;
  const submit = useSubmit();

  // 初期化ロジック
  useEffect(() => {
    const initialLogs = initialExercises.map((exercise) => ({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: Array.from({ length: exercise.targetSets || 3 }, () => ({
        id: crypto.randomUUID(),
        weight: exercise.targetWeight?.toString() || "",
        reps:
          typeof exercise.targetReps === "number"
            ? exercise.targetReps.toString()
            : exercise.targetReps || "",
        rir: "",
        rpe: "",
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
      rpe: "",
    };
    const updatedLogs = [...exerciseLogs];
    updatedLogs[exerciseLogIndex].sets.push(newSet);
    setExerciseLogs(updatedLogs);
  };

  // セットを削除
  const handleRemoveSet = (exerciseLogIndex: number, setIndex: number) => {
    const updatedLogs = [...exerciseLogs];

    // 最後の1セットの場合は削除しない
    if (updatedLogs[exerciseLogIndex].sets.length <= 1) {
      return;
    }

    updatedLogs[exerciseLogIndex].sets.splice(setIndex, 1);
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
    } else if (field === "rpe") {
      targetSet.rpe = value;
    } else {
      // weight, reps はそのまま更新
      targetSet[field] = value;
    }

    setExerciseLogs(updatedLogs);
  };

  // フォーム送信
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // バリデーション
    if (exerciseLogs.length === 0) {
      setErrors({ form: "エクササイズが見つかりません" });
      return;
    }

    for (const log of exerciseLogs) {
      for (const set of log.sets) {
        if (!set.weight || !set.reps) {
          setErrors({ form: "すべてのセットに重量とレップ数を入力してください" });
          return;
        }
      }
    }

    const formData = new FormData();

    // バックエンドAPIの期待する形式に変換
    const exercises = exerciseLogs.map((log) => ({
      exercise_id: log.exerciseId,
      sets: log.sets.map((set) => {
        const setData: {
          weight_kg: number;
          reps: number;
          rir?: number;
          rpe?: number;
        } = {
          weight_kg: Number.parseFloat(set.weight) || 0,
          reps: Number.parseInt(set.reps, 10) || 0,
        };

        // 現在のモードに応じてRIR/RPEを設定
        if (intensityMode === "rir" && set.rir) {
          setData.rir = Number.parseFloat(set.rir) || undefined;
        } else if (intensityMode === "rpe" && set.rpe) {
          setData.rpe = Number.parseFloat(set.rpe) || undefined;
        }

        return setData;
      }),
    }));

    formData.append(
      "workout",
      JSON.stringify({
        menuId,
        exercises,
      })
    );

    console.log(
      "送信データ:",
      JSON.stringify(
        {
          menuId,
          exercises,
        },
        null,
        2
      )
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

      {/* バリデーションエラー表示 */}
      {errors.form && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <span className="block sm:inline">{errors.form}</span>
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
                      step="0.5"
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
                      step="0.5"
                    />
                    <Field.Error className="text-red-500 text-xs" />
                  </Field.Root>
                )}

                {/* セット削除ボタン */}
                <button
                  type="button"
                  onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                  className="text-red-500 hover:text-red-700 ml-2"
                  aria-label={`セット ${setIndex + 1} を削除`}
                >
                  ×
                </button>
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
