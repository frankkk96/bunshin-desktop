
interface NotFoundViewProps {
  entityType: string
  message?: string
}

export function NotFoundView({ entityType, message }: NotFoundViewProps) {
  return (
    <div
      className="h-full flex items-center justify-center flex-col gap-4 text-muted-foreground bg-background"
    >
      <div className="text-lg font-semibold">{entityType} not found</div>
      <div className="text-sm">
        {message || `The selected ${entityType.toLowerCase()} could not be found`}
      </div>
    </div>
  )
}
