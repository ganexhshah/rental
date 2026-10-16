import React, { useState } from 'react'
import {
  Space,
  Button,
  Select,
  Tag,
  Avatar,
  Input,
  Row,
  Col,
  Card,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  SearchOutlined,
  ReloadOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { StatsGrid } from '@/components/data-display/StatsGrid'
import { KPIWidget } from '@/components/data-display/KPIWidget'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CustomerDetailsDrawer } from './CustomerDetailsDrawer'
import { customersApi } from '../api'
import type { Customer, CustomerType, CustomerVerificationStatus } from '@/types/customer'
import type { ColumnsType } from 'antd/es/table'

export const CustomersListPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all')
  const [verificationFilter, setVerificationFilter] = useState<string>('all')
  const [blacklistFilter, setBlacklistFilter] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['customers-summary'],
    queryFn: customersApi.getCustomerSummary,
  })

  const {
    data: customers = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['customers', search, customerTypeFilter, verificationFilter, blacklistFilter],
    queryFn: () =>
      customersApi.getCustomers({
        search: search.trim() || undefined,
        customerType: customerTypeFilter !== 'all' ? (customerTypeFilter as CustomerType) : undefined,
        verificationStatus:
          verificationFilter !== 'all' ? (verificationFilter as CustomerVerificationStatus) : undefined,
        isBlacklisted:
          blacklistFilter === 'blacklisted'
            ? true
            : blacklistFilter === 'clean'
            ? false
            : undefined,
      }),
  })

  const columns: ColumnsType<Customer> = [
    {
      title: 'Customer',
      key: 'name',
      render: (_, record) => (
        <Space size={10}>
          <Avatar
            src={record.profilePhoto}
            icon={<UserOutlined />}
            style={{ cursor: 'pointer', backgroundColor: '#1677ff' }}
            onClick={() => navigate(`/customers/view/${record.id}`)}
          />
          <div>
            <div
              style={{ fontWeight: 600, fontSize: 14, color: '#1677ff', cursor: 'pointer' }}
              onClick={() => navigate(`/customers/view/${record.id}`)}
            >
              {record.fullName}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              <MailOutlined style={{ marginRight: 4 }} />
              {record.email}
              {record.customerCode && ` • ${record.customerCode}`}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Phone & Location',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>
            <PhoneOutlined style={{ marginRight: 4, color: 'rgba(0,0,0,0.45)' }} />
            {record.phone}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
            {record.districtCity || record.city || 'Kathmandu'}, {record.country || 'Nepal'}
          </div>
        </div>
      ),
    },
    {
      title: 'Account Type',
      dataIndex: 'customerType',
      key: 'type',
      width: 140,
      render: (t: string) => {
        const color = t === 'business' ? 'purple' : t === 'organization' ? 'cyan' : 'blue'
        return <Tag color={color}>{(t || 'individual').toUpperCase()}</Tag>
      },
    },
    {
      title: 'Driving Licence',
      key: 'license',
      width: 170,
      render: (_, record) => (
        <div>
          {record.licenseNumber ? (
            <>
              <strong>{record.licenseNumber}</strong>
              <div>
                <Tag color="cyan" style={{ marginTop: 2 }}>Cat {record.licenseCategory || 'B'}</Tag>
              </div>
            </>
          ) : (
            <span style={{ color: 'rgba(0,0,0,0.35)' }}>No Licence</span>
          )}
        </div>
      ),
    },
    {
      title: 'KYC Verification',
      dataIndex: 'verificationStatus',
      key: 'verification',
      width: 160,
      render: (s) => <StatusBadge status={s || 'pending'} />,
    },
    {
      title: 'Account Status',
      key: 'status',
      width: 140,
      render: (_, record) =>
        record.isBlacklisted ? (
          <Tag color="error">BLACKLISTED</Tag>
        ) : (
          <Tag color="success">ACTIVE</Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Full Customer Page">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/customers/view/${record.id}`)}
            >
              View
            </Button>
          </Tooltip>
          <Tooltip title="Quick Overview Drawer">
            <Button
              size="small"
              icon={<UserOutlined />}
              onClick={() => {
                setSelectedCustomer(record)
                setDetailsOpen(true)
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                refetch()
                refetchSummary()
              }}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/customers/new')}
            >
              Add Customer
            </Button>
          </Space>
        }
      />

      {/* KPI Stats Grid */}
      <StatsGrid columns={4}>
        <KPIWidget
          title="Total Customers"
          value={summary?.totalCustomers ?? customers.length}
          icon={<TeamOutlined style={{ fontSize: 22, color: '#1677ff' }} />}
          onClick={() => {
            setVerificationFilter('all')
            setBlacklistFilter('all')
          }}
        />
        <KPIWidget
          title="Active"
          value={summary?.activeCustomers ?? 0}
          icon={<CheckCircleOutlined style={{ fontSize: 22, color: '#52c41a' }} />}
          onClick={() => {
            setBlacklistFilter('clean')
            setVerificationFilter('all')
          }}
        />
        <KPIWidget
          title="Pending KYC"
          value={summary?.pendingVerification ?? 0}
          icon={<ClockCircleOutlined style={{ fontSize: 22, color: '#faad14' }} />}
          onClick={() => {
            setVerificationFilter('pending')
            setBlacklistFilter('all')
          }}
        />
        <KPIWidget
          title="Blacklisted"
          value={summary?.blacklistedCustomers ?? 0}
          icon={<StopOutlined style={{ fontSize: 22, color: '#ff4d4f' }} />}
          onClick={() => {
            setBlacklistFilter('blacklisted')
            setVerificationFilter('all')
          }}
        />
      </StatsGrid>

      {/* Filters Toolbar */}
      <Card
        size="small"
        style={{ marginBottom: 16, borderRadius: 8 }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={7}>
            <Input
              placeholder="Search customer name, email, phone, licence..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Account Type"
              value={customerTypeFilter}
              onChange={setCustomerTypeFilter}
              options={[
                { value: 'all', label: 'All Customer Types' },
                { value: 'individual', label: 'Individual' },
                { value: 'business', label: 'Corporate / Business' },
                { value: 'organization', label: 'Organization / NGO' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="KYC Verification"
              value={verificationFilter}
              onChange={setVerificationFilter}
              options={[
                { value: 'all', label: 'All KYC Statuses' },
                { value: 'verified', label: 'Verified' },
                { value: 'pending', label: 'Pending Verification' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%' }}
              placeholder="Risk Status"
              value={blacklistFilter}
              onChange={setBlacklistFilter}
              options={[
                { value: 'all', label: 'All Accounts' },
                { value: 'clean', label: 'Clean / Active' },
                { value: 'blacklisted', label: 'Blacklisted' },
              ]}
            />
          </Col>
          <Col xs={12} sm={6} md={2} style={{ textAlign: 'right' }}>
            <Button
              onClick={() => {
                setSearch('')
                setCustomerTypeFilter('all')
                setVerificationFilter('all')
                setBlacklistFilter('all')
              }}
            >
              Reset
            </Button>
          </Col>
        </Row>
      </Card>

      <DataTable
        columns={columns}
        dataSource={customers}
        loading={isLoading || summaryLoading}
        rowKey="id"
        onRetry={() => {
          refetch()
          refetchSummary()
        }}
      />

      <CustomerDetailsDrawer
        customer={selectedCustomer}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false)
          setSelectedCustomer(null)
          refetch()
          refetchSummary()
        }}
      />
    </PageContainer>
  )
}
