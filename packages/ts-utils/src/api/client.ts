import { getAuth } from "@clerk/react-router/ssr.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { ApiErrorResponse } from "./types";

/**
 * APIクライアントタイプ
 * React Router のローダー関数またはアクション関数、もしくはカスタムコンテキスト
 */
export type ApiClientContext =
  | LoaderFunctionArgs
  | ActionFunctionArgs
  | { request: Request; context?: { cloudflare?: { env?: Record<string, string> } } };

/**
 * API URLを取得する
 */
export function getApiUrl(args: ApiClientContext): string {
  const env = args.context?.cloudflare?.env;
  return env?.API_URL || "http://localhost:5555";
}

/**
 * リクエストヘッダーを生成する
 */
export async function createHeaders(args: ApiClientContext): Promise<Headers> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  // Clerkの認証トークンを取得
  try {
    // LoaderFunctionArgs または ActionFunctionArgs の場合に getAuth を使用
    if ("params" in args) {
      const { getToken } = await getAuth(args);
      const token = await getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
  } catch (error) {
    console.warn("Clerk認証トークンの取得に失敗しました:", error);
    // トークン取得失敗時も処理を続行
  }

  // Cookieがあれば転送（認証トークンなどを含む場合）
  const cookie = args.request.headers.get("Cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  return headers;
}

/**
 * 汎用的なAPIフェッチ関数
 */
export async function apiFetch(
  args: ApiClientContext,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getApiUrl(args);
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = await createHeaders(args);

  // オプションのヘッダーとマージ
  if (options.headers) {
    const optionHeaders = options.headers as Record<string, string>;
    for (const [key, value] of Object.entries(optionHeaders)) {
      if (value) headers.set(key, value);
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  return fetch(url, config);
}

/**
 * 型安全なGETリクエスト
 */
export async function apiGet<TResponse>(
  args: ApiClientContext,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<TResponse> {
  // URLパラメータの構築
  let url = path;
  if (params) {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    }

    const queryString = queryParams.toString();
    if (queryString) {
      url = `${path}${url.includes("?") ? "&" : "?"}${queryString}`;
    }
  }

  const response = await apiFetch(args, url, { method: "GET" });

  if (!response.ok) {
    const error = (await response.json()) as ApiErrorResponse;
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

/**
 * 型安全なPOSTリクエスト
 */
export async function apiPost<TRequest, TResponse>(
  args: ApiClientContext,
  path: string,
  data: TRequest
): Promise<TResponse> {
  const response = await apiFetch(args, path, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = (await response.json()) as ApiErrorResponse;
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

/**
 * 型安全なPUTリクエスト
 */
export async function apiPut<TRequest, TResponse>(
  args: ApiClientContext,
  path: string,
  data: TRequest
): Promise<TResponse> {
  const response = await apiFetch(args, path, {
    method: "PUT",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = (await response.json()) as ApiErrorResponse;
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

/**
 * 型安全なDELETEリクエスト
 */
export async function apiDelete<TResponse>(
  args: ApiClientContext,
  path: string
): Promise<TResponse> {
  const response = await apiFetch(args, path, { method: "DELETE" });

  if (!response.ok) {
    const error = (await response.json()) as ApiErrorResponse;
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}
