#!/usr/bin/env node
// validate_board.mjs — weaveboard/v2 数据无头校验 + CPM 关键路径试算
// 用法: node validate_board.mjs <data.json>
// 退出码: 0 = 通过；1 = 有错误；2 = 用法错误
import { readFile } from 'node:fs/promises';

const TRACKED = new Set(['task', 'milestone', 'blocker']);
const KINDS = new Set(['task', 'milestone', 'note', 'person', 'place', 'document', 'image', 'blocker', 'risk', 'decision']);
const STATUS = new Set(['not-started', 'in-progress', 'in-review', 'blocked', 'done']);
const EXECUTORS = new Set(['ai', 'human', 'pair']);
const PRIORITY = new Set(['low', 'medium', 'high', 'critical']);
const DEP_TYPES = new Set(['FS', 'SS', 'FF', 'SF']);
const LEVELS = new Set(['low', 'medium', 'high']);
const RISK_RESPONSE = new Set(['mitigate', 'avoid', 'transfer', 'accept']);
const DECISION_STATUS = new Set(['proposed', 'accepted', 'superseded', 'deprecated']);
const DAY = 86400000;

const [dataPath] = process.argv.slice(2);
if (!dataPath) {
  console.error('用法: node validate_board.mjs <data.json>');
  process.exit(2);
}
const d = JSON.parse(await readFile(dataPath, 'utf8'));
const errors = [], warnings = [];

// ---- 结构与字段（镜像应用内 validate()）----
const ids = new Set();
for (const c of d.cards || []) {
  const label = c.title || c.id || '未命名卡片';
  if (!c.id || ids.has(c.id)) errors.push(`卡片 ID 缺失或重复: ${label}`);
  ids.add(c.id);
  if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) errors.push(`卡片坐标无效: ${label}`);
  if (c.kind && !KINDS.has(c.kind)) errors.push(`卡片类型无效: ${label} (${c.kind})`);
  if (c.progress != null && (c.progress < 0 || c.progress > 100)) errors.push(`进度超出 0-100: ${label}`);
  if (c.status && !STATUS.has(c.status)) errors.push(`状态无效: ${label}`);
  if (c.executor && !EXECUTORS.has(c.executor)) errors.push(`执行者无效（ai/human/pair）: ${label}`);
  if (c.priority && !PRIORITY.has(c.priority)) errors.push(`优先级无效: ${label}`);
  if (c.startDate && c.dueDate && Date.parse(c.startDate) > Date.parse(c.dueDate)) errors.push(`开始日期晚于截止日期: ${label}`);
  if (c.riskProb && !LEVELS.has(c.riskProb)) errors.push(`风险概率无效: ${label}`);
  if (c.riskImpact && !LEVELS.has(c.riskImpact)) errors.push(`风险影响无效: ${label}`);
  if (c.riskResponse && !RISK_RESPONSE.has(c.riskResponse)) errors.push(`风险应对策略无效: ${label}`);
  if (c.decisionStatus && !DECISION_STATUS.has(c.decisionStatus)) errors.push(`决策状态无效: ${label}`);
}
for (const e of d.edges || []) {
  if (!ids.has(e.from) || !ids.has(e.to)) errors.push(`关系指向不存在对象: ${e.id || e.from + '→' + e.to}`);
  if (e.dependencyType && !DEP_TYPES.has(e.dependencyType)) errors.push(`依赖类型无效: ${e.id || ''} (${e.dependencyType})`);
}
for (const c of d.cards || []) if (c.parentId && !ids.has(c.parentId)) errors.push(`父级不存在: ${c.title || c.id}`);
const byId = new Map((d.cards || []).map(c => [c.id, c]));
for (const c of d.cards || []) {
  const seen = new Set([c.id]);
  let p = c.parentId;
  while (p) {
    if (seen.has(p)) { errors.push(`WBS 层级成环: ${c.title || c.id}`); break; }
    seen.add(p);
    p = byId.get(p)?.parentId;
  }
}

// ---- 生成质量提醒（不阻断）----
for (const c of d.cards || []) {
  if (TRACKED.has(c.kind) && (!c.startDate || !c.dueDate)) warnings.push(`任务缺起止日期，将不参与关键路径: ${c.title || c.id}`);
  if (c.kind === 'risk' && !c.mitigation) warnings.push(`风险未写应对措施: ${c.title || c.id}`);
  if (TRACKED.has(c.kind) && !(Number(c.estimateHours) > 0)) warnings.push(`任务缺预计工时，影响 SPI/CPI 与加权进度: ${c.title || c.id}`);
  if (c.kind === 'task' && c.executor === 'ai' && !c.acceptance) warnings.push(`AI 任务缺验收标准，agent 无法自证完成: ${c.title || c.id}`);
}
const depEdges = (d.edges || []).filter(e => e.dependencyType);
if ((d.cards || []).filter(c => TRACKED.has(c.kind)).length > 1 && depEdges.length === 0) {
  warnings.push('任务之间没有任何依赖（FS/SS/…），关键路径无法计算');
}
if (d.board?.baseline?.dates) {
  for (const id of Object.keys(d.board.baseline.dates)) if (!ids.has(id)) errors.push(`基线引用了不存在对象: ${id}`);
}

