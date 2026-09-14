# weaveboard/v2 数据契约

生成或修改看板数据时的唯一依据。所有枚举值必须精确匹配；日期为 `YYYY-MM-DD`，时间为 `HH:MM`。

## 顶层结构

```json
{
  "format": "weaveboard/v2",
  "version": 2,
  "board":  { "id", "name", "template", "view", "camera" },
  "cards":  [ ... ],
  "edges":  [ ... ],
  "assets": [],
  "settings": { "gravity": 0.045, "damping": 0.91, "reducedMotion": false, "ropeLayer": "behind-cards", "focusRopes": true }
}
```

- `board.template`: `"tech"`（技术项目，含概览/看板视图）或 `"travel"`（旅行规划，含行程视图）
- `board.view`: 默认打开的视图，技术模板推荐 `"dashboard"`；可选 `space / dashboard / wbs / kanban / timeline / graph / trip`
- `camera`: `{ "zoom": 0.8, "offsetX": 20, "offsetY": 10 }`，可省略

## 卡片 cards[]

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | **必填**，全板唯一，建议短语义 id（如 `m1`、`writepath`） |
| `kind` | enum | **必填**，见下方类型表 |
| `title` | string | **必填** |
| `body` | string | 描述；风险写影响场景，决策写背景与代价 |
| `x` / `y` / `w` | number | 画布坐标与宽度，建议 `w` 245–280，卡片从左到右按流程排布，画布 2400×1600 |
| `tilt` | number | 视觉微倾角，-2 ~ 2 随机取值即可 |
| `meta` | string | 底部脚注，可省略（有 progress 的卡片会覆盖它） |
| `accent` | string | 顶条颜色，建议取 palette 对应色 |

### kind 类型表（palette 色）

| kind | 中文 | accent | 用途 |
|---|---|---|---|
| `task` | 任务 | `#8fb5ff` | WBS 参与方，可挂依赖 |
| `milestone` | 里程碑 | `#f4b860` | 关键节点，参与 CPM |
| `blocker` | 阻塞 | `#e7746b` | 受阻项，参与 WBS/CPM |
| `risk` | 风险 | `#d9954f` | 风险登记册条目 |
| `decision` | 决策 | `#7d95b5` | ADR 决策记录 |
| `person` | 人物 | `#b496e8` | 干系人 |
| `document` | 文档 | `#78b8aa` | 参考资料 |
| `note` | 便签 | `#e8cf68` | 备注/预算 |
| `place` | 地点 | `#e99d85` | 地点（旅行模板常用） |
| `image` | 图片 | `#7ba68f` | 附件卡（本 skill 不生成） |

### WBS / CPM 字段（kind ∈ task/milestone/blocker）

| 字段 | 说明 |
|---|---|
| `parentId` | 父级卡片 id；顶层任务省略。**不得成环** |
| `wbsOrder` | 同级排序号，从 1 起 |
| `status` | `not-started` 未开始 / `in-progress` 进行中 / `blocked` 受阻 / `done` 已完成 |
| `priority` | `low` / `medium` / `high` / `critical` |
| `assignee` | 负责人姓名 |
| `startDate` / `dueDate` | 起止日期；**两个都有才参与关键路径计算**，且 start ≤ due |
| `estimateHours` / `actualHours` | 预计/实际工时（数字） |
| `progress` | 0–100（数字）；status 为 done 时应用会强制 100 |

### 风险字段（kind = risk）

| 字段 | 说明 |
|---|---|
| `riskProb` | `low` 低 / `medium` 中 / `high` 高（=1/2/3 分） |
| `riskImpact` | 同上；**风险分 = 概率 × 影响（1–9），≥6 视为高风险进驾驶舱** |
| `riskResponse` | `mitigate` 减轻 / `avoid` 规避 / `transfer` 转移 / `accept` 接受 |
| `mitigation` | 应对措施，一句话可执行 |

### 决策字段（kind = decision）

| 字段 | 说明 |
|---|---|
| `decisionStatus` | `proposed` 提议中 / `accepted` 已接受 / `superseded` 已替代 / `deprecated` 已废弃 |
| `decisionDate` | 决策日期 |

## 关系 edges[]

| 字段 | 说明 |
|---|---|
| `id` | 必填且唯一（如 `e1`、`e2`） |
| `from` / `to` | 卡片 id，**必须存在**；方向语义 = "from 指向/支撑/驱动 to" |
| `color` | 绳索颜色；依赖边建议 `#597fba`，风险边 `#d9954f`，决策边 `#7d95b5`，人物边 `#b496e8`，普通关联 `#4c8c76` |
| `label` | 关系名（无 dependencyType 时显示） |
| `dependencyType` | `FS` 完成→开始 / `SS` 开始→开始 / `FF` 完成→完成 / `SF` 开始→完成。**仅当 from、to 都是 task/milestone/blocker 时使用** |
| `lagDays` | 滞后天数（数字 ≥ 0），仅依赖边有意义 |

## 硬性校验规则（validate_board.mjs 会拦截）

1. 卡片 id 非空且不重复；x/y 为数字
2. progress ∈ [0,100]；startDate ≤ dueDate
3. 所有枚举字段取值合法
4. 边引用的卡片存在；依赖类型合法
5. parentId 存在且不成环
6. 旅行字段（travelType/day/cost/bookingStatus）如使用需合法（本 skill 一般不用）
