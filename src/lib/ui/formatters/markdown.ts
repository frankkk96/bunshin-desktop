// 直接的 Markdown 处理函数
const escapeHTML = (text: string): string => {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

const generateCodeBlock = (code: string, language: string): string => {
  return `
    <div class="relative group mb-4">
      <div class="bg-muted border border-border rounded-t-lg px-4 py-2 text-xs text-muted-foreground flex justify-between items-center">
        <span class="font-mono uppercase tracking-wide">${language}</span>
        <button class="opacity-0 group-hover:opacity-100 bg-background hover:bg-muted border border-border rounded px-2 py-1 text-xs" onclick="navigator.clipboard.writeText('${escapeHTML(
          code,
        )}')">
          Copy
        </button>
      </div>
      <pre class="bg-muted border border-t-0 border-border rounded-b-lg p-4 overflow-x-auto text-sm font-mono leading-6"><code class="language-${language}">${escapeHTML(
    code,
  )}</code></pre>
    </div>
  `
}

const generateTable = (header: string, rows: string): string => {
  const headerCells = header
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell)
  const rowsArray = rows.split('\n').filter((row) => row.trim())

  let tableHTML =
    '<div class="my-4 overflow-x-auto"><table class="min-w-full border-collapse border border-border rounded-lg overflow-hidden">'

  // Generate header
  tableHTML += '<thead class="bg-muted/50"><tr>'
  headerCells.forEach((cell) => {
    tableHTML += `<th class="border-r border-border last:border-r-0 px-4 py-3 text-left font-semibold">${processTableCell(
      cell,
    )}</th>`
  })
  tableHTML += '</tr></thead>'

  // Generate body
  tableHTML += '<tbody>'
  rowsArray.forEach((row) => {
    const cells = row
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell)
    if (cells.length > 0) {
      tableHTML += '<tr class="border-b border-border last:border-b-0">'
      cells.forEach((cell, index) => {
        if (index < headerCells.length) {
          tableHTML += `<td class="border-r border-border last:border-r-0 px-4 py-3">${processTableCell(
            cell,
          )}</td>`
        }
      })
      tableHTML += '</tr>'
    }
  })
  tableHTML += '</tbody></table></div>'

  return tableHTML
}

const processTableCell = (cellContent: string): string => {
  let processed = cellContent
  // Bold and italic
  processed = processed.replace(
    /\*\*\*(.*?)\*\*\*/g,
    '<strong class="font-semibold"><em class="italic">$1</em></strong>',
  )
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  processed = processed.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  // Inline code
  processed = processed.replace(
    /`([^`\n]+)`/g,
    `<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400">${escapeHTML(
      '$1',
    )}</code>`,
  )
  // Images
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const altText = alt || 'Image'
    return `<img src="${url}" alt="${escapeHTML(
      altText,
    )}" class="max-w-full h-auto rounded-lg shadow-sm" style="max-height: 100px;" loading="lazy" />`
  })
  // Links
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    return `<a href="${url}" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer">${text}</a>`
  })
  return processed
}

const convertToNestedList = (items: string[]): string => {
  if (items.length === 0) return ''

  let html = '<ul class="mb-4 ml-6 list-disc space-y-1">'
  let currentLevel = 0
  let stack: number[] = []

  items.forEach((item) => {
    const match = item.match(/<li data-level="(\d+)">([\s\S]*?)<\/li>/)
    if (match) {
      const level = parseInt(match[1])
      const content = match[2]

      while (currentLevel < level) {
        html += '<ul class="mb-4 ml-6 list-disc space-y-1">'
        stack.push(currentLevel)
        currentLevel++
      }

      while (currentLevel > level) {
        html += '</ul>'
        currentLevel = stack.pop() || 0
      }

      html += `<li class="leading-7">${content}</li>`
    }
  })

  while (stack.length > 0) {
    html += '</ul>'
    stack.pop()
  }
  html += '</ul>'

  return html
}

