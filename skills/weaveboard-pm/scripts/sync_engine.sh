#!/usr/bin/env bash
# sync_engine.sh — 从 GitHub 仓库同步最新引擎到本 skill 的 assets/
set -euo pipefail
cd "$(dirname "$0")/.."
REPO_URL="https://raw.githubusercontent.com/tohnee/weaveboard/main/weaveboard-offline.html"
curl -fsSL "$REPO_URL" -o assets/weaveboard-offline.html
if ! grep -q 'weaveboard-engine: v' assets/weaveboard-offline.html; then
  echo "警告: 下载的文件缺少引擎版本标记，可能不是有效的引擎文件"
  exit 1
fi
echo "已同步引擎:"
grep -o 'weaveboard-engine: v[0-9]*' assets/weaveboard-offline.html | head -1
