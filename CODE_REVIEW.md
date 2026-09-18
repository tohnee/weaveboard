# Weaveboard Offline 代码审查与修复说明

## 2026-09 迭代七：改名 Task Board + 制图桌视觉重做（引擎 v6）

### 改名（用户可见面）

- 产品更名 **Task Board**（原 Weaveboard）：`<title>`、顶栏品牌（新 SVG 网格徽标 + "PROJECT PLANNING · LOCAL FIRST"）、hint 文案（编织→建立）、docx 报告头与 Heading1 色（绿→普鲁士蓝 1F4A96）、中英 README 标题与首段（标注"原名 Weaveboard"）、docs/index.html（Pages 应用本体，与引擎同步 v6）。
- 技术标识不变：weaveboard/v2 数据契约、seed 标签 id、LocalStorage 键、GitHub 仓库名与 URL（外发身份，未动）。

### 视觉系统：制图桌（Drafting Studio）

- 两个 `<style>` 块整块重写（选择器集合不变，纯换肤零结构风险）：冷调胶片底 #EDF1F6 / 画布制图纸 #F7F9FC（蓝灰细网格）/ 纯白卡片 / 普鲁士墨蓝 #1B2A41 / 行动蓝 #2D5FB8 / 红铅笔 #D9483B 关键路径 / 琥珀 #C07A15 受阻 / 等宽数字，全部去衬线。
- 签名元素：顶栏分段式视图切换器（凹槽轨道+白卡选中）；深普鲁士渐变 hero；卡片完全水平（移除 tilt 渲染，数据保留）；绳索重绘为制图连线（普通钢蓝 .58α、活跃 .95α、关键路径砖红 #C93A2E 2.6px .85α、冷影 #1B2A41 .12α）。
- 新功能：WBS 甘特表头日期刻度（min..max 均分 6 格 MM-DD 等宽小字，renderWbs 内联生成）。

### 两轮视觉迭代（浏览器实测 + 视觉模型评审）

- 首轮评审（概览 7.5 / 空间 85 / WBS 8.5 / 看板 8.7）后修：hero 警示卡浅红底深红字提对比；顶栏投影；甘特计划条加深 + 日期刻度；进度/负载条轨道加深；卡片去倾斜；关键绳索降饱和变细；看板白卡加投影、受阻列淡底、进度条 5px。
- 二轮评审（概览 8 / 空间 8.5 / WBS 8.5-9）后修：受阻甘特条红→琥珀（与关键路径红框解耦）；关键行去红色标题（保留行底+红框+红编号）；工具栏投影加档。
- 功能冒烟：七视图切换、检查器编辑、设为基线（基线偏差 chip 出现）、6 格刻度、撤销/重做按钮、toast 均正常；JS 语法检查通过。

### 产物同步

- 四张 README 截图重拍（docs/assets/{dashboard,space,wbs,kanban}.png，1440×900）；skill 引擎资产同步 v6（skills/weaveboard-pm/assets/）。

## 2026-09 迭代六：全量安全扫描 + 按 DeepSeek Harness 官方规范重写插件

### 全量安全扫描（mimosa deep scan）

- 结论：**0 发现**，扫描封印 `sha256:ad5a49516de2dc295560cca89ac0c41fec491942d40d59b48e89e38feccbb879`，scanId `scan-2026-09-16T04-46-00.392Z-d002f58bf005`（证据边界：static_only_no_runtime_execution）。
- 迭代五中安全 hook 拦截的 SSRF / 命令注入模式（agent.py 时代）在最终代码中已不存在——本轮直接删除了整个 OpenAI 适配层。

### DeepSeek Harness 官方规范调研（推翻上一轮假设）

