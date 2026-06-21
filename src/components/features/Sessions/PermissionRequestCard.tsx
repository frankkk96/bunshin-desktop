import { createContext, useContext, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Button, Input, Label } from '@/components/ui'
import { sessionsApi } from '@/lib/tauri/service/sessions'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import { useT } from '@/lib/i18n'
import type { Message } from '@/lib/types'
import { Markdown } from './Markdown'

interface PermissionContextValue {
  sessionId: string
  isRunning: boolean
  responsesByRequestId: Map<string, Message>
}

const PermissionCtx = createContext<PermissionContextValue | null>(null)

export function PermissionProvider({
  sessionId,
  isRunning,
  messages,
  children,
}: {
  sessionId: string
  isRunning: boolean
  messages: Message[]
  children: React.ReactNode
}) {
  const responsesByRequestId = useMemo(() => {
    const map = new Map<string, Message>()
    for (const m of messages) {
      if (m.kind !== 'local_control_response') continue
      const rid = m.payload?.request_id
      if (typeof rid === 'string') map.set(rid, m)
    }
    return map
  }, [messages])

  return (
    <PermissionCtx.Provider value={{ sessionId, isRunning, responsesByRequestId }}>
      {children}
    </PermissionCtx.Provider>
  )
}

/** True iff at least one `control_request` in `messages` has no matching response. */
export function hasPendingPermission(messages: Message[]): boolean {
  const answered = new Set<string>()
  for (const m of messages) {
    if (m.kind === 'local_control_response' && typeof m.payload?.request_id === 'string') {
      answered.add(m.payload.request_id)
    }
  }
  for (const m of messages) {
    if (m.kind !== 'control_request') continue
    const rid = m.payload?.request_id
    if (typeof rid !== 'string') continue
    if (!answered.has(rid)) return true
  }
  return false
}

export function PermissionRequestCard({ message }: { message: Message }) {
  const ctx = useContext(PermissionCtx)
  if (!ctx) return null
  const requestId: string | undefined = message.payload?.request_id
  if (!requestId) return null
  const request = message.payload?.request ?? {}
  const subtype: string = request.subtype ?? ''

  const resolution = ctx.responsesByRequestId.get(requestId)

  if (subtype !== 'can_use_tool') {
    // Unknown control_request subtype — render a minimal debug chip so the user
    // at least sees something is happening. v1 only renders can_use_tool.
    return (
      <div className="text-[11px] text-muted-foreground text-center">
        Unhandled control_request: {subtype || 'unknown'}
      </div>
    )
  }

  const toolName: string = request.tool_name ?? ''
  const input: any = request.input ?? {}

  const respond = (response: unknown) => async () => {
    try {
      await respondToPermissionCall(ctx, requestId, response)
    } catch (err) {
      toast.error(String(err))
    }
  }

  if (toolName === 'AskUserQuestion') {
    return (
      <AskUserQuestionPrompt
        input={input}
        resolution={resolution}
        disabled={!ctx.isRunning}
        respond={respond}
      />
    )
  }
  if (toolName === 'ExitPlanMode') {
    return (
      <ExitPlanModePrompt
        input={input}
        resolution={resolution}
        disabled={!ctx.isRunning}
        respond={respond}
      />
    )
  }
  return (
    <ToolPermissionPrompt
      toolName={toolName}
      input={input}
      permissionSuggestions={request.permission_suggestions ?? []}
      resolution={resolution}
      disabled={!ctx.isRunning}
      respond={respond}
    />
  )
}

function respondToPermissionCall(
  ctx: PermissionContextValue,
  requestId: string,
  response: unknown,
) {
  return sessionsApi.respondToPermission({
    sessionId: ctx.sessionId,
    requestId,
    response,
  })
}

// --- generic tool permission ------------------------------------------------

const RISKY_TOOLS = new Set(['Bash', 'Write', 'Edit', 'NotebookEdit'])

