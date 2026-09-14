# Weaveboard Offline 代码审查与修复说明

## 2026-09 迭代四：Agent Skill 化与发布

### 应用侧改动

- **内嵌数据冷启动**：`<script type="application/json" id="weaveboard-seed">` 块 + 启动顺序 `LocalStorage → 内嵌 seed → 默认种子`，载入内嵌数据时 toast 提示。这是 skill 管线的使能改动：HTML 成为可注入数据的"模板"。
- 数据注入的 `</script>` 闭合风险由生成脚本统一转义（`</` → `<\/`，JSON 合法转义）。
- 首次选中卡片初始化修复（原硬编码 `selected='prototype'`）。

### Skill 包（skills/weaveboard-pm/）

- `new_board.mjs`：数据 + 引擎 → 内嵌 seed 的成品看板；`inject_data.mjs`：原位更新数据块（单块校验）；`sync_engine.sh`：从仓库同步引擎并校验版本标记。
- `validate_board.mjs`：镜像应用 `validate()` 全部规则 + CPM 无头移植（与应用同算法），输出关键链与浮时；错误 exit 1。
- `references/schema.md`（字段契约）+ `authoring.md`（PM 编写规范）+ `examples/api-refactor.weaveboard.json`。

### 验证记录

- 脚本：示例数据校验通过且关键链（阻塞→影子流量→M2）与浏览器实测一致；坏数据 8 项错误全命中、exit 1；生成注入后 seed 块唯一且 JSON 可解析。
- E2E：`new_board` 产物部署后清空 LocalStorage 冷启动，自动载入生成项目（toast「已载入内嵌项目数据」），驾驶舱关键链与校验器输出一致。
- 本地安装到 `~/.zcode/skills/weaveboard-pm` 并复跑校验通过。

### 发布化

双语 README（英文主 + README.zh-CN.md）、MIT License、PROMOTION.md 推广手册、docs/（Pages 演示页 + 四视图截图）。

## 2026-09 迭代三：Excel 与 Word 报告导出

### 实现方式

零依赖手写 OpenXML：`.xlsx` 与 `.docx` 本质是 ZIP 包裹的 XML，复用应用内已有的 `makeZip`（STORE 模式 + CRC32）写入器，不引入任何外部库。

- **`exportXlsx()`**：5 个工作表（项目概览/任务清单/风险登记册/决策记录/依赖关系）。单元格用 `inlineStr` 规避 sharedStrings 部件；工时/进度/浮时/滞后存为真实数值单元格（可直接 SUM/筛选）；表头走 `styles.xml` 的加粗字体样式（`cellXfs` xf 1）。部件：`[Content_Types].xml`、`_rels/.rels`、`xl/workbook.xml`(+rels)、`xl/styles.xml`、`xl/worksheets/sheet1-5.xml`。
- **`exportDocx()`**：报告体 `wP()`（段落，支持 Title/Heading1 样式）+ `wTbl()`（表格，显式六向边框 + 表头底纹 `EAF1EC`，`tblW pct` 自适应）。六个章节：项目概览、关键路径、WBS、风险登记册、决策记录、依赖关系；风险应对措施超 200 字符自动截断加省略号。部件：`[Content_Types].xml`、`_rels/.rels`、`word/_rels/document.xml.rels`、`word/styles.xml`、`word/document.xml`（A4 `sectPr`）。
- 数据准备收敛到 `pmData()` 单一来源，两处导出与概览视图共享同一套口径（任务数/进度/受阻/高风险/关键路径/完工推演/工时）。
- 入口在"数据与备份"弹窗，与 JSON/ZIP 导出一样先过 `validate()` 校验；旅行模板下风险/决策表为仅表头的空表，导出路径一致。

### 回归验证

- 浏览器实测拦截导出 blob 并页内解包：xlsx 10 部件、docx 5 部件齐全；workbook 含中文工作表名；任务清单表头含加粗样式与 inlineStr；docx 六个章节标题、关键路径链（含"浮时 0 天"）、风险表内容（对账措施）均在；两文件共 15 个 XML/rels 部件全部通过 DOMParser 良构校验（无 parsererror，即 Office 打不开的"文件损坏"类问题排除）。
- 旅行模板导出：概览含旅行名，风险表仅表头，任务表 7 行（表头+6 任务），空表不崩溃。

## 2026-09 迭代二：重构为技术项目管理面板

### 机制映射

