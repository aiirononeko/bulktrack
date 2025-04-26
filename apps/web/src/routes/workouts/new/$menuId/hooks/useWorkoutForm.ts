import { useEffect, useState } from "react";
import { useActionData, useSubmit } from "react-router";
import type { ExerciseLastRecord, LastRecordData } from "ts-utils/src/api/types/menus";
import type { MenuExerciseTemplate, RecordingExercise, WorkoutSetRecord } from "../../types";
import type {
  ExerciseLog,
  FormErrors,
  UseWorkoutFormProps as HookProps,
  IntensityMode,
  UseWorkoutFormReturn,
  WorkoutSet,
} from "./types";

export type { IntensityMode, WorkoutSet, ExerciseLog, FormErrors };

interface UseWorkoutFormProps extends HookProps {
  workoutId?: string;
  initialExercises: MenuExerciseTemplate[] | RecordingExercise[];
  lastRecords?: ExerciseLastRecord[];
}

export function useWorkoutForm({
  menuId,
  workoutId,
  initialExercises,
  lastRecords = [],
}: UseWorkoutFormProps): UseWorkoutFormReturn {
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [intensityMode, setIntensityMode] = useState<IntensityMode>("rir");

  const lastRecordMap = new Map(lastRecords?.map((record) => [record.exercise_id, record]) || []);

  const actionData = useActionData() as { error?: string; validationErrors?: any } | undefined;
  const submit = useSubmit();
  const isEditing = !!workoutId;

  // 初期化ロジック (新規/編集で分岐)
  useEffect(() => {
    if (initialExercises.length === 0) return;

    let initialLogs: ExerciseLog[];

    // 型ガード: Object.hasOwn を使用
    const isRecordingExerciseArray = (arr: any[]): arr is RecordingExercise[] =>
      arr.length > 0 && Object.hasOwn(arr[0], "sets");

    if (isEditing && isRecordingExerciseArray(initialExercises)) {
      // 編集モード: RecordingExercise[] から ExerciseLog[] に変換
      initialLogs = initialExercises.map((exercise) => ({
        exerciseId: exercise.id, // RecordingExercise の id を使う
        exerciseName: exercise.name,
        sets: exercise.sets.map((set: WorkoutSetRecord) => ({
          // 型を明示
          id: set.id, // 既存のセットIDを使う
          weight: set.weight?.toString() || "",
          reps: set.reps?.toString() || "",
          rir: set.rir?.toString() || "",
          rpe: "", // RecordingExercise に rpe はないが、フォーム用に初期化
        })),
      }));
    } else if (
      !isEditing &&
      initialExercises.length > 0 &&
      Object.hasOwn(initialExercises[0], "targetSets")
    ) {
      // 新規モード: MenuExerciseTemplate[] から ExerciseLog[] に変換 (従来のロジック)
      const templates = initialExercises as MenuExerciseTemplate[]; // 型アサーション
      initialLogs = templates.map((exercise) => ({
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
    } else {
      console.error("Invalid initialExercises type or mode mismatch");
      initialLogs = []; // エラー時は空にする
    }

    setExerciseLogs(initialLogs);
  }, [initialExercises, isEditing]); // isEditing も依存配列に追加

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

  // フォーム送信 (編集モード対応)
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
    const exercisesPayload = exerciseLogs.map((log) => ({
      exercise_id: log.exerciseId,
      sets: log.sets.map((set) => {
        const setData: {
          set_id?: string; // 編集用にセットIDを追加
          weight_kg: number;
          reps: number;
          rir?: number;
          rpe?: number;
        } = {
          weight_kg: Number.parseFloat(set.weight) || 0,
          reps: Number.parseInt(set.reps, 10) || 0,
        };
        // 編集モードの場合、既存のセットIDを追加
        if (isEditing) {
          setData.set_id = set.id;
        }

        // 現在のモードに応じてRIR/RPEを設定
        if (intensityMode === "rir" && set.rir !== "") {
          setData.rir = Number.parseFloat(set.rir);
        } else if (intensityMode === "rpe" && set.rpe !== "") {
          setData.rpe = Number.parseFloat(set.rpe);
        }

        return setData;
      }),
    }));

    // 送信するデータを workoutData としてまとめる
    const workoutData = {
      menuId: menuId, // 新規・編集共通
      exercises: exercisesPayload,
      // workoutId: workoutId, // 編集の場合 workoutId も含めるか？ action URL で判別するので不要かも
      // note: ... // ノート編集機能があれば追加
    };

    formData.append("workout", JSON.stringify(workoutData));

    // 送信メソッドを決定
    const method = isEditing ? "patch" : "post";
    // 送信先 URL (action 関数側で workoutId を使うため、ここでは指定不要か？)
    // const actionUrl = isEditing ? `/workouts/${workoutId}` : `/workouts/new/${menuId}`;

    submit(formData, { method }); // action URL は指定せず、現在のルートの action を使う
  };

  // 前回の記録を取得する関数
  const getPreviousSet = (exerciseId: string, setIndex: number): LastRecordData | null => {
    const exerciseRecord = lastRecordMap.get(exerciseId);
    const previousSets = exerciseRecord?.last_records;
    return (
      previousSets?.find((prevSet: LastRecordData) => prevSet.set_order === setIndex + 1) || null
    );
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