function ToolPermissionPrompt({
  toolName,
  input,
  permissionSuggestions,
  resolution,
  disabled,
  respond,
}: {
  toolName: string
  input: any
  permissionSuggestions: any[]
  resolution: Message | undefined
  disabled: boolean
  respond: (r: unknown) => () => Promise<void>
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(RISKY_TOOLS.has(toolName))

  if (resolution) return <ResolvedChip resolution={resolution} label={toolName} />

  const summary = summariseToolInput(input)
  const allowAlwaysSuggestion =
    Array.isArray(permissionSuggestions) && permissionSuggestions.length > 0
      ? permissionSuggestions[0]
      : { type: 'addRules', rules: [{ toolName }], behavior: 'allow', destination: 'session' }

  return (
    <CardShell
      icon={<ShieldCheck size={13} className="text-amber-500" />}
      title={t('permreq.needed')}
      tone="amber"
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
        )}
        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground/90 flex-shrink-0">
          {toolName}
        </span>
        <span className="text-xs text-muted-foreground truncate min-w-0">{summary}</span>
      </button>
      {expanded && (
        <pre className="px-3 py-2 text-[11px] leading-relaxed overflow-x-auto bg-muted/40 border-t border-border/40 whitespace-pre-wrap break-all">
          {JSON.stringify(input ?? {}, null, 2)}
        </pre>
      )}
      <div className="px-3 py-2 border-t border-border/40 flex flex-wrap gap-2 justify-end">
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={respond({
            behavior: 'deny',
            message: 'User denied permission for this tool call.',
            interrupt: false,
          })}
        >
          {t('permreq.deny')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={respond({
            behavior: 'allow',
            updatedInput: input,
            updatedPermissions: [allowAlwaysSuggestion],
          })}
        >
          {t('permreq.allowAlways')}
        </Button>
        <Button
          size="sm"
          disabled={disabled}
          onClick={respond({ behavior: 'allow', updatedInput: input })}
        >
          {t('permreq.allow')}
        </Button>
      </div>
    </CardShell>
  )
}

// --- AskUserQuestion --------------------------------------------------------

interface QuestionDef {
  question: string
  header?: string
  multiSelect?: boolean
  options: { label: string; description?: string; preview?: string }[]
}

function AskUserQuestionPrompt({
  input,
  resolution,
  disabled,
  respond,
}: {
  input: any
  resolution: Message | undefined
  disabled: boolean
  respond: (r: unknown) => () => Promise<void>
}) {
  const questions: QuestionDef[] = Array.isArray(input?.questions) ? input.questions : []
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [otherText, setOtherText] = useState<Record<string, string>>({})
  const [previews, setPreviews] = useState<Record<string, string | null>>({})

  if (resolution) {
    const answered = resolution.payload?.response?.updatedInput?.answers ?? {}
    const summary = Object.values(answered)
      .map((a) => (Array.isArray(a) ? a.join(', ') : String(a)))
      .join(' · ')
    return <ResolvedChip resolution={resolution} label="Question" detail={summary} />
  }

  const allAnswered = questions.every((q) => {
    const v = answers[q.question]
    return q.multiSelect
      ? Array.isArray(v) && v.length > 0
      : typeof v === 'string' && v.length > 0
  })

  const handleSubmit = respond({
    behavior: 'allow',
    updatedInput: { questions, answers },
  })

  return (
    <CardShell
      icon={<CircleHelp size={13} className="text-blue-500" />}
      title="Question"
      tone="blue"
    >
      <div className="px-3 py-3 space-y-4">
        {questions.map((q) => (
          <div key={q.question} className="space-y-2">
            <div className="text-sm font-medium leading-snug">{q.question}</div>
            <div className="grid gap-1.5">
              {q.options.map((opt) => {
                const selected = q.multiSelect
                  ? Array.isArray(answers[q.question]) &&
                    (answers[q.question] as string[]).includes(opt.label)
                  : answers[q.question] === opt.label
                return (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setAnswers((prev) => {
                        if (q.multiSelect) {
                          const cur = Array.isArray(prev[q.question])
                            ? (prev[q.question] as string[])
                            : []
                          return {
                            ...prev,
                            [q.question]: cur.includes(opt.label)
                              ? cur.filter((l) => l !== opt.label)
                              : [...cur, opt.label],
                          }
                        }
                        return { ...prev, [q.question]: opt.label }
                      })
                      if (opt.preview)
                        setPreviews((p) => ({ ...p, [q.question]: opt.preview ?? null }))
                    }}
                    className={cn(
                      'text-left rounded-md border px-3 py-1.5 transition-colors cursor-pointer',
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border/60 hover:bg-muted/40',
                    )}
                  >
                    <div className="text-sm flex items-center gap-2">
                      <span
                        className={cn(
                          'w-3.5 h-3.5 rounded-full border flex-shrink-0',
                          selected
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/40',
                        )}
                      />
                      <span>{opt.label}</span>
                    </div>
                    {opt.description && (
                      <div className="text-[11px] text-muted-foreground mt-1 ml-5.5 pl-1">
                        {opt.description}
                      </div>
                    )}
                  </button>
                )
              })}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  Other
                </Label>
                <Input
                  placeholder="Type a custom answer…"
                  value={otherText[q.question] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setOtherText((p) => ({ ...p, [q.question]: v }))
                    if (v) {
                      setAnswers((prev) =>
                        q.multiSelect
                          ? { ...prev, [q.question]: [v] }
                          : { ...prev, [q.question]: v },
                      )
                    }
                  }}
                />
              </div>
            </div>
            {previews[q.question] && (
              <pre className="text-[11px] bg-muted/30 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap">
                {previews[q.question]}
              </pre>
            )}
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-border/40 flex justify-end gap-2">
        <Button size="sm" disabled={disabled || !allAnswered} onClick={handleSubmit}>
          Submit
        </Button>
      </div>
    </CardShell>
  )
}

