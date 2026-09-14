#!/usr/bin/env node
// new_board.mjs — weaveboard/v2 JSON + 引擎 → 内嵌数据的成品看板 HTML
// 用法: node new_board.mjs <data.json> [-o 输出.html] [--engine 引擎.html]
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [dataPath, ...rest] = process.argv.slice(2);
if (!dataPath) {
  console.error('用法: node new_board.mjs <data.json> [-o 输出.html] [--engine 引擎.html]');
  process.exit(2);
}
const opt = (flag, fallback) => {
  const i = rest.indexOf(flag);
  return i > -1 && rest[i + 1] ? resolve(rest[i + 1]) : fallback;
};
const outPath = opt('-o', resolve(dataPath.replace(/\.weaveboard\.json$|\.json$/i, '') + '.html'));
const enginePath = opt('--engine', new URL('../assets/weaveboard-offline.html', import.meta.url).pathname);

const data = JSON.parse(await readFile(dataPath, 'utf8'));
if (!Array.isArray(data.cards) || !data.cards.length) {
  console.error('错误: data.cards 为空或不为数组');
  process.exit(1);
}
if (!data.board?.name) {
  console.error('错误: 缺少 board.name');
  process.exit(1);
}

const engine = await readFile(enginePath, 'utf8');
const SEED_TAG = '<script type="application/json" id="weaveboard-seed"></script>';
if (!engine.includes(SEED_TAG)) {
  console.error(`错误: 引擎 ${enginePath} 缺少内嵌数据入口（需要 weaveboard-engine v3+）。\n请先运行 scripts/sync_engine.sh 同步最新引擎。`);
  process.exit(1);
}
// `</` 转义为 `<\/`（JSON 合法转义），防止数据里的字符串提前闭合 script 标签
const seedJson = JSON.stringify(data, null, 2).replace(/<\//g, '<\\/');
const html = engine.replace(SEED_TAG, `<script type="application/json" id="weaveboard-seed">${seedJson}</script>`);

await writeFile(outPath, html, 'utf8');
console.log(`已生成: ${outPath}`);
console.log(`双击即可打开（浏览器无旧数据时自动载入「${data.board.name}」）；`);
console.log(`打开后可在「数据与备份」里导出 Excel / Word 报告。`);
