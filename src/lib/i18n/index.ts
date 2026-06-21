import { useAppSettingsQuery } from '@/hooks/settings/query'

type Lang = 'en' | 'zh'

/** Translations for the agent configuration surfaces. Keep each string in a
 *  single language — never mix. Technical tokens (Base URL, API Key, Model, MCP,
 *  settings.json) are intentionally kept identical across languages. */
const DICT: Record<string, { en: string; zh: string }> = {
  // common
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.create': { en: 'Create', zh: '创建' },
  'common.creating': { en: 'Creating…', zh: '创建中…' },
  'common.delete': { en: 'Delete', zh: '删除' },
  'common.duplicate': { en: 'Duplicate', zh: '复制' },
  'common.default': { en: 'Default', zh: '默认' },
  'common.on': { en: 'On', zh: '开启' },
  'common.off': { en: 'Off', zh: '关闭' },

  // agent editor / creation
  'agent.name': { en: 'Name', zh: '名称' },
  'agent.namePlaceholder': { en: 'e.g. Codey', zh: '例如 Codey' },
  'agent.baseUrl': { en: 'Base URL', zh: 'Base URL' },
  'agent.apiKey': { en: 'API Key', zh: 'API Key' },
  'agent.model': { en: 'Model', zh: 'Model' },
  'agent.cwd': { en: 'Working directory', zh: '工作目录' },
  'agent.permission': { en: 'Permission mode', zh: '权限模式' },
  'common.browse': { en: 'Browse…', zh: '选择…' },
  'agent.new': { en: 'New agent', zh: '新建 Agent' },
  'agent.newDesc': {
    en: 'A working directory plus an Anthropic-compatible API.',
    zh: '一个工作目录 + 一个 Anthropic 兼容 API。',
  },
  'agent.edit': { en: 'Edit agent', zh: '编辑 Agent' },
  'agent.editDesc': {
    en: 'Duplicate to reuse this setup with tweaks.',
    zh: '点「复制」可在此配置基础上微调复用。',
  },
  'agent.setupGuide': { en: 'How to configure a provider', zh: '各 Provider 配置指南' },
  'agent.newAgent': { en: 'New agent', zh: '新建 Agent' },
  'agent.duplicated': { en: 'Agent duplicated', zh: '已复制 Agent' },
  'agent.deleteConfirm': {
    en: 'Delete this agent and all its sessions?',
    zh: '删除这个 Agent 及其所有对话?',
  },

  // config (advanced)
  'cfg.advanced': { en: 'Advanced', zh: '高级配置' },
  'cfg.save': { en: 'Save advanced config', zh: '保存高级配置' },
  'cfg.saving': { en: 'Saving…', zh: '保存中…' },
  'cfg.saved': { en: 'Saved', zh: '已保存' },
  'cfg.savedToast': {
    en: 'Advanced config saved — takes effect on a new or restarted session.',
    zh: '高级配置已保存 · 新建会话或 Clear 重启后生效。',
  },
  'cfg.saveFailed': { en: 'Save failed', zh: '保存失败' },
  'cfg.effort': { en: 'Effort', zh: '思考强度' },
  'cfg.systemPrompt': { en: 'Append system prompt', zh: '追加系统提示' },
  'cfg.systemPromptHint': {
    en: 'Added after the default system prompt',
    zh: '附加在默认系统提示之后',
  },
  'cfg.systemPromptPlaceholder': {
    en: 'e.g. Always answer in English; use Conventional Commits…',
    zh: '例如：始终用中文回答；提交信息使用 Conventional Commits…',
  },
  'cfg.tools': { en: 'Built-in tools', zh: '内置工具' },
  'cfg.toolsNote': {
    en: 'Web search is an Anthropic server-side tool: it needs the first-party api.anthropic.com endpoint and must be enabled in Console → Settings → Privacy. Most third-party gateways do not support it. This switch only controls whether the tool is offered to the model.',
    zh: '联网搜索是 Anthropic 服务端工具:需走第一方 api.anthropic.com,且在 Console → Settings → Privacy 开启;第三方网关大多不支持。此开关只控制是否把工具交给模型。',
  },
  'cfg.coauthored': { en: 'Commit co-author', zh: '提交署名' },
  'cfg.coauthoredHint': {
    en: 'Add the Claude co-author trailer to git commits (includeCoAuthoredBy)',
    zh: '在 git 提交里附加 Claude 署名(includeCoAuthoredBy)',
  },
  'cfg.fallbackModel': { en: 'Fallback model', zh: '备用模型' },
  'cfg.fallbackHint': {
    en: 'Comma-separated; used when the primary model is overloaded',
    zh: '主模型过载时回退,逗号分隔',
  },
  'cfg.permissions': { en: 'Permission rules', zh: '权限规则' },
  'cfg.permissionsHint': {
    en: 'One per line, e.g. Bash(git *) or Read(./.env)',
    zh: '每行一条,如 Bash(git *) 或 Read(./.env)',
  },
  'cfg.allow': { en: 'Allow', zh: '允许' },
  'cfg.deny': { en: 'Deny', zh: '拒绝' },
  'cfg.ask': { en: 'Ask', zh: '询问' },
  'cfg.env': { en: 'Environment variables', zh: '环境变量' },
  'cfg.envHint': { en: 'Injected into settings.json env', zh: '注入到 settings.json env' },
  'cfg.addVar': { en: 'Add variable', zh: '添加变量' },
  'cfg.mcp': { en: 'MCP servers', zh: 'MCP 服务器' },
  'cfg.rawSettings': { en: 'Raw settings.json', zh: '原始 settings.json' },
  'cfg.rawHint': {
    en: 'Fallback: merged into --settings, overrides the keys above',
    zh: '兜底:合并进 --settings,覆盖以上同名键',
  },
  'cfg.jsonError': { en: 'Invalid JSON', zh: 'JSON 格式错误' },

  // tools
  'tool.WebSearch': { en: 'Web search', zh: '联网搜索' },
  'tool.WebSearch.hint': { en: 'WebSearch — let the model search the web', zh: 'WebSearch — 让模型搜索网页' },
  'tool.WebFetch': { en: 'Fetch web pages', zh: '抓取网页' },
  'tool.WebFetch.hint': { en: 'WebFetch — read a given URL', zh: 'WebFetch — 读取指定 URL 内容' },
  'tool.Bash': { en: 'Shell commands', zh: '终端命令' },
  'tool.Bash.hint': { en: 'Bash — run shell commands', zh: 'Bash — 执行 shell 命令' },
  'tool.Edit': { en: 'Edit files', zh: '编辑文件' },
  'tool.Edit.hint': { en: 'Edit — modify existing files', zh: 'Edit — 修改已有文件' },
  'tool.Write': { en: 'Write files', zh: '写入文件' },
  'tool.Write.hint': { en: 'Write — create/overwrite files', zh: 'Write — 新建/覆盖文件' },
  'tool.Read': { en: 'Read files', zh: '读取文件' },
  'tool.Read.hint': { en: 'Read — read file contents', zh: 'Read — 读取文件内容' },

  // sidebar / agents list
  'ui.searchAgents': { en: 'Search agents', zh: '搜索 Agent' },
  'ui.settings': { en: 'Settings', zh: '设置' },
  'ui.update': { en: 'Update', zh: '更新' },
  'agent.noMatch': { en: 'No matching agents.', zh: '没有匹配的 Agent。' },
  'agent.noneChat': {
    en: 'No agents yet. Create one to start chatting.',
    zh: '还没有 Agent,新建一个即可开始对话。',
  },
  'agent.noAgentsTitle': { en: 'No agents yet', zh: '还没有 Agent' },
  'agent.pickTitle': { en: 'Pick an agent', zh: '选择一个 Agent' },
  'agent.emptyHint': {
    en: 'An agent pairs a project folder with an API key and model. Create one to start chatting.',
    zh: '一个 Agent = 项目目录 + API 凭据 + 模型,新建一个即可开始对话。',
  },
  'agent.pickHint': {
    en: 'Select an agent on the left to open its session.',
    zh: '在左侧选择一个 Agent 打开它的对话。',
  },
  'agent.editTooltip': { en: 'Edit agent', zh: '编辑 Agent' },
  'agent.running': { en: 'Running', zh: '运行中' },
  'agent.changeAvatar': { en: 'Click to change avatar', zh: '点击更换头像' },
  'agent.allRequired': {
    en: 'Name, working directory, Base URL, API Key and Model are all required.',
    zh: '名称、工作目录、Base URL、API Key、Model 均为必填。',
  },

  // session / chat
  'session.new': { en: 'New session', zh: '新建对话' },
  'session.history': { en: 'History', zh: '历史' },
  'session.stop': { en: 'Stop', zh: '停止' },
  'session.firstMessage': { en: 'Send your first message below.', zh: '在下方发送第一条消息。' },
  'session.starting': { en: 'Subprocess is starting up…', zh: '子进程启动中…' },
  'session.notRunning': { en: 'Session is not running', zh: '对话未在运行' },
  'session.listTitle': { en: 'Sessions', zh: '对话' },
  'session.none': { en: 'No sessions yet.', zh: '还没有对话。' },
  'session.unnamed': { en: 'New session', zh: '未命名对话' },
  'session.current': { en: 'current', zh: '当前' },
  'session.pin': { en: 'Pin', zh: '置顶' },
  'session.unpin': { en: 'Unpin', zh: '取消置顶' },
  'session.rename': { en: 'Rename', zh: '重命名' },
  'session.deleteConfirm': {
    en: 'Delete this session and all its messages?',
    zh: '删除这个对话及其所有消息?',
  },
  'session.couldNotResume': { en: 'Could not resume session', zh: '无法恢复对话' },

  // status
  'status.crashed': { en: 'Subprocess crashed', zh: '子进程已崩溃' },
  'status.starting': { en: 'Starting…', zh: '启动中…' },
  'status.stopped': { en: 'Stopped', zh: '已停止' },
  'status.running': { en: 'Running…', zh: '运行中…' },
  'status.ready': { en: 'Ready', zh: '就绪' },

  // composer
  'composer.placeholder': { en: 'Ask me anything...', zh: '问我任何问题…' },
  'composer.notRunning': { en: 'Subprocess not running…', zh: '子进程未运行…' },
  'composer.resolvePermission': {
    en: 'Resolve the permission prompt above to continue',
    zh: '请先处理上方的权限请求',
  },

  // permission modes
  'perm.default': { en: 'Default — ask before risky actions', zh: '默认 — 危险操作前询问' },
  'perm.acceptEdits': { en: 'Accept edits — auto-approve file edits', zh: '接受编辑 — 自动批准文件修改' },
  'perm.plan': { en: 'Plan only — no tools', zh: '仅规划 — 不使用工具' },
  'perm.bypass': { en: 'Bypass — no prompts (sandboxed dirs)', zh: '绕过 — 不提示(沙盒目录)' },
  'perm.dontAsk': { en: "Don't ask", zh: '不询问' },

  // permission request card
  'permreq.needed': { en: 'Permission needed', zh: '需要授权' },
  'permreq.allow': { en: 'Allow', zh: '允许' },
  'permreq.allowAlways': { en: 'Allow always', zh: '总是允许' },
  'permreq.deny': { en: 'Deny', zh: '拒绝' },

  // settings (general)
  'set.application': { en: 'Application', zh: '应用' },
  'set.theme': { en: 'Theme', zh: '主题' },
  'set.light': { en: 'Light', zh: '浅色' },
  'set.dark': { en: 'Dark', zh: '深色' },
  'set.systemMode': { en: 'System', zh: '跟随系统' },
  'set.language': { en: 'Language', zh: '语言' },
  'set.system': { en: 'System', zh: '系统' },
  'set.autoUpdate': { en: 'Auto Update', zh: '自动更新' },
  'set.crashReports': { en: 'Crash Reports', zh: '崩溃报告' },
  'set.proxy': { en: 'Proxy', zh: '代理' },
  'set.proxyUrl': { en: 'Proxy URL', zh: '代理地址' },
  'set.proxyDesc': { en: 'HTTP/HTTPS proxy server URL', zh: 'HTTP/HTTPS 代理服务器地址' },
  'set.test': { en: 'Test', zh: '测试' },
  'set.dataMgmt': { en: 'Data Management', zh: '数据管理' },
  'set.exportData': { en: 'Export Data', zh: '导出数据' },
  'set.exportDesc': {
    en: 'Export all application data excluding encrypted API keys',
    zh: '导出全部应用数据(不含加密的 API 密钥)',
  },
  'set.export': { en: 'Export', zh: '导出' },
  'set.help': { en: 'Help & Diagnostics', zh: '帮助与诊断' },
  'set.feedback': { en: 'Submit Feedback', zh: '提交反馈' },
  'set.feedbackDesc': { en: 'Open the GitHub issue tracker', zh: '打开 GitHub issue' },
  'set.open': { en: 'Open', zh: '打开' },
}

export type TKey = keyof typeof DICT

export function useT() {
  const { data } = useAppSettingsQuery()
  const lang: Lang = data?.language === 'zh' ? 'zh' : 'en'
  return (key: TKey): string => {
    const entry = DICT[key]
    if (!entry) return key
    return entry[lang] ?? entry.en
  }
}
