import { type ApiClientContext, apiDelete, apiGet, apiPost, apiPut } from "../client";
import type {
  ExerciseCreateRequest,
  ExerciseResponse,
  ExerciseUpdateRequest,
  ExercisesQueryParams,
  ExercisesResponse,
} from "../types";

const BASE_PATH = "/exercises";

/**
 * 種目一覧を取得
 */
export async function getExercises(
  args: ApiClientContext,
  params?: ExercisesQueryParams
): Promise<ExercisesResponse> {
  return apiGet<ExercisesResponse>(args, BASE_PATH, params);
}

/**
 * 種目詳細を取得
 */
export async function getExercise(args: ApiClientContext, id: string): Promise<ExerciseResponse> {
  return apiGet<ExerciseResponse>(args, `${BASE_PATH}/${id}`);
}

/**
 * 新規種目を作成
 */
export async function createExercise(
  args: ApiClientContext,
  data: ExerciseCreateRequest
): Promise<ExerciseResponse> {
  return apiPost<ExerciseCreateRequest, ExerciseResponse>(args, BASE_PATH, data);
}

/**
 * 種目を更新
 */
export async function updateExercise(
  args: ApiClientContext,
  id: string,
  data: ExerciseUpdateRequest
): Promise<ExerciseResponse> {
  return apiPut<ExerciseUpdateRequest, ExerciseResponse>(args, `${BASE_PATH}/${id}`, data);
}

/**
 * 種目を削除
 */
export async function deleteExercise(args: ApiClientContext, id: string): Promise<void> {
  return apiDelete<void>(args, `${BASE_PATH}/${id}`);
}
