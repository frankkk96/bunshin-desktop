import { cn } from '@/lib/ui/utils'

interface SettingInputProps {
  value: string | number
  onChange: (value: string) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: 'text' | 'number'
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
}

export function SettingInput({
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  min,
  max,
  step,
  className,
  disabled = false,
}: SettingInputProps) {
  const inputSize = Math.max(10, Math.min(50, (placeholder?.length || 10) + 2))

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      size={inputSize}
      className={cn(
        'px-2 py-1 text-sm bg-muted border border-border rounded-md h-8',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    />
  )
}
