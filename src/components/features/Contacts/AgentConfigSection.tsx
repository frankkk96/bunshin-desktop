import { useMemo, useState } from 'react'
import { ChevronRight, Info, Plus, X } from 'lucide-react'
import { MacOSButton, MacOSSwitch } from '@/components/ui'
import { useUpdateAgent } from '@/hooks/agents'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import type { Agent, AgentConfig, EnvVar } from '@/lib/types'

interface Props {
  agent: Agent
}

const MODEL_ALIASES = ['opus', 'sonnet', 'haiku', 'fable'] as const
const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const

/** Built-in tools we expose as on/off toggles. Off → added to `disabledTools`. */
const TOOL_TOGGLES: { name: string; label: string; hint: string }[] = [
  { name: 'WebSearch', label: '联网搜索', hint: 'WebSearch — 让模型搜索网页' },
  { name: 'WebFetch', label: '抓取网页', hint: 'WebFetch — 读取指定 URL 内容' },
  { name: 'Bash', label: '终端命令', hint: 'Bash — 执行 shell 命令' },
  { name: 'Edit', label: '编辑文件', hint: 'Edit — 修改已有文件' },
  { name: 'Write', label: '写入文件', hint: 'Write — 新建/覆盖文件' },
  { name: 'Read', label: '读取文件', hint: 'Read — 读取文件内容' },
]

const linesToArr = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
const arrToLines = (a?: string[]) => (a ?? []).join('\n')

function fieldLabel(text: string, hint?: string) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label className="text-xs font-medium text-foreground">{text}</label>
      {hint && <span className="text-[11px] text-muted-foreground">· {hint}</span>}
    </div>
  )
}

const inputCls =
  'w-full h-8 px-3 text-sm rounded-md border bg-muted text-foreground placeholder:text-muted-foreground/60 outline-none border-border focus:ring-1 focus:ring-ring'
const monoCls =
  'w-full px-3 py-2 text-xs font-mono leading-relaxed rounded-md border bg-muted text-foreground placeholder:text-muted-foreground/60 outline-none resize-y'

