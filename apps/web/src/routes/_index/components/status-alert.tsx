import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { WifiOffIcon, AlertCircleIcon, RefreshCwIcon } from "lucide-react";

type StatusAlertProps = {
  isOffline?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  lastUpdated?: string;
};

export function StatusAlert({
  isOffline,
  error,
  onRetry,
  lastUpdated,
}: StatusAlertProps) {
  if (!isOffline && !error) return null;

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("ja-JP", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    } catch (e) {
      return "";
    }
  };

  return (
    <Alert
      variant={error ? "destructive" : "default"}
      className="mb-4"
    >
      {isOffline ? (
        <>
          <WifiOffIcon className="h-4 w-4" />
          <AlertTitle>オフラインモード</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>
              インターネット接続がオフラインのため、キャッシュされたデータを表示しています。
              {lastUpdated && (
                <span className="block text-xs text-muted-foreground">
                  最終更新: {formatLastUpdated(lastUpdated)}
                </span>
              )}
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={onRetry}
              >
                <RefreshCwIcon className="h-3 w-3 mr-2" />
                再接続を試みる
              </Button>
            )}
          </AlertDescription>
        </>
      ) : error ? (
        <>
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>エラーが発生しました</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>
              データの読み込み中にエラーが発生しました。
              <span className="block text-xs">
                {error.message || "不明なエラー"}
              </span>
            </p>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={onRetry}
              >
                <RefreshCwIcon className="h-3 w-3 mr-2" />
                再試行
              </Button>
            )}
          </AlertDescription>
        </>
      ) : null}
    </Alert>
  );
}