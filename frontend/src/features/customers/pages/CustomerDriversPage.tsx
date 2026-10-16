import React, { useState, useMemo } from 'react'
import {
  Space,
  Button,
  Tag,
  Card,
  Input,
  Row,
  Col,
} from 'antd'
import {
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { customersApi } from '../api'
import type { CustomerDriver } from '@/types/customer'
import type { ColumnsType } from 'antd/es/table'
import { formatDate } from '@/lib/formatting/date'

export const CustomerDriversPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: drivers = [], isLoading, refetch } = useQuery<CustomerDriver[]>({
    queryKey: ['all-customer-drivers'],
    queryFn: () => customersApi.getAllCustomerDrivers(),
  })

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers
    const q = search.toLowerCase().trim()
    return drivers.filter(
      (d) =>
        d.fullName?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.licenseNumber?.toLowerCase().includes(q) ||
        d.customerName?.toLowerCase().includes(q)
    )
  }, [drivers, search])

  const columns: ColumnsType<CustomerDriver> = [
    {
      title: 'Driver Name',
      dataIndex: 'fullName',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.phone || record.email}</div>
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customer',
      render: (cName, record) => (
        <span
          style={{ color: '#1677ff', fontWeight: 500, cursor: record.customerId ? 'pointer' : 'default' }}
          onClick={() => record.customerId && navigate(`/customers/view/${record.customerId}`)}
        >
          {cName || 'View Profile'}
        </span>
      ),
    },
    {
      title: 'Relationship',
      dataIndex: 'relationship',
      key: 'relationship',
      render: (rel) => <Tag color="blue">{String(rel || 'Authorized Driver').toUpperCase().replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Licence Number',
      dataIndex: 'licenseNumber',
      key: 'license',
      render: (num, record) => (
        <div>
          <span style={{ fontWeight: 500 }}>{num}</span>
          <Tag style={{ marginLeft: 6 }}>Cat {record.licenseCategory || 'B'}</Tag>
        </div>
      ),
    },
    {
      title: 'Licence Expiry',
      dataIndex: 'licenseExpiryDate',
      key: 'expiry',
      render: (d) => {
        if (!d) return '-'
        const isExp = new Date(d).getTime() < Date.now()
        return (
          <span style={{ color: isExp ? '#ff4d4f' : 'inherit', fontWeight: isExp ? 600 : 'normal' }}>
            {formatDate(d)} {isExp ? '(EXPIRED)' : ''}
          </span>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'verificationStatus',
      key: 'verification',
      render: (s) => (
        <Tag color={s === 'verified' ? 'green' : 'orange'}>
          {String(s || 'pending').toUpperCase()}
        </Tag>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Drivers"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }} styles={{ body: { padding: '12px 16px' } }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search driver name, licence, or customer..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <Card style={{ borderRadius: 8 }}>
        <DataTable
          columns={columns}
          dataSource={filteredDrivers}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 15 }}
          emptyTitle="No Drivers Found"
          emptyDescription="No authorized drivers matched your search."
        />
      </Card>
    </PageContainer>
  )
}

export default CustomerDriversPage

