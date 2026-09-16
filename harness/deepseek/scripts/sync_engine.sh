#!/usr/bin/env bash
# sync_engine.sh — 从 GitHub 仓库同步最新引擎到本 bundle 的 assets/
# --http1.1 + 三次重试：raw.githubusercontent.com 在部分网络下 HTTP/2 不稳定
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p assets
REPO_URL="https://raw.githubusercontent.com/tohnee/weaveboard/main/weaveboard-offline.html"
ok=0
for i in 1 2 3; do
  if curl -fsSL --http1.1 --retry 2 "$REPO_URL" -o assets/weaveboard-offline.html; then ok=1; break; fi
  echo "第 $i 次拉取失败，重试…" >&2
  sleep 2
done
if [ "$ok" != 1 ]; then
  echo "错误: 连续 3 次拉取引擎失败（网络原因）。可稍后重试，或手动下载 $REPO_URL 放到 assets/weaveboard-offline.html" >&2
  exit 2
fi
if ! grep -q 'weaveboard-engine: v' assets/weaveboard-offline.html; then
  echo "警告: 下载的文件缺少引擎版本标记，可能不是有效的引擎文件"
  exit 1
fi
echo "已同步引擎:"
grep -o 'weaveboard-engine: v[0-9]*' assets/weaveboard-offline.html | head -1
