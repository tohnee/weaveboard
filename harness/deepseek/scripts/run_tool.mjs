#!/usr/bin/env node
// run_tool.mjs — harness 工具执行入口：node run_tool.mjs <工具名> <JSON参数载荷>
// 安全约束：工具名走白名单；参数中的路径必须位于当前工作目录或插件目录内；
// 一律以参数列表 spawn（shell: false），不经过任何 shell 解释。
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [name, payloadRaw] = process.argv.slice(2);
let args = {};
try { args = JSON.parse(payloadRaw || '{}'); } catch { console.error('参数载荷不是合法 JSON'); process.exit(2); }

// positional: 按脚本位置参数顺序传递（min = 最少必传个数）；flags: 映射为 -o 等命令行标志
const SCRIPTS = {
  validate_board: { file: 'scripts/validate_board.mjs', runner: 'node', positional: ['data_path'], min: 1, flags: {} },
  new_board: { file: 'scripts/new_board.mjs', runner: 'node', positional: ['data_path'], min: 1, flags: { output_path: '-o', engine_path: '--engine' } },
  inject_data: { file: 'scripts/inject_data.mjs', runner: 'node', positional: ['html_path', 'data_path'], min: 2, flags: { output_path: '-o' } },
  sync_engine: { file: 'scripts/sync_engine.sh', runner: 'bash', positional: [], min: 0, flags: {} },
};
const spec = SCRIPTS[name];
if (!spec) { console.error('未知工具: ' + name); process.exit(2); }
const unknown = Object.keys(args).filter(k => !spec.positional.includes(k) && !(k in spec.flags));
if (unknown.length) { console.error('未知参数: ' + unknown.join(', ')); process.exit(2); }

const roots = [process.cwd(), SKILL_DIR];
function safe(v) {
  const s = String(v);
  if (s.startsWith('-')) throw new Error('非法参数（疑似选项注入）: ' + s);
  const p = path.resolve(s);
  if (!roots.some(r => p === r || p.startsWith(r + path.sep))) throw new Error('路径越界（只允许工作目录或插件目录内）: ' + s);
  return s;
}
let extra = [];
try {
  // 位置参数必须从左连续出现，且不少于 min（防止 flags 被脚本误读为位置参数）
  const lastIdx = spec.positional.map(k => k in args).lastIndexOf(true);
  if (lastIdx >= 0 && spec.positional.slice(0, lastIdx).some(k => !(k in args))) throw new Error('位置参数缺失: ' + spec.positional.join(', '));
  const pos = spec.positional.map(k => (k in args) ? safe(args[k]) : null).filter(v => v != null);
  if (pos.length < spec.min) throw new Error('缺少必传参数: ' + spec.positional.slice(0, spec.min).join(', '));
  const fl = Object.entries(spec.flags).flatMap(([k, flag]) => (k in args) ? [flag, safe(args[k])] : []);
  extra = [...pos, ...fl];
}
catch (e) { console.error(e.message); process.exit(2); }

const r = spawnSync(spec.runner, [path.join(SKILL_DIR, spec.file), ...extra],
  { stdio: ['ignore', 'inherit', 'inherit'], shell: false });
process.exit(r.status ?? 1);
