# 冲星推广手册（PROMOTION）

> 代码只能保证"值得被 star"，星数来自传播。这份手册是冷启动的可执行清单。

## 定位一句话

**"Notion 太重、Jira 太贵、Excel 太散——一个 HTML 文件搞定技术项目管理的全部。"**

差异点排序（传播时按此优先级讲）：
1. **单文件零依赖离线**：双击即用，数据不离机（隐私 + 便携，最易传播的点）
2. **真 PM 机制**：CPM 关键路径/浮时、PDM 四种依赖、风险评分、ADR——不是玩具
3. **零依赖导出真 Excel/Word**：手写 OpenXML 这个技术点本身就有传播价值
4. **Agent Skill**：AI 一句话生成项目看板，蹭 AI 工作流热度

## 发布前检查（已完成 ✓）

- [x] 双语 README（英文主）+ 四张真实截图 + 在线 Demo（GitHub Pages）
- [x] MIT License + 示例数据 + 可复制的 skill 安装命令
- [x] Topics 标签 + 一句话 repo description
- [ ] Release v1.0.0 tag（发布时打）

## 投放渠道与话术

| 渠道 | 动作 | 关键话术 |
|---|---|---|
| Hacker News (Show HN) | Show HN: Weaveboard – Offline PM in a single HTML file | 强调 zero-dependency xlsx/docx 导出与 file:// 可用；正文放 Demo 链接 |
| V2EX / 创造者们 | 发帖 + 截图 | "单文件项目管理面板，数据不出浏览器" |
| Reddit r/selfhosted r/programmingtools | 发帖 | privacy-first, no server needed |
| 小红书/即刻/X | 短内容 + GIF | 双击打开的"哇点"动图（驾驶舱→空间红绳→Excel 导出） |
| 独立开发/效率工具 newsletter | 投稿 (Product Hunt 周五发布) | single-file, works forever |

## 增长飞轮

1. **Demo 即转化**：Pages 在线体验 30 秒内看到关键路径红绳 → 决定 star
2. **Skill 即分发**：AI 用户装 skill 时必然访问仓库；skill 内 `sync_engine.sh` 每次同步都是回访
3. **内容营销**：写技术文章《不用任何库手写 xlsx/docx 导出》/《CPM 关键路径的 60 行实现》——工程向文章带仓库链接，长尾流量稳定
4. **反馈闭环**：issue 里收集真实项目模板需求，每周迭代，Release notes 保持可读

## 里程碑节奏

- 第 1 周：Show HN + V2EX + Reddit 三连发；准备 GIF 素材
- 第 1 个月：2 篇技术文章；Product Hunt 发布；v1.1（脚本端导出）
- 第 1 季度：模板市场（社区贡献看板模板）；v2（基线/挣值）

## 风险与应对

- "为什么不直接用 Notion？" → 定位差异：离线/隐私/单文件可交付/无锁定
- 数据只在浏览器 = 换电脑怎么办 → ZIP 导入导出全量迁移；进阶：脚本端同步
- 单文件越来越大 → 当前 97K，还有数量级余量；保持零依赖是产品红线
