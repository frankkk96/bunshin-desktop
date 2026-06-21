import { useMemo, useState } from 'react'
import { ChevronRight, Info, Plus, X } from 'lucide-react'
import { Button, Switch } from '@/components/ui'
import { useUpdateAgent } from '@/hooks/agents'
import { useT, type TKey } from '@/lib/i18n'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import type { Agent, AgentConfig, EnvVar } from '@/lib/types'

interface Props {
  agent: Agent
}

const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
const TOOL_NAMES = ['WebSearch', 'WebFetch', 'Bash', 'Edit', 'Write', 'Read'] as const

const linesToArr = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
const arrToLines = (a?: string[]) => (a ?? []).join('\n')

/** Model is edited in the basic block (next to base URL / key); strip it here so
 *  the advanced editor never owns it, and re-attach it (from the fresh agent) on
 *  save so the two never clobber each other. */
const stripModel = (c: AgentConfig): AgentConfig => {
  const { model: _model, ...rest } = c
  return rest
}

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
  const t = useT()

  const initial = useMemo<AgentConfig>(() => stripModel(agent.config ?? {}), [agent.id, agent.config])
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

  // --- tools ---
  const disabled = cfg.disabledTools ?? []
  const isToolOn = (name: string) => !disabled.includes(name)
  const toggleTool = (name: string, on: boolean) =>
    set('disabledTools', on ? disabled.filter((tool) => tool !== name) : [...disabled, name])

  // --- env vars ---
  const env = cfg.env ?? []
  const setEnv = (next: EnvVar[]) => set('env', next)

  // --- JSON validation for raw fields ---
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
    // `model` is preserved from the (fresh) agent — it's edited in the basic block.
    const clean: AgentConfig = {
      model: agent.config?.model || undefined,
      effort: cfg.effort?.trim() || undefined,
      fallbackModel: cfg.fallbackModel?.trim() || undefined,
      appendSystemPrompt: cfg.appendSystemPrompt?.trim() || undefined,
      disabledTools: (cfg.disabledTools ?? []).length ? cfg.disabledTools : undefined,
      includeCoAuthoredBy:
        typeof cfg.includeCoAuthoredBy === 'boolean' ? cfg.includeCoAuthoredBy : undefined,
      permissionAllow: (cfg.permissionAllow ?? []).length ? cfg.permissionAllow : undefined,
      permissionDeny: (cfg.permissionDeny ?? []).length ? cfg.permissionDeny : undefined,
      permissionAsk: (cfg.permissionAsk ?? []).length ? cfg.permissionAsk : undefined,
      env: env.filter((e) => e.key.trim()).length ? env.filter((e) => e.key.trim()) : undefined,
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
        cwd: agent.cwd,
        permissionMode: agent.permissionMode,
        config: clean,
      })
      toast.success(t('cfg.savedToast'))
    } catch (err) {
      toast.error(`${t('cfg.saveFailed')}: ${err}`)
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight
            size={14}
            className={cn('transition-transform', showAdvanced && 'rotate-90')}
          />
          {t('cfg.advanced')}
        </button>
        {showAdvanced && (
          <Button onClick={handleSave} disabled={!canSave}>
            {updateAgent.isPending ? t('cfg.saving') : dirty ? t('cfg.save') : t('cfg.saved')}
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="space-y-5 pt-3">
          {/* Effort */}
          <div>
            {fieldLabel(t('cfg.effort'))}
            <select
              value={cfg.effort ?? ''}
              onChange={(e) => set('effort', e.target.value || undefined)}
              className={cn(inputCls, 'w-40')}
            >
              <option value="">{t('common.default')}</option>
              {EFFORT_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* System prompt */}
          <div>
            {fieldLabel(t('cfg.systemPrompt'), t('cfg.systemPromptHint'))}
            <textarea
              value={cfg.appendSystemPrompt ?? ''}
              onChange={(e) => set('appendSystemPrompt', e.target.value)}
              placeholder={t('cfg.systemPromptPlaceholder')}
              rows={3}
              className={cn(monoCls)}
            />
          </div>

          {/* Tools */}
          <div>
            {fieldLabel(t('cfg.tools'))}
            <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
              {TOOL_NAMES.map((name) => (
                <div key={name} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-xs text-foreground">{t(`tool.${name}` as TKey)}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t(`tool.${name}.hint` as TKey)}
                    </div>
                  </div>
                  <Switch
                    checked={isToolOn(name)}
                    onCheckedChange={(v) => toggleTool(name, v)}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-start gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <Info size={12} className="mt-px flex-shrink-0" />
              <span>{t('cfg.toolsNote')}</span>
            </div>
          </div>

          {/* Co-authored-by */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-foreground">{t('cfg.coauthored')}</div>
              <div className="text-[11px] text-muted-foreground">{t('cfg.coauthoredHint')}</div>
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
              <option value="">{t('common.default')}</option>
              <option value="on">{t('common.on')}</option>
              <option value="off">{t('common.off')}</option>
            </select>
          </div>

          {/* Fallback model */}
          <div>
            {fieldLabel(t('cfg.fallbackModel'), t('cfg.fallbackHint'))}
            <input
              value={cfg.fallbackModel ?? ''}
              onChange={(e) => set('fallbackModel', e.target.value)}
              placeholder="sonnet,haiku"
              className={inputCls}
            />
          </div>

          {/* Permissions */}
          <div>
            {fieldLabel(t('cfg.permissions'), t('cfg.permissionsHint'))}
            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  ['permissionAllow', t('cfg.allow')],
                  ['permissionDeny', t('cfg.deny')],
                  ['permissionAsk', t('cfg.ask')],
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
            {fieldLabel(t('cfg.env'), t('cfg.envHint'))}
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
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setEnv([...env, { key: '', value: '' }])}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus size={13} /> {t('cfg.addVar')}
              </button>
            </div>
          </div>

          {/* MCP config */}
          <div>
            {fieldLabel(t('cfg.mcp'), '{ "mcpServers": { … } }')}
            <textarea
              value={cfg.mcpConfig ?? ''}
              onChange={(e) => set('mcpConfig', e.target.value)}
              rows={5}
              spellCheck={false}
              className={cn(monoCls, mcpInvalid && 'border-destructive focus:ring-destructive')}
              placeholder={'{\n  "mcpServers": {\n    "name": { "type": "stdio", "command": "npx", "args": ["server"] }\n  }\n}'}
            />
            {mcpInvalid && <div className="text-[11px] text-destructive mt-1">{t('cfg.jsonError')}</div>}
          </div>

          {/* Extra settings */}
          <div>
            {fieldLabel(t('cfg.rawSettings'), t('cfg.rawHint'))}
            <textarea
              value={cfg.extraSettings ?? ''}
              onChange={(e) => set('extraSettings', e.target.value)}
              rows={4}
              spellCheck={false}
              className={cn(monoCls, extraInvalid && 'border-destructive focus:ring-destructive')}
              placeholder={'{ "outputStyle": "Explanatory" }'}
            />
            {extraInvalid && (
              <div className="text-[11px] text-destructive mt-1">{t('cfg.jsonError')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