| PM 机制 | 实现 |
|---|---|
| 依赖管理（PDM 前导图） | 边上 `dependencyType`（FS/SS/FF/SF）+ `lagDays`；检查器内可改类型、改滞后、删关系；连接工具对任务对自动建 FS |
| 关键路径（CPM） | `criticalPath()` 对有起止日期的任务做前向/后向松弛（迭代至稳定，含环安全上界）；浮时=LS−ES；关键边按 ES/EF 绑定关系判定。`render()` 每轮重算并写入全局 `crit`，被绳索、WBS、看板、概览四处消费 |
| 风险登记册 | 新 `risk` 类型：`riskProb/riskImpact`（低中高→1/2/3）、`riskResponse`、`mitigation`；风险分=概率×影响；≥6 分进驾驶舱；卡片元信息显示 `高×高` |
| 决策记录（ADR） | 新 `decision` 类型：`decisionStatus`（提议中/已接受/已替代/已废弃）+ `decisionDate` |
| 状态看板 | 新 `kanban` 视图：四列按状态分组、按截止日排序、`→` 按钮推进状态、关键路径角标 |
| 管理驾驶舱 | 新 `dashboard` 视图：指标带（任务/完成工时进度/受阻/高风险/7 天到期/工时投入）+ 关键路径链 + 阻塞清单 + 风险排序 + 决策记录 + 到期清单 |
| 模板系统 | "模板"弹窗可选技术项目/旅行规划；`syncViewButtons()` 按模板显隐视图按钮（旅行隐藏概览与看板、技术隐藏行程），`switchView` 对不适用视图回退到空间 |

### 开发中修掉的问题

- **CPM 后向 pass 公式错误**：初版 `LS(前序)=LS(后继)−1天−滞后` 漏减前序自身工期，正确为 `LS(前序)=LS(后继)−滞后−dur(前序)`（FF/SS 各有对应式）。症状：种子数据只标出 1 个关键项，应为 4 项链；浏览器回归发现后修正。
- 种子看板从产品发布演示重写为「交易链路重构 · V2 网关」：2 里程碑、2 任务链、1 阻塞、3 风险、2 条 ADR、13 条边（含 FS/SS 混合依赖），关键路径 = 契约测试→写路径双写→读路径灰度→M2。

### 回归验证

- 语法检查通过；无旧标识残留（travelBtn/旧种子标题计数 0）。
- 浏览器实测：驾驶舱关键链 4 项与推演完工日期正确、风险分 9/6/4 降序；看板四列分布与"→"推进 + 撤销恢复；WBS 4 行关键高亮、浮时提示（M1 40 天/回填 7 天）、汇总条（7 任务/41%/1 受阻/4 关键/320h·80h）；风险面板字段区（9/9 分、策略、措施）；依赖类型 FS↔SS 切换与撤销；双模板往返切换 + 视图按钮自适应；两张截图（驾驶舱、空间关键路径红绳）经视觉模型检查无阻断问题。

## 2026-09 迭代一：修复清单与回归记录

### 修复的问题

1. **每帧 O(n²) DOM 查询**：`cardHeight` 每次调用都对 `#cardLayer` 做 `querySelectorAll`，而 `eraseCardSilhouettes` 每帧对每张卡各调一次。改为 `renderCards` 末尾一次性测量写入 `heights` Map，`cardHeight` 读缓存；`fit()` 同步改用实测高度（原为 145px 估算）。
2. **撤销/重做缺失**：新增 40 步 JSON 历史栈，入口在防抖 `save()` 回调（`pushHistory`，按内容去重）。实现过程中修掉两个叠加缺陷：其一，编辑后的当前状态也被压栈，首次 undo 弹出的是与现状相同的快照（差一错误），修复为 `undo()` 先弹出与当前一致的栈顶；其二，历史快照包含 `exportedAt` 时间戳，而每次防抖保存都会改写该字段，导致内容相同的状态比较不相等（启动时产生幻影历史条目、撤销判定漂移），修复为 `stateBody()` 统一剔除 `exportedAt` 后再做历史比较。`restoreFrom()` 设置 `suppressPush` 抑制 restore 渲染期间 `switchView→save` 的重入 push（该 push 会污染历史并清空 redo 栈）；`redo()` 对称处理并用不去重的 `historyPush`。
3. **多选只高亮不可操作**：`cardDown` 在按下的卡片属于 `multi` 时构建 `drag.items`（含相对偏移），pointermove 整组同步位移；Delete/Backspace 走 `deleteCards` 删除全部选中；Shift 点选加入多选（原 Shift 点选仅"不清空"）。
4. **选中态全量重渲**：点选卡片由 `renderCards()`（整层 innerHTML 重建）改为 `syncCardStates()`（仅切换 class）。
5. **死代码**：SVG 时代的 `.rope-layer/.rope/.rope-shadow` CSS、`loadPackage` 中 `r.path/r.shadow` 清理残留、从未使用的 `assetUrls` 变量。
6. **配置项形同虚设**：`settings.reducedMotion`（含 `prefers-reduced-motion` 媒体查询）生效时绳索物理关闭（damp=1、gravity=0、快速收敛、CSS 过渡禁用）；`settings.focusRopes` 生效时选中对象后无关绳索透明度降至 35%。

