import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Input,
  Select,
  Space,
  Card,
  Row,
  Col,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  HistoryOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { staffApi } from '../api'
import type { SystemActivityLog } from '@/types/staff'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'

export const ActivityLogsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('all')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs', search, entityFilter],
    queryFn: () => staffApi.getActivityLogs({ search, entityType: entityFilter }),
  })

  const columns: ColumnsType<SystemActivityLog> = [
    {
      title: 'Timestamp (UTC)',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (ts: string) => <DateDisplay date={ts} showTime />,
    },
    {
      title: 'Operator',
      key: 'user',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.userName}</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>{record.userRole.toUpperCase()}</div>
        </div>
      ),
    },
    {
      title: 'Resource Category',
      dataIndex: 'entityType',
      key: 'entityType',
      render: (cat: string) => {
        const colorMap: Record<string, string> = {
          booking: 'blue',
          vehicle: 'cyan',
          customer: 'green',
          payment: 'gold',
          contract: 'purple',
          maintenance: 'orange',
          system: 'default',
        }
        return <Tag color={colorMap[cat] || 'default'}>{cat.toUpperCase()}</Tag>
      },
    },
    {
      title: 'Action Performed',
      dataIndex: 'action',
      key: 'action',
      render: (act: string) => <span style={{ fontWeight: 500 }}>{act}</span>,
    },
    {
      title: 'Audit Details & Parameters',
      dataIndex: 'details',
      key: 'details',
      render: (d: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{d}</span>,
    },
    {
      title: 'Client IP',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (ip: string) => (
        <span style={{ fontSize: 11, color: '#8c8c8c', fontFamily: 'monospace' }}>
          {ip || '127.0.0.1'}
        </span>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="System Activity & Audit Logs"
        subtitle="Immutable audit trail of all staff operations, status transitions, financial disbursements, and document approvals."
      />

      <Card bordered={false} style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by user, action, or details..."
              prefix={<SearchOutlined />}
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ textAlign: 'right' }}>
            <Select
              value={entityFilter}
              onChange={setEntityFilter}
              style={{ width: 180 }}
              options={[
                { label: 'All Resources', value: 'all' },
                { label: 'Bookings', value: 'booking' },
                { label: 'Vehicles', value: 'vehicle' },
                { label: 'Customers', value: 'customer' },
                { label: 'Payments', value: 'payment' },
                { label: 'Contracts', value: 'contract' },
                { label: 'Maintenance', value: 'maintenance' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={logs}
          loading={isLoading}
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </PageContainer>
  )
}

export default ActivityLogsPage
