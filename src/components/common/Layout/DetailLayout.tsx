interface DetailLayoutProps {
  children: React.ReactNode
  className?: string
}

export function DetailLayout({ children, className = '' }: DetailLayoutProps) {
  return (
    <div data-tauri-drag-region className={`h-full overflow-y-auto p-8 bg-background ${className}`}>
      <div className="max-w-[600px] mx-auto">{children}</div>
    </div>
  )
}
