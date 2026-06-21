import React from 'react'
import { IoSearchOutline } from 'react-icons/io5'
import { cn } from '@/lib/ui/utils'
import {
  MacOSButton,
  MacOSTooltip,
  MacOSTooltipContent,
  MacOSTooltipTrigger,
} from '@/components/ui'

interface ActionButton {
  icon: React.ComponentType<any>
  onClick: () => void
  tooltip: string
}

interface SidebarContainerProps {
  children: React.ReactNode
  width?: string

  // Header props
  title?: string | React.ReactNode
  headerIcon?: React.ReactNode
  onHeaderIconClick?: () => void
  headerIconTooltip?: string

  // Search props
  showSearch?: boolean
  searchPlaceholder?: string
  searchValue?: string
  searchQuery?: string
  onSearchChange?: (value: string) => void

  // Loading state
  isLoading?: boolean

  // Action button (like add contact)
  actionButton?: ActionButton

  // Action button rendered inline to the right of the search field
  inlineAction?: ActionButton

  // Pinned footer (e.g. settings entry) rendered below the scroll area
  footer?: React.ReactNode
}

export function SidebarContainer({
  children,
  width = '280px',
  title,
  headerIcon,
  headerIconTooltip,
  onHeaderIconClick,
  showSearch = true,
  searchPlaceholder = 'Search...',
  searchValue,
  searchQuery,
  onSearchChange,
  isLoading = false,
  actionButton,
  inlineAction,
  footer,
}: SidebarContainerProps) {
  // Use searchQuery if provided, otherwise use searchValue
  const currentSearchValue = searchQuery || searchValue || ''

  return (
    <div
      className={cn('h-full border-r border-border bg-secondary overflow-x-hidden flex flex-col')}
      style={{
        width,
      }}
    >
      {/* Header — extra top padding clears the macOS traffic lights now that this
          is the left-most pane (no icon rail). */}
      <div data-tauri-drag-region className="px-3 pb-3 pt-9 select-none">
        <div
          data-tauri-drag-region
          className={cn(
            'flex items-center justify-between',
            showSearch && (title || actionButton || headerIcon) ? 'mb-2' : '',
            !title && !actionButton && !headerIcon ? 'hidden' : '',
          )}
        >
          {title && (
            <h2
              data-tauri-drag-region
              className="text-lg font-semibold m-0 text-foreground min-h-[30px]"
            >
              {title}
            </h2>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {actionButton && (
              <MacOSTooltip>
                <MacOSTooltipTrigger asChild>
                  <MacOSButton
                    data-tauri-drag-region
                    onClick={actionButton.onClick}
                    variant="icon"
                    className="p-1.5 rounded-md"
                  >
                    <actionButton.icon size={16} />
                  </MacOSButton>
                </MacOSTooltipTrigger>
                <MacOSTooltipContent side="top" sideOffset={5}>
                  {actionButton.tooltip}
                </MacOSTooltipContent>
              </MacOSTooltip>
            )}

            {headerIcon && (
              <MacOSTooltip>
                <MacOSTooltipTrigger asChild>
                  <MacOSButton
                    data-tauri-drag-region
                    onClick={onHeaderIconClick || (() => {})}
                    variant="icon"
                    className="p-1.5 rounded-md"
                  >
                    {headerIcon}
                  </MacOSButton>
                </MacOSTooltipTrigger>
                <MacOSTooltipContent side="top" sideOffset={5}>
                  {headerIconTooltip}
                </MacOSTooltipContent>
              </MacOSTooltip>
            )}
          </div>
        </div>

        {/* Search Bar (+ optional inline action, e.g. New Session) */}
        {showSearch && (
          <div data-tauri-drag-region className="flex items-center gap-1.5">
            <div className="relative flex items-center flex-1">
              <IoSearchOutline
                size={14}
                className="absolute left-2.5 pointer-events-none text-muted-foreground"
              />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={currentSearchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="bg-muted w-full pl-8 pr-2.5 py-2 border-[1px] rounded-md text-xs outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-ring border-border"
              />
            </div>
            {inlineAction && (
              <MacOSTooltip>
                <MacOSTooltipTrigger asChild>
                  <MacOSButton
                    onClick={inlineAction.onClick}
                    variant="outline"
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <inlineAction.icon size={16} />
                  </MacOSButton>
                </MacOSTooltipTrigger>
                <MacOSTooltipContent side="bottom" sideOffset={5}>
                  {inlineAction.tooltip}
                </MacOSTooltipContent>
              </MacOSTooltip>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-x-hidden">
        {isLoading ? <div className="p-4 text-muted-foreground">Loading...</div> : children}
      </div>

      {/* Pinned footer */}
      {footer && <div className="border-t border-border/60 p-2">{footer}</div>}
    </div>
  )
}
