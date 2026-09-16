#!/usr/bin/env python3
"""Weaveboard PM × DeepSeek —— 最小可运行的 function-calling harness。

零第三方依赖（Python 3.9+ 标准库）。用法：

    export DEEPSEEK_API_KEY=sk-xxx
    python3 agent.py "帮我把 my-project.weaveboard.json 校验并生成看板 HTML"

安全设计：
- 出网只连接字面量主机 api.deepseek.com（官方端点白名单），路径固定 /chat/completions；
- 工具调用不向子进程传递动态参数：argv 固定为 [node, run_tool.mjs, 工具名, JSON载荷]，
  工具名先经白名单校验，参数以 JSON 字符串整体传递，由 run_tool.mjs 在 JS 侧
  做路径边界校验后执行（shell 一律不参与）。
"""
import http.client
import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILL_DIR = HERE.parent / "skills" / "weaveboard-pm"   # 按安装位置修改
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
MAX_TURNS = 12
TOOL_NAMES = {"validate_board", "new_board", "inject_data", "sync_engine"}
RUNNER = str(SKILL_DIR / "scripts" / "run_tool.mjs")

TOOLS = json.loads((HERE / "tools.json").read_text(encoding="utf-8"))["tools"]
SYSTEM = (HERE / "system_prompt.md").read_text(encoding="utf-8")


def call_model(messages):
    """只连接字面量官方主机与固定路径，密钥仅经环境变量注入请求头。"""
    conn = http.client.HTTPSConnection("api.deepseek.com", timeout=120)
    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "tools": TOOLS,
        "temperature": 0.2,
    })
    conn.request("POST", "/chat/completions", body=body, headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer " + os.environ.get("DEEPSEEK_API_KEY", ""),
    })
    resp = conn.getresponse()
    data = json.loads(resp.read().decode("utf-8"))
    conn.close()
    return data["choices"][0]["message"]


def run_tool(name, args):
    if name not in TOOL_NAMES:
        return f"错误：未知工具 {name}"
    payload = json.dumps(args or {}, ensure_ascii=False)
    # argv 完全固定：解释器、固定脚本路径、白名单工具名、单个 JSON 字符串载荷
    proc = subprocess.run(["node", RUNNER, name, payload],
                          shell=False, capture_output=True, text=True, timeout=120)
    out = (proc.stdout + ("\n[stderr] " + proc.stderr if proc.stderr else "")).strip()
    return f"exit={proc.returncode}\n{out[:6000]}"


def main():
    if not os.environ.get("DEEPSEEK_API_KEY"):
        sys.exit("请先设置 DEEPSEEK_API_KEY")
    task = " ".join(sys.argv[1:]) or "校验 examples/api-refactor.weaveboard.json 并生成看板 HTML"
    messages = [{"role": "system", "content": SYSTEM},
                {"role": "user", "content": task}]
    for _ in range(MAX_TURNS):
        msg = call_model(messages)
        messages.append(msg)
        if not msg.get("tool_calls"):
            print(msg.get("content", ""))
            return
        for tc in msg["tool_calls"]:
            fn = tc["function"]
            print(f"→ {fn['name']}({fn['arguments']})", file=sys.stderr)
            result = run_tool(fn["name"], json.loads(fn["arguments"] or "{}"))
            print(result.splitlines()[0], file=sys.stderr)
            messages.append({"role": "tool", "tool_call_id": tc["id"],
                             "content": result})
    print("达到最大轮数，任务未确认完成——请检查校验输出。")


if __name__ == "__main__":
    main()
