# Weaveboard PM · DeepSeek Harness 插件（dsh bundle）

按 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`，"Everything
is a Plugin"，基于 [Cordis](https://github.com/cordiverse/cordis) 内核）的官方插件规范编写，
把 weaveboard-pm 的四个能力注册为 `ctx.tools` 里的模型可见工具。

参考的官方文档：

- 仓库：<https://github.com/deepseek-ai/deepseek-harness>
- 产品页：<https://www.deepseek.com/harness/en/>
- 插件开发（Your first plugin / Build a tool / Package and install）：
  <https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/>
- 工具编写契约（canonical value / render / 卡片投影）：
  `docs/cookbook/adding-a-tool.md`（仓库内）

## 目录结构

```
harness/deepseek/
├── package.json        # dsh.bundle 清单：声明 cordis.patch.yml 配置层
├── cordis.patch.yml    # 把 weaveboard-pm 插件行插入组合配置
├── index.js            # apply(ctx)：defineTool 注册 4 个工具
└── scripts/            # 工具实现（与 skills/weaveboard-pm/scripts 同源）
    ├── run_tool.mjs        # 执行器：工具白名单 + 路径边界 + shell:false
    ├── validate_board.mjs  # weaveboard/v2 校验 + CPM 试算
    ├── new_board.mjs       # JSON + 引擎 → 自包含看板 HTML
    ├── inject_data.mjs     # 替换既有 HTML 的内嵌数据块
    └── sync_engine.sh      # 从 GitHub 拉取最新引擎
```

引擎 HTML **不随包分发**：首次使用先调 `weaveboard_sync_engine` 拉取最新版到
`assets/`（或用 `engine_path` 参数指定本地引擎），保证生成的看板永远是最新引擎。

## 安装（bundle → profile）

需要已安装 `dsh` CLI（`npx @deepseek-ai/dsh web` 可直接体验开发模式）：

```sh
# 从本仓库检出目录安装
dsh plugin --profile my-weave add ./harness/deepseek

# 启动
dsh --profile my-weave
```

开发期不打 bundle、直接挂载源码（绝对路径 overlay）：

```sh
# weaveboard 仓库根目录下
cat > /tmp/weaveboard-cordis.yml <<'EOF'
- insert:
    - id: weaveboard-pm
      name: /绝对路径/weaveboard/harness/deepseek/index.js
EOF
pnpm dsh web --patch /tmp/weaveboard-cordis.yml
```

## 注册的工具

| 工具 | 参数 | 说明 |
|---|---|---|
| `weaveboard_validate_board` | `data_path` | 校验 JSON + CPM 关键路径/浮时试算（生成前必跑） |
| `weaveboard_new_board` | `data_path`, `output_path?`, `engine_path?` | 生成双击即开的看板 HTML |
| `weaveboard_inject_data` | `html_path`, `data_path`, `output_path?` | 更新既有 HTML 内嵌数据 |
| `weaveboard_sync_engine` | —（无参数） | 拉取最新引擎到本插件 assets/ |

典型对话："用 weaveboard 工具把 docs/plan.weaveboard.json 校验后生成为看板 HTML"。

## 安全模型

- 工具名白名单（`run_tool.mjs` 的 `SCRIPTS` 表），未知工具/未知参数直接拒绝；
- 所有文件路径必须位于**当前工作目录或插件目录**内，`..` 与越界路径拒绝，
  拒绝 `--` 开头的值（防选项注入）；
- 子进程一律参数列表 + `shell:false`，不经过任何 shell 解释；
- 插件侧退出码约定：0 成功、1 领域失败（返回 `ok:false` 规范值）、≥2 策略拒绝（抛
  `isError`）。dsh 侧 `defineTool` 负责参数 schema 校验，`exec.signal` 传递给子进程。

## 与 skill 的关系

`skills/weaveboard-pm/`（Claude Code 等 agent skills）与本 bundle 共用同一套脚本，
工作流知识（WBS 编号、字段规范、周度维护流程）在 SKILL.md；dsh 插件只暴露工具，
流程约束由模型按工具 description 执行。
