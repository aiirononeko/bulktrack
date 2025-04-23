import type { BaseResource, ID, PaginationParams } from "./common";
import type { Exercise } from "./exercises";

/**
 * メニュー（トレーニングプラン）リソースの型定義
 */
export interface Menu extends BaseResource {
  name: string;
  description: string;
  user_id: ID;
  is_template?: boolean;
}

/**
 * メニュー内の種目の型定義
 */
export interface MenuExercise extends BaseResource {
  menu_id: ID;
  exercise_id: ID;
  exercise?: Exercise;
  position: number;
  sets?: number;
  reps?: number;
  weight?: number;
  rest_time?: number; // 秒単位
  notes?: string;
}

/**
 * メニュー一覧取得レスポンス
 */
export type MenusResponse = Menu[];

/**
 * メニュー一覧取得クエリパラメータ
 */
export interface MenusQueryParams extends PaginationParams {
  is_template?: boolean;
  search?: string;
}

/**
 * メニュー詳細取得レスポンス（種目情報を含む）
 */
export interface MenuResponse extends Menu {
  exercises: MenuExercise[];
}

/**
 * メニュー作成リクエスト
 */
export interface MenuCreateRequest {
  name: string;
  description?: string;
  is_template?: boolean;
  exercises?: Array<{
    exercise_id: ID;
    position: number;
    sets?: number;
    reps?: number;
    weight?: number;
    rest_time?: number;
    notes?: string;
  }>;
}

/**
 * メニュー更新リクエスト
 */
export interface MenuUpdateRequest {
  name?: string;
  description?: string;
  is_template?: boolean;
}

/**
 * 前回のトレーニング記録データ
 */
export interface LastRecordData {
  date: string;
  weight_kg: number;
  reps: number;
  rir?: number;
  rpe?: number;
}

/**
 * メニューに含まれる種目の前回のトレーニング記録
 */
export interface ExerciseLastRecord {
  exercise_id: string;
  exercise_name: string;
  last_record: LastRecordData | null;
}

/**
 * 前回のトレーニング記録取得レスポンス
 */
export type ExerciseLastRecordResponse = ExerciseLastRecord[];
