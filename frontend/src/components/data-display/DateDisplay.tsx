import React from 'react'
import { Typography, Tooltip } from 'antd'
import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/formatting/date'

const { Text } = Typography

export interface DateDisplayProps {
  date: string | Date | null | undefined
  mode?: 'date' | 'datetime' | 'relative'
  showTime?: boolean
  formatStr?: string
  showTooltip?: boolean
  className?: string
  style?: React.CSSProperties
}

export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  mode = 'date',
  showTime,
  formatStr,
  showTooltip = true,
  className,
  style,
}) => {
  if (!date) return <Text type="secondary">-</Text>

  const effectiveMode = showTime ? 'datetime' : mode

  let displayStr = ''
  if (formatStr) {
    displayStr = formatDate(date, formatStr)
  } else if (effectiveMode === 'datetime') {
    displayStr = formatDateTime(date)
  } else if (effectiveMode === 'relative') {
    displayStr = formatRelativeTime(date)
  } else {
    displayStr = formatDate(date)
  }

  const fullDateTime = formatDateTime(date)

  if (showTooltip && effectiveMode === 'relative') {
    return (
      <Tooltip title={fullDateTime}>
        <Text style={style} className={className}>
          {displayStr}
        </Text>
      </Tooltip>
    )
  }

  return (
    <Text style={style} className={className}>
      {displayStr}
    </Text>
  )
}

export default DateDisplay

