import React, { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Space,
  Select,
  Tag,
  Button,
  Badge,
} from 'antd'
import {
  CarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DateRangePicker } from '@/components/data-display/DateRangePicker'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { bookingsApi, AvailabilitySlot } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import type { VehicleLocation } from '@/types/vehicle'

export const FleetAvailabilityPage: React.FC = () => {
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: locations = [] } = useQuery<VehicleLocation[]>({
    queryKey: ['availability-locations'],
    queryFn: vehiclesApi.getLocations,
  })

  const { data: slots = [], isLoading, refetch } = useQuery<AvailabilitySlot[]>({
    queryKey: ['availability-grid', { dateRange, location: locationFilter, type: typeFilter }],
    queryFn: () => bookingsApi.getAvailabilityGrid(dateRange || undefined, locationFilter, typeFilter),
  })

  const availableCount = slots.filter((s) => s.isAvailable).length
  const occupiedCount = slots.length - availableCount

  return (
    <PageContainer loading={isLoading}>
      <PageHeader
        title="Fleet Availability"
        extra={
          <Space>
            <Tag color="success" style={{ fontSize: 13, padding: '4px 10px' }}>
              {availableCount} Available
            </Tag>
            <Tag color="orange" style={{ fontSize: 13, padding: '4px 10px' }}>
              {occupiedCount} Occupied
            </Tag>
          </Space>
        }
      />

      {/* Filter toolbar */}
      <Card style={{ borderRadius: 8, marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Date Range</div>
            <DateRangePicker value={dateRange} onChange={setDateRange} showTime />
          </Col>
          <Col xs={24} sm={12} md={7}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Location</div>
            <Select
              style={{ width: '100%' }}
              value={locationFilter}
              onChange={setLocationFilter}
              options={[
                { label: 'All Locations', value: 'all' },
                ...locations.map((l) => ({ label: l.name, value: l.id })),
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={7}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Type</div>
            <Select
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: 'All Types', value: 'all' },
                { label: 'Cars & SUVs', value: 'car' },
                { label: 'Motorcycles', value: 'bike' },
                { label: 'Scooters', value: 'scooter' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Fleet Grid */}
      <Row gutter={[16, 16]}>
        {slots.map(({ vehicle, isAvailable, currentBooking, conflictsCount }) => (
          <Col xs={24} sm={12} md={8} lg={6} key={vehicle.id}>
            <Card
              hoverable
              style={{
                borderRadius: 8,
                borderTop: `4px solid ${isAvailable ? '#52c41a' : '#fa8c16'}`,
              }}
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {vehicle.make} {vehicle.model}
                  </div>
                  <Tag style={{ marginTop: 2 }}>{vehicle.plateNumber}</Tag>
                </div>
                {isAvailable ? (
                  <Badge status="success" text={<span style={{ fontWeight: 600, color: '#52c41a' }}>Ready</span>} />
                ) : (
                  <Badge status="warning" text={<span style={{ fontWeight: 600, color: '#fa8c16' }}>Occupied</span>} />
                )}
              </div>

              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <EnvironmentOutlined />
                <span>{vehicle.locationName || 'Main Station'}</span>
              </div>

              <div style={{ fontSize: 12, marginBottom: 12 }}>
                <span>Daily Rate: </span>
                <strong><CurrencyDisplay amount={vehicle.pricing.dailyRate} />/day</strong>
              </div>

              {currentBooking ? (
                <div style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
                  <div style={{ color: 'rgba(0,0,0,0.45)', marginBottom: 2 }}>Reserved By:</div>
                  <div style={{ fontWeight: 600 }}>{currentBooking.customerName}</div>
                  <div style={{ color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                    #{currentBooking.bookingCode}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 10, backgroundColor: '#f6ffed', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#389e0d' }}>
                  <CheckCircleOutlined style={{ marginRight: 4 }} />
                  Available in selected window
                </div>
              )}

              {isAvailable ? (
                <Button
                  block
                  type="primary"
                  icon={<CarOutlined />}
                  onClick={() => navigate(`/operations/bookings?vehicleId=${vehicle.id}&action=new`)}
                >
                  Book
                </Button>
              ) : (
                <Button
                  block
                  onClick={() => navigate(`/operations/bookings?id=${currentBooking?.id}`)}
                >
                  View Current Booking
                </Button>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  )
}
