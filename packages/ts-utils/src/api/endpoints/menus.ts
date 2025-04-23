import { type ApiClientContext, apiDelete, apiGet, apiPost, apiPut } from "../client";
import type {
  ExerciseLastRecordResponse,
  MenuCreateRequest,
  MenuResponse,
  MenuUpdateRequest,
  MenusQueryParams,
  MenusResponse,
} from "../types";

const BASE_PATH = "/menus";

/**
 * メニュー一覧を取得
 */
export async function getMenus(
  args: ApiClientContext,
  params?: MenusQueryParams
): Promise<MenusResponse> {
  return apiGet<MenusResponse>(args, BASE_PATH, params);
}

/**
 * メニュー詳細を取得
 */
export async function getMenu(args: ApiClientContext, id: string): Promise<MenuResponse> {
  return apiGet<MenuResponse>(args, `${BASE_PATH}/${id}`);
}

/**
 * 新規メニューを作成
 */
export async function createMenu(
  args: ApiClientContext,
  data: MenuCreateRequest
): Promise<MenuResponse> {
  return apiPost<MenuCreateRequest, MenuResponse>(args, BASE_PATH, data);
}

/**
 * メニューを更新
 */
export async function updateMenu(
  args: ApiClientContext,
  id: string,
  data: MenuUpdateRequest
): Promise<MenuResponse> {
  return apiPut<MenuUpdateRequest, MenuResponse>(args, `${BASE_PATH}/${id}`, data);
}

/**
 * メニューを削除
 */
export async function deleteMenu(args: ApiClientContext, id: string): Promise<void> {
  return apiDelete<void>(args, `${BASE_PATH}/${id}`);
}

/**
 * メニューに含まれる種目の前回のトレーニング記録を取得
 */
export async function getLastRecords(
  args: ApiClientContext,
  menuId: string
): Promise<ExerciseLastRecordResponse> {
  return apiGet<ExerciseLastRecordResponse>(args, `${BASE_PATH}/${menuId}/exercises/last-records`);
}
