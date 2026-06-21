import { useState } from 'react'
import { ChevronDown, ChevronRight, LogIn } from 'lucide-react'
import { MacOSButton } from '@/components/ui'
import { useSignInAgent } from '@/hooks/agents'
import { toast } from '@/lib/core/utils/toast'
import { cn } from '@/lib/ui/utils'
import type { Message } from '@/lib/types'
import { Markdown } from './Markdown'
import { PermissionRequestCard } from './PermissionRequestCard'

interface MessageRendererProps {
  message: Message
}

/**
 * Translates a row from the messages table into UI. Each row is one stream-json
 * event from the claude subprocess (or a `local_user` mirror of an outgoing
 * user message we wrote to stdin).
 */
export function MessageRenderer({ message }: MessageRendererProps) {
  const { kind, payload } = message

  switch (kind) {
    case 'local_user':
      return <UserBubble text={payload?.text ?? ''} attachments={payload?.attachments ?? []} />

    case 'assistant':
      return <AssistantTurn payload={payload} />

    case 'user':
      // Echo from the child — usually contains tool_result blocks.
      return <ToolResultBlocks payload={payload} />

    case 'system':
      return <SystemChip payload={payload} />

    case 'result':
      return <ResultChip payload={payload} />

    case 'process_exit':
      return <ProcessExitChip payload={payload} />

    case 'control_request':
      return <PermissionRequestCard message={message} />

    case 'local_control_response':
      // The card itself renders the resolved-state chip by looking this up.
      return null

    case 'stream_event':
    case 'control_response':
      return null

    case 'unknown':
      return <RawDebug payload={payload} kind="unknown" />

    default:
      return <RawDebug payload={payload} kind={kind} />
  }
}

function UserBubble({ text, attachments }: { text: string; attachments: any[] }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl px-4 py-2 whitespace-pre-wrap text-sm">
        {text}
        {attachments?.length > 0 && (
          <div className="mt-2 text-xs opacity-80">
            {attachments.length} attachment{attachments.length === 1 ? '' : 's'}
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantTurn({ payload }: { payload: any }) {
  const blocks: any[] = payload?.message?.content ?? []
  if (!Array.isArray(blocks) || blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-2 max-w-full">
      {blocks.map((block, idx) => {
        if (block.type === 'text') {
          return <Markdown key={idx}>{block.text ?? ''}</Markdown>
        }
        if (block.type === 'thinking') {
          return <ThinkingBlock key={idx} text={block.thinking ?? ''} />
        }
        if (block.type === 'tool_use') {
          return <ToolUseCard key={idx} block={block} />
        }
        return <RawDebug key={idx} payload={block} kind={`assistant:${block.type}`} />
      })}
    </div>
  )
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-sm">
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Thinking
      </button>
      {open && (
        <div className="mt-1 pl-4 text-xs whitespace-pre-wrap text-muted-foreground border-l border-border/40">
          {text}
        </div>
      )}
    </div>
  )
}

function ToolUseCard({ block }: { block: any }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border/60 rounded-md text-sm bg-muted/20 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
        )}
        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground/90 flex-shrink-0">
          {block.name}
        </span>
        <span className="text-xs text-muted-foreground truncate min-w-0">
          {summariseToolInput(block.input)}
        </span>
      </button>
      {open && (
        <pre className="px-3 py-2 text-[11px] leading-relaxed overflow-x-auto bg-muted/40 border-t border-border/40 whitespace-pre-wrap break-all">
          {JSON.stringify(block.input ?? {}, null, 2)}
        </pre>
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

function ToolResultBlocks({ payload }: { payload: any }) {
  const blocks: any[] = payload?.message?.content ?? []
  if (!Array.isArray(blocks)) return null
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type !== 'tool_result') return null
        const text = Array.isArray(b.content)
          ? b.content
              .map((c: any) => (c.type === 'text' ? c.text : JSON.stringify(c)))
              .join('\n')
          : String(b.content ?? '')
        return <ToolResultCard key={i} text={text} isError={!!b.is_error} />
      })}
    </>
  )
}

