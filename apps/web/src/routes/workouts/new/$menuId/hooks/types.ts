import type { Exercise } from "ts-utils/src/api/types/exercises";
import type { ExerciseLastRecord, LastRecordData } from "ts-utils/src/api/types/menus";
import type { MenuExerciseTemplate } from "../../types";

// 強度指標モード (RIR or RPE)
export type IntensityMode = "rir" | "rpe";

// ワークアウトセットの型定義
export interface WorkoutSet {
  id: string; // ユニークなID (例: uuid)
  weight: string;
  reps: string;
  rir: string; // RIRの値
  rpe: string; // RPEの値
}

// エクササイズログの型定義
export interface ExerciseLog {
  exerciseId: string; // MenuExerciseTemplate の ID と紐付ける
  exerciseName: string;
  sets: WorkoutSet[];
}

// フォームエラーの型定義
export interface FormErrors {
  form?: string;
}

// useWorkoutFormのpropsの型定義
export interface UseWorkoutFormProps {
  menuId: string;
  initialExercises: MenuExerciseTemplate[];
  lastRecords?: ExerciseLastRecord[];
  allExercises: Exercise[];
}

// useWorkoutFormの戻り値の型定義
export interface UseWorkoutFormReturn {
  exerciseLogs: ExerciseLog[];
  errors: FormErrors;
  intensityMode: IntensityMode;
  actionData: { error?: string; validationErrors?: any } | undefined;
  setIntensityMode: (mode: IntensityMode) => void;
  handleAddSet: (exerciseLogIndex: number) => void;
  handleRemoveSet: (exerciseLogIndex: number, setIndex: number) => void;
  handleInputChange: (
    exerciseLogIndex: number,
    setIndex: number,
    field: keyof Omit<WorkoutSet, "id">,
    value: string
  ) => void;
  handleFormSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  getPreviousSet: (exerciseId: string, setIndex: number) => LastRecordData | null;
  handleRemoveExercise: (exerciseLogIndex: number) => void;
  isAddExerciseOpen: boolean;
  setIsAddExerciseOpen: (isOpen: boolean) => void;
  handleAddExercise: (exerciseId: string, exerciseName: string) => void;
}
