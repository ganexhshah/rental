import React, { useState } from 'react'
import { Space, Button, Tag, Avatar, Modal, App, Card, Input, Row, Col } from 'antd'
import { StopOutlined, CheckCircleOutlined, UserOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { customersApi } from '../api'
import type { Customer } from '@/types/customer'
import type { ColumnsType } from 'antd/es/table'
import { formatDate } from '@/lib/formatting/date'

export const CustomerBlacklistPage: React.FC = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers-blacklist', search],
    queryFn: () =>
      customersApi.getCustomers({
        isBlacklisted: true,
        search: search.trim() || undefined,
      }),
  })

  const removeBlacklistMutation = useMutation({
    mutationFn: (id: string) => customersApi.toggleBlacklist(id, false),
    onSuccess: () => {
      message.success('Customer removed from blacklist.')
      queryClient.invalidateQueries({ queryKey: ['customers-blacklist'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-summary'] })
      refetch()
    },
    onError: () => message.error('Failed to update blacklist status.'),
  })

  const handleRemove = (c: Customer) => {
    Modal.confirm({
      title: 'Remove from Blacklist',
      content: `Allow ${c.fullName} to rent vehicles again?`,
      okText: 'Remove Blacklist',
      onOk: () => removeBlacklistMutation.mutate(c.id),
    })
  }

  const columns: ColumnsType<Customer> = [
    {
      title: 'Customer',
      key: 'name',
      render: (_, r) => (
        <Space size={10}>
          <Avatar
            src={r.profilePhoto}
            icon={<UserOutlined />}
            style={{ cursor: 'pointer', backgroundColor: '#1677ff' }}
            onClick={() => navigate(`/customers/view/${r.id}`)}
          />
          <div>
            <div
              style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer' }}
              onClick={() => navigate(`/customers/view/${r.id}`)}
            >
              {r.fullName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              {r.email} • {r.phone}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Licence No.',
      dataIndex: 'licenseNumber',
      key: 'license',
      render: (l) => (l ? <Tag color="volcano">{l}</Tag> : '-'),
    },
    {
      title: 'Reason',
      dataIndex: 'blacklistReason',
      key: 'reason',
      render: (r, row) => (
        <div>
          <span style={{ color: '#cf1322', fontWeight: 500 }}>
            {r || 'Flagged by manager'}
          </span>
          {row.blacklistedAt && (
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
              Date: {formatDate(row.blacklistedAt)} {row.blacklistedBy && `• Staff: ${row.blacklistedBy}`}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Outstanding Balance',
      dataIndex: 'outstandingBalance',
      key: 'bal',
      render: (b) => <CurrencyDisplay amount={b || 0} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={() => handleRemove(record)}
          loading={removeBlacklistMutation.isPending}
        >
          Remove
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Blacklist"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search blacklisted customer or licence..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <DataTable
        columns={columns}
        dataSource={customers}
        loading={isLoading}
        rowKey="id"
        onRetry={() => refetch()}
        emptyTitle="No Blacklisted Accounts"
        emptyDescription="There are currently no blacklisted renters in the system."
      />
    </PageContainer>
  )
}

export default CustomerBlacklistPage
