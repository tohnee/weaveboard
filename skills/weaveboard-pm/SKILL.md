---
name: weaveboard-pm
description: 生成和更新 Weaveboard 技术项目管理看板（单文件 HTML，含 WBS、CPM 关键路径、风险登记册、ADR 决策记录、状态看板、Excel/Word 导出）。当用户要求"生成项目看板/项目管理面板/项目进度板/风险登记/项目报告导出/weaveboard"，或给出项目简报希望可视化跟踪时使用。数据零依赖、纯本地，产出可直接双击打开的看板文件。
---

# Weaveboard PM — 项目管理看板生成

把用户的项目信息变成一个**可直接打开的单文件看板**：里程碑、任务依赖、关键路径、风险登记册、决策记录（ADR）、状态看板，全部内嵌在一个 HTML 里，双击即用，数据不出本机。

## 工作流一：新建看板（最常用）

1. **收集信息**：从用户口述、PRD、周报或 issue 里提取——里程碑（≤3）、任务与负责人/日期、任务依赖（谁卡谁）、风险（概率×影响）、关键决策。信息不全时按 `references/authoring.md` 的口径补全合理默认值，并明确告知用户哪些是假设。
2. **写数据**：严格按 `references/schema.md` 的字段表与枚举生成 `data.json`。布局、依赖建模、风险评分口径遵循 `references/authoring.md`。
3. **校验（必须，直到 0 错误）**：
   ```bash
   node scripts/validate_board.mjs <data.json>
   ```
   输出会给出 CPM 推演完工日期与关键路径链——检查链条能否读成一句话，浮时分布是否合理；不合理先修数据。
4. **生成看板**：
   ```bash
   node scripts/new_board.mjs <data.json> -o <项目名>.html
   ```
   （引擎默认取 `assets/weaveboard-offline.html`；若提示缺内嵌入口，先跑 `scripts/sync_engine.sh`。）
5. **交付**：告诉用户双击打开即见"概览"驾驶舱；所有视图（概览/空间/WBS/看板/时间线/图谱）可直接用；改数据在右侧属性面板编辑，自动保存到浏览器。

## 工作流二：更新看板数据

- 仓库/目录里有 `*.weaveboard.json` 时：编辑 JSON → 再跑校验 → 原地重注入：
  ```bash
  node scripts/inject_data.mjs <看板.html> <data.json>
  ```
- 用户在应用里改过并导出了新 JSON：用它覆盖源 JSON 后走同样流程。
- 提醒：浏览器 LocalStorage 里的数据优先于内嵌数据；注入后需在应用"数据与备份"里清空看板再刷新，或清理站点数据。

## 工作流三：导出报告

指引用户在应用内"数据与备份"操作（无需脚本）：
- **导出 Excel**：5 个工作表（项目概览/任务清单/风险登记册/决策记录/依赖关系），数值单元格可直接汇总。
- **导出 Word 报告**：六章项目报告，可直接当周报/评审材料。
- **导出 JSON/ZIP**：完整数据备份与迁移。

## 硬性规则

1. 生成/修改数据后**必须**跑 `validate_board.mjs` 且 0 错误才允许交付。
2. 字段与枚举以 `references/schema.md` 为唯一依据，不要凭记忆猜字段名。
3. 依赖边（dependencyType）只能连 task/milestone/blocker；组织关系用普通 label 边。
4. 不删除历史决策（ADR）；被推翻的改成 `superseded`。
5. 高风险（评分 ≥6）必须有可执行的 mitigation，并连到具体任务。
6. 交付的看板文件必须由 `new_board.mjs` 产出（保证 `</script>` 转义正确），不要手改 HTML。

## 目录说明

- `assets/weaveboard-offline.html` — 看板引擎（从 GitHub 仓库同步，勿手改）
- `scripts/` — new_board / inject_data / validate_board / sync_engine
- `references/` — schema.md（字段契约）、authoring.md（PM 编写规范）
- `examples/api-refactor.weaveboard.json` — 完整示例数据，可作为起点复制修改