const convertToNestedOrderedList = (items: string[]): string => {
  if (items.length === 0) return ''

  let html = '<ol class="mb-4 ml-6 list-decimal space-y-1">'
  let currentLevel = 0
  let stack: number[] = []

  items.forEach((item) => {
    const match = item.match(/<oli data-level="(\d+)">([\s\S]*?)<\/oli>/)
    if (match) {
      const level = parseInt(match[1])
      const content = match[2]

      while (currentLevel < level) {
        html += '<ol class="mb-4 ml-6 list-decimal space-y-1">'
        stack.push(currentLevel)
        currentLevel++
      }

      while (currentLevel > level) {
        html += '</ol>'
        currentLevel = stack.pop() || 0
      }

      html += `<li class="leading-7">${content}</li>`
    }
  })

  while (stack.length > 0) {
    html += '</ol>'
    stack.pop()
  }
  html += '</ol>'

  return html
}

// 主处理函数
export function processMarkdown(text: string): string {
  if (!text) return ''

  let processed = text

  // Process horizontal rules first
  processed = processed.replace(/^[ \t]*---+[ \t]*$/gm, '<hr class="my-8 border-t border-border">')
  processed = processed.replace(
    /^[ \t]*\*\*\*+[ \t]*$/gm,
    '<hr class="my-8 border-t border-border">',
  )
  processed = processed.replace(/^[ \t]*___+[ \t]*$/gm, '<hr class="my-8 border-t border-border">')

  // Extract and preserve code blocks, inline code, and LaTeX
  const codeBlocks: string[] = []
  const inlineCodes: string[] = []
  const tables: string[] = []
  const latexDisplays: string[] = []
  const latexInlines: string[] = []
  let codeBlockIndex = 0
  let inlineCodeIndex = 0
  let tableIndex = 0
  let latexDisplayIndex = 0
  let latexInlineIndex = 0

  // Extract LaTeX display equations first
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_match, equation) => {
    const placeholder = `__LATEX_DISPLAY_${latexDisplayIndex}__`
    latexDisplays[latexDisplayIndex] = `$$${equation}$$`
    latexDisplayIndex++
    return placeholder
  })

  // Extract LaTeX inline equations
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_match, equation) => {
    const placeholder = `__LATEX_INLINE_${latexInlineIndex}__`
    latexInlines[latexInlineIndex] = `$${equation}$`
    latexInlineIndex++
    return placeholder
  })

  // Extract fenced code blocks
  processed = processed.replace(/```(\w*)\n?([\s\S]*?)\n?```/g, (_match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`
    codeBlocks[codeBlockIndex] = generateCodeBlock(code.trim(), lang || 'text')
    codeBlockIndex++
    return placeholder
  })

  // Extract inline code
  processed = processed.replace(/`([^`\n]+)`/g, (_match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCodeIndex}__`
    inlineCodes[
      inlineCodeIndex
    ] = `<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-red-600 dark:text-red-400">${escapeHTML(
      code,
    )}</code>`
    inlineCodeIndex++
    return placeholder
  })

  // Process headers first - 在表格处理之前
  processed = processed.replace(
    /^#{6}[ \t]+(.+)$/gm,
    '<h6 class="text-xs font-semibold mt-3 mb-2 first:mt-0">$1</h6>',
  )
  processed = processed.replace(
    /^#{5}[ \t]+(.+)$/gm,
    '<h5 class="text-sm font-semibold mt-3 mb-2 first:mt-0">$1</h5>',
  )
  processed = processed.replace(
    /^#{4}[ \t]+(.+)$/gm,
    '<h4 class="text-base font-semibold mt-3 mb-2 first:mt-0">$1</h4>',
  )
  processed = processed.replace(
    /^#{3}[ \t]+(.+)$/gm,
    '<h3 class="text-lg font-semibold mt-4 mb-2 first:mt-0">$1</h3>',
  )
  processed = processed.replace(
    /^#{2}[ \t]+(.+)$/gm,
    '<h2 class="text-xl font-semibold mt-5 mb-3 first:mt-0">$1</h2>',
  )
  processed = processed.replace(
    /^#{1}[ \t]+(.+)$/gm,
    '<h1 class="text-2xl font-semibold mt-6 mb-4 first:mt-0">$1</h1>',
  )

  // Extract and process tables
  processed = processed.replace(
    /^\|(.+)\|\s*\n\|[-\s|:]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm,
    (_match, header, rows) => {
      const placeholder = `__TABLE_${tableIndex}__`
      tables[tableIndex] = generateTable(header, rows)
      tableIndex++
      return placeholder
    },
  )

  // Bold and italic
  processed = processed.replace(
    /\*\*\*(.*?)\*\*\*/g,
    '<strong class="font-semibold"><em class="italic">$1</em></strong>',
  )
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
  processed = processed.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')

  // Strikethrough
  processed = processed.replace(/~~(.*?)~~/g, '<del class="line-through opacity-75">$1</del>')

  // Images
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const altText = alt || 'Image'
    return `<img src="${url}" alt="${escapeHTML(
      altText,
    )}" class="max-w-full h-auto rounded-lg my-4 shadow-sm" loading="lazy" />`
  })

  // Links - 所有链接都渲染成 citation 样式的 inline badge
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    let hostname = ''
    try {
      hostname = new URL(url).hostname
    } catch {
      hostname = url
    }
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="citation-link"><img src="${faviconUrl}" alt="" class="citation-favicon" onerror="this.style.display='none'"><span class="citation-abbrev">${escapeHTML(text)}</span></a>`
  })

  // Blockquotes
  processed = processed.replace(/^((?:>\s*.+\n?)+)/gm, (match) => {
    const content = match.replace(/^>\s*/gm, '').trim()
    return `<blockquote class="border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/20 pl-4 py-2 my-4 italic">${content}</blockquote>`
  })

  // Process lists - Unordered
  processed = processed.replace(/^(\s*)[-*+]\s+(.+)$/gm, (_match, indent, content) => {
    const level = Math.floor(indent.length / 2)
    return `<li data-level="${level}">${content}</li>`
  })

  processed = processed.replace(/(<li data-level="\d+">[\s\S]*?<\/li>\s*)+/gs, (match) => {
    const items = match.match(/<li data-level="(\d+)">(.*?)<\/li>/gs) || []
    return convertToNestedList(items)
  })

  // Ordered lists
  processed = processed.replace(/^(\s*)\d+\.\s+(.+)$/gm, (_match, indent, content) => {
    const level = Math.floor(indent.length / 2)
    return `<oli data-level="${level}">${content}</oli>`
  })

  processed = processed.replace(/(<oli data-level="\d+">[\s\S]*?<\/oli>\s*)+/gs, (match) => {
    const items = match.match(/<oli data-level="(\d+)">(.*?)<\/oli>/gs) || []
    return convertToNestedOrderedList(items)
  })

  // Process paragraphs
  const paragraphs = processed.split(/\n\s*\n/)
  processed = paragraphs
    .map((para) => {
      para = para.trim()
      if (!para) return ''
      // Don't wrap block elements
      if (
        para.startsWith('<h') ||
        para.startsWith('<ul>') ||
        para.startsWith('<ol>') ||
        para.startsWith('<blockquote>') ||
        para.startsWith('<hr>') ||
        para === '<hr>' ||
        para.includes('__CODE_BLOCK_') ||
        para.includes('__TABLE_')
      ) {
        return para.replace(/\n/g, ' ')
      }
      return `<p class="mb-4 last:mb-0 leading-7">${para.replace(/\n/g, '<br>')}</p>`
    })
    .filter((para) => para)
    .join('\n\n')

  // Restore placeholders
  for (let i = 0; i < tables.length; i++) {
    processed = processed.replace(`__TABLE_${i}__`, tables[i])
  }
  for (let i = 0; i < codeBlocks.length; i++) {
    processed = processed.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i])
  }
  for (let i = 0; i < inlineCodes.length; i++) {
    processed = processed.replace(`__INLINE_CODE_${i}__`, inlineCodes[i])
  }
  for (let i = 0; i < latexDisplays.length; i++) {
    processed = processed.replace(`__LATEX_DISPLAY_${i}__`, latexDisplays[i])
  }
  for (let i = 0; i < latexInlines.length; i++) {
    processed = processed.replace(`__LATEX_INLINE_${i}__`, latexInlines[i])
  }

  return processed
}
