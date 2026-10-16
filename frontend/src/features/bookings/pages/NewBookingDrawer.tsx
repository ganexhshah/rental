import React, { useState, useEffect } from 'react'
import {
  Form,
  Select,
  DatePicker,
  Input,
  InputNumber,
  Checkbox,
  Button,
  Space,
  Row,
  Col,
  Card,
  Alert,
  Divider,
  Tag,
  Typography,
  Spin,
  message,
  Flex,
} from 'antd'
import {
  CarOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  TagOutlined,
  ShopOutlined,
  CloseCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FormDrawer } from '@/components/overlays/FormDrawer'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { bookingsApi } from '../api'
import { vehiclesApi } from '@/features/vehicles/api'
import { customersApi } from '@/features/customers/api'
import type { Booking, BookingExtra, PricingQuoteResponse } from '@/types/booking'
import type { Vehicle, VehicleLocation } from '@/types/vehicle'
import type { Customer } from '@/types/customer'

const { Text, Title } = Typography
const { RangePicker } = DatePicker
const { TextArea } = Input

interface NewBookingDrawerProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  initialVehicleId?: string
}

const AVAILABLE_EXTRAS = [
  { name: 'Child Safety Seat', price: 800 },
  { name: 'GPS Navigation System', price: 500 },
  { name: 'Roof Luggage Carrier', price: 1000 },
  { name: 'Rider Helmet', price: 300 },
  { name: 'Extra Driver Authorization', price: 1000 },
]

