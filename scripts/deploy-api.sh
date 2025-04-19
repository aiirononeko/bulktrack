#!/usr/bin/env bash
set -e

# プロジェクトルートに移動
cd "$(dirname "$0")/.."

# プロジェクトルートからfly.tomlを使用してデプロイ
echo "🚀 Fly.ioにAPIをデプロイします..."
flyctl deploy

echo "✅ デプロイが完了しました！"
echo "🌐 APIエンドポイント: https://bulktrack-api.fly.dev/"
echo "📋 ログを確認するには: flyctl logs"