// ---- CPM 试算（与应用内 criticalPath() 同算法）----
function criticalPath() {
  const tasks = (d.cards || []).filter(c => TRACKED.has(c.kind) && c.startDate && c.dueDate);
  const dur = c => Math.max(1, Math.round((Date.parse(c.dueDate) - Date.parse(c.startDate)) / DAY) + 1);
  const es = new Map(), ef = new Map();
  tasks.forEach(c => { es.set(c.id, Date.parse(c.startDate)); ef.set(c.id, es.get(c.id) + (dur(c) - 1) * DAY); });
  const deps = depEdges.filter(e => byId.has(e.from) && byId.has(e.to) && tasks.some(t => t.id === e.from) && tasks.some(t => t.id === e.to));
  for (let pass = 0; pass < tasks.length; pass++) {
    let changed = false;
    for (const e of deps) {
      const f = byId.get(e.from), t = byId.get(e.to), lag = (Number(e.lagDays) || 0) * DAY, type = e.dependencyType;
      if (type === 'FF') {
        const nf = ef.get(f.id) + lag;
        if (nf > ef.get(t.id)) { ef.set(t.id, nf); es.set(t.id, nf - (dur(t) - 1) * DAY); changed = true; }
      } else {
        const ns = (type === 'SS' ? es.get(f.id) : ef.get(f.id) + DAY) + lag;
        if (ns > es.get(t.id)) { es.set(t.id, ns); ef.set(t.id, ns + (dur(t) - 1) * DAY); changed = true; }
      }
    }
    if (!changed) break;
  }
  const finish = tasks.length ? Math.max(...[...ef.values()]) : null;
  const ls = new Map(), lf = new Map();
  tasks.forEach(c => { lf.set(c.id, finish); ls.set(c.id, finish - (dur(c) - 1) * DAY); });
  for (let pass = 0; pass < tasks.length; pass++) {
    let changed = false;
    for (const e of deps) {
      const f = byId.get(e.from), t = byId.get(e.to), lag = (Number(e.lagDays) || 0) * DAY, type = e.dependencyType;
      let nl;
      if (type === 'SS') nl = ls.get(t.id) - lag;
      else if (type === 'FF') nl = ls.get(t.id) + (dur(t) - 1) * DAY - lag - (dur(f) - 1) * DAY;
      else nl = ls.get(t.id) - lag - dur(f) * DAY;
      if (nl < ls.get(f.id)) { ls.set(f.id, nl); lf.set(f.id, nl + (dur(f) - 1) * DAY); changed = true; }
    }
    if (!changed) break;
  }
  const slack = new Map(), criticalCards = new Set();
  tasks.forEach(c => {
    const s = Math.max(0, Math.round((ls.get(c.id) - es.get(c.id)) / DAY));
    slack.set(c.id, s);
    if (s <= 0) criticalCards.add(c.id);
  });
  return { tasks, slack, criticalCards, finish, deps };
}
const cpm = criticalPath();

// ---- 汇总输出 ----
const fmt = ts => ts == null ? '—' : new Date(ts).toISOString().slice(0, 10);
const chain = [...cpm.criticalCards].map(id => byId.get(id)).filter(Boolean)
  .sort((a, b) => Date.parse(a.startDate || a.dueDate || '9e9') - Date.parse(b.startDate || b.dueDate || '9e9'));
console.log(`看板: ${d.board?.name || '(未命名)'}  模板: ${d.board?.template || 'tech'}`);
console.log(`卡片 ${ (d.cards || []).length }  关系 ${ (d.edges || []).length }  依赖边 ${ depEdges.length }  风险 ${ (d.cards || []).filter(c => c.kind === 'risk').length }  决策 ${ (d.cards || []).filter(c => c.kind === 'decision').length }`);
if (cpm.finish != null) {
  console.log(`CPM 推演完工: ${fmt(cpm.finish)}   关键路径 ${chain.length} 项:`);
  chain.forEach((c, i) => console.log(`  ${i + 1}. ${c.title}  (${c.startDate} → ${c.dueDate})`));
  for (const [id, s] of cpm.slack) if (s > 0) console.log(`  浮时 ${s} 天: ${byId.get(id)?.title || id}`);
}
if (warnings.length) {
  console.log(`\n提醒 ${warnings.length} 项:`);
  warnings.forEach(w => console.log(`  · ${w}`));
}
if (errors.length) {
  console.error(`\n错误 ${errors.length} 项:`);
  errors.forEach(e => console.error(`  × ${e}`));
  process.exit(1);
}
console.log(`\n校验通过 ✓`);
