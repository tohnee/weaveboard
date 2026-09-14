#!/usr/bin/env node
// inject_data.mjs — 用新 JSON 更新既有看板 HTML 的内嵌数据块（不改动引擎其余部分）
// 用法: node inject_data.mjs <看板.html> <data.json> [-o 输出.html（缺省原地覆盖）]
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [htmlPath, dataPath, ...rest] = process.argv.slice(2);
if (!htmlPath || !dataPath) {
  console.error('用法: node inject_data.mjs <看板.html> <data.json> [-o 输出.html]');
  process.exit(2);
}
const i = rest.indexOf('-o');
const outPath = i > -1 && rest[i + 1] ? resolve(rest[i + 1]) : resolve(htmlPath);

const data = JSON.parse(await readFile(dataPath, 'utf8'));
if (!Array.isArray(data.cards) || !data.cards.length) {
  console.error('错误: data.cards 为空或不为数组');
  process.exit(1);
}
const html = await readFile(resolve(htmlPath), 'utf8');
const re = /<script type="application\/json" id="weaveboard-seed">[\s\S]*?<\/script>/;
if (!re.test(html)) {
  console.error('错误: 目标 HTML 没有内嵌数据块。请用 new_board.mjs 重新生成，或先升级引擎（sync_engine.sh）。');
  process.exit(1);
}
const seedJson = JSON.stringify(data, null, 2).replace(/<\//g, '<\\/');
await writeFile(outPath, html.replace(re, `<script type="application/json" id="weaveboard-seed">${seedJson}</script>`), 'utf8');
console.log(`已更新内嵌数据: ${outPath}`);
console.log('注意: 浏览器里若已有该看板的 LocalStorage 数据，会优先于内嵌数据——在应用内「数据与备份 → 清空看板」或清理站点数据后重开。');
