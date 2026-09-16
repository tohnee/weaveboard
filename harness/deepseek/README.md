# Weaveboard PM · DeepSeek Harness 适配包

把 weaveboard-pm 的四个能力（校验 / 生成 / 注入 / 同步）作为工具暴露给任意
OpenAI 兼容的 agent harness（DeepSeek API 完全兼容 OpenAI 的 chat + tools 协议）。

> 说明：DeepSeek 官方没有发布名为 "harness" 的插件规范；本目录按
> "function-calling agent harness" 的通用形态提供适配件。如果你使用的具体
> harness 有自己的插件清单格式，把 `tools.json` 里的函数定义转写过去即可，
> 三个 JSON-Schema 定义与脚本一一对应，不需要改动脚本本身。

## 组成

| 文件 | 用途 |
|---|---|
| `system_prompt.md` | 系统提示词（从 SKILL.md 蒸馏，直接放进 messages[0]） |
| `tools.json` | OpenAI 格式的 tools 定义（4 个函数） |
| `agent.py` | 最小可运行示例：stdlib 实现 DeepSeek chat + tool_calls 循环 |

## 快速开始

```bash
export DEEPSEEK_API_KEY=sk-xxx
python3 agent.py "帮我把 docs/my-project.weaveboard.json 校验后生成为一个看板 HTML"
```

`agent.py` 零依赖（Python 3.9+ 标准库），把用户的自然语言任务交给 DeepSeek，
模型按 system_prompt 的约束调用工具脚本，直到校验通过并产出看板文件。

## 接入你自己的 harness

1. 把 `system_prompt.md` 内容设为 system message；
2. 把 `tools.json` 的数组作为 `tools` 参数传入；
3. 收到 `tool_calls` 时，用 `subprocess` 执行对应 `node skills/weaveboard-pm/scripts/<name>`，
   把 stdout/exit code 作为 `role:"tool"` 消息回填；
4. 仓库路径解析：脚本里的相对路径基于 `skills/weaveboard-pm/`，把
   `agent.py` 里的 `SKILL_DIR` 常量改成你的安装路径即可。
