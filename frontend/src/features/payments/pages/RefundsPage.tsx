import React, { useState } from 'react'
import { Space, Button, Tag, Modal, Input, InputNumber, App } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { paymentsApi } from '../api'
import type { RefundRequest } from '@/types/payment'
import type { ColumnsType } from 'antd/es/table'
import { formatDateTime } from '@/lib/formatting/date'

export const RefundsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [refundBookingCode, setRefundBookingCode] = useState('')
  const [refundCustomer, setRefundCustomer] = useState('')
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [refundReason, setRefundReason] = useState('')

  const { data: refunds = [], isLoading, refetch } = useQuery<RefundRequest[]>({
    queryKey: ['refunds'],
    queryFn: paymentsApi.getRefunds,
  })

  const processMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      paymentsApi.processRefund(id, status),
    onSuccess: (_, vars) => {
      message.success(`Refund request ${vars.status}.`)
      queryClient.invalidateQueries({ queryKey: ['refunds'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      paymentsApi.createRefundRequest({
        tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
        transactionId: 'txn-1',
        bookingId: 'bk-1001',
        customerId: 'cust-1',
        customerName: refundCustomer,
        amount: refundAmount,
        reason: refundReason,
      }),
    onSuccess: () => {
      message.success('Refund request submitted for approval.')
      setRequestModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['refunds'] })
    },
  })

  const columns: ColumnsType<RefundRequest> = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'cust',
      render: (c) => <strong>{c}</strong>,
    },
    {
      title: 'Refund Amount',
      dataIndex: 'amount',
      key: 'amt',
      render: (a) => <CurrencyDisplay amount={a} strong type="warning" />,
    },
    {
      title: 'Reason for Refund',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: 'Requested At',
      dataIndex: 'requestedAt',
      key: 'reqAt',
      render: (t) => formatDateTime(t),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) =>
        record.status === 'pending' ? (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => processMutation.mutate({ id: record.id, status: 'approved' })}
            >
              Approve
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => processMutation.mutate({ id: record.id, status: 'rejected' })}
            >
              Reject
            </Button>
          </Space>
        ) : (
          <Tag color={record.status === 'processed' ? 'green' : 'default'}>
            {record.status?.toUpperCase()}
          </Tag>
        ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Refund Requests & Credits"
        subtitle="Review, authorize, and disburse customer reimbursement claims"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setRequestModalOpen(true)}
          >
            Initiate Refund Request
          </Button>
        }
      />

      <DataTable
        columns={columns}
        dataSource={refunds}
        loading={isLoading}
        onRetry={() => refetch()}
        emptyTitle="No Refund Requests"
        emptyDescription="There are currently zero pending refund requests in the queue."
      />

      <Modal
        open={requestModalOpen}
        title="Initiate Customer Refund"
        okText="Submit for Processing"
        onCancel={() => setRequestModalOpen(false)}
        onOk={() => createMutation.mutate()}
        confirmLoading={createMutation.isPending}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Customer Name</label>
          <Input value={refundCustomer} onChange={(e) => setRefundCustomer(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Refund Amount (Rs.)</label>
          <InputNumber
            style={{ width: '100%' }}
            min={1}
            value={refundAmount}
            onChange={(v) => setRefundAmount(v || 0)}
            prefix="Rs."
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Reason</label>
          <Input.TextArea
            rows={2}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
        </div>
      </Modal>
    </PageContainer>
  )
}
