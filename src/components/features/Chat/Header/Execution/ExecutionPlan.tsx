/**
 * ExecutionPlan - 显示 workflow 执行计划的组件
 * 用于在 ExecutionStatus 中显示步骤详情
 * 按照最新的三层结构显示：Workflow -> Query[] -> Task[]
 */

import { WorkflowSnapshot } from '@/lib/core/execution/types'
import { QuerySnapshot } from '@/lib/core/execution/types'
import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  IoCheckmarkCircleOutline,
  IoTimerOutline,
  IoWarningOutline,
  IoCloseCircle,
} from 'react-icons/io5'
import { ImSpinner8 } from 'react-icons/im'
import { ProviderIcon } from '@/components/common'
import { useAgentsByIds } from '@/hooks/contacts/agents/query'
import { useProviders } from '@/hooks/models/useModels'

const MAX_VISIBLE_AGENTS = 2

// 用于显示 query 对应的 agent 图标
function QueryAgentAvatars({ agentIds }: { agentIds: string[] }) {
  const agents = useAgentsByIds(agentIds)
  const { data: providers = [] } = useProviders()

  // 创建 providerId -> avatar 的映射
  const providerAvatarMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const provider of providers) {
      map.set(provider.id, provider.avatar)
    }
    return map
  }, [providers])

  const getProviderAvatar = (providerId: string): string => {
    return providerAvatarMap.get(providerId) ?? providerId
  }

  const visibleAgents = agents.slice(0, MAX_VISIBLE_AGENTS)
  const hiddenCount = agents.length - MAX_VISIBLE_AGENTS

  if (agents.length === 0) return null

  return (
    <div className="flex items-center -space-x-1 flex-shrink-0">
      {visibleAgents.map((agent) => (
        <div
          key={agent.id}
          className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center"
        >
          <ProviderIcon provider={getProviderAvatar(agent.llm.providerId)} size={12} />
        </div>
      ))}
      {hiddenCount > 0 && (
        <div className="w-4 h-4 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-1 ring-background">
          <span className="text-[8px] font-medium text-muted-foreground">+{hiddenCount}</span>
        </div>
      )}
    </div>
  )
}

interface ExecutionPlanProps {
  workflow: WorkflowSnapshot
  trigger?: 'hover' | 'click'
  onClose?: () => void
  children: React.ReactNode
}

export function ExecutionPlan({
  workflow,
  trigger = 'hover',
  onClose,
  children,
}: ExecutionPlanProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const queries = workflow.queries || []

  // 计算tooltip位置
  const updatePosition = () => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipWidth = 320
    const tooltipHeight = Math.min(240, queries.length * 28 + 50) // 每个query约28px，加上header

    let x = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2
    let y = triggerRect.bottom + 8 // 默认显示在下方，避免鼠标移动路径被阻断

    // 边界检测
    if (x < 8) x = 8
    if (x + tooltipWidth > window.innerWidth - 8) x = window.innerWidth - tooltipWidth - 8

    // 如果下方没有足够空间，则显示在上方
    if (y + tooltipHeight > window.innerHeight - 8) {
      y = triggerRect.top - tooltipHeight - 8
    }

    setPosition({ x, y })
  }

  // 处理显示/隐藏
  const handleShow = () => {
    updatePosition()
    setIsVisible(true)
  }

  const handleHide = () => {
    setIsVisible(false)
    onClose?.()
  }

  // 事件处理
  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      // 清除之前的隐藏定时器
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      // 立即显示
      handleShow()
    }
  }

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      // 延迟隐藏，给用户时间移动到tooltip上
      hoverTimeoutRef.current = setTimeout(() => {
        handleHide()
        hoverTimeoutRef.current = null
      }, 300) // 增加延迟时间
    }
  }

  const handleClick = () => {
    if (trigger === 'click') {
      if (isVisible) handleHide()
      else handleShow()
    }
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // 监听窗口大小变化
  useEffect(() => {
    if (isVisible) {
      const handleResize = () => updatePosition()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [isVisible])

  // 点击外部关闭
  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleHide()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isVisible])

  const getQueryIcon = (query: QuerySnapshot) => {
    switch (query.status) {
      case 'succeeded':
        return <IoCheckmarkCircleOutline size={14} className="text-green-500" />
      case 'running':
        return <ImSpinner8 size={12} className="text-primary animate-spin" />
      case 'failed':
        return <IoWarningOutline size={14} className="text-destructive" />
      case 'cancelled':
        return <IoCloseCircle size={14} className="text-muted-foreground" />
      case 'pending':
      default:
        return <IoTimerOutline size={14} className="text-muted-foreground" />
    }
  }

  const getQueryStatus = (query: QuerySnapshot) => {
    return query.status
  }

  return (
    <>
      {/* 触发器 */}
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={trigger === 'hover' ? 'cursor-help' : 'cursor-pointer'}
      >
        {children}
      </div>

      {/* Tooltip - 使用 Portal 渲染到 body */}
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] shadow-lg rounded-lg border backdrop-blur-sm bg-background/95 border-border overflow-hidden"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: '320px',
              maxHeight: '240px',
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => {
              if (trigger === 'hover') {
                // 清除隐藏定时器，保持显示
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current)
                  hoverTimeoutRef.current = null
                }
                setIsVisible(true)
              }
            }}
            onMouseLeave={handleMouseLeave}
          >
            {/* Header */}
            <div className="px-3 py-1.5 border-b border-border bg-secondary/50">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-xs text-foreground">Execution Plan</h3>
                <div className="text-xs text-muted-foreground">
                  {queries.filter((q) => q.status === 'succeeded').length}/{queries.length} queries
                </div>
              </div>
            </div>

            {/* Queries List */}
            <div className="overflow-y-auto" style={{ maxHeight: '160px' }}>
              {queries.map((query, index) => {
                const status = getQueryStatus(query)
                const isActive = query.status === 'running'

                return (
                  <div
                    key={query.queryId}
                    className={`flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 border-border ${
                      isActive
                        ? 'bg-primary/10'
                        : status === 'succeeded'
                        ? 'bg-success/5'
                        : status === 'failed'
                        ? 'bg-destructive/5'
                        : ''
                    }`}
                  >
                    {/* Query Icon */}
                    <div className="flex-shrink-0 flex items-center">{getQueryIcon(query)}</div>

                    {/* Index */}
                    <span
                      className={`text-xs flex-shrink-0 ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {index + 1}.
                    </span>

                    {/* Text */}
                    <span
                      className={`text-xs truncate flex-1 min-w-0 text-foreground ${
                        isActive ? 'opacity-100' : 'opacity-90'
                      }`}
                      title={query.message.text || `Query ${index + 1}`}
                    >
                      {query.message.text || `Query ${index + 1}`}
                    </span>

                    {/* Running Badge */}
                    {isActive && (
                      <span
                        className="text-xs px-1 py-0 rounded flex-shrink-0 bg-primary/20 text-primary"
                        style={{
                          fontSize: '10px',
                        }}
                      >
                        Running
                      </span>
                    )}

                    {/* Agent Avatars */}
                    <QueryAgentAvatars agentIds={query.message.agents} />
                  </div>
                )
              })}
            </div>

            {/* Footer - 只在失败时显示 */}
            {workflow.status === 'failed' && (
              <div className="px-3 py-1 border-t text-xs text-center border-border bg-destructive/10 text-destructive">
                Execution failed
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