### 设计完善

- 字号体系整体上调一档（8/9/10/13/14/15px → 10/11/12/14/15/16px，7px 徽章→9px），WBS 网格列宽与最小宽度同步加宽。
- `:focus-visible` 键盘焦点环；工具按钮补 `title` 提示；提示条文案从实现口吻（"Canvas 底层连线 · 卡片轮廓自动挖空"）改为用户口吻。
- Esc 逐级取消（弹窗 → 连接模式 → 多选）；创建对象 / 行程项目 / 搜索弹窗支持回车提交或选中首条结果。
- 保存状态徽章文案："等待保存"→"保存中…"。

### 回归验证

- 提取内联脚本 `vm.Script` 语法检查通过；死代码引用计数为 0。
- 浏览器实测（每步含 toast 断言）：无编辑时撤销提示"当前已是最早状态"且不产生幻影历史；删除→Ctrl+Z 恢复→Ctrl+Shift+Z 重做；连续两次删除后连撤两步完整回到种子看板；Shift 点选 2 张卡片成组删除（7→5）并整体恢复（5→7）；WBS 4 行含甘特条且无横向溢出；旅行模板 4 日程组 12 项双币种统计正确；行程弹窗回车新增项目；旅行属性面板 10 个字段齐全；截图目检绳索不穿卡片、四栏布局无重叠、模型视觉评分 8.5/10 无阻断问题。

## 根因（上一轮）

旧版同时使用 CSS `z-index` 和动态 SVG `mask` 隐藏卡片内部的连线。图层顺序本身没有明显错误，但动态蒙版包含旋转矩形、动态 DOM 更新与 SVG 滤镜；在 `file://` 本地文件模式和部分 Safari 渲染路径中，蒙版可能不稳定，导致绳索仍显示在卡片之上或卡片内部。

## 本次结构性修复

1. 删除页面中的 SVG 连线节点、动态 mask 和遮挡矩形节点。
2. 使用独立 `ropeCanvas` 绘制 Verlet 绳索，Canvas 固定在 `z-index: 0`。
3. 卡片 DOM 固定在 `z-index: 10`，连线层设置 `pointer-events: none`。
4. 每一帧先绘制绳索和阴影，再以 `destination-out` 清除所有卡片轮廓范围内的连线像素。
5. 清除轮廓使用绝对坐标计算旋转圆角矩形，不依赖 Canvas 临时变换，减少不同渲染实现的差异。
6. 拖动时同步更新连接端点；卡片移动、旋转或内容高度变化后，下一帧自动重新挖空。

因此现在有两层保证：即使 CSS 堆叠上下文出现差异，Canvas 中位于任何卡片范围内的连线像素也已经被删除。

## 旅行规划扩展

- 新增“旅行模板”和“行程”视图。
- 数据模型新增 `travelType`、`day`、`city`、`address`、`startTime`、`endTime`、`bookingStatus`、`cost`、`currency`、`confirmation` 字段。
- 支持交通、住宿、景点、餐饮、活动、预算、旅行待办和整段旅行。
- 行程按天分组，汇总已录入费用、已预订/确认项目和待决定项目。
- 旅行项目可以参与空间连线、WBS、时间线、JSON/ZIP 导入导出和本地版本快照。
- 导出校验新增旅行类型、天数序号、费用、预订状态和同日时间顺序检查。

## 回归检查

- JavaScript 语法检查通过。
- 单文件运行时初始化、LocalStorage 保存、旅行模板切换、行程分组和旅行属性面板检查通过。
- Canvas 像素级回归：7 张示例卡片中心共检查 567 个采样点，连线泄漏像素为 0。
- 示例画布实际绘制 4,463 个非透明绳索像素，确认测试不是“没有绘制连线”的假通过。