- 上一轮 README 曾写"DeepSeek 官方没有发布名为 harness 的插件规范"——**该判断错误**。官方项目真实存在：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（CLI `dsh`，"Everything is a Plugin"，Cordis 内核），产品页 [deepseek.com/harness](https://www.deepseek.com/harness/en/)，文档 [deepseek-harness.github.io](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/)，`@deepseek-ai/dsh-tools` 已发布 npm。
- 插件真实形态：导出 `apply(ctx)` 的 ESM 模块 + `inject=['tools']`，`ctx.tools.register(defineTool({...}))`；分发为 bundle（package.json 声明 `dsh.bundle` 指向 `cordis.patch.yml` 配置层），`dsh plugin --profile <name> add <path>` 安装。

### 重写 harness/deepseek/ 为官方 dsh bundle

- 新结构：`package.json`（dsh.bundle 清单，files 只含 index.js/cordis.patch.yml/scripts/README）+ `cordis.patch.yml` + `index.js`（defineTool × 4）+ `scripts/`（执行器与四个工具脚本，与 skill 同源）。删除 agent.py / tools.json / system_prompt.md。
- 引擎不随包分发：首跑 `weaveboard_sync_engine` 从 GitHub 拉最新引擎（避免第三份入库副本漂移）；`assets/` 加入 .gitignore。
- 契约对齐：参数 DSL（`{type, required, description}`）、`output.schema` 值 schema、`output.render` 模型侧内容、`presentCall` 纯函数卡片投影、`exec.signal` 透传子进程、退出码语义（0 成功 / 1 领域失败返回 `ok:false` / ≥2 基础设施或策略拒绝抛 isError）。

### 执行器加固（run_tool.mjs，skill 与 bundle 双份同步）

- 修复：`output_path` 之前按位置参数传给 new_board.mjs（期望 `-o` 标志）被静默忽略——改为 positional/flags 映射表。
- 修复：flags-only 调用（缺 data_path）会把 `-o` 误当位置参数——新增 `min` 最少位置参数约束 + 连续前缀校验，统一 exit 2 拒绝。
- 新增：未知参数名拒绝（白名单之外一律 exit 2）。
- sync_engine.sh：`--http1.1` + 3 次重试（实测 raw.githubusercontent.com HTTP/2 偶发 framing/SSL 错误）；网络总失败改 exit 2（基础设施故障 → isError），下载内容无效保持 exit 1。

### 回归验证

- 执行器矩阵（bundle+skill 双份）：正常链路 exit 0；`/etc/passwd` 越界 exit 2；未知参数 exit 2；缺必传位置参数 exit 2；`-o` 输出路径生效（115,647 字节成品 HTML 含内嵌数据）。
- **真实 dsh-tools 冒烟**（/tmp 安装 `@deepseek-ai/dsh-tools@0.0.1-rc.1` 全家 + 桩 ctx 驱动 apply）：首轮抓出两处只对着已发布包才会暴露的契约违规——value schema 对象必须显式 `additionalProperties`、不支持对象级 `required` 数组（改属性内联 `required: true`）；修复后 4 工具注册、validate/new_board 执行、越界抛错、render/presentCall 契约全部通过。

## 2026-09 迭代五：Claude 风格重设计 + 工程管理强化 + harness 适配

### UI（Claude 设计语言）

- 全站换装：暖象牙底（--ivory #F0EEE6 / --paper #FAF9F5）、黏土橙点缀（--clay #D97757，选中环/关键路径/焦点/CTA）、墨色主按钮与深墨英雄区、衬线标题 + 等宽数据、大圆角；印章"织"徽标改黏土渐变。
- 调色板全面柔和化（JS palette + 种子 accent + 边颜色共 60 处替换）；绳索参数回浅色画布（暖墨阴影 .13、关键路径黏土深 #BD5D3A）。
- 新增 `.gantt>b`（基线虚线条）与 `.load-row`（人力负载行）样式。

### 工程管理能力

- **基线**：WBS「设为基线」生成 `board.baseline={savedAt,dates}`；甘特叠加基线虚线条；汇总条显示最大顺延 chip；行提示含逐项偏差；校验器与应用内 validate 均校验基线引用。
- **SPI/CPI**：EV=Σ(进度%×预计工时)、PV=Σ已到期任务预计工时、AC=Σ实际工时；驾驶舱 chip <0.9 标红；xlsx/docx 概览表新增三行（SPI/CPI/基线偏差）。
- **人力负载**：驾驶舱左栏新增按负责人聚合（实际/预计工时条 + 受阻计数，超载标橙）。
- skill 同步：schema 增基线结构、authoring 增工时纪律一节、SKILL.md 增"周度维护"工作流、validate_board 增工时缺失提醒与基线校验。

### DeepSeek harness 适配（harness/deepseek/）

- system_prompt.md（SKILL.md 蒸馏）+ tools.json（OpenAI 格式 4 工具）+ agent.py（零依赖，http.client 字面量官方端点、工具白名单、subprocess 固定 argv）+ scripts/run_tool.mjs（路径边界校验执行器，/etc/passwd 拒绝 exit 2）。
- 安全 hook 拦截两轮后收敛：URL 字面量内联 + 动态参数改 JSON 载荷传递，命令注入与 SSRF 检查项清零。

### 回归验证

- 语法通过；浏览器实测：SPI 0.35（红）/CPI 1.39 与手算一致；负载五行（郑 46/120h·1受阻 等）；设基线（7 条虚线、0d chip）→ 关键任务顺延 7 天 → chip "+7d"、行提示"关键路径 · 浮时 0 天 · 基线偏差 +7 天"；Excel 导出含新指标行；run_tool 正常执行 + 越界拒绝；四张截图重拍，视觉复核确认无遮挡、风格达成。

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
