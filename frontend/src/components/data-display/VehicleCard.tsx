import React from 'react'
import { Card, Tag, Space, Button } from 'antd'
import { CarOutlined, EnvironmentOutlined, EyeOutlined } from '@ant-design/icons'
import type { Vehicle } from '@/types/vehicle'
import { StatusBadge } from './StatusBadge'
import { CurrencyDisplay } from './CurrencyDisplay'

interface VehicleCardProps {
  vehicle: Vehicle
  onView?: (vehicle: Vehicle) => void
  onBook?: (vehicle: Vehicle) => void
  showActions?: boolean
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onView,
  onBook,
  showActions = true,
}) => {
  const hasAmenities =
    vehicle.specs.hasAC ||
    vehicle.specs.hasGPS ||
    vehicle.specs.hasBluetooth ||
    vehicle.specs.helmetIncluded ||
    (Array.isArray(vehicle.specs.features) && vehicle.specs.features.length > 0)

  return (
    <Card
      hoverable
      style={{ borderRadius: 8, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{
        body: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 16 },
      }}
      cover={
        <div style={{ position: 'relative', height: 180, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
          <img
            alt={`${vehicle.make} ${vehicle.model}`}
            src={vehicle.primaryImage}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <StatusBadge status={vehicle.status} />
          </div>
          <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
            <Tag color="black" style={{ fontWeight: 600, fontSize: 12 }}>
              {vehicle.plateNumber}
            </Tag>
          </div>
        </div>
      }
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {vehicle.make} {vehicle.model}
          </div>
          <Tag color="blue">{vehicle.year}</Tag>
        </div>

        <div
          style={{
            fontSize: 12,
            color: 'rgba(0, 0, 0, 0.45)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <EnvironmentOutlined />
          <span>{vehicle.locationName || 'Main Station'}</span>
        </div>

        <Space wrap size={[4, 4]} style={{ marginBottom: 8 }}>
          <Tag>{vehicle.type.toUpperCase()}</Tag>
          <Tag>{vehicle.specs.transmission}</Tag>
          <Tag>{vehicle.specs.fuelType}</Tag>
          {vehicle.specs.seatingCapacity && <Tag>{vehicle.specs.seatingCapacity} Seats</Tag>}
        </Space>

        {/* ── Installed Amenities & Features ── */}
        {hasAmenities && (
          <div
            style={{
              borderTop: '1px dashed #e8e8e8',
              paddingTop: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: 'rgba(0,0,0,0.38)',
                marginBottom: 5,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Installed Amenities
            </div>
            <Space wrap size={[4, 4]}>
              {vehicle.specs.hasAC && (
                <Tag color="cyan" style={{ fontSize: 11 }}>
                  ❄️ A/C
                </Tag>
              )}
              {vehicle.specs.hasGPS && (
                <Tag color="blue" style={{ fontSize: 11 }}>
                  📡 GPS
                </Tag>
              )}
              {vehicle.specs.hasBluetooth && (
                <Tag color="geekblue" style={{ fontSize: 11 }}>
                  🔵 Bluetooth
                </Tag>
              )}
              {vehicle.specs.helmetIncluded && (
                <Tag color="orange" style={{ fontSize: 11 }}>
                  ⛑️ Helmet
                </Tag>
              )}
              {Array.isArray(vehicle.specs.features) &&
                vehicle.specs.features.slice(0, 2).map((feat) => (
                  <Tag key={feat} color="purple" style={{ fontSize: 11 }}>
                    ✓ {feat}
                  </Tag>
                ))}
              {Array.isArray(vehicle.specs.features) && vehicle.specs.features.length > 2 && (
                <Tag style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', background: '#f0f0f0', border: 'none' }}>
                  +{vehicle.specs.features.length - 2} more
                </Tag>
              )}
            </Space>
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            borderTop: '1px solid rgba(0, 0, 0, 0.06)',
            paddingTop: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Daily Rate</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>
              <CurrencyDisplay amount={vehicle.pricing.dailyRate} />
              <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(0, 0, 0, 0.45)' }}>/day</span>
            </div>
          </div>
          {vehicle.pricing.depositAmount && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(0, 0, 0, 0.45)' }}>Deposit</div>
              <CurrencyDisplay amount={vehicle.pricing.depositAmount} strong />
            </div>
          )}
        </div>

        {showActions && (
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            {onView && (
              <Button icon={<EyeOutlined />} onClick={() => onView(vehicle)}>
                Details
              </Button>
            )}
            {onBook && vehicle.status === 'available' && (
              <Button type="primary" icon={<CarOutlined />} onClick={() => onBook(vehicle)}>
                Rent Now
              </Button>
            )}
          </Space>
        )}
      </div>
    </Card>
  )
}
