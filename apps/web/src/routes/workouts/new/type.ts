export type SelectableMenu = {
  id: string;
  name: string;
  description?: string; // 説明は任意
};

// メニューに含まれるエクササイズのテンプレート情報
export type MenuExerciseTemplate = {
  id: string; // メニュー項目固有のID or エクササイズマスターID
  name: string;
  targetSets: number;
  targetReps: number | string; // "AMRAP"なども考慮するならstringも
  targetWeight?: number;
};

// 実際のワークアウト記録のセット情報
export type WorkoutSetRecord = {
  id: string; // 各セットにユニークなID (例: uuid)
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rir: number | null; // Reps in Reserve (0-5程度 or null)
  isCompleted: boolean; // セット完了フラグ
};

// 記録中のエクササイズ情報 (テンプレート + セット記録)
export type RecordingExercise = MenuExerciseTemplate & {
  sets: WorkoutSetRecord[];
};
