import React, { useState } from 'react'
import {
  Space,
  Button,
  Tag,
  Modal,
  Input,
  InputNumber,
  Radio,
  message,
} from 'antd'
import {
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { paymentsApi } from '../api'
import type { DepositRecord } from '@/types/payment'
import type { ColumnsType } from 'antd/es/table'
import { formatDateTime } from '@/lib/formatting/date'

export const DepositsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [releaseModalOpen, setReleaseModalOpen] = useState(false)
  const [targetDeposit, setTargetDeposit] = useState<DepositRecord | null>(null)
  const [releaseAction, setReleaseAction] = useState<'full' | 'partial'>('full')
  const [deductionAmount, setDeductionAmount] = useState<number>(0)
  const [deductionReason, setDeductionReason] = useState('')

  const { data: deposits = [], isLoading, refetch } = useQuery<DepositRecord[]>({
    queryKey: ['deposits'],
    queryFn: paymentsApi.getDeposits,
  })

  const releaseMutation = useMutation({
    mutationFn: () => {
      if (!targetDeposit) return Promise.reject()
      const refund = releaseAction === 'full' ? targetDeposit.amount : targetDeposit.amount - deductionAmount
      return paymentsApi.releaseDeposit(
        targetDeposit.id,
        refund,
        releaseAction === 'partial' ? deductionAmount : 0,
        releaseAction === 'partial' ? deductionReason : undefined
      )
    },
    onSuccess: () => {
      message.success('Deposit settlement completed.')
      setReleaseModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
    },
    onError: () => message.error('Failed to settle deposit.'),
  })

  const handleOpenRelease = (d: DepositRecord) => {
    setTargetDeposit(d)
    setReleaseAction('full')
    setDeductionAmount(0)
    setDeductionReason('')
    setReleaseModalOpen(true)
  }

  const columns: ColumnsType<DepositRecord> = [
    {
      title: 'Booking Code',
      dataIndex: 'bookingCode',
      key: 'code',
      render: (t) => <strong>#{t}</strong>,
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customer',
      render: (c) => <strong>{c}</strong>,
    },
    {
      title: 'Held Amount',
      dataIndex: 'amount',
      key: 'amt',
      render: (a) => <CurrencyDisplay amount={a} strong style={{ fontSize: 15 }} />,
    },
    {
      title: 'Hold Status',
      dataIndex: 'status',
      key: 'st',
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: 'Deductions',
      key: 'ded',
      render: (_, r) =>
        r.deductionsAmount && r.deductionsAmount > 0 ? (
          <div>
            <CurrencyDisplay amount={r.deductionsAmount} type="danger" strong />
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{r.deductionReason}</div>
          </div>
        ) : (
          '-'
        ),
    },
    {
      title: 'Held Timestamp',
      dataIndex: 'heldAt',
      key: 'time',
      render: (t) => formatDateTime(t),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) =>
        record.status === 'held' ? (
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleOpenRelease(record)}
          >
            Settle & Release Hold
          </Button>
        ) : (
          <Tag color="default">Settled</Tag>
        ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Security Deposits Escrow & Holds"
        subtitle="Manage card authorization holds, damage deductibles, and automatic deposit releases"
      />

      <DataTable
        columns={columns}
        dataSource={deposits}
        loading={isLoading}
        onRetry={() => refetch()}
      />

      {/* Release / Settle Modal */}
      <Modal
        open={releaseModalOpen}
        title={`Release Security Deposit #${targetDeposit?.bookingCode}`}
        okText="Confirm Settlement"
        onCancel={() => setReleaseModalOpen(false)}
        onOk={() => releaseMutation.mutate()}
        confirmLoading={releaseMutation.isPending}
      >
        <p>
          Customer: <strong>{targetDeposit?.customerName}</strong> • Total Held: <strong>${targetDeposit?.amount}</strong>
        </p>

        <div style={{ marginBottom: 16 }}>
          <Radio.Group
            value={releaseAction}
            onChange={(e) => setReleaseAction(e.target.value)}
          >
            <Radio value="full">Release 100% Full Deposit (No Damages)</Radio>
            <Radio value="partial">Deduct Damages / Fuel (Partial Release)</Radio>
          </Radio.Group>
        </div>

        {releaseAction === 'partial' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Deduction Amount (Rs.)</label>
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={targetDeposit?.amount}
                value={deductionAmount}
                onChange={(v) => setDeductionAmount(v || 0)}
                prefix="Rs."
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Deduction Reason</label>
              <Input.TextArea
                rows={2}
                placeholder="e.g. Scuffed front bumper, low fuel return penalty..."
                value={deductionReason}
                onChange={(e) => setDeductionReason(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}
