import type { BaseResource, ID, PaginationParams } from "./common";

/**
 * 種目リソースの型定義
 */
export interface Exercise extends BaseResource {
  name: string;
  description: string;
  muscle_group?: string;
  equipment?: string;
  is_compound?: boolean;
}

/**
 * 種目一覧取得レスポンス
 */
export type ExercisesResponse = Exercise[];

/**
 * 種目一覧取得クエリパラメータ
 */
export interface ExercisesQueryParams extends PaginationParams {
  muscle_group?: string;
  search?: string;
}

/**
 * 種目詳細取得レスポンス
 */
export type ExerciseResponse = Exercise;

/**
 * 種目作成リクエスト
 */
export interface ExerciseCreateRequest {
  name: string;
  description: string;
  muscle_group?: string;
  equipment?: string;
  is_compound?: boolean;
}

/**
 * 種目更新リクエスト
 */
export interface ExerciseUpdateRequest {
  name?: string;
  description?: string;
  muscle_group?: string;
  equipment?: string;
  is_compound?: boolean;
}
