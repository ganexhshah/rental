import React, { useState } from 'react'
import {
  Modal,
  Button,
  Space,
  Row,
  Col,
  Tag,
  Typography,
  Card,
  App,
} from 'antd'
import {
  PrinterOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  FormOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import {
  printBookingAgreement,
  printBookingInvoice,
  printHandoverSheet,
  type CollateralPrintDetails,
} from '../utils/printTemplates'
import type { Booking } from '@/types/booking'
import type { Vehicle } from '@/types/vehicle'
import type { Customer } from '@/types/customer'

const { Text, Title } = Typography

interface BookingSuccessModalProps {
  open: boolean
  booking: Booking | null
  vehicle?: Vehicle | null
  customer?: Customer | null
  collateral?: CollateralPrintDetails
  onClose: () => void
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  open,
  booking,
  vehicle,
  customer,
  collateral,
  onClose,
}) => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [digitalSignModalOpen, setDigitalSignModalOpen] = useState(false)
  const [signedState, setSignedState] = useState(false)

  if (!booking) return null

  const handleCopyCode = () => {
    navigator.clipboard.writeText(booking.bookingCode)
    message.success('Booking Code copied to clipboard')
  }

  const handlePrintAgreement = () => {
    printBookingAgreement(booking, vehicle, customer, collateral)
  }

  const handlePrintInvoice = () => {
    printBookingInvoice(booking, vehicle, customer)
  }

  const handlePrintHandover = () => {
    printHandoverSheet(booking, vehicle, customer)
  }

  const colType = collateral?.collateralType || 'bank_cheque'
  const isBlank = collateral?.isBlankCheque !== false
  const depositAmt = collateral?.depositAmount ?? booking.depositAmount ?? 15000

  return (
    <>
      <Modal
        open={open}
        width={680}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        styles={{ body: { padding: '24px 28px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <CheckCircleOutlined style={{ fontSize: 44, color: '#16a34a', marginBottom: 10 }} />
          <Title level={4} style={{ margin: 0, color: '#0f172a', fontSize: 20 }}>
            Booking Confirmed
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            The reservation has been recorded in the fleet system.
          </Text>
        </div>

        {/* Summary Details */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 20,
          }}
        >
          <Row gutter={[20, 14]}>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 13 }}>Booking Reference:</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#1e40af' }}>
                  {booking.bookingCode}
                </span>
                <Button size="small" type="text" icon={<CopyOutlined />} onClick={handleCopyCode} />
              </div>
            </Col>

            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 13 }}>Status:</Text>
              <div style={{ marginTop: 2 }}>
                <Tag color="success" style={{ fontSize: 13, padding: '3px 10px', fontWeight: 600 }}>
                  {(booking.status || 'CONFIRMED').toUpperCase()}
                </Tag>
              </div>
            </Col>

            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 13 }}>Customer:</Text>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
                {customer?.fullName || booking.customerName}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {customer?.phone || booking.customerPhone}
              </div>
            </Col>

            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 13 }}>Assigned Vehicle:</Text>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
                {vehicle ? `${vehicle.make} ${vehicle.model}` : booking.vehicleModel}
              </div>
              <div style={{ fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
                Plate: {vehicle?.plateNumber || booking.vehiclePlate}
              </div>
            </Col>

            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 13 }}>Rental Amount:</Text>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                Rs. {(booking.totalAmount || 0).toLocaleString()} ({booking.totalDays || 1} Days)
              </div>
              <div style={{ fontSize: 12, color: (booking.balanceDue || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                Paid: Rs. {(booking.paidAmount || 0).toLocaleString()} | Due: Rs. {(booking.balanceDue || 0).toLocaleString()}
              </div>
            </Col>

            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 13 }}>Security Deposit / Collateral:</Text>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                {colType === 'bank_cheque'
                  ? `${collateral?.chequeBankName || 'Bank Cheque'} (${isBlank ? 'Blank Cheque' : `Rs. ${(collateral?.chequeAmount || depositAmt).toLocaleString()}`})`
                  : colType === 'cash_card'
                  ? `Cash / Card: Rs. ${depositAmt.toLocaleString()}`
                  : colType === 'original_document'
                  ? `Document: ${collateral?.originalDocType || 'Passport'}`
                  : colType === 'guarantor_only'
                  ? 'Guarantor Bond'
                  : 'Waived'}
              </div>
              {collateral?.hasGuarantor && collateral?.guarantorName && (
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Guarantor: {collateral.guarantorName} ({collateral.guarantorRelationship || 'Relative'})
                </div>
              )}
            </Col>
          </Row>
        </div>

        {/* Print & Action buttons */}
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Button
            type="primary"
            size="large"
            block
            icon={<FileTextOutlined style={{ fontSize: 18 }} />}
            onClick={handlePrintAgreement}
            style={{
              height: 48,
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 8,
              backgroundColor: '#1e40af',
            }}
          >
            Print Rental Agreement
          </Button>

          <Row gutter={12}>
            <Col span={12}>
              <Button
                size="large"
                block
                icon={<PrinterOutlined />}
                onClick={handlePrintInvoice}
                style={{ height: 46, fontWeight: 600, borderRadius: 8 }}
              >
                Print Invoice
              </Button>
            </Col>
            <Col span={12}>
              <Button
                size="large"
                block
                icon={<PrinterOutlined />}
                onClick={handlePrintHandover}
                style={{ height: 46, fontWeight: 600, borderRadius: 8 }}
              >
                Print Handover Sheet
              </Button>
            </Col>
          </Row>

          <Button
            size="large"
            block
            icon={<FormOutlined />}
            onClick={() => setDigitalSignModalOpen(true)}
            style={{
              height: 44,
              fontWeight: 600,
              borderRadius: 8,
              borderColor: signedState ? '#16a34a' : undefined,
              color: signedState ? '#16a34a' : undefined,
            }}
          >
            {signedState ? 'Digitally Signed by Customer' : 'Digital E-Signature'}
          </Button>
        </Space>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button size="large" onClick={onClose} style={{ height: 42 }}>Close</Button>
          <Space size="middle">
            <Button
              size="large"
              onClick={() => {
                onClose()
                navigate('/operations/pickup-return')
              }}
              style={{ height: 42 }}
            >
              Go to Handover
            </Button>
            <Button
              size="large"
              type="primary"
              onClick={() => {
                onClose()
                navigate('/operations/bookings')
              }}
              style={{ height: 42, fontWeight: 600 }}
            >
              View All Bookings
            </Button>
          </Space>
        </div>
      </Modal>

      {/* Digital E-Signature Dialog */}
      <Modal
        title="Digital Contract Signature"
        open={digitalSignModalOpen}
        onCancel={() => setDigitalSignModalOpen(false)}
        onOk={() => {
          setSignedState(true)
          message.success('Signature recorded.')
          setDigitalSignModalOpen(false)
        }}
        okText="Confirm Signature"
        okButtonProps={{ size: 'large' }}
        cancelButtonProps={{ size: 'large' }}
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
            Customer <strong>{customer?.fullName || booking.customerName}</strong> agrees to rental terms and conditions.
          </Text>
          <div
            style={{
              height: 140,
              border: '2px dashed #94a3b8',
              borderRadius: 8,
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'crosshair',
            }}
          >
            <div style={{ textAlign: 'center', color: '#64748b' }}>
              <FormOutlined style={{ fontSize: 28, color: '#3b82f6', marginBottom: 6 }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>Sign here / Touchpad sign</div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
