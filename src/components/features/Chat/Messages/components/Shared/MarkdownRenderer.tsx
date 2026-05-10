import { memo, useMemo, useEffect, useRef } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.min.css'
import { processMarkdown } from '@/lib/ui/formatters/markdown'
import { cn } from '@/lib/ui/utils'
import { openUrl } from '@tauri-apps/plugin-opener'
import { logger } from '@/lib/core/utils/logger'

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  // 使用 useMemo 缓存处理结果，避免重复计算
  const html = useMemo(() => {
    if (!content.trim()) return ''
    return processMarkdown(content)
  }, [content])
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      // Highlight code blocks
      contentRef.current.querySelectorAll('pre code').forEach((el) => {
        hljs.highlightElement(el as HTMLElement)
      })

      // Handle external link clicks
      const linkHandlers: Array<{ element: Element; handler: (e: Event) => void }> = []

      contentRef.current.querySelectorAll('a[href]').forEach((link) => {
        const href = link.getAttribute('href')
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          const handler = (e: Event) => {
            e.preventDefault()
            openUrl(href).catch((error: any) => {
              logger.error('Failed to open external link:', error)
            })
          }
          link.addEventListener('click', handler)
          linkHandlers.push({ element: link, handler })
        }
      })

      // Cleanup function to remove event listeners
      return () => {
        linkHandlers.forEach(({ element, handler }) => {
          element.removeEventListener('click', handler)
        })
      }
    }
  }, [html])

  return (
    <div
      ref={contentRef}
      className={cn('markdown-content')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})
