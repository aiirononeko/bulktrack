/**
 * APIレスポンスの共通型
 */

// APIエラーレスポンス型
export interface ApiErrorResponse {
  error: string;
  message: string;
  status: number;
}

// ページネーション用パラメータ
export interface PaginationParams extends Record<string, string | number | boolean | undefined> {
  page?: number;
  limit?: number;
}

// ID型（UUID文字列）
export type ID = string;

// タイムスタンプ型（ISO 8601形式の文字列）
export type Timestamp = string;

// 基本リソース型（すべてのリソースの共通フィールド）
export interface BaseResource {
  id: ID;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}
