import { cn, getProgressColor } from '@/lib/utils'

interface ProgressBarProps {
  current: number
  target: number
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export default function ProgressBar({ current, target, showLabel = true, size = 'md' }: ProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )}
      <div className={cn(
        'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
        size === 'sm' ? 'h-1.5' : 'h-2.5'
      )}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', getProgressColor(percentage))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
