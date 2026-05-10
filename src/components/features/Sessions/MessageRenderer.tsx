import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/ui/utils'
import type { Message } from '@/lib/types'

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

    case 'stream_event':
      // Partial deltas — skip; the assistant turn render handles whole turns.
      return null

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
    <div className="flex flex-col gap-2 max-w-[90%]">
      {blocks.map((block, idx) => {
        if (block.type === 'text') {
          return (
            <div
              key={idx}
              className="prose prose-sm dark:prose-invert max-w-none rounded-2xl bg-muted/40 px-4 py-2"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text ?? ''}</ReactMarkdown>
            </div>
          )
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
    <div className="border border-border/40 rounded-md text-sm">
      <button
        className="w-full flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Thinking
      </button>
      {open && (
        <div className="px-3 pb-2 text-xs whitespace-pre-wrap text-muted-foreground">
          {text}
        </div>
      )}
    </div>
  )
}

function ToolUseCard({ block }: { block: any }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-md text-sm">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted">{block.name}</span>
        <span className="text-xs text-muted-foreground truncate">
          {summariseToolInput(block.input)}
        </span>
      </button>
      {open && (
        <pre className="px-3 pb-2 text-[11px] overflow-x-auto bg-muted/30">
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
  if (typeof v === 'string') return `${first}: ${v.slice(0, 80)}`
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
        return (
          <div
            key={i}
            className={cn(
              'border-l-2 pl-3 text-xs whitespace-pre-wrap font-mono',
              b.is_error ? 'border-red-500 text-red-700' : 'border-muted',
            )}
          >
            {text || '(empty result)'}
          </div>
        )
      })}
    </>
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
  return (
    <div className="text-[11px] text-center text-amber-600">
      Subprocess exited (status: {payload?.status ?? 'unknown'}, code: {payload?.code ?? '?'})
      {payload?.stderr_tail && (
        <pre className="text-left text-[10px] mt-1 px-2 py-1 bg-muted rounded">
          {String(payload.stderr_tail).slice(-500)}
        </pre>
      )}
    </div>
  )
}

function RawDebug({ payload, kind }: { payload: any; kind: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="text-[11px] text-muted-foreground">
      <button onClick={() => setOpen((v) => !v)} className="underline">
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
