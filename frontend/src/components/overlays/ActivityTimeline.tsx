import React from 'react'
import { Timeline, Typography } from 'antd'
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons'
import { formatRelativeTime } from '@/lib/formatting/date'

const { Text } = Typography

export interface TimelineItemData {
  id: string
  title: string
  actor?: string
  role?: string
  timestamp: string
  details?: string
  status?: 'success' | 'info' | 'warning' | 'danger'
}

interface ActivityTimelineProps {
  items: TimelineItemData[]
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return <Text type="secondary">No recorded activities.</Text>
  }

  const timelineItems = items.map((item) => {
    let dotColor = '#1677ff'
    if (item.status === 'success') dotColor = '#52c41a'
    if (item.status === 'warning') dotColor = '#faad14'
    if (item.status === 'danger') dotColor = '#ff4d4f'

    return {
      dot: <ClockCircleOutlined style={{ fontSize: '14px', color: dotColor }} />,
      children: (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text strong style={{ fontSize: 13 }}>{item.title}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatRelativeTime(item.timestamp)}
            </Text>
          </div>
          {item.actor && (
            <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.65)', marginTop: 2 }}>
              <UserOutlined style={{ marginRight: 4, fontSize: 11 }} />
              {item.actor} {item.role && <Text type="secondary">({item.role})</Text>}
            </div>
          )}
          {item.details && (
            <div style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginTop: 4 }}>
              {item.details}
            </div>
          )}
        </div>
      ),
    }
  })

  return <Timeline items={timelineItems} />
}
