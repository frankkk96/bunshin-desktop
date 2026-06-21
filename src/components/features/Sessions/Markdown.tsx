import { useEffect, useMemo, useRef } from 'react'
import { marked, Renderer } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { cn } from '@/lib/ui/utils'

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  )

// Escape any raw HTML in the source — Claude can produce arbitrary text and we
// don't want `<script>` etc. to render. Markdown formatting itself still works.
const renderer = new Renderer()
renderer.html = ({ text }) => escapeHtml(text)

marked.setOptions({
  gfm: true,
  breaks: false,
  renderer,
})

interface MarkdownProps {
  children: string
  className?: string
}

export function Markdown({ children, className }: MarkdownProps) {
  const html = useMemo(
    () => marked.parse(children ?? '', { async: false }) as string,
    [children],
  )
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.querySelectorAll<HTMLElement>('pre code').forEach((el) => {
      if (el.dataset.highlighted === 'yes') return
      hljs.highlightElement(el)
    })
  }, [html])

  return (
    <div
      ref={ref}
      className={cn('markdown-content', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
