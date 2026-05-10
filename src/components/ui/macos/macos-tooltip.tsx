import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/ui/utils'

function MacOSTooltipProvider({
  delayDuration = 0,
  skipDelayDuration,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  )
}

function MacOSTooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root {...props} />
}

function MacOSTooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger {...props} />
}

function MacOSTooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 overflow-hidden rounded-md px-3 py-1.5 text-xs',
          'bg-black text-white shadow-xl border border-gray-600',
          'max-w-xs',
          className,
        )}
        style={{
          // Ensure sufficiently high z-index
          zIndex: 9999,
        }}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

// Export MacOS versions
export { MacOSTooltip, MacOSTooltipTrigger, MacOSTooltipContent, MacOSTooltipProvider }
