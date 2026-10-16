import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Select,
  InputNumber,
  Input,
  Button,
  Radio,
  Space,
  Row,
  Col,
  Tag,
  Descriptions,
  App,
  Divider,
  Tabs,
} from 'antd'
import {
  CheckCircleOutlined,
  CarOutlined,
  FilePdfOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { bookingsApi } from '../api'
import { documentsApi } from '@/features/documents/api'
import type { Booking } from '@/types/booking'
import { formatDateTime } from '@/lib/formatting/date'

const { TextArea } = Input

export const PickupReturnPage: React.FC = () => {
  const { message } = App.useApp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const defaultMode = (searchParams.get('mode') as 'pickup' | 'return') || 'pickup'
  const defaultBookingId = searchParams.get('bookingId') || ''

  const [mode, setMode] = useState<'pickup' | 'return'>(defaultMode)
  const [selectedBookingId, setSelectedBookingId] = useState<string>(defaultBookingId)
  const [form] = Form.useForm()

  const [photos, setPhotos] = useState<string[]>([])
  const [damageAmount, setDamageAmount] = useState<number>(0)
  const [fuelCharge, setFuelCharge] = useState<number>(0)
  const [depositDeduction, setDepositDeduction] = useState<number>(0)
  const [odometerInput, setOdometerInput] = useState<number>(0)

  // Fetch all bookings
  const { data: allBookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['bookings'],
    queryFn: () => bookingsApi.getBookings(),
  })

  // Filter bookings based on active mode
  const pickupBookings = allBookings.filter((b) =>
    ['confirmed', 'pickup_scheduled', 'pending'].includes(b.status)
  )
  const returnBookings = allBookings.filter((b) => b.status === 'active')
  const eligibleBookings = mode === 'pickup' ? pickupBookings : returnBookings

  const activeBooking = allBookings.find((b) => b.id === selectedBookingId) || eligibleBookings[0]

  useEffect(() => {
    if (activeBooking) {
      setSelectedBookingId(activeBooking.id)
      const initialOdo =
        mode === 'pickup'
          ? activeBooking.pickupOdometer || 15000
          : (activeBooking.pickupOdometer || 15000) + 180

      setOdometerInput(initialOdo)
      form.setFieldsValue({
        odometer: initialOdo,
        fuelLevel: mode === 'pickup' ? '100%' : '90%',
        exteriorCondition: '',
        interiorCondition: '',
        notes: '',
        damageDescription: '',
        depositRefundNote: '',
      })
    }
  }, [activeBooking, mode, form])

  // Calculation for Return
  const pickupOdo = activeBooking?.pickupOdometer || 15000
  const kmDriven = Math.max(0, odometerInput - pickupOdo)
  const depositHeld = activeBooking?.depositAmount || 0
  const depositRefundable = Math.max(0, depositHeld - depositDeduction)

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!activeBooking) return

      if (mode === 'pickup') {
        return bookingsApi.pickupBooking(activeBooking.id, {
          odometer: values.odometer,
          fuel_level: values.fuelLevel,
          exterior_condition: values.exteriorCondition,
          interior_condition: values.interiorCondition,
          photos,
          notes: values.notes || '',
          customer_signature: 'Verified',
        })
      } else {
        return bookingsApi.returnBooking(activeBooking.id, {
          odometer: values.odometer,
          fuel_level: values.fuelLevel,
          exterior_condition: values.exteriorCondition,
          interior_condition: values.interiorCondition,
          photos,
          notes: values.notes || '',
          additional_damages: damageAmount,
          damage_description: values.damageDescription || '',
          fuel_charge: fuelCharge,
          deposit_deduction: depositDeduction,
          deposit_refund_note: values.depositRefundNote || '',
          customer_signature: 'Verified',
        })
      }
    },
    onSuccess: () => {
      message.success(
        mode === 'pickup' ? 'Handover completed successfully.' : 'Vehicle return completed successfully.'
      )
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      navigate('/operations/bookings')
    },
    onError: (err: any) => {
      message.error(err?.message || 'Inspection processing failed.')
    },
  })

  return (
    <PageContainer loading={isLoading}>
      <PageHeader
        title="Pickup & Return"
        style={{ marginBottom: 0 }}
      />

      <Tabs
        activeKey={mode}
        onChange={(key) => {
          setMode(key as 'pickup' | 'return')
          setSelectedBookingId('')
        }}
        size="large"
        style={{ marginBottom: 16 }}
        tabBarExtraContent={
          eligibleBookings.length > 0 ? (
            <Select
              style={{ minWidth: 320 }}
              value={activeBooking?.id}
              onChange={(val) => setSelectedBookingId(val)}
              options={eligibleBookings.map((b) => ({
                value: b.id,
                label: `${b.bookingCode} — ${b.customerName} (${b.vehiclePlate})`,
              }))}
              placeholder="Select reservation"
            />
          ) : undefined
        }
        items={[
          {
            key: 'pickup',
            label: (
              <Space>
                <CarOutlined />
                <span>Pickup</span>
                <Tag color={mode === 'pickup' ? 'blue' : 'default'} style={{ borderRadius: 10, margin: 0 }}>
                  {pickupBookings.length}
                </Tag>
              </Space>
            ),
          },
          {
            key: 'return',
            label: (
              <Space>
                <CheckCircleOutlined />
                <span>Return</span>
                <Tag color={mode === 'return' ? 'blue' : 'default'} style={{ borderRadius: 10, margin: 0 }}>
                  {returnBookings.length}
                </Tag>
              </Space>
            ),
          },
        ]}
      />

      {!activeBooking ? (
        <Card style={{ textAlign: 'center', padding: 40, borderRadius: 8 }}>
          <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: 15, marginBottom: 16 }}>
            {mode === 'pickup'
              ? 'No confirmed reservations awaiting pickup.'
              : 'No active rentals currently checked out for return.'}
          </p>
          <Button type="primary" onClick={() => navigate('/operations/bookings')}>
            Back to Bookings
          </Button>
        </Card>
      ) : (
        <Row gutter={[20, 20]}>
          {/* Left Column: Booking & Vehicle Details */}
          <Col xs={24} lg={9}>
            <Card
              title={
                <Space>
                  <CarOutlined />
                  <span>Booking Details</span>
                </Space>
              }
              style={{ borderRadius: 8, marginBottom: 20 }}
            >
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Booking #">
                  <strong>{activeBooking.bookingCode}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Customer">
                  {activeBooking.customerName}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {activeBooking.customerPhone || 'On file'}
                </Descriptions.Item>
                <Descriptions.Item label="KYC">
                  <Tag color={activeBooking.customerKycStatus === 'verified' ? 'green' : 'orange'} style={{ margin: 0 }}>
                    {(activeBooking.customerKycStatus || 'verified').toUpperCase()}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Vehicle">
                  {activeBooking.vehicleModel} ({activeBooking.vehiclePlate})
                </Descriptions.Item>
                <Descriptions.Item label="Dates">
                  {formatDateTime(activeBooking.startDate)} — {formatDateTime(activeBooking.endDate)}
                </Descriptions.Item>
                <Descriptions.Item label="Total">
                  <CurrencyDisplay amount={activeBooking.totalAmount} />
                </Descriptions.Item>
                <Descriptions.Item label="Deposit">
                  <CurrencyDisplay amount={activeBooking.depositAmount} />
                </Descriptions.Item>
              </Descriptions>

              {mode === 'return' && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f0f0f0', fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Pickup Baseline:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Odometer:</span>
                    <strong>{pickupOdo.toLocaleString()} km</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Fuel Level:</span>
                    <strong>{activeBooking.pickupFuel || '100%'}</strong>
                  </div>
                  {activeBooking.actualPickupAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Handover:</span>
                      <span>{formatDateTime(activeBooking.actualPickupAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>

          {/* Right Column: Handover / Return Inspection Form */}
          <Col xs={24} lg={15}>
            <Card
              title={
                <span>
                  {mode === 'pickup'
                    ? 'Pickup Inspection'
                    : 'Return Settlement'}
                </span>
              }
              style={{ borderRadius: 8 }}
            >
              <Form form={form} layout="vertical" onFinish={(vals) => submitMutation.mutate(vals)}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="odometer"
                      label="Odometer (km)"
                      rules={[{ required: true, message: 'Odometer is required' }]}
                    >
                      <InputNumber
                        min={mode === 'return' ? pickupOdo : 0}
                        style={{ width: '100%' }}
                        onChange={(val) => setOdometerInput(Number(val) || 0)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="fuelLevel"
                      label="Fuel Level"
                      rules={[{ required: true, message: 'Fuel level is required' }]}
                    >
                      <Select
                        options={[
                          { value: '100%', label: '100% (Full)' },
                          { value: '90%', label: '90%' },
                          { value: '75%', label: '75% (3/4)' },
                          { value: '50%', label: '50% (1/2)' },
                          { value: '25%', label: '25% (1/4)' },
                          { value: '10%', label: '10% (Low)' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {mode === 'return' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '4px 2px', fontSize: 13 }}>
                    <span style={{ color: '#64748b' }}>Pickup Baseline: {pickupOdo.toLocaleString()} km</span>
                    <span>Distance Driven: <strong style={{ color: '#0d9488' }}>{kmDriven.toLocaleString()} km</strong></span>
                  </div>
                )}

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="exteriorCondition" label="Exterior Condition">
                      <Input placeholder="Body, paint, lights condition" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="interiorCondition" label="Interior Condition">
                      <Input placeholder="Cabin and seating condition" />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Return Additional Charges / Settlement Section */}
                {mode === 'return' && (
                  <>
                    <Divider style={{ margin: '14px 0' }}>Settlement & Charges</Divider>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="Damage Charges (Rs.)">
                          <InputNumber
                            min={0}
                            value={damageAmount}
                            onChange={(v) => setDamageAmount(Number(v) || 0)}
                            style={{ width: '100%' }}
                            placeholder="0"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="Fuel Charges (Rs.)">
                          <InputNumber
                            min={0}
                            value={fuelCharge}
                            onChange={(v) => setFuelCharge(Number(v) || 0)}
                            style={{ width: '100%' }}
                            placeholder="0"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="Deposit Deduction (Rs.)">
                          <InputNumber
                            min={0}
                            max={depositHeld}
                            value={depositDeduction}
                            onChange={(v) => setDepositDeduction(Number(v) || 0)}
                            style={{ width: '100%' }}
                            placeholder="0"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {damageAmount > 0 && (
                      <Form.Item name="damageDescription" label="Damage Description">
                        <Input placeholder="Describe damages or repair needed" />
                      </Form.Item>
                    )}

                    <Form.Item name="depositRefundNote" label="Deposit Refund Method">
                      <Input placeholder="e.g. Bank transfer, cash, QR" />
                    </Form.Item>

                    <div style={{ padding: '8px 4px', marginBottom: 16, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                        <span style={{ color: '#64748b' }}>Deposit Held:</span>
                        <strong><CurrencyDisplay amount={depositHeld} /></strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: depositDeduction > 0 ? '#dc2626' : 'inherit' }}>
                        <span style={{ color: '#64748b' }}>Total Deductions:</span>
                        <span>- <CurrencyDisplay amount={depositDeduction} /></span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#16a34a', borderTop: '1px dashed #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                        <span>Refund to Customer:</span>
                        <CurrencyDisplay amount={depositRefundable} strong />
                      </div>
                    </div>
                  </>
                )}

                <Form.Item name="notes" label="Notes">
                  <TextArea rows={2} placeholder="Optional inspection or handover notes" />
                </Form.Item>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/operations/bookings')}>
                    Back
                  </Button>
                  {activeBooking && (
                    <Button
                      icon={<FilePdfOutlined />}
                      onClick={() => {
                        documentsApi.viewDocumentPdf(activeBooking.id)
                      }}
                    >
                      Inspection PDF
                    </Button>
                  )}
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={submitMutation.isPending}
                    icon={<CheckCircleOutlined />}
                    size="middle"
                    style={{ fontWeight: 600 }}
                  >
                    {mode === 'pickup' ? 'Complete Pickup' : 'Complete Return'}
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      )}
    </PageContainer>
  )
}
