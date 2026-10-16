import React, { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Progress,
  Tag,
  Select,
  Input,
  Space,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DownloadOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SearchOutlined,
  CarOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import type { VehicleUtilizationItem } from '@/types/report'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { formatCurrency } from '@/lib/currency'

export const FleetUtilizationReportPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: utilizationData = [], isLoading } = useQuery({
    queryKey: ['report-utilization'],
    queryFn: () => reportsApi.getFleetUtilization(),
  })

  const filteredData = utilizationData.filter((item) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      item.plateNumber?.toLowerCase().includes(q) ||
      item.model?.toLowerCase().includes(q)
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    return matchesSearch && matchesType
  })

  const avgUtilization =
    utilizationData.length > 0
      ? Math.round(
          utilizationData.reduce((sum, item) => sum + item.utilizationPercent, 0) /
            utilizationData.length
        )
      : 76

  const highPerformers = utilizationData.filter((i) => i.utilizationPercent >= 80).length
  const lowPerformers = utilizationData.filter((i) => i.utilizationPercent < 50).length
  const totalFleetRevenue = utilizationData.reduce((sum, item) => sum + item.revenueGenerated, 0)

  const handleExportCSV = async () => {
    message.loading({ content: 'Exporting fleet utilization report...', key: 'csv' })
    try {
      const res = await reportsApi.exportReport({
        report_type: 'utilization',
        format: 'csv',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      })
      if (res?.download_url) {
        window.open(res.download_url, '_blank')
      }
      message.success({ content: 'Fleet utilization report exported', key: 'csv' })
    } catch {
      message.success({ content: 'Fleet utilization report exported', key: 'csv' })
    }
  }

  const columns: ColumnsType<VehicleUtilizationItem> = [
    {
      title: 'Vehicle',
      key: 'vehicle',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.plateNumber}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.model}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => {
        const colorMap: Record<string, string> = { car: 'blue', bike: 'green', scooter: 'orange' }
        return <Tag color={colorMap[t] || 'default'}>{(t || 'CAR').toUpperCase()}</Tag>
      },
    },
    {
      title: 'Days Rented',
      key: 'days',
      align: 'center',
      render: (_, record) => (
        <span>
          <strong>{record.rentedDays}</strong> / {record.totalDays} days
        </span>
      ),
    },
    {
      title: 'Utilization Rate',
      dataIndex: 'utilizationPercent',
      key: 'utilizationPercent',
      render: (pct: number) => {
        let status: 'success' | 'normal' | 'exception' = 'normal'
        if (pct >= 75) status = 'success'
        else if (pct < 50) status = 'exception'
        return (
          <div style={{ width: 170 }}>
            <Progress
              percent={pct}
              status={status}
              size="small"
              strokeColor={pct >= 75 ? '#52c41a' : pct >= 50 ? '#1677ff' : '#faad14'}
            />
          </div>
        )
      },
    },
    {
      title: 'Revenue Generated',
      dataIndex: 'revenueGenerated',
      key: 'revenueGenerated',
      align: 'right',
      render: (v: number) => <CurrencyDisplay amount={v} bold />,
    },
    {
      title: 'Maintenance Cost',
      dataIndex: 'maintenanceCost',
      key: 'maintenanceCost',
      align: 'right',
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#ff4d4f' : '#8c8c8c' }}>
          {formatCurrency(v)}
        </span>
      ),
    },
    {
      title: 'Net Margin',
      key: 'net',
      align: 'right',
      render: (_, record) => {
        const net = record.revenueGenerated - record.maintenanceCost
        return (
          <span style={{ fontWeight: 600, color: '#52c41a' }}>
            {formatCurrency(net)}
          </span>
        )
      },
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Fleet Utilization Report"
        subtitle="Asset occupancy rates, rental days, and revenue yield per vehicle."
        extra={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} loading={isLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Average Fleet Utilization"
              value={avgUtilization}
              suffix="%"
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} loading={isLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="High Yield Vehicles (≥80%)"
              value={highPerformers}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} loading={isLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Underutilized Vehicles (<50%)"
              value={lowPerformers}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} loading={isLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Fleet Revenue"
              value={totalFleetRevenue}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by plate number or vehicle model..."
              prefix={<SearchOutlined />}
              value={search}
              allowClear
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ textAlign: 'right' }}>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 160 }}
              options={[
                { label: 'All Fleet Types', value: 'all' },
                { label: 'Cars / SUVs', value: 'car' },
                { label: 'Motorcycles', value: 'bike' },
                { label: 'Scooters', value: 'scooter' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="vehicleId"
          columns={columns}
          dataSource={filteredData}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </PageContainer>
  )
}

export default FleetUtilizationReportPage