export function AgentConfigSection({ agent }: Props) {
  const updateAgent = useUpdateAgent()

  const initial = useMemo<AgentConfig>(() => agent.config ?? {}, [agent.id, agent.config])
  const [cfg, setCfg] = useState<AgentConfig>(initial)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Reset local edits whenever a different agent is shown.
  const [trackedId, setTrackedId] = useState(agent.id)
  if (trackedId !== agent.id) {
    setTrackedId(agent.id)
    setCfg(initial)
  }

  const set = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) =>
    setCfg((c) => ({ ...c, [key]: value }))

  // --- model select (alias vs custom) ---
  const modelValue = cfg.model ?? ''
  const modelIsAlias = MODEL_ALIASES.includes(modelValue as (typeof MODEL_ALIASES)[number])
  const modelSelect = modelValue === '' ? '' : modelIsAlias ? modelValue : 'custom'

  // --- tools ---
  const disabled = cfg.disabledTools ?? []
  const isToolOn = (name: string) => !disabled.includes(name)
  const toggleTool = (name: string, on: boolean) =>
    set('disabledTools', on ? disabled.filter((t) => t !== name) : [...disabled, name])

  // --- env vars ---
  const env = cfg.env ?? []
  const setEnv = (next: EnvVar[]) => set('env', next)

  // --- JSON validation for advanced raw fields ---
  const jsonError = (raw?: string | null): boolean => {
    if (!raw || !raw.trim()) return false
    try {
      JSON.parse(raw)
      return false
    } catch {
      return true
    }
  }
  const mcpInvalid = jsonError(cfg.mcpConfig)
  const extraInvalid = jsonError(cfg.extraSettings)

  const dirty = JSON.stringify(cfg) !== JSON.stringify(initial)
  const canSave = dirty && !mcpInvalid && !extraInvalid && !updateAgent.isPending

  const handleSave = async () => {
    // Normalize: drop empty strings/arrays so the stored config stays clean.
    const clean: AgentConfig = {
      model: cfg.model?.trim() || undefined,
      effort: cfg.effort?.trim() || undefined,
      fallbackModel: cfg.fallbackModel?.trim() || undefined,
      appendSystemPrompt: cfg.appendSystemPrompt?.trim() || undefined,
      disabledTools: (cfg.disabledTools ?? []).length ? cfg.disabledTools : undefined,
      includeCoAuthoredBy:
        typeof cfg.includeCoAuthoredBy === 'boolean' ? cfg.includeCoAuthoredBy : undefined,
      permissionAllow: (cfg.permissionAllow ?? []).length ? cfg.permissionAllow : undefined,
      permissionDeny: (cfg.permissionDeny ?? []).length ? cfg.permissionDeny : undefined,
      permissionAsk: (cfg.permissionAsk ?? []).length ? cfg.permissionAsk : undefined,
      env: env.filter((e) => e.key.trim()).length
        ? env.filter((e) => e.key.trim())
        : undefined,
      mcpConfig: cfg.mcpConfig?.trim() || undefined,
      extraSettings: cfg.extraSettings?.trim() || undefined,
    }
    try {
      await updateAgent.mutateAsync({
        id: agent.id,
        alias: agent.alias,
        description: agent.description,
        avatar: agent.avatar,
        baseUrl: agent.baseUrl,
        config: clean,
      })
      toast.success('配置已保存 · 新建会话或 Clear 重启后生效')
    } catch (err) {
      toast.error(`保存失败: ${err}`)
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Claude Code 配置
        </label>
        <MacOSButton onClick={handleSave} disabled={!canSave}>
          {updateAgent.isPending ? '保存中…' : dirty ? '保存配置' : '已保存'}
        </MacOSButton>
      </div>

      {/* ---------- Basic ---------- */}
      <div className="space-y-5">
        {/* Model */}
        <div>
          {fieldLabel('模型', '默认跟随 provider 登录账户')}
          <div className="flex gap-2">
            <select
              value={modelSelect}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') set('model', undefined)
                else if (v === 'custom') set('model', '')
                else set('model', v)
              }}
              className={cn(inputCls, 'w-40')}
            >
              <option value="">默认</option>
              {MODEL_ALIASES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="custom">自定义…</option>
            </select>
            {modelSelect === 'custom' && (
              <input
                value={modelValue}
                onChange={(e) => set('model', e.target.value)}
                placeholder="claude-opus-4-8"
                className={cn(inputCls, 'flex-1')}
              />
            )}
          </div>
        </div>

        {/* Effort */}
        <div>
          {fieldLabel('Effort 思考强度')}
          <select
            value={cfg.effort ?? ''}
            onChange={(e) => set('effort', e.target.value || undefined)}
            className={cn(inputCls, 'w-40')}
          >
            <option value="">默认</option>
            {EFFORT_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* System prompt */}
        <div>
          {fieldLabel('追加系统提示', '附加在默认系统提示之后')}
          <textarea
            value={cfg.appendSystemPrompt ?? ''}
            onChange={(e) => set('appendSystemPrompt', e.target.value)}
            placeholder="例如：始终用中文回答；提交信息使用 Conventional Commits…"
            rows={3}
            className={cn(monoCls)}
          />
        </div>

        {/* Tools */}
        <div>
          {fieldLabel('内置工具')}
          <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
            {TOOL_TOGGLES.map((t) => (
              <div key={t.name} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs text-foreground">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{t.hint}</div>
                </div>
                <MacOSSwitch
                  checked={isToolOn(t.name)}
                  onCheckedChange={(v) => toggleTool(t.name, v)}
                />
              </div>
            ))}
          </div>
          <div className="flex items-start gap-1.5 mt-2 text-[11px] text-muted-foreground">
            <Info size={12} className="mt-px flex-shrink-0" />
            <span>
              联网搜索是 Anthropic 服务端工具:需走第一方 api.anthropic.com,且在 Console →
              Settings → Privacy 开启;第三方网关大多不支持。此开关只控制是否把工具交给模型。
            </span>
          </div>
        </div>

        {/* Co-authored-by */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-foreground">提交署名 Co-authored-by</div>
            <div className="text-[11px] text-muted-foreground">
              在 git 提交里附加 Claude 署名(includeCoAuthoredBy)
            </div>
          </div>
          <select
            value={
              cfg.includeCoAuthoredBy === true
                ? 'on'
                : cfg.includeCoAuthoredBy === false
                  ? 'off'
                  : ''
            }
            onChange={(e) => {
              const v = e.target.value
              set('includeCoAuthoredBy', v === '' ? undefined : v === 'on')
            }}
            className={cn(inputCls, 'w-28')}
          >
            <option value="">默认</option>
            <option value="on">开启</option>
            <option value="off">关闭</option>
          </select>
        </div>
      </div>

      {/* ---------- Advanced ---------- */}
      <button
        onClick={() => setShowAdvanced((s) => !s)}
        className="flex items-center gap-1 mt-6 mb-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          size={14}
          className={cn('transition-transform', showAdvanced && 'rotate-90')}
        />
        高级
      </button>

      {showAdvanced && (
        <div className="space-y-5 pt-3">
          {/* Fallback model */}
          <div>
            {fieldLabel('备用模型', '主模型过载时回退,逗号分隔')}
            <input
              value={cfg.fallbackModel ?? ''}
              onChange={(e) => set('fallbackModel', e.target.value)}
              placeholder="sonnet,haiku"
              className={inputCls}
            />
          </div>

          {/* Permissions */}
          <div>
            {fieldLabel('权限规则', '每行一条,如 Bash(git *) 或 Read(./.env)')}
            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  ['permissionAllow', 'Allow 允许'],
                  ['permissionDeny', 'Deny 拒绝'],
                  ['permissionAsk', 'Ask 询问'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
                  <textarea
                    value={arrToLines(cfg[key])}
                    onChange={(e) => set(key, linesToArr(e.target.value))}
                    rows={2}
                    className={monoCls}
                    placeholder={key === 'permissionAllow' ? 'Bash(npm run *)' : ''}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Env vars */}
          <div>
            {fieldLabel('环境变量', '注入到 settings.json env')}
            <div className="space-y-2">
              {env.map((e, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={e.key}
                    onChange={(ev) =>
                      setEnv(env.map((x, j) => (j === i ? { ...x, key: ev.target.value } : x)))
                    }
                    placeholder="KEY"
                    className={cn(inputCls, 'w-44 font-mono')}
                  />
                  <input
                    value={e.value}
                    onChange={(ev) =>
                      setEnv(env.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)))
                    }
                    placeholder="value"
                    className={cn(inputCls, 'flex-1 font-mono')}
                  />
                  <button
                    onClick={() => setEnv(env.filter((_, j) => j !== i))}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    title="删除"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEnv([...env, { key: '', value: '' }])}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus size={13} /> 添加变量
              </button>
            </div>
          </div>

          {/* MCP config */}
          <div>
            {fieldLabel('MCP 服务器', '{ "mcpServers": { … } } JSON')}
            <textarea
              value={cfg.mcpConfig ?? ''}
              onChange={(e) => set('mcpConfig', e.target.value)}
              rows={5}
              spellCheck={false}
              className={cn(monoCls, mcpInvalid && 'border-destructive focus:ring-destructive')}
              placeholder={'{\n  "mcpServers": {\n    "name": { "type": "stdio", "command": "npx", "args": ["server"] }\n  }\n}'}
            />
            {mcpInvalid && <div className="text-[11px] text-destructive mt-1">JSON 格式错误</div>}
          </div>

          {/* Extra settings */}
          <div>
            {fieldLabel('原始 settings.json', '兜底:合并进 --settings,覆盖以上同名键')}
            <textarea
              value={cfg.extraSettings ?? ''}
              onChange={(e) => set('extraSettings', e.target.value)}
              rows={4}
              spellCheck={false}
              className={cn(monoCls, extraInvalid && 'border-destructive focus:ring-destructive')}
              placeholder={'{ "outputStyle": "Explanatory" }'}
            />
            {extraInvalid && (
              <div className="text-[11px] text-destructive mt-1">JSON 格式错误</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
