import { getAuth } from "@clerk/react-router/ssr.server";
// LoaderFunctionArgs の型をインポート（必要に応じてパス調整）
import type { LoaderFunctionArgs } from "react-router";

export async function apiFetch(
  args: LoaderFunctionArgs,
  apiPath: RequestInfo,
  init: RequestInit = {}
) {
  const env = args.context.cloudflare.env;
  const baseUrl = env?.API_URL || "http://localhost:5555";

  // getAuth から getToken を直接取得
  const { getToken } = await getAuth(args);
  const token = await getToken();

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // input と init を使って fetch
  return fetch(`${baseUrl}${apiPath}`, { ...init, headers });
}
