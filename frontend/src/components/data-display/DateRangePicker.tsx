import React from 'react'
import { DatePicker } from 'antd'
import type { TimeRangePickerProps } from 'antd'
import dayjs, { Dayjs } from 'dayjs'

const { RangePicker } = DatePicker

interface DateRangePickerProps {
  value?: [string, string] | null
  onChange?: (dates: [string, string] | null) => void
  showTime?: boolean
  className?: string
  style?: React.CSSProperties
  placeholder?: [string, string]
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  showTime = false,
  className,
  style,
  placeholder = ['Start Date', 'End Date'],
}) => {
  const rangePresets: TimeRangePickerProps['presets'] = [
    { label: 'Today', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
    { label: 'Next 7 Days', value: [dayjs(), dayjs().add(7, 'd')] },
    { label: 'Next 30 Days', value: [dayjs(), dayjs().add(30, 'd')] },
    { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Last 30 Days', value: [dayjs().subtract(30, 'd'), dayjs()] },
  ]

  const dayjsValue: [Dayjs | null, Dayjs | null] | null = value
    ? [value[0] ? dayjs(value[0]) : null, value[1] ? dayjs(value[1]) : null]
    : null

  const handleChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates || !dates[0] || !dates[1]) {
      onChange?.(null)
    } else {
      onChange?.([dates[0].toISOString(), dates[1].toISOString()])
    }
  }

  return (
    <RangePicker
      presets={rangePresets}
      value={dayjsValue as [Dayjs, Dayjs] | null}
      onChange={(dates) => handleChange(dates as [Dayjs | null, Dayjs | null] | null)}
      showTime={showTime}
      placeholder={placeholder}
      className={className}
      style={{ width: '100%', minWidth: 260, ...style }}
    />
  )
}