function ToolResultCard({ text, isError }: { text: string; isError: boolean }) {
  const [open, setOpen] = useState(false)
  const trimmed = text.trim()
  const lines = trimmed ? trimmed.split('\n').length : 0
  const chars = trimmed.length

  const summary = trimmed
    ? `${lines} line${lines === 1 ? '' : 's'} · ${chars.toLocaleString()} char${chars === 1 ? '' : 's'}`
    : 'empty'

  return (
    <div
      className={cn(
        'border rounded-md text-sm overflow-hidden',
        isError ? 'border-red-500/40 bg-red-500/5' : 'border-border/60 bg-muted/20',
      )}
    >
      <button
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors cursor-pointer',
          isError ? 'hover:bg-red-500/10' : 'hover:bg-muted/40',
        )}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
        )}
        <span
          className={cn(
            'text-[11px] px-1.5 py-0.5 rounded font-medium flex-shrink-0',
            isError
              ? 'bg-red-500/10 text-red-700 dark:text-red-400'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {isError ? 'error' : 'result'}
        </span>
        <span className="text-xs text-muted-foreground truncate">{summary}</span>
      </button>
      {open && (
        <pre
          className={cn(
            'px-3 py-2 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all border-t border-border/40 font-mono',
            isError ? 'bg-red-500/5 text-red-800 dark:text-red-300' : 'bg-muted/40',
          )}
        >
          {trimmed || '(empty result)'}
        </pre>
      )}
    </div>
  )
}

function SystemChip({ payload }: { payload: any }) {
  if (payload?.subtype === 'init') {
    return (
      <div className="text-[11px] text-muted-foreground text-center">
        session started · model {payload.model ?? 'unknown'}
      </div>
    )
  }
  return null
}

function ResultChip({ payload }: { payload: any }) {
  const cost = payload?.total_cost_usd
  const dur = payload?.duration_ms
  const turns = payload?.num_turns
  return (
    <div className="text-[11px] text-muted-foreground text-center">
      turn done
      {dur != null && ` · ${(dur / 1000).toFixed(1)}s`}
      {turns != null && ` · ${turns} turn(s)`}
      {cost != null && ` · $${cost.toFixed(4)}`}
    </div>
  )
}

function ProcessExitChip({ payload }: { payload: any }) {
  const needsLogin = !!payload?.needs_login
  const agentId: string | undefined = payload?.agent_id
  return (
    <div className="text-[11px] text-center text-amber-600">
      {needsLogin ? (
        <span className="text-foreground">
          This agent isn't signed in yet — run <code className="px-1 py-0.5 rounded bg-muted text-[10px]">claude /login</code> in its isolated profile.
        </span>
      ) : (
        <>Subprocess exited (status: {payload?.status ?? 'unknown'}, code: {payload?.code ?? '?'})</>
      )}
      {needsLogin && agentId && (
        <div className="mt-2 flex justify-center">
          <SignInButton agentId={agentId} />
        </div>
      )}
      {payload?.stderr_tail && (
        <pre className="text-left text-[10px] mt-1 px-2 py-1 bg-muted rounded">
          {String(payload.stderr_tail).slice(-500)}
        </pre>
      )}
    </div>
  )
}

export function SignInButton({ agentId }: { agentId: string }) {
  const signIn = useSignInAgent()
  const handle = async () => {
    try {
      await signIn.mutateAsync(agentId)
      toast.success('Terminal opened — complete the login there, then resume the session.')
    } catch (err) {
      toast.error(String(err))
    }
  }
  return (
    <MacOSButton variant="outline" onClick={handle} disabled={signIn.isPending}>
      <LogIn size={13} className="mr-1.5" />
      {signIn.isPending ? 'Opening…' : 'Sign in'}
    </MacOSButton>
  )
}

function RawDebug({ payload, kind }: { payload: any; kind: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-[11px] text-muted-foreground">
      <button
        onClick={() => setOpen((v) => !v)}
        className="underline cursor-pointer"
      >
        {open ? 'Hide' : 'Show'} {kind} event
      </button>
      {open && (
        <pre className="text-[10px] bg-muted/30 px-2 py-1 mt-1 rounded overflow-x-auto">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  )
}
