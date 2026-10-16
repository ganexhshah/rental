import React, { useState } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Space,
  Table,
  Tag,
  Progress,
  Tabs,
  Badge,
  Segmented,
} from 'antd'
import {
  DollarOutlined,
  CalendarOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  UserAddOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { KPIWidget } from '@/components/data-display/KPIWidget'
import { ChartCard } from '@/components/data-display/ChartCard'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { dashboardApi } from '../api'
import { Area, Pie, Column } from '@ant-design/plots'
import { formatDate } from '@/lib/formatting/date'

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'bookings'>('revenue')

  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: dashboardApi.getKPIs,
  })

  const { data: revenueTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: dashboardApi.getRevenueTrends,
  })

  const { data: categoryRevenue, isLoading: catLoading } = useQuery({
    queryKey: ['dashboard', 'categories'],
    queryFn: dashboardApi.getCategoryRevenue,
  })

  const { data: operational, isLoading: opLoading } = useQuery({
    queryKey: ['dashboard', 'operational'],
    queryFn: dashboardApi.getOperationalLists,
  })

  const fleetTotal = kpis?.totalFleetCount ?? 0
  const rentedPct = fleetTotal > 0 ? Math.round(((kpis?.rentedVehiclesCount ?? 0) / fleetTotal) * 100) : 0

  // Chart configs
  const trendConfig = {
    data: revenueTrends || [],
    xField: 'date',
    yField: trendMetric,
    smooth: true,
    height: 260,
    style: {
      fill: 'linear-gradient(-90deg, white 0%, #1677ff 100%)',
      fillOpacity: 0.25,
    },
    line: {
      color: '#1677ff',
    },
  }

  const categoryChartConfig = {
    data: categoryRevenue || [],
    xField: 'category',
    yField: 'revenue',
    colorField: 'category',
    height: 260,
    legend: false,
    label: {
      text: (d: { revenue: number }) => `Rs. ${d.revenue?.toLocaleString()}`,
      position: 'inside',
    },
  }

  const fleetStatusData = [
    { type: 'Rented', value: kpis?.rentedVehiclesCount ?? 0 },
    { type: 'Available', value: kpis?.availableVehiclesCount ?? 0 },
    { type: 'Maintenance', value: kpis?.maintenanceVehiclesCount ?? 0 },
  ]

  const fleetPieConfig = {
    data: fleetStatusData,
    angleField: 'value',
    colorField: 'type',
    innerRadius: 0.6,
    height: 260,
    legend: {
      position: 'bottom' as const,
    },
    interactions: [{ type: 'element-active' }],
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        extra={
          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/operations/bookings')}
            >
              New Booking
            </Button>
            <Button
              icon={<CarOutlined />}
              onClick={() => navigate('/vehicles/new')}
            >
              Add Vehicle
            </Button>
            <Button
              icon={<UserAddOutlined />}
              onClick={() => navigate('/customers/all')}
            >
              Add Customer
            </Button>
          </Space>
        }
      />

      {/* KPI Cards Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6} lg={6}>
          <KPIWidget
            title="Total Revenue"
            value={<CurrencyDisplay amount={kpis?.totalRevenue ?? 0} />}
            icon={<DollarOutlined />}
            color="#1677ff"
            loading={kpiLoading}
            onClick={() => navigate('/reports/revenue')}
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={6}>
          <KPIWidget
            title="Today's Revenue"
            value={<CurrencyDisplay amount={kpis?.todayRevenue ?? 0} />}
            icon={<CheckCircleOutlined />}
            color="#52c41a"
            loading={kpiLoading}
            onClick={() => navigate('/payments/transactions')}
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={6}>
          <KPIWidget
            title="Active Rentals"
            value={kpis?.activeRentalsCount ?? 0}
            icon={<CalendarOutlined />}
            color="#722ed1"
            loading={kpiLoading}
            onClick={() => navigate('/operations/active-rentals')}
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={6}>
          <KPIWidget
            title="Today's Bookings"
            value={kpis?.todayBookingsCount ?? 0}
            icon={<CalendarOutlined />}
            color="#13c2c2"
            loading={kpiLoading}
            onClick={() => navigate('/operations/bookings')}
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={6}>
          <KPIWidget
            title="Available Vehicles"
            value={kpis?.availableVehiclesCount ?? 0}
            icon={<CarOutlined />}
            color="#52c41a"
            suffix={` / ${fleetTotal}`}
            loading={kpiLoading}
            onClick={() => navigate('/vehicles/all')}
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={6}>
          <KPIWidget
            title="Rented Vehicles"
            value={kpis?.rentedVehiclesCount ?? 0}
            icon={<CarOutlined />}
            color="#fa8c16"
            loading={kpiLoading}
            onClick={() => navigate('/operations/active-rentals')}
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={6}>
          <KPIWidget
            title="Pending Payments"
            value={kpis?.pendingPaymentsCount ?? 0}
            icon={<ClockCircleOutlined />}
            color="#faad14"
            loading={kpiLoading}
            onClick={() => navigate('/payments/transactions')}
          />
        </Col>
        <Col xs={24} sm={12} md={6} lg={6}>
          <KPIWidget
            title="In Maintenance"
            value={kpis?.maintenanceVehiclesCount ?? 0}
            icon={<ToolOutlined />}
            color="#ff4d4f"
            loading={kpiLoading}
            onClick={() => navigate('/maintenance')}
          />
        </Col>
      </Row>

      {/* Main Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <ChartCard
            title="Performance Trends"
            loading={trendsLoading}
            extra={
              <Segmented
                options={[
                  { label: 'Revenue', value: 'revenue' },
                  { label: 'Bookings', value: 'bookings' },
                ]}
                value={trendMetric}
                onChange={(val) => setTrendMetric(val as 'revenue' | 'bookings')}
              />
            }
          >
            <Area {...trendConfig} />
          </ChartCard>
        </Col>

        <Col xs={24} lg={8}>
          <ChartCard
            title="Fleet Status"
            loading={kpiLoading}
          >
            <Pie {...fleetPieConfig} />
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Occupancy Rate</span>
                <strong>{rentedPct}%</strong>
              </div>
              <Progress percent={rentedPct} status="active" strokeColor="#1677ff" />
            </div>
          </ChartCard>
        </Col>
      </Row>

      {/* Revenue by Category & Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <ChartCard
            title="Revenue by Category"
            loading={catLoading}
          >
            <Column {...categoryChartConfig} />
          </ChartCard>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Quick Actions"
            style={{ borderRadius: 8, height: '100%' }}
            styles={{ body: { padding: 20 } }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Button
                size="large"
                style={{ height: 'auto', padding: 14, textAlign: 'left' }}
                onClick={() => navigate('/operations/pickup-return')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Check-out</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Inspect & hand over</div>
                  </div>
                </div>
              </Button>

              <Button
                size="large"
                style={{ height: 'auto', padding: 14, textAlign: 'left' }}
                onClick={() => navigate('/operations/pickup-return')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CarOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Check-in</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Inspect & return</div>
                  </div>
                </div>
              </Button>

              <Button
                size="large"
                style={{ height: 'auto', padding: 14, textAlign: 'left' }}
                onClick={() => navigate('/payments/transactions')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <DollarOutlined style={{ fontSize: 20, color: '#faad14' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Payments</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Transactions & deposits</div>
                  </div>
                </div>
              </Button>

              <Button
                size="large"
                style={{ height: 'auto', padding: 14, textAlign: 'left' }}
                onClick={() => navigate('/operations/availability')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CalendarOutlined style={{ fontSize: 20, color: '#722ed1' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Availability</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Calendar view</div>
                  </div>
                </div>
              </Button>
            </div>

            <div style={{ marginTop: 24, padding: 14, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Fleet Health</span>
                {operational?.needingService && operational.needingService.length > 0 ? (
                  <Badge count={`${operational.needingService.length} In Service`} style={{ backgroundColor: '#fa8c16' }} />
                ) : (
                  <Badge count="All Operational" style={{ backgroundColor: '#52c41a' }} />
                )}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>
                {operational?.needingService && operational.needingService.length > 0 ? (
                  `${operational.needingService[0].make} ${operational.needingService[0].model} (${operational.needingService[0].plateNumber}) in maintenance.`
                ) : (
                  `All ${fleetTotal} vehicles are available.`
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Operational Queues */}
      <Card
        title="Operations Queue"
        style={{ borderRadius: 8, marginBottom: 24 }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          defaultActiveKey="pickups"
          style={{ padding: '0 20px' }}
          items={[
            {
              key: 'pickups',
              label: `Pickups (${operational?.todayPickups.length || 0})`,
              children: (
                <Table
                  dataSource={operational?.todayPickups || []}
                  rowKey="id"
                  pagination={false}
                  loading={opLoading}
                  columns={[
                    { title: 'Booking Code', dataIndex: 'bookingCode', key: 'bookingCode', render: (t) => <strong>{t}</strong> },
                    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
                    { title: 'Vehicle', dataIndex: 'vehicleModel', key: 'vehicleModel' },
                    { title: 'Plate', dataIndex: 'vehiclePlate', key: 'vehiclePlate', render: (t) => <Tag>{t}</Tag> },
                    { title: 'Pickup Time', dataIndex: 'startDate', key: 'startDate', render: (t) => formatDate(t, 'MMM dd, HH:mm') },
                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <StatusBadge status={s} /> },
                    {
                      title: 'Action',
                      key: 'action',
                      render: (_, record) => (
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => navigate(`/operations/pickup-return?bookingId=${record.id}&mode=pickup`)}
                        >
                          Check Out
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'returns',
              label: `Returns (${operational?.todayReturns.length || 0})`,
              children: (
                <Table
                  dataSource={operational?.todayReturns || []}
                  rowKey="id"
                  pagination={false}
                  loading={opLoading}
                  columns={[
                    { title: 'Booking Code', dataIndex: 'bookingCode', key: 'bookingCode', render: (t) => <strong>{t}</strong> },
                    { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
                    { title: 'Vehicle', dataIndex: 'vehicleModel', key: 'vehicleModel' },
                    { title: 'Due Date', dataIndex: 'endDate', key: 'endDate', render: (t) => formatDate(t, 'MMM dd, HH:mm') },
                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <StatusBadge status={s} /> },
                    {
                      title: 'Action',
                      key: 'action',
                      render: (_, record) => (
                        <Button
                          size="small"
                          onClick={() => navigate(`/operations/pickup-return?bookingId=${record.id}&mode=return`)}
                        >
                          Check In
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'service',
              label: `In Service (${operational?.needingService.length || 0})`,
              children: (
                <Table
                  dataSource={operational?.needingService || []}
                  rowKey="id"
                  pagination={false}
                  loading={opLoading}
                  columns={[
                    { title: 'Plate', dataIndex: 'plateNumber', key: 'plate', render: (t) => <Tag color="blue">{t}</Tag> },
                    { title: 'Vehicle', key: 'model', render: (_, r) => `${r.make} ${r.model}` },
                    { title: 'Location', dataIndex: 'locationName', key: 'loc' },
                    { title: 'Odometer', dataIndex: ['specs', 'mileageOdometer'], key: 'odo', render: (m) => `${m?.toLocaleString()} km` },
                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <StatusBadge status={s} /> },
                    {
                      title: 'Action',
                      key: 'action',
                      render: () => (
                        <Button size="small" onClick={() => navigate('/maintenance')}>
                          View Work Order
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'recentBookings',
              label: 'Recent Bookings',
              children: (
                <Table
                  dataSource={operational?.recentBookings || []}
                  rowKey="id"
                  pagination={false}
                  loading={opLoading}
                  columns={[
                    { title: 'Code', dataIndex: 'bookingCode', key: 'code', render: (t) => <strong>{t}</strong> },
                    { title: 'Customer', dataIndex: 'customerName', key: 'cust' },
                    { title: 'Vehicle', dataIndex: 'vehicleModel', key: 'veh' },
                    { title: 'Total', dataIndex: 'totalAmount', key: 'tot', render: (a) => <CurrencyDisplay amount={a} strong /> },
                    { title: 'Status', dataIndex: 'status', key: 'st', render: (s) => <StatusBadge status={s} /> },
                    {
                      title: 'Action',
                      key: 'act',
                      render: (_, r) => (
                        <Button type="link" size="small" onClick={() => navigate(`/operations/bookings?id=${r.id}`)}>
                          Details <RightOutlined />
                        </Button>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </PageContainer>
  )
}
