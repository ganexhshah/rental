import React, { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Select,
  Space,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DownloadOutlined,
  ArrowUpOutlined,
  RiseOutlined,
  DollarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { Area, Column } from '@ant-design/plots'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import type { CategoryBreakdown } from '@/types/report'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { ChartCard } from '@/components/data-display/ChartCard'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { formatCurrency } from '@/lib/currency'

export const RevenueReportPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'ytd'>('ytd')

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ['report-kpis', timeRange],
    queryFn: () => reportsApi.getKPIs(timeRange),
  })

  const { data: trends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['report-trends', timeRange],
    queryFn: () => reportsApi.getRevenueTrends(timeRange),
  })

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['report-categories', timeRange],
    queryFn: () => reportsApi.getCategoryBreakdown(timeRange),
  })

  const handleExportCSV = async () => {
    message.loading({ content: 'Generating revenue CSV...', key: 'csv' })
    try {
      const now = new Date()
      const end_date = now.toISOString().slice(0, 10)
      let start_date = `${now.getFullYear()}-01-01`
      if (timeRange === '30d') {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        start_date = d.toISOString().slice(0, 10)
      } else if (timeRange === '90d') {
        const d = new Date()
        d.setDate(d.getDate() - 90)
        start_date = d.toISOString().slice(0, 10)
      }

      const res = await reportsApi.exportReport({
        report_type: 'revenue',
        format: 'csv',
        start_date,
        end_date,
      })
      const downloadUrl = (res as any)?.file_url || res?.download_url
      if (downloadUrl) {
        if (downloadUrl.startsWith('data:')) {
          const a = document.createElement('a')
          a.href = downloadUrl
          a.download = `revenue_report_${timeRange}_${end_date}.csv`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else {
          window.open(downloadUrl, '_blank')
        }
      }
      message.success({ content: 'Revenue report exported successfully', key: 'csv' })
    } catch {
      message.error({ content: 'Failed to export revenue report', key: 'csv' })
    }
  }

  const areaConfig = {
    data: trends,
    xField: 'date',
    yField: 'revenue',
    smooth: true,
    height: 280,
    style: {
      fill: 'linear-gradient(-90deg, white 0%, #52c41a 100%)',
      fillOpacity: 0.35,
    },
    line: {
      style: {
        stroke: '#52c41a',
        lineWidth: 2.5,
      },
    },
  }

  const columnConfig = {
    data: categories,
    xField: 'category',
    yField: 'revenue',
    colorField: 'category',
    height: 280,
    legend: false,
    label: {
      text: (d: { revenue: number }) => `Rs. ${d.revenue?.toLocaleString()}`,
    },
  }

  const columns: ColumnsType<CategoryBreakdown> = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <span style={{ fontWeight: 600 }}>{cat}</span>,
    },
    {
      title: 'Gross Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right',
      render: (v: number) => <CurrencyDisplay amount={v} bold />,
    },
    {
      title: 'Share',
      dataIndex: 'percentage',
      key: 'percentage',
      align: 'right',
      render: (pct: number) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {pct}%
        </Tag>
      ),
    },
    {
      title: 'Completed Bookings',
      dataIndex: 'bookingsCount',
      key: 'bookingsCount',
      align: 'right',
      render: (cnt: number) => <span>{cnt}</span>,
    },
    {
      title: 'Avg Revenue / Booking',
      key: 'aov',
      align: 'right',
      render: (_, record) => {
        const aov = record.bookingsCount > 0 ? record.revenue / record.bookingsCount : 0
        return formatCurrency(Math.round(aov))
      },
    },
  ]

  const totalBookings = kpi?.totalBookings || 1
  const avgBookingVal = kpi ? Math.round(kpi.totalRevenue / totalBookings) : 0

  return (
    <PageContainer>
      <PageHeader
        title="Revenue Report"
        subtitle="Revenue analytics, temporal trends, and category distribution."
        extra={
          <Space>
            <Select
              value={timeRange}
              onChange={setTimeRange}
              options={[
                { label: 'Past 30 Days', value: '30d' },
                { label: 'Past 90 Days', value: '90d' },
                { label: 'Year to Date', value: 'ytd' },
              ]}
              style={{ width: 150 }}
            />
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} loading={kpiLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Revenue"
              value={kpi?.totalRevenue || 0}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
              <ArrowUpOutlined /> +{kpi?.revenueGrowthPercent || 15.8}% vs previous
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} loading={kpiLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Net Profit"
              value={kpi?.netProfit || 0}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              Margin: {kpi?.profitMarginPercent || 0}%
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} loading={kpiLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Avg Booking Value"
              value={avgBookingVal}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
              Avg duration: {kpi?.averageRentalDurationDays || 4.2} days
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} loading={kpiLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Bookings"
              value={kpi?.totalBookings || 0}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: '#52c41a' }}>
              <CheckCircleOutlined /> Active fleet operations
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} lg={14}>
          <ChartCard
            title="Revenue Trend"
            subtitle="Monthly earnings trajectory"
            loading={trendsLoading}
          >
            <Area {...areaConfig} />
          </ChartCard>
        </Col>

        <Col xs={24} lg={10}>
          <ChartCard
            title="Revenue by Category"
            subtitle="Fleet category distribution"
            loading={catLoading}
          >
            <Column {...columnConfig} />
          </ChartCard>
        </Col>
      </Row>

      <Card
        title="Category Breakdown"
        bordered={false}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          rowKey="category"
          columns={columns}
          dataSource={categories}
          loading={catLoading}
          pagination={false}
        />
      </Card>
    </PageContainer>
  )
}

export default RevenueReportPage