// --- ExitPlanMode -----------------------------------------------------------

function ExitPlanModePrompt({
  input,
  resolution,
  disabled,
  respond,
}: {
  input: any
  resolution: Message | undefined
  disabled: boolean
  respond: (r: unknown) => () => Promise<void>
}) {
  const plan: string = typeof input?.plan === 'string' ? input.plan : ''
  const [denyMode, setDenyMode] = useState(false)
  const [denyText, setDenyText] = useState('')

  if (resolution) {
    const denied = resolution.payload?.response?.behavior === 'deny'
    return (
      <ResolvedChip
        resolution={resolution}
        label="Plan"
        detail={denied ? resolution.payload?.response?.message : 'approved'}
      />
    )
  }

  return (
    <CardShell
      icon={<ClipboardList size={13} className="text-violet-500" />}
      title="Plan ready"
      tone="violet"
    >
      <div className="px-3 py-3 max-h-96 overflow-y-auto">
        <Markdown className="text-sm">{plan}</Markdown>
      </div>
      {denyMode ? (
        <div className="px-3 py-2 border-t border-border/40 space-y-2">
          <Input
            autoFocus
            placeholder="What should Claude reconsider?"
            value={denyText}
            onChange={(e) => setDenyText(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setDenyMode(false)}>
              Back
            </Button>
            <Button
              size="sm"
              disabled={disabled || !denyText.trim()}
              onClick={respond({
                behavior: 'deny',
                message: denyText.trim(),
                interrupt: false,
              })}
            >
              Send feedback
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-3 py-2 border-t border-border/40 flex flex-wrap gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setDenyMode(true)}>
            Deny with feedback
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={respond({
              behavior: 'deny',
              message: 'User wants to keep iterating on the plan.',
              interrupt: false,
            })}
          >
            Keep planning
          </Button>
          <Button
            size="sm"
            disabled={disabled}
            onClick={respond({ behavior: 'allow', updatedInput: input })}
          >
            Approve and run
          </Button>
        </div>
      )}
    </CardShell>
  )
}

// --- shared chrome ----------------------------------------------------------

function CardShell({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode
  title: string
  tone: 'amber' | 'blue' | 'violet'
  children: React.ReactNode
}) {
  const borderTone =
    tone === 'amber'
      ? 'border-amber-500/40'
      : tone === 'blue'
        ? 'border-blue-500/40'
        : 'border-violet-500/40'
  return (
    <div className={cn('border rounded-md text-sm overflow-hidden', borderTone)}>
      <div className="px-3 py-1.5 flex items-center gap-1.5 bg-muted/30 border-b border-border/40 text-[11px] text-muted-foreground">
        {icon}
        <span className="font-medium uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  )
}

function ResolvedChip({
  resolution,
  label,
  detail,
}: {
  resolution: Message
  label: string
  detail?: string
}) {
  const behavior = resolution.payload?.response?.behavior
  const allowed = behavior === 'allow'
  return (
    <div
      className={cn(
        'text-[11px] text-center flex items-center justify-center gap-1.5 opacity-70',
        allowed ? 'text-emerald-600' : 'text-rose-600',
      )}
    >
      {allowed ? <Check size={12} /> : <X size={12} />}
      <span>
        {allowed ? 'Allowed' : 'Denied'} {label}
      </span>
      {detail && (
        <span className="text-muted-foreground truncate max-w-[280px]">· {detail}</span>
      )}
    </div>
  )
}

function summariseToolInput(input: any): string {
  if (!input || typeof input !== 'object') return ''
  const keys = Object.keys(input)
  if (keys.length === 0) return ''
  const first = keys[0]
  const v = input[first]
  if (typeof v === 'string') {
    const flat = v.replace(/\s+/g, ' ').trim()
    return `${first}: ${flat.slice(0, 100)}${flat.length > 100 ? '…' : ''}`
  }
  return `${keys.length} field${keys.length === 1 ? '' : 's'}`
}
