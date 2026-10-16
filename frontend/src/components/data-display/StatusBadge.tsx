import React from 'react'
import { Tag } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  StopOutlined,
  ToolOutlined,
} from '@ant-design/icons'

export type StatusCategory =
  | 'vehicle'
  | 'booking'
  | 'verification'
  | 'payment'
  | 'contract'
  | 'maintenance'
  | 'general'

export interface StatusBadgeProps {
  status: string
  category?: StatusCategory
  customLabel?: string
  text?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customLabel,
  text,
}) => {
  const norm = status?.toLowerCase() || ''
  const label = customLabel || text

  switch (norm) {
    case 'available':
      return <Tag color="success" icon={<CheckCircleOutlined />}>{label || 'Available'}</Tag>
    case 'active':
      return <Tag color="processing" icon={<SyncOutlined spin />}>{label || 'Active'}</Tag>
    case 'confirmed':
      return <Tag color="cyan" icon={<CheckCircleOutlined />}>{label || 'Confirmed'}</Tag>
    case 'completed':
    case 'signed':
    case 'approved':
    case 'verified':
    case 'paid':
      return <Tag color="success" icon={<CheckCircleOutlined />}>{label || norm.toUpperCase()}</Tag>
    case 'pending':
    case 'draft':
    case 'pending_signature':
    case 'waiting_parts':
      return <Tag color="warning" icon={<ClockCircleOutlined />}>{label || norm.replace('_', ' ').toUpperCase()}</Tag>
    case 'partially_paid':
      return <Tag color="orange" icon={<ClockCircleOutlined />}>{label || 'Partially Paid'}</Tag>
    case 'in_progress':
      return <Tag color="blue" icon={<SyncOutlined spin />}>{label || 'In Progress'}</Tag>
    case 'maintenance':
      return <Tag color="orange" icon={<ToolOutlined />}>{label || 'Maintenance'}</Tag>
    case 'reserved':
      return <Tag color="purple" icon={<ClockCircleOutlined />}>{label || 'Reserved'}</Tag>
    case 'needs_correction':
      return <Tag color="warning" icon={<ExclamationCircleOutlined />}>{label || 'Needs Correction'}</Tag>
    case 'overdue':
      return <Tag color="error" icon={<ExclamationCircleOutlined />}>{label || 'Overdue'}</Tag>
    case 'cancelled':
    case 'rejected':
    case 'failed':
      return <Tag color="error" icon={<CloseCircleOutlined />}>{label || norm.toUpperCase()}</Tag>
    case 'blacklisted':
      return <Tag color="volcano" icon={<StopOutlined />}>{label || 'Blacklisted'}</Tag>
    case 'retired':
      return <Tag color="default" icon={<StopOutlined />}>{label || 'Retired'}</Tag>
    case 'refunded':
      return <Tag color="magenta">{label || 'Refunded'}</Tag>
    case 'held':
      return <Tag color="geekblue">{label || 'Deposit Held'}</Tag>
    default:
      return <Tag>{label || status}</Tag>
  }
}

export default StatusBadge

