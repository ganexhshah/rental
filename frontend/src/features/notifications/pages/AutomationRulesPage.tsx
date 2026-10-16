import React from 'react'
import {
  Table,
  Button,
  Tag,
  Switch,
  Card,
  Space,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '../api'
import type { AutomationRule } from '@/types/notification'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'

export const AutomationRulesPage: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => notificationsApi.getAutomationRules(),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      notificationsApi.toggleRule(id, active),
    onSuccess: () => {
      message.success('Automation rule updated')
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
    },
  })

  const columns: ColumnsType<AutomationRule> = [
    {
      title: 'Rule Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <span style={{ fontWeight: 600 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: 'Trigger Event',
      dataIndex: 'trigger',
      key: 'trigger',
      render: (trig: string) => <Tag color="blue">{trig.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Evaluation Criteria',
      dataIndex: 'condition',
      key: 'condition',
      render: (cond: string) => <code style={{ fontSize: 12 }}>{cond}</code>,
    },
    {
      title: 'Automated Action',
      dataIndex: 'action',
      key: 'action',
      render: (act: string) => <Tag color="green">{act.replace('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Last Triggered',
      dataIndex: 'lastRunAt',
      key: 'lastRunAt',
      render: (d: string) => (d ? <DateDisplay date={d} showTime /> : 'Never'),
    },
    {
      title: 'Active Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean, record) => (
        <Switch
          checked={active}
          onChange={(checked) => toggleMutation.mutate({ id: record.id, active: checked })}
        />
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Event Automation Rules"
        subtitle="Autonomous background triggers that execute operational workflows, alerts, customer communications, and schedule updates."
      />

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rules}
          loading={isLoading}
          pagination={false}
          locale={{
            emptyText: (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>No Automation Rules</p>
                <p style={{ color: 'rgba(0,0,0,0.45)', margin: 0 }}>Automatic background rules will be registered here.</p>
              </div>
            ),
          }}
        />
      </Card>
    </PageContainer>
  )
}

export default AutomationRulesPage
