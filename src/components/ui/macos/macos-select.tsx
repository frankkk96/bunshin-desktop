import React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { cn } from '@/lib/ui/utils'

function MacOSSelect({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />
}

function MacOSSelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group {...props} />
}

function MacOSSelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value {...props} />
}

interface MacOSSelectTriggerProps extends React.ComponentProps<typeof SelectPrimitive.Trigger> {
  size?: 'sm' | 'default'
}

function MacOSSelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: MacOSSelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex w-fit items-center justify-between gap-2 rounded-md border border-border bg-muted',
        'px-3 py-2 text-sm whitespace-nowrap outline-none',
        'text-foreground placeholder:text-muted-foreground',
        'focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        size === 'default' && 'h-9',
        size === 'sm' && 'h-8',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

MacOSSelectTrigger.displayName = 'MacOSSelectTrigger'

interface MacOSSelectContentProps extends React.ComponentProps<typeof SelectPrimitive.Content> {
  position?: 'popper' | 'item-aligned'
}

function MacOSSelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: MacOSSelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border',
          'bg-popover text-popover-foreground shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <MacOSSelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <MacOSSelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

MacOSSelectContent.displayName = 'MacOSSelectContent'

function MacOSSelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

MacOSSelectLabel.displayName = 'MacOSSelectLabel'

function MacOSSelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm',
        'py-1.5 pl-2 pr-8 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

MacOSSelectItem.displayName = 'MacOSSelectItem'

function MacOSSelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
  )
}

MacOSSelectSeparator.displayName = 'MacOSSelectSeparator'

function MacOSSelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUpIcon className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

MacOSSelectScrollUpButton.displayName = 'MacOSSelectScrollUpButton'

function MacOSSelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDownIcon className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

MacOSSelectScrollDownButton.displayName = 'MacOSSelectScrollDownButton'

// Exports
export {
  MacOSSelect,
  MacOSSelectContent,
  MacOSSelectGroup,
  MacOSSelectItem,
  MacOSSelectLabel,
  MacOSSelectScrollDownButton,
  MacOSSelectScrollUpButton,
  MacOSSelectSeparator,
  MacOSSelectTrigger,
  MacOSSelectValue,
}
