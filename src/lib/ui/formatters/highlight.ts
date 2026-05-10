import React, { ReactNode } from 'react'

/**
 * 在文本中高亮指定的查询词
 * @param text - 需要高亮的文本
 * @param query - 查询词
 * @returns ReactNode - 包含高亮部分的React节点
 */
function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) {
    return text
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return React.createElement(
        'mark',
        {
          key: index,
          className: 'bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded-sm',
        },
        part,
      )
    }
    return part
  })
}

/**
 * 截断文本并在指定位置高亮
 * @param text - 原始文本
 * @param query - 查询词
 * @param maxLength - 最大长度
 * @returns 处理后的文本和是否被截断
 */
export function truncateAndHighlight(
  text: string,
  query: string,
  maxLength: number = 100,
): {
  text: ReactNode
  truncated: boolean
} {
  if (!query.trim()) {
    if (text.length > maxLength) {
      return {
        text: text.substring(0, maxLength) + '...',
        truncated: true,
      }
    }
    return { text, truncated: false }
  }

  // 查找查询词的位置
  const queryIndex = text.toLowerCase().indexOf(query.toLowerCase())

  if (queryIndex === -1) {
    // 如果没找到查询词，直接截断
    if (text.length > maxLength) {
      return {
        text: text.substring(0, maxLength) + '...',
        truncated: true,
      }
    }
    return { text, truncated: false }
  }

  // 计算显示范围，让查询词居中
  const halfLength = Math.floor(maxLength / 2)
  let start = Math.max(0, queryIndex - halfLength)
  let end = Math.min(text.length, start + maxLength)

  // 如果结尾超出，调整开始位置
  if (end - start < maxLength && start > 0) {
    start = Math.max(0, end - maxLength)
  }

  let displayText = text.substring(start, end)
  let prefix = start > 0 ? '...' : ''
  let suffix = end < text.length ? '...' : ''

  displayText = prefix + displayText + suffix

  return {
    text: highlightText(displayText, query),
    truncated: start > 0 || end < text.length,
  }
}
