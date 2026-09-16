// index.js — Weaveboard PM · DeepSeek Harness (dsh) 插件
// 规范: github.com/deepseek-ai/deepseek-harness（Cordis 插件内核，一切皆插件）
// 形态: 导出 apply(ctx) 的 ESM 模块；inject 声明对工具注册表的依赖，
//       用 defineTool 定义模型可见工具；注册随插件 fiber 销毁自动注销。
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'weaveboard-pm'
export const inject = ['tools']

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url))
const RUNNER = path.join(PLUGIN_DIR, 'scripts', 'run_tool.mjs')

// 经 run_tool.mjs 执行 skill 脚本：工具名白名单 + 路径边界校验 + shell:false
// 都在执行器内完成；这里只负责把子进程结果映射为规范返回值。
function runScript(tool, args, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [RUNNER, tool, JSON.stringify(args)], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      signal,
    })
    let out = ''
    let err = ''
    child.stdout.on('data', c => { out += c })
    child.stderr.on('data', c => { err += c })
    child.on('error', reject)
    child.on('close', code => resolve({ code: code == null ? -1 : code, out, err }))
  })
}

// 退出码约定（与 skill 脚本一致）:
//   0 = 成功；1 = 领域结果（校验发现错误 / 缺少数据块等）；≥2 = 用法或安全策略拒绝。
// 领域失败是成功的领域结局，返回 ok:false 的规范值；策略拒绝才抛异常（isError）。
async function call(tool, args, exec) {
  const { code, out, err } = await runScript(tool, args, exec.signal)
  if (code >= 2) throw new Error(`weaveboard ${tool} 被拒绝: ${(err || out).trim().slice(0, 400)}`)
  return { ok: code === 0, output: (out || err).trim() }
}

const render = (_args, value) => [{ type: 'text', text: value.output || (value.ok ? '完成' : '未通过') }]

// 规范返回值契约：所有工具统一 { ok, output }；对象节点必须显式 additionalProperties，
// 必填用属性内联 required 表达（value schema DSL 不支持对象级 required 数组）
const resultSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', required: true, description: 'true = 成功；false = 领域失败（如校验发现错误）' },
    output: { type: 'string', required: true, description: '工具的文本报告' },
  },
  additionalProperties: false,
}

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'weaveboard_validate_board',
    description:
      '校验 weaveboard/v2 看板 JSON：结构/字段/枚举/WBS 层级/基线引用检查，' +
      '并试算 CPM 关键路径、每项浮时与推演完工日。生成或注入数据前先跑它。',
    parameters: {
      data_path: { type: 'string', required: true, description: '看板 JSON 文件路径' },
    },
    output: { schema: resultSchema, render },
    presentCall: a => ({ card: 'generic', title: `weaveboard 校验 ${a.data_path}`, locations: [{ path: a.data_path }] }),
    execute: (args, exec) => call('validate_board', args, exec),
  }))

  ctx.tools.register(defineTool({
    name: 'weaveboard_new_board',
    description:
      '由 weaveboard/v2 JSON 生成自包含看板 HTML（引擎 + 内嵌数据，双击即开，' +
      '可导出 Excel/Word 报告）。先用 weaveboard_validate_board 校验数据。',
    parameters: {
      data_path: { type: 'string', required: true, description: '看板 JSON 文件路径' },
      output_path: { type: 'string', description: '输出 HTML 路径（缺省为同名 .html）' },
    },
    output: { schema: resultSchema, render },
    presentCall: a => ({ card: 'generic', title: `weaveboard 生成 ${a.output_path || '(默认输出)'}`, locations: [{ path: a.data_path }] }),
    execute: (args, exec) => call('new_board', args, exec),
  }))

  ctx.tools.register(defineTool({
    name: 'weaveboard_inject_data',
    description:
      '用新 JSON 替换既有看板 HTML 的内嵌数据块（不动引擎其余部分）。' +
      '注意：浏览器 LocalStorage 里的旧数据优先，需在应用内清空看板后重开。',
    parameters: {
      html_path: { type: 'string', required: true, description: '既有看板 HTML 路径' },
      data_path: { type: 'string', required: true, description: '新数据 JSON 路径' },
      output_path: { type: 'string', description: '输出 HTML 路径（缺省原地覆盖）' },
    },
    output: { schema: resultSchema, render },
    presentCall: a => ({ card: 'generic', title: `weaveboard 注入 ${a.data_path}`, locations: [{ path: a.html_path }, { path: a.data_path }] }),
    execute: (args, exec) => call('inject_data', args, exec),
  }))

  ctx.tools.register(defineTool({
    name: 'weaveboard_sync_engine',
    description:
      '从 GitHub (tohnee/weaveboard main) 拉取最新引擎 HTML 覆盖本插件 assets/，' +
      '引擎升级后新看板即带新特性。无参数。',
    parameters: {},
    output: { schema: resultSchema, render },
    presentCall: () => ({ card: 'generic', title: 'weaveboard 同步引擎' }),
    execute: (_args, exec) => call('sync_engine', {}, exec),
  }))
}
