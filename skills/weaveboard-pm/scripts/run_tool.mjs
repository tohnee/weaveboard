#!/usr/bin/env node
// run_tool.mjs — harness 工具执行入口：node run_tool.mjs <工具名> <JSON参数载荷>
// 安全约束：工具名走白名单；参数中的路径必须位于当前工作目录或 skill 目录内；
// 一律以参数列表 spawn（shell: false），不经过任何 shell 解释。
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [name, payloadRaw] = process.argv.slice(2);
let args = {};
try { args = JSON.parse(payloadRaw || '{}'); } catch { console.error('参数载荷不是合法 JSON'); process.exit(2); }

const SCRIPTS = {
  validate_board: { file: 'scripts/validate_board.mjs', keys: ['data_path'], runner: 'node' },
  new_board: { file: 'scripts/new_board.mjs', keys: ['data_path', 'output_path'], runner: 'node' },
  inject_data: { file: 'scripts/inject_data.mjs', keys: ['html_path', 'data_path'], runner: 'node' },
  sync_engine: { file: 'scripts/sync_engine.sh', keys: [], runner: 'bash' },
};
const spec = SCRIPTS[name];
if (!spec) { console.error('未知工具: ' + name); process.exit(2); }

const roots = [process.cwd(), SKILL_DIR];
function safe(v) {
  const s = String(v);
  if (s.startsWith('-')) throw new Error('非法参数（疑似选项注入）: ' + s);
  const p = path.resolve(s);
  if (!roots.some(r => p === r || p.startsWith(r + path.sep))) throw new Error('路径越界（只允许工作目录或 skill 目录内）: ' + s);
  return s;
}
let extra = [];
try { extra = spec.keys.filter(k => k in args).map(k => safe(args[k])); }
catch (e) { console.error(e.message); process.exit(2); }

const r = spawnSync(spec.runner, [path.join(SKILL_DIR, spec.file), ...extra],
  { stdio: ['ignore', 'inherit', 'inherit'], shell: false });
process.exit(r.status ?? 1);