export const NewBookingDrawer: React.FC<NewBookingDrawerProps> = ({ open, onClose, onSuccess, initialVehicleId }) => {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicleId || '')
  const [selectedDates, setSelectedDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [withInsurance, setWithInsurance] = useState<boolean>(true)
  const [selectedExtras, setSelectedExtras] = useState<BookingExtra[]>([])
  const [couponCode, setCouponCode] = useState<string>('')
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [collectionFee, setCollectionFee] = useState<number>(0)
  const [oneWayFee, setOneWayFee] = useState<number>(0)

  const [quote, setQuote] = useState<PricingQuoteResponse | null>(null)
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false)
  const [eligibilityWarning, setEligibilityWarning] = useState<string | null>(null)

  // Fetch available vehicles (or all vehicles if an initial vehicle is pre-selected)
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-for-new-booking', initialVehicleId],
    queryFn: () => vehiclesApi.getVehicles(initialVehicleId ? undefined : { status: 'available' }),
    enabled: open,
  })

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-for-new-booking'],
    queryFn: () => customersApi.getCustomers(),
    enabled: open,
  })

  // Fetch locations
  const { data: locations = [] } = useQuery<VehicleLocation[]>({
    queryKey: ['locations-for-new-booking'],
    queryFn: () => vehiclesApi.getLocations(),
    enabled: open,
  })

  // Fetch all bookings for date conflict check
  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getBookings(),
    enabled: open,
  })

  // Pre-fill initial vehicle if passed
  useEffect(() => {
    if (open && initialVehicleId) {
      setSelectedVehicleId(initialVehicleId)
      form.setFieldValue('vehicleId', initialVehicleId)
    }
  }, [open, initialVehicleId, form])

  // Default Office / Main Station location
  const defaultOfficeLocation = React.useMemo(() => {
    if (!locations || locations.length === 0) return undefined
    return (
      locations.find(
        (l) =>
          /office|hq|head|main|central/i.test(l.name) ||
          /office|hq|main/i.test(l.code)
      ) || locations[0]
    )
  }, [locations])

  // Pre-fill pickup and return station to Office location
  useEffect(() => {
    if (open && defaultOfficeLocation) {
      const curPickup = form.getFieldValue('pickupLocationId')
      const curReturn = form.getFieldValue('returnLocationId')
      if (!curPickup) {
        form.setFieldValue('pickupLocationId', defaultOfficeLocation.id)
      }
      if (!curReturn) {
        form.setFieldValue('returnLocationId', defaultOfficeLocation.id)
      }
    }
  }, [open, defaultOfficeLocation, form])

  // Fetch drivers for selected customer
  const { data: customerDrivers = [] } = useQuery<any[]>({
    queryKey: ['customer-drivers', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return []
      try {
        return await customersApi.getCustomerDrivers(selectedCustomerId)
      } catch {
        return []
      }
    },
    enabled: Boolean(selectedCustomerId),
  })

  // Check customer blacklist / verification
  useEffect(() => {
    if (!selectedCustomerId) {
      setEligibilityWarning(null)
      return
    }
    const cust = customers.find((c) => c.id === selectedCustomerId)
    if (cust) {
      if (cust.isBlacklisted) {
        setEligibilityWarning(`CAUTION: Customer is blacklisted: ${cust.blacklistReason || 'Restricted by admin'}`)
      } else if (cust.verificationStatus === 'pending') {
        setEligibilityWarning('Note: Customer KYC documents are pending verification.')
      } else {
        setEligibilityWarning(null)
      }
    }
  }, [selectedCustomerId, customers])

  // Recalculate quote whenever relevant fields change
  useEffect(() => {
    if (!selectedVehicleId || !selectedDates || !selectedDates[0] || !selectedDates[1]) {
      setQuote(null)
      return
    }

    const start = selectedDates[0].toISOString()
    const end = selectedDates[1].toISOString()

    setQuoteLoading(true)
    bookingsApi
      .getPricingQuote({
        vehicle_id: selectedVehicleId,
        start_date: start,
        end_date: end,
        insurance: withInsurance,
        coupon_code: couponCode,
        extra_items: selectedExtras,
        delivery_fee: deliveryFee,
        collection_fee: collectionFee,
        one_way_fee: oneWayFee,
      })
      .then((data) => {
        setQuote(data)
      })
      .catch((err) => {
        console.warn('Quote calculation error:', err)
      })
      .finally(() => {
        setQuoteLoading(false)
      })
  }, [
    selectedVehicleId,
    selectedDates,
    withInsurance,
    selectedExtras,
    couponCode,
    deliveryFee,
    collectionFee,
    oneWayFee,
  ])

  // Toggle extras
  const handleToggleExtra = (extraName: string, price: number, checked: boolean) => {
    if (checked) {
      setSelectedExtras((prev) => [...prev, { name: extraName, price, quantity: 1 }])
    } else {
      setSelectedExtras((prev) => prev.filter((e) => e.name !== extraName))
    }
  }

  // Conflict map for all vehicles based on selected dates
  const vehicleConflictsMap = React.useMemo(() => {
    if (!selectedDates || !selectedDates[0] || !selectedDates[1]) {
      return new Map<string, Booking>()
    }
    const startReq = selectedDates[0].valueOf()
    const endReq = selectedDates[1].valueOf()

    const map = new Map<string, Booking>()
    for (const b of allBookings) {
      if (['cancelled', 'completed', 'no_show', 'rejected'].includes(b.status)) continue
      const bStart = dayjs(b.startDate).valueOf()
      const bEnd = dayjs(b.endDate).valueOf()
      if (startReq < bEnd && endReq > bStart) {
        if (!map.has(b.vehicleId)) {
          map.set(b.vehicleId, b)
        }
      }
    }
    return map
  }, [selectedDates, allBookings])

  const activeVehicleConflict = React.useMemo(() => {
    if (!selectedVehicleId) return null
    return vehicleConflictsMap.get(selectedVehicleId) || null
  }, [selectedVehicleId, vehicleConflictsMap])

  const availableAlternatives = React.useMemo(() => {
    if (!activeVehicleConflict) return []
    const cur = vehicles.find((v) => v.id === selectedVehicleId)
    return vehicles.filter(
      (v) =>
        v.id !== selectedVehicleId &&
        (cur ? v.type === cur.type : true) &&
        v.status === 'available' &&
        !vehicleConflictsMap.has(v.id)
    )
  }, [activeVehicleConflict, vehicles, selectedVehicleId, vehicleConflictsMap])

  const handleSwitchToAlternative = (altVehicle: Vehicle) => {
    setSelectedVehicleId(altVehicle.id)
    form.setFieldValue('vehicleId', altVehicle.id)
    message.success(
      `Switched to available vehicle: ${altVehicle.make} ${altVehicle.model} (${altVehicle.plateNumber})`
    )
  }

  // Create booking mutation
  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const start = values.dates[0].toISOString()
      const end = values.dates[1].toISOString()

      const payload = {
        customer_id: values.customerId,
        primary_driver_id: values.primaryDriverId || undefined,
        vehicle_id: values.vehicleId,
        pickup_location_id: values.pickupLocationId,
        return_location_id: values.returnLocationId,
        start_date: start,
        end_date: end,
        initial_status: values.initialStatus || 'confirmed',
        insurance: withInsurance,
        coupon_code: couponCode,
        extra_items: selectedExtras,
        delivery_fee: deliveryFee,
        collection_fee: collectionFee,
        one_way_fee: oneWayFee,
        notes: values.notes || '',
      }

      return await bookingsApi.createBooking(payload)
    },
    onSuccess: () => {
      message.success('Booking successfully created and recorded into system.')
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      form.resetFields()
      setQuote(null)
      setSelectedExtras([])
      onClose()
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to create booking.')
    },
  })

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (activeVehicleConflict) {
        message.error(
          `Selected vehicle is already booked from ${dayjs(activeVehicleConflict.startDate).format('YYYY-MM-DD HH:mm')} to ${dayjs(activeVehicleConflict.endDate).format('YYYY-MM-DD HH:mm')}. Please select an alternative vehicle or change dates.`
        )
        return
      }
      createMutation.mutate(values)
    } catch {
      // validation error
    }
  }

  return (
    <FormDrawer
      title="Create New Booking / Reservation"
      open={open}
      onClose={onClose}
      width={780}
      onSubmit={handleSubmit}
      confirmLoading={createMutation.isPending}
      submitText="Confirm & Reserve"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          initialStatus: 'confirmed',
          pickupLocationId: defaultOfficeLocation?.id || locations[0]?.id || 'loc-1',
          returnLocationId: defaultOfficeLocation?.id || locations[0]?.id || 'loc-1',
        }}
      >
        {eligibilityWarning && (
          <Alert
            title="Eligibility Warning"
            description={eligibilityWarning}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Section 1: Customer & Driver */}
        <Card
          size="small"
          title={
            <Space>
              <UserOutlined />
              <span>1. Customer & Authorized Driver</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="customerId"
                label="Select Registered Customer"
                rules={[{ required: true, message: 'Please select a customer' }]}
              >
                <Select
                  showSearch
                  placeholder="Search by customer name or phone"
                  optionFilterProp="children"
                  onChange={(val) => {
                    setSelectedCustomerId(val)
                    form.setFieldValue('primaryDriverId', undefined)
                  }}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.fullName} (${c.phone || c.email}) ${c.isBlacklisted ? '⛔ BLACKLISTED' : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="primaryDriverId"
                label="Authorized Driver"
                help={
                  customerDrivers.length === 0
                    ? 'Defaulting to customer profile'
                    : undefined
                }
              >
                <Select
                  placeholder="Select authorized driver"
                  allowClear
                  options={customerDrivers.map((d: any) => ({
                    value: d.id,
                    label: `${d.full_name} (Lic: ${d.license_number})`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Section 2: Vehicle Asset & Locations */}
        <Card
          size="small"
          title={
            <Space>
              <CarOutlined />
              <span>2. Vehicle Fleet Asset & Stations</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          {activeVehicleConflict && (
            <Alert
              type="error"
              showIcon
              icon={<CloseCircleOutlined style={{ fontSize: 18, color: '#dc2626' }} />}
              title={
                <span style={{ fontWeight: 700, color: '#991b1b' }}>
                  Vehicle Already Booked for Selected Period
                </span>
              }
              description={
                <div style={{ marginTop: 6, fontSize: 13 }}>
                  <div style={{ marginBottom: 8, padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                    <div>
                      <strong>Booking:</strong> <Tag color="red">{activeVehicleConflict.bookingCode}</Tag>
                      <Tag color="purple">{activeVehicleConflict.status}</Tag>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <strong>Dates:</strong> {dayjs(activeVehicleConflict.startDate).format('YYYY-MM-DD HH:mm')} – {dayjs(activeVehicleConflict.endDate).format('YYYY-MM-DD HH:mm')}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <strong>Renter:</strong> {activeVehicleConflict.customerName}
                    </div>
                  </div>

                  {availableAlternatives.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6, color: '#0f172a' }}>
                        Available Alternatives:
                      </div>
                      <Space wrap size={[6, 6]}>
                        {availableAlternatives.map((alt) => (
                          <Button
                            key={alt.id}
                            size="small"
                            type="primary"
                            ghost
                            icon={<SwapOutlined />}
                            onClick={() => handleSwitchToAlternative(alt)}
                          >
                            Switch to {alt.make} {alt.model} ({alt.plateNumber})
                          </Button>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
              }
              style={{ marginBottom: 14, borderRadius: 8 }}
            />
          )}

          <Form.Item
            name="vehicleId"
            label="Select Available Vehicle"
            rules={[{ required: true, message: 'Please choose an available vehicle' }]}
          >
            <Select
              showSearch
              placeholder="Search available fleet vehicle"
              optionFilterProp="filterText"
              onChange={(val) => setSelectedVehicleId(val)}
              options={vehicles.map((v) => {
                const conflict = vehicleConflictsMap.get(v.id)
                const isBooked = Boolean(conflict)
                const isSelected = v.id === selectedVehicleId
                return {
                  value: v.id,
                  disabled: isBooked && !isSelected,
                  filterText: `${v.make} ${v.model} ${v.plateNumber} ${v.type}`,
                  label: (
                    <Flex justify="space-between" align="center">
                      <span>{v.make} {v.model} ({v.plateNumber})</span>
                      {isBooked ? (
                        <Tag color="error" style={{ fontSize: 10, margin: 0 }}>
                          Booked: {dayjs(conflict!.startDate).format('MMM D')} - {dayjs(conflict!.endDate).format('MMM D')}
                        </Tag>
                      ) : (
                        <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 11 }}>
                          Rs. {v.pricing.dailyRate}/day
                        </span>
                      )}
                    </Flex>
                  ),
                }
              })}
            />
          </Form.Item>

          <div style={{ marginBottom: 8 }}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
              <Text strong style={{ fontSize: 13, color: '#475569' }}>
                🏢 Stations Assignment (Pre-filled with Office)
              </Text>
              {defaultOfficeLocation && (
                <Space size="small">
                  <Button
                    size="small"
                    type="dashed"
                    icon={<ShopOutlined />}
                    onClick={() => {
                      form.setFieldValue('pickupLocationId', defaultOfficeLocation.id)
                      form.setFieldValue('returnLocationId', defaultOfficeLocation.id)
                      message.info(`Pre-filled to Office (${defaultOfficeLocation.name})`)
                    }}
                  >
                    Office ({defaultOfficeLocation.name})
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      const p = form.getFieldValue('pickupLocationId') || defaultOfficeLocation.id
                      form.setFieldValue('returnLocationId', p)
                      message.info('Return station matched to pickup station')
                    }}
                  >
                    Same Return
                  </Button>
                </Space>
              )}
            </Flex>
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="pickupLocationId"
                label="Pickup Station"
                rules={[{ required: true, message: 'Select pickup station' }]}
                extra={defaultOfficeLocation ? `Default: ${defaultOfficeLocation.name} (Office)` : undefined}
              >
                <Select
                  placeholder="Select pickup station"
                  options={locations.map((l) => {
                    const isOffice =
                      l.id === defaultOfficeLocation?.id ||
                      /office|hq|head|main/i.test(l.name) ||
                      /office|hq/i.test(l.code)
                    return {
                      value: l.id,
                      label: (
                        <Flex justify="space-between" align="center">
                          <span>{isOffice ? '🏢 ' : '📍 '}{l.name} ({l.city})</span>
                          {isOffice && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>Office / HQ</Tag>}
                        </Flex>
                      ),
                    }
                  })}
                  onChange={(val) => {
                    form.setFieldValue('pickupLocationId', val)
                    const ret = form.getFieldValue('returnLocationId')
                    if (!ret || ret === defaultOfficeLocation?.id) {
                      form.setFieldValue('returnLocationId', val)
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="returnLocationId"
                label="Return Station"
                rules={[{ required: true, message: 'Select return station' }]}
                extra={defaultOfficeLocation ? `Default: ${defaultOfficeLocation.name} (Office)` : undefined}
              >
                <Select
                  placeholder="Select return station"
                  options={locations.map((l) => {
                    const isOffice =
                      l.id === defaultOfficeLocation?.id ||
                      /office|hq|head|main/i.test(l.name) ||
                      /office|hq/i.test(l.code)
                    return {
                      value: l.id,
                      label: (
                        <Flex justify="space-between" align="center">
                          <span>{isOffice ? '🏢 ' : '📍 '}{l.name} ({l.city})</span>
                          {isOffice && <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>Office / HQ</Tag>}
                        </Flex>
                      ),
                    }
                  })}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Section 3: Rental Period */}
        <Card
          size="small"
          title={
            <Space>
              <CalendarOutlined />
              <span>3. Rental Schedule Duration</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="dates"
            label="Rental Period (Start Date & Time — End Date & Time)"
            rules={[{ required: true, message: 'Please select rental start and end dates' }]}
          >
            <RangePicker
              showTime={{ format: 'HH:mm' }}
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setSelectedDates([dates[0], dates[1]])
                } else {
                  setSelectedDates(null)
                }
              }}
            />
          </Form.Item>
        </Card>

        {/* Section 4: Protection & Add-ons */}
        <Card
          size="small"
          title={
            <Space>
              <SafetyCertificateOutlined />
              <span>4. Insurance Protection & Optional Extras</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <div style={{ marginBottom: 12 }}>
            <Checkbox
              checked={withInsurance}
              onChange={(e) => setWithInsurance(e.target.checked)}
            >
              <strong>Comprehensive Protection / Rental Insurance</strong> (10% of rental, min Rs. 500/day)
            </Checkbox>
          </div>

          <Divider style={{ margin: '8px 0' }} />
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
            Optional Add-on Equipment & Services:
          </Text>

          <Row gutter={[16, 8]}>
            {AVAILABLE_EXTRAS.map((extra) => {
              const isChecked = selectedExtras.some((e) => e.name === extra.name)
              return (
                <Col span={12} key={extra.name}>
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => handleToggleExtra(extra.name, extra.price, e.target.checked)}
                  >
                    {extra.name} (<CurrencyDisplay amount={extra.price} />)
                  </Checkbox>
                </Col>
              )
            })}
          </Row>

          <Divider style={{ margin: '12px 0 8px 0' }} />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Delivery Surcharge (Rs.)">
                <InputNumber
                  min={0}
                  value={deliveryFee}
                  onChange={(v) => setDeliveryFee(Number(v) || 0)}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Collection Surcharge (Rs.)">
                <InputNumber
                  min={0}
                  value={collectionFee}
                  onChange={(v) => setCollectionFee(Number(v) || 0)}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="One-Way Surcharge (Rs.)">
                <InputNumber
                  min={0}
                  value={oneWayFee}
                  onChange={(v) => setOneWayFee(Number(v) || 0)}
                  style={{ width: '100%' }}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Promo / Coupon Code">
                <Input
                  prefix={<TagOutlined />}
                  placeholder="Enter discount code (e.g. MONSOON2026)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="initialStatus"
                label="Initial Booking Status"
              >
                <Select
                  options={[
                    { value: 'confirmed', label: 'Confirmed (Reserve Now)' },
                    { value: 'pending_confirmation', label: 'Pending Confirmation' },
                    { value: 'quote', label: 'Price Quote / Estimate' },
                    { value: 'draft', label: 'Draft' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Section 5: Real-time Authoritative Pricing Breakdown */}
        <Card
          size="small"
          title={
            <Space>
              <DollarOutlined />
              <span>5. Authoritative Centralized Pricing Breakdown</span>
            </Space>
          }
          style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
        >
          {quoteLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin tip="Calculating authoritative pricing quote..." />
            </div>
          ) : quote ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Rental Duration:</span>
                <strong>{quote.rental_days} Day(s) (@ Rs. {quote.base_rental_rate}/day)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>Base Rental Amount:</span>
                <CurrencyDisplay amount={quote.rental_amount} />
              </div>
              {quote.insurance_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Comprehensive Protection:</span>
                  <CurrencyDisplay amount={quote.insurance_amount} />
                </div>
              )}
              {quote.extra_charges > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Equipment & Logistics Extras:</span>
                  <CurrencyDisplay amount={quote.extra_charges} />
                </div>
              )}
              {quote.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#52c41a' }}>
                  <span>Coupon Discount Applied:</span>
                  <span>- <CurrencyDisplay amount={quote.discount_amount} /></span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #d9d9d9' }}>
                <span>Nepal VAT (13% Standard):</span>
                <CurrencyDisplay amount={quote.tax_amount} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 16, fontWeight: 700 }}>
                <span>Total Rental Charges:</span>
                <CurrencyDisplay amount={quote.total_amount} strong />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'rgba(0,0,0,0.65)' }}>
                <span>Refundable Security Deposit (Hold):</span>
                <strong><CurrencyDisplay amount={quote.deposit_amount} /></strong>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)', padding: '12px 0' }}>
              Select a vehicle and rental dates to view live price quote.
            </div>
          )}
        </Card>

        {/* Section 6: Staff Notes */}
        <Form.Item name="notes" label="Operations & Dispatch Notes">
          <TextArea rows={2} placeholder="Any special customer requests, delivery instructions, or notes" />
        </Form.Item>
      </Form>
    </FormDrawer>
  )
}
