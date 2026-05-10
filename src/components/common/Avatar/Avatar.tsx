import { useMemo } from 'react'
import { cn } from '@/lib/ui/utils'
import { ProviderIcon } from '../Icons/ProviderIcon'
import type { Contact } from '@/hooks/contacts/shared/types'
import { useProviders } from '@/hooks/models/useModels'

interface AvatarProps {
  contact: Contact
  size?: number
  className?: string
}

// 根据头像大小计算合适的圆角
const getBorderRadius = (avatarSize: number) => {
  // 圆角约为头像尺寸的 12%，最小 2px，最大 6px
  return Math.min(6, Math.max(2, Math.round(avatarSize * 0.12)))
}

export function Avatar({ contact, size = 40, className }: AvatarProps) {
  const agents = contact.agents || []
  const borderRadius = getBorderRadius(size)

  // 使用 React Query 获取 providers
  const { data: providers = [] } = useProviders()

  // 创建 providerId -> avatar 的映射
  const providerAvatarMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const provider of providers) {
      map.set(provider.id, provider.avatar)
    }
    return map
  }, [providers])

  // 获取 provider 的 avatar
  const getProviderAvatar = (providerId: string): string => {
    return providerAvatarMap.get(providerId) ?? providerId
  }

  // Group variant: display multiple agent icons in 2x2 grid
  if (agents.length > 1) {
    const gap = 2
    const avatarSize = (size - gap) / 2
    const maxAgents = agents.slice(0, 4)

    return (
      <div
        className={cn('grid grid-cols-2 overflow-hidden', className)}
        style={{ width: size, height: size, gap: `${gap}px` }}
      >
        {Array.from({ length: 4 }).map((_, index) => {
          const agent = maxAgents[index]
          const providerId = agent?.llm?.providerId
          const avatar = providerId ? getProviderAvatar(providerId) : undefined

          return (
            <div
              key={agent?.id || index}
              className="flex items-center justify-center"
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: `${getBorderRadius(avatarSize)}px`,
              }}
            >
              {avatar && <ProviderIcon provider={avatar} size={avatarSize} />}
            </div>
          )
        })}
      </div>
    )
  }

  // Single variant: display one agent's provider icon
  const providerId = agents[0]?.llm?.providerId
  const avatar = providerId ? getProviderAvatar(providerId) : undefined

  return (
    <div
      className={cn('flex items-center justify-center flex-shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: `${borderRadius}px`,
      }}
    >
      {avatar && <ProviderIcon provider={avatar} size={size} />}
    </div>
  )
}
