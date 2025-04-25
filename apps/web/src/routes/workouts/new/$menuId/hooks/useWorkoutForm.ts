import { useState, useEffect } from "react";
import { useActionData, useSubmit } from "react-router";
import type { LastRecordData } from "ts-utils/src/api/types/menus";
import type {
  IntensityMode,
  WorkoutSet,
  ExerciseLog,
  FormErrors,
  UseWorkoutFormProps,
  UseWorkoutFormReturn
} from "./types";

export { type IntensityMode, type WorkoutSet, type ExerciseLog, type FormErrors };

export function useWorkoutForm({ menuId, initialExercises, lastRecords = [] }: UseWorkoutFormProps): UseWorkoutFormReturn {
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [intensityMode, setIntensityMode] = useState<IntensityMode>("rir");

  // 前回の記録をexerciseIdでマップ
  const lastRecordMap = new Map(lastRecords?.map((record) => [record.exercise_id, record]) || []);

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
        if (intensityMode === "rir" && set.rir !== "") {
          setData.rir = Number.parseFloat(set.rir);
        } else if (intensityMode === "rpe" && set.rpe !== "") {
          setData.rpe = Number.parseFloat(set.rpe);
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

    submit(formData, { method: "post" });
  };

  // 前回の記録を取得する関数
  const getPreviousSet = (exerciseId: string, setIndex: number): LastRecordData | null => {
    const previousSets = lastRecordMap.get(exerciseId)?.last_records;
    return previousSets?.find((prevSet: LastRecordData) => prevSet.set_order === setIndex + 1) || null;
  };

  return {
    exerciseLogs,
    errors,
    intensityMode,
    actionData,
    setIntensityMode,
    handleAddSet,
    handleRemoveSet,
    handleInputChange,
    handleFormSubmit,
    getPreviousSet,
  };
}