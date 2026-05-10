interface SettingDividerProps {
  className?: string
}

export function SettingDivider({ className = '' }: SettingDividerProps) {
  return <div className={`h-px bg-border mx-3 my-0 ${className}`}></div>
}
