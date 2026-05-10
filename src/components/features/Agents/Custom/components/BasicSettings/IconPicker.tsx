import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { ProviderIcon, PROVIDER_ICONS } from '@/components/common/Icons/ProviderIcon'
import { MacOSInput, MacOSScrollArea } from '@/components/ui'
import { cn } from '@/lib/ui/utils'

const ICON_KEYS = Object.keys(PROVIDER_ICONS)

interface IconPickerProps {
  value: string
  onChange: (value: string) => void
  /** 触发按钮的尺寸: 'sm' = 32px, 'md' = 40px */
  size?: 'sm' | 'md'
  className?: string
}

export function IconPicker({ value, onChange, size = 'sm', className }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // 过滤图标
  const filteredIcons = search
    ? ICON_KEYS.filter((key) => key.toLowerCase().includes(search.toLowerCase()))
    : ICON_KEYS

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 选择图标
  const handleSelect = (key: string) => {
    onChange(key)
    setIsOpen(false)
    setSearch('')
  }

  const sizeClasses = size === 'md' ? 'w-10 h-10 rounded-lg' : 'w-8 h-8 rounded-md'
  const iconSize = size === 'md' ? 24 : 16

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          sizeClasses,
          'bg-accent/50 flex-shrink-0',
          'flex items-center justify-center',
          'hover:bg-accent cursor-pointer transition-colors',
        )}
        title={value}
      >
        <ProviderIcon provider={value} size={iconSize} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-[280px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <MacOSInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icons..."
                className="pl-7 h-7 text-xs"
                autoFocus
              />
            </div>
          </div>

          {/* Icons Grid */}
          <MacOSScrollArea className="h-[200px] [&>div>div]:!block">
            <div className="p-2">
              {filteredIcons.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-4">
                  No icons found
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {filteredIcons.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelect(key)}
                      className={cn(
                        'w-8 h-8 rounded-md flex items-center justify-center',
                        'hover:bg-accent cursor-pointer transition-colors',
                        value === key && 'bg-accent ring-1 ring-foreground/20',
                      )}
                      title={key}
                    >
                      <ProviderIcon provider={key} size={18} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </MacOSScrollArea>
        </div>
      )}
    </div>
  )
}
