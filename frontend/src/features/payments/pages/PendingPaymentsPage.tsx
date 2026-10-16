import React, { useState } from 'react'
import { Space, Button, Tag, Modal, InputNumber, App } from 'antd'
import { DollarOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { bookingsApi } from '@/features/bookings/api'
import { paymentsApi } from '../api'
import type { Booking } from '@/types/booking'
import type { ColumnsType } from 'antd/es/table'

export const PendingPaymentsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [targetBooking, setTargetBooking] = useState<Booking | null>(null)
  const [payAmount, setPayAmount] = useState<number>(0)

  const { data: bookings = [], isLoading, refetch } = useQuery<Booking[]>({
    queryKey: ['pending-payments-bookings'],
    queryFn: () => bookingsApi.getBookings(),
  })

  // Filter bookings with balance due
  const pendingBookings = bookings.filter((b) => b.balanceDue > 0 || b.paymentStatus === 'partially_paid' || b.paymentStatus === 'unpaid')

  const collectMutation = useMutation({
    mutationFn: async () => {
      if (!targetBooking) return
      await paymentsApi.recordPayment({
        tenantId: targetBooking.tenantId,
        bookingId: targetBooking.id,
        bookingCode: targetBooking.bookingCode,
        customerId: targetBooking.customerId,
        customerName: targetBooking.customerName,
        amount: payAmount,
        currency: 'NPR',
        category: 'rental',
        method: 'card',
        gateway: 'Stripe Quick Pay',
        status: 'completed',
        notes: `Balance collected for booking #${targetBooking.bookingCode}`,
      })

      // Update booking balance
      const newPaid = targetBooking.paidAmount + payAmount
      const newBalance = Math.max(0, targetBooking.balanceDue - payAmount)
      const newStatus = newBalance === 0 ? 'paid' : 'partially_paid'

      await bookingsApi.updateBooking(targetBooking.id, {
        paidAmount: newPaid,
        balanceDue: newBalance,
        paymentStatus: newStatus,
      })
    },
    onSuccess: () => {
      message.success('Payment collected and balance updated!')
      setPayModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['pending-payments-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => message.error('Failed to collect payment.'),
  })

  const handleOpenPay = (b: Booking) => {
    setTargetBooking(b)
    setPayAmount(b.balanceDue)
    setPayModalOpen(true)
  }

  const columns: ColumnsType<Booking> = [
    {
      title: 'Booking Code',
      dataIndex: 'bookingCode',
      key: 'code',
      render: (t) => <strong>#{t}</strong>,
    },
    {
      title: 'Customer',
      key: 'cust',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customerName}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{r.customerPhone}</div>
        </div>
      ),
    },
    {
      title: 'Vehicle',
      dataIndex: 'vehicleModel',
      key: 'veh',
    },
    {
      title: 'Total Charge',
      dataIndex: 'totalAmount',
      key: 'total',
      render: (amt) => <CurrencyDisplay amount={amt} />,
    },
    {
      title: 'Already Paid',
      dataIndex: 'paidAmount',
      key: 'paid',
      render: (amt) => <CurrencyDisplay amount={amt} type="success" />,
    },
    {
      title: 'Outstanding Balance Due',
      dataIndex: 'balanceDue',
      key: 'due',
      sorter: (a, b) => a.balanceDue - b.balanceDue,
      render: (amt) => <CurrencyDisplay amount={amt} strong type="danger" style={{ fontSize: 15 }} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<DollarOutlined />}
          onClick={() => handleOpenPay(record)}
        >
          Collect Balance
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Pending Payments & Outstanding Receivables"
        subtitle="Manage uncollected balances, partial payments, and overdue rental invoices"
      />

      <DataTable
        columns={columns}
        dataSource={pendingBookings}
        loading={isLoading}
        onRetry={() => refetch()}
        emptyTitle="All Receivables Settled"
        emptyDescription="There are currently zero pending payment balances."
      />

      <Modal
        open={payModalOpen}
        title={`Collect Outstanding Balance #${targetBooking?.bookingCode}`}
        okText="Process Payment"
        onCancel={() => setPayModalOpen(false)}
        onOk={() => collectMutation.mutate()}
        confirmLoading={collectMutation.isPending}
      >
        <p>Customer: <strong>{targetBooking?.customerName}</strong></p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>Payment Amount (Rs.)</label>
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            max={targetBooking?.balanceDue}
            value={payAmount}
            onChange={(v) => setPayAmount(v || 0)}
            prefix="Rs."
          />
        </div>
      </Modal>
    </PageContainer>
  )
}
