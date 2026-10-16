import React, { useState, useMemo, useEffect } from 'react'
import {
  Space,
  Button,
  Select,
  Tag,
  Form,
  Input,
  InputNumber,
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Descriptions,
  Table,
  Divider,
  Radio,
  App,
  DatePicker,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  ReloadOutlined,
  SearchOutlined,
  PrinterOutlined,
  EyeOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  RollbackOutlined,
  SendOutlined,
  FilePdfOutlined,
  CarOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/navigation/PageHeader'
import { PageContainer } from '@/components/navigation/PageContainer'
import { DataTable } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { FormDrawer } from '@/components/overlays/FormDrawer'
import { DateDisplay } from '@/components/data-display/DateDisplay'
import { paymentsApi } from '../api'
import { documentsApi } from '@/features/documents/api'
import { customersApi } from '@/features/customers/api'
import { bookingsApi } from '@/features/bookings/api'
import type {
  PaymentTransaction,
  PaymentMethod,
  PaymentCategory,
  PaymentStatus,
  DepositRecord,
  Invoice,
  InvoiceItem,
  RefundRequest,
} from '@/types/payment'
import type { ColumnsType } from 'antd/es/table'
import { formatDateTime, formatDate } from '@/lib/formatting/date'

const { TextArea } = Input

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate()
  const { id: routeTxnId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryTxnId = searchParams.get('id') || searchParams.get('txn')
  const initialTxnId = routeTxnId || queryTxnId

  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'transactions')
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modals & Drawers
  const [selectedTxn, setSelectedTxn] = useState<PaymentTransaction | null>(null)
  const [isViewTxnModalOpen, setIsViewTxnModalOpen] = useState(false)

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false)
  const [isCollectDepositOpen, setIsCollectDepositOpen] = useState(false)
  const [isInitiateRefundOpen, setIsInitiateRefundOpen] = useState(false)
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)

  // Deposit Release Modal
  const [isReleaseDepositOpen, setIsReleaseDepositOpen] = useState(false)
  const [targetDeposit, setTargetDeposit] = useState<DepositRecord | null>(null)
  const [depositReleaseAction, setDepositReleaseAction] = useState<'full' | 'partial'>('full')
  const [depositDeductionAmount, setDepositDeductionAmount] = useState<number>(0)
  const [depositDeductionReason, setDepositDeductionReason] = useState('')

  // Invoice Preview Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false)

  // Forms
  const [paymentForm] = Form.useForm()
  const [depositForm] = Form.useForm()
  const [refundForm] = Form.useForm()
  const [invoiceForm] = Form.useForm()

  // 1. Fetch Transactions
  const {
    data: transactions = [],
    isLoading: txnsLoading,
    refetch: refetchTxns,
  } = useQuery<PaymentTransaction[]>({
    queryKey: ['transactions', { search, method: methodFilter, status: statusFilter, category: categoryFilter }],
    queryFn: () =>
      paymentsApi.getTransactions({
        search,
        method: methodFilter,
        status: statusFilter,
        category: categoryFilter,
      }),
  })

  // 2. Fetch Deposits
  const {
    data: deposits = [],
    isLoading: depositsLoading,
    refetch: refetchDeposits,
  } = useQuery<DepositRecord[]>({
    queryKey: ['deposits'],
    queryFn: paymentsApi.getDeposits,
  })

  // 3. Fetch Refunds
  const {
    data: refunds = [],
    isLoading: refundsLoading,
    refetch: refetchRefunds,
  } = useQuery<RefundRequest[]>({
    queryKey: ['refunds'],
    queryFn: paymentsApi.getRefunds,
  })

  // 4. Fetch Invoices
  const {
    data: invoices = [],
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => paymentsApi.getInvoices(),
  })

  // Dropdown list data for forms
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list-mini'],
    queryFn: () => customersApi.getCustomers(),
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-list-mini'],
    queryFn: () => bookingsApi.getBookings(),
  })

  // Auto-open specific transaction details when ID is passed via URL
  useEffect(() => {
    if (initialTxnId) {
      const found = transactions.find(
        (t) => t.id === initialTxnId || t.transactionNumber?.toLowerCase() === initialTxnId.toLowerCase()
      )
      if (found) {
        setSelectedTxn(found)
        setIsViewTxnModalOpen(true)
      } else {
        paymentsApi.getTransactionById(initialTxnId).then((t) => {
          if (t) {
            setSelectedTxn(t)
            setIsViewTxnModalOpen(true)
          }
        })
      }
    }
  }, [initialTxnId, transactions])

  // --- MUTATIONS ---

  // Record Payment
  const recordPaymentMutation = useMutation({
    mutationFn: (values: any) => {
      const selectedCust = customers.find((c: any) => c.id === values.customerId)
      const selectedBk = bookings.find((b: any) => b.id === values.bookingId)
      return paymentsApi.recordPayment({
        tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
        bookingId: values.bookingId || '',
        bookingCode: selectedBk ? selectedBk.bookingCode : values.bookingCode || '',
        customerId: values.customerId || 'cust-1',
        customerName: selectedCust ? selectedCust.fullName : values.customerName || 'Customer',
        amount: Number(values.amount) || 0,
        currency: 'NPR',
        category: values.category as PaymentCategory,
        method: values.method as PaymentMethod,
        gateway: values.gateway || values.method || 'Direct',
        gatewayReference: values.gatewayReference,
        status: (values.status as PaymentStatus) || 'completed',
        notes: values.notes,
      })
    },
    onSuccess: (newTxn) => {
      message.success(`Payment transaction ${newTxn.transactionNumber} recorded.`)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setIsRecordPaymentOpen(false)
      paymentForm.resetFields()
    },
    onError: () => message.error('Failed to record payment.'),
  })

  // Collect Deposit
  const collectDepositMutation = useMutation({
    mutationFn: (values: any) => {
      const selectedCust = customers.find((c: any) => c.id === values.customerId)
      const selectedBk = bookings.find((b: any) => b.id === values.bookingId)
      return paymentsApi.createDeposit({
        tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
        bookingId: values.bookingId || '',
        bookingCode: selectedBk ? selectedBk.bookingCode : 'BK-MANUAL',
        customerId: values.customerId || 'cust-1',
        customerName: selectedCust ? selectedCust.fullName : 'Customer',
        amount: Number(values.amount) || 0,
        currency: 'NPR',
        method: values.method as PaymentMethod,
        notes: values.notes,
      })
    },
    onSuccess: () => {
      message.success('Security deposit recorded.')
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      setIsCollectDepositOpen(false)
      depositForm.resetFields()
    },
    onError: () => message.error('Failed to collect deposit.'),
  })

  // Release / Settle Deposit
  const releaseDepositMutation = useMutation({
    mutationFn: () => {
      if (!targetDeposit) return Promise.reject()
      const refund =
        depositReleaseAction === 'full'
          ? targetDeposit.amount
          : targetDeposit.amount - depositDeductionAmount
      return paymentsApi.releaseDeposit(
        targetDeposit.id,
        refund,
        depositReleaseAction === 'partial' ? depositDeductionAmount : 0,
        depositReleaseAction === 'partial' ? depositDeductionReason : undefined
      )
    },
    onSuccess: () => {
      message.success('Deposit settlement completed.')
      setIsReleaseDepositOpen(false)
      queryClient.invalidateQueries({ queryKey: ['deposits'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => message.error('Failed to settle deposit.'),
  })

  // Process Refund (Approve / Reject)
  const processRefundMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      paymentsApi.processRefund(id, status),
    onSuccess: (_, vars) => {
      message.success(`Refund request ${vars.status}.`)
      queryClient.invalidateQueries({ queryKey: ['refunds'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => message.error('Failed to process refund.'),
  })

  // Initiate Refund Request
  const createRefundMutation = useMutation({
    mutationFn: (values: any) => {
      const selectedCust = customers.find((c: any) => c.id === values.customerId)
      const selectedBk = bookings.find((b: any) => b.id === values.bookingId)
      return paymentsApi.createRefundRequest({
        tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
        transactionId: values.transactionId || 'txn-manual',
        bookingId: values.bookingId || '',
        customerId: values.customerId || 'cust-1',
        customerName: selectedCust ? selectedCust.fullName : values.customerName || 'Customer',
        amount: Number(values.amount) || 0,
        reason: values.reason || 'Customer refund',
      })
    },
    onSuccess: () => {
      message.success('Refund request initiated.')
      setIsInitiateRefundOpen(false)
      refundForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['refunds'] })
    },
    onError: () => message.error('Failed to initiate refund.'),
  })

  // Create Invoice
  const createInvoiceMutation = useMutation({
    mutationFn: (values: any) => {
      const selectedCust = customers.find((c: any) => c.id === values.customerId)
      const selectedBk = bookings.find((b: any) => b.id === values.bookingId)

      const items: InvoiceItem[] = (values.items || []).map((it: any, idx: number) => ({
        id: `item-${idx + 1}`,
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        totalPrice: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
      }))

      const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0)
      const taxRate = Number(values.taxRate) || 0
      const taxAmount = (subtotal * taxRate) / 100
      const discountAmount = Number(values.discountAmount) || 0
      const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount)

      return paymentsApi.createInvoice({
        tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
        bookingId: values.bookingId || '',
        bookingCode: selectedBk?.bookingCode || 'BK-MANUAL',
        customerId: values.customerId,
        customerName: selectedCust ? selectedCust.fullName : 'Customer',
        customerEmail: selectedCust?.email || 'customer@email.com',
        customerAddress: selectedCust ? `${selectedCust.address}, ${selectedCust.districtCity || selectedCust.city || 'Kathmandu'}` : undefined,
        issueDate: new Date().toISOString(),
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : new Date(Date.now() + 86400000 * 7).toISOString(),
        status: 'issued',
        items,
        subtotal,
        taxRate,
        taxAmount,
        discountAmount,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        notes: values.notes,
      })
    },
    onSuccess: () => {
      message.success('Invoice created successfully.')
      setIsCreateInvoiceOpen(false)
      invoiceForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => message.error('Failed to create invoice.'),
  })

  // --- KPI CALCULATIONS ---
  const totalCollectedRevenue = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'completed' && t.category !== 'deposit_refund')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [transactions])

  const totalHeldDeposits = useMemo(() => {
    return deposits
      .filter((d) => d.status === 'held')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
  }, [deposits])

  const totalRefundsAmount = useMemo(() => {
    return refunds
      .filter((r) => r.status === 'approved' || r.status === 'processed')
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  }, [refunds])

  const totalInvoicesBalance = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.balanceDue) || 0), 0)
  }, [invoices])

  // --- TAB 1: ALL TRANSACTIONS COLUMNS ---
  const transactionColumns: ColumnsType<PaymentTransaction> = [
    {
      title: 'Transaction #',
      dataIndex: 'transactionNumber',
      key: 'txn',
      render: (t, r) => (
        <Space>
          <CreditCardOutlined style={{ color: '#1677ff' }} />
          <a
            style={{ fontWeight: 600 }}
            onClick={() => {
              setSelectedTxn(r)
              setIsViewTxnModalOpen(true)
            }}
          >
            {t}
          </a>
        </Space>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customer',
      render: (c, r) => (
        <div>
          <span
            style={{ fontWeight: 600, color: r.customerId ? '#1677ff' : 'inherit', cursor: r.customerId ? 'pointer' : 'default' }}
            onClick={() => r.customerId && navigate(`/customers/view/${r.customerId}`)}
          >
            {c}
          </span>
        </div>
      ),
    },
    {
      title: 'Booking Ref',
      dataIndex: 'bookingCode',
      key: 'booking',
      render: (b, r) =>
        b ? (
          <Tag
            color="blue"
            style={{ cursor: r.bookingId ? 'pointer' : 'default' }}
            onClick={() => r.bookingId && navigate(`/operations/bookings?id=${r.bookingId}`)}
          >
            {b}
          </Tag>
        ) : (
          '-'
        ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'cat',
      render: (cat) => {
        const color =
          cat === 'deposit'
            ? 'gold'
            : cat === 'deposit_refund'
            ? 'volcano'
            : cat === 'damage_fee'
            ? 'red'
            : 'blue'
        return <Tag color={color}>{String(cat || 'rental').toUpperCase().replace(/_/g, ' ')}</Tag>
      },
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (m, r) => (
        <span style={{ fontSize: 13 }}>
          {String(m || 'cash').toUpperCase()}
          {r.gateway && r.gateway !== m ? ` (${r.gateway})` : ''}
        </span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amt',
      sorter: (a, b) => a.amount - b.amount,
      render: (amt, r) => (
        <CurrencyDisplay
          amount={amt}
          currency={r.currency}
          strong
          type={r.category === 'deposit_refund' ? 'warning' : 'success'}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'st',
      render: (s) => <StatusBadge status={s || 'completed'} />,
    },
    {
      title: 'Date & Time',
      dataIndex: 'timestamp',
      key: 'time',
      render: (t) => formatDateTime(t),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedTxn(r)
              setIsViewTxnModalOpen(true)
            }}
          >
            View
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => {
              setSelectedTxn(r)
              setIsViewTxnModalOpen(true)
              setTimeout(() => window.print(), 300)
            }}
          />
        </Space>
      ),
    },
  ]

  // --- TAB 2: DEPOSITS COLUMNS ---
  const depositColumns: ColumnsType<DepositRecord> = [
    {
      title: 'Booking Code',
      dataIndex: 'bookingCode',
      key: 'code',
      render: (t, r) => (
        <a
          style={{ fontWeight: 600 }}
          onClick={() => r.bookingId && navigate(`/operations/bookings?id=${r.bookingId}`)}
        >
          #{t}
        </a>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'customer',
      render: (c, r) => (
        <span
          style={{ fontWeight: 600, color: r.customerId ? '#1677ff' : 'inherit', cursor: r.customerId ? 'pointer' : 'default' }}
          onClick={() => r.customerId && navigate(`/customers/view/${r.customerId}`)}
        >
          {c}
        </span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amt',
      render: (a) => <CurrencyDisplay amount={a} strong style={{ fontSize: 14 }} />,
    },
    {
      title: 'Status',
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
            {r.deductionReason && (
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{r.deductionReason}</div>
            )}
          </div>
        ) : (
          '-'
        ),
    },
    {
      title: 'Date',
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
            onClick={() => {
              setTargetDeposit(record)
              setDepositReleaseAction('full')
              setDepositDeductionAmount(0)
              setDepositDeductionReason('')
              setIsReleaseDepositOpen(true)
            }}
          >
            Settle
          </Button>
        ) : (
          <Tag color="green">SETTLED</Tag>
        ),
    },
  ]

  // --- TAB 3: REFUNDS COLUMNS ---
  const refundColumns: ColumnsType<RefundRequest> = [
    {
      title: 'Customer',
      dataIndex: 'customerName',
      key: 'cust',
      render: (c, r) => (
        <span
          style={{ fontWeight: 600, color: r.customerId ? '#1677ff' : 'inherit', cursor: r.customerId ? 'pointer' : 'default' }}
          onClick={() => r.customerId && navigate(`/customers/view/${r.customerId}`)}
        >
          {c}
        </span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amt',
      render: (a) => <CurrencyDisplay amount={a} strong type="warning" />,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (r) => r || 'Rental adjustment',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <StatusBadge status={s || 'pending'} />,
    },
    {
      title: 'Date',
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
              onClick={() => processRefundMutation.mutate({ id: record.id, status: 'approved' })}
              loading={processRefundMutation.isPending}
            >
              Approve
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => processRefundMutation.mutate({ id: record.id, status: 'rejected' })}
              loading={processRefundMutation.isPending}
            >
              Reject
            </Button>
          </Space>
        ) : (
          <Tag color={record.status === 'approved' || record.status === 'processed' ? 'green' : 'default'}>
            {record.status?.toUpperCase()}
          </Tag>
        ),
    },
  ]

  // --- TAB 4: INVOICES COLUMNS ---
  const invoiceColumns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (num: string, record: Invoice) => (
        <a
          onClick={() => {
            setSelectedInvoice(record)
            setIsInvoicePreviewOpen(true)
          }}
          style={{ fontWeight: 600, color: '#1677ff' }}
        >
          {num}
        </a>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div
            style={{ fontWeight: 600, color: record.customerId ? '#1677ff' : 'inherit', cursor: record.customerId ? 'pointer' : 'default' }}
            onClick={() => record.customerId && navigate(`/customers/view/${record.customerId}`)}
          >
            {record.customerName}
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.customerEmail}</div>
        </div>
      ),
    },
    {
      title: 'Booking Ref',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (code: string, r) => (
        <Tag
          color="blue"
          style={{ cursor: r.bookingId ? 'pointer' : 'default' }}
          onClick={() => r.bookingId && navigate(`/operations/bookings?id=${r.bookingId}`)}
        >
          {code || 'Direct'}
        </Tag>
      ),
    },
    {
      title: 'Issue / Due Date',
      key: 'dates',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>Issue: {formatDate(record.issueDate)}</div>
          <div style={{ color: '#8c8c8c' }}>Due: {formatDate(record.dueDate)}</div>
        </div>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => <CurrencyDisplay amount={val} strong />,
    },
    {
      title: 'Balance Due',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
          <CurrencyDisplay amount={val} />
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: Invoice['status']) => {
        const colorMap: Record<Invoice['status'], string> = {
          paid: 'success',
          issued: 'processing',
          overdue: 'error',
          draft: 'default',
          void: 'warning',
        }
        return <StatusBadge status={colorMap[st] as any} text={st.toUpperCase()} />
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedInvoice(record)
              setIsInvoicePreviewOpen(true)
            }}
          >
            Preview
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => {
              setSelectedInvoice(record)
              setIsInvoicePreviewOpen(true)
              setTimeout(() => window.print(), 300)
            }}
          />
        </Space>
      ),
    },
  ]

  const handleCloseViewTxn = () => {
    setIsViewTxnModalOpen(false)
    if (queryTxnId) {
      const next = new URLSearchParams(searchParams)
      next.delete('id')
      next.delete('txn')
      setSearchParams(next, { replace: true })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        extra={
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                refetchTxns()
                refetchDeposits()
                refetchRefunds()
                refetchInvoices()
              }}
            >
              Refresh
            </Button>
            <Button icon={<SafetyCertificateOutlined />} onClick={() => setIsCollectDepositOpen(true)}>
              Collect Deposit
            </Button>
            <Button icon={<RollbackOutlined />} onClick={() => setIsInitiateRefundOpen(true)}>
              Initiate Refund
            </Button>
            <Button icon={<FileTextOutlined />} onClick={() => setIsCreateInvoiceOpen(true)}>
              Create Invoice
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsRecordPaymentOpen(true)}
            >
              Record Payment
            </Button>
          </Space>
        }
      />

      {/* 1. Top Financial KPI Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #e2e8f0' }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title="Collected Revenue"
              value={totalCollectedRevenue}
              prefix="Rs. "
              precision={2}
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #e2e8f0' }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title="Security Deposits"
              value={totalHeldDeposits}
              prefix="Rs. "
              precision={2}
              valueStyle={{ color: '#d97706', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #e2e8f0' }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title="Refunds"
              value={totalRefundsAmount}
              prefix="Rs. "
              precision={2}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} style={{ borderRadius: 10, border: '1px solid #e2e8f0' }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title="Outstanding Invoices"
              value={totalInvoicesBalance}
              prefix="Rs. "
              precision={2}
              valueStyle={{ color: totalInvoicesBalance > 0 ? '#ea580c' : '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 2. Main Tabbed Payments Workspace */}
      <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0' }} styles={{ body: { padding: '16px 20px' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key)
            const next = new URLSearchParams(searchParams)
            next.set('tab', key)
            setSearchParams(next, { replace: true })
          }}
          size="large"
          items={[
            // TAB 1: ALL TRANSACTIONS
            {
              key: 'transactions',
              label: (
                <span>
                  <CreditCardOutlined style={{ marginRight: 6 }} />
                  Transactions ({transactions.length})
                </span>
              ),
              children: (
                <div>
                  <Card size="small" style={{ marginBottom: 16, borderRadius: 8, backgroundColor: '#f8fafc' }}>
                    <Row gutter={[12, 12]} align="middle">
                      <Col xs={24} sm={10} md={8}>
                        <Input
                          placeholder="Search transactions, customers, bookings..."
                          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          allowClear
                        />
                      </Col>
                      <Col xs={12} sm={7} md={5}>
                        <Select
                          style={{ width: '100%' }}
                          value={categoryFilter}
                          onChange={setCategoryFilter}
                          options={[
                            { value: 'all', label: 'All Categories' },
                            { value: 'rental', label: 'Rental Payment' },
                            { value: 'deposit', label: 'Security Deposit' },
                            { value: 'deposit_refund', label: 'Deposit Refund' },
                            { value: 'damage_fee', label: 'Damage Fee' },
                            { value: 'extension', label: 'Rental Extension' },
                          ]}
                        />
                      </Col>
                      <Col xs={12} sm={7} md={5}>
                        <Select
                          style={{ width: '100%' }}
                          value={methodFilter}
                          onChange={setMethodFilter}
                          options={[
                            { value: 'all', label: 'All Methods' },
                            { value: 'cash', label: 'Cash' },
                            { value: 'card', label: 'Credit / Debit Card' },
                            { value: 'bank_transfer', label: 'Bank Transfer' },
                            { value: 'esewa', label: 'eSewa' },
                            { value: 'khalti', label: 'Khalti' },
                          ]}
                        />
                      </Col>
                      <Col xs={12} sm={7} md={4}>
                        <Select
                          style={{ width: '100%' }}
                          value={statusFilter}
                          onChange={setStatusFilter}
                          options={[
                            { value: 'all', label: 'All Statuses' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'refunded', label: 'Refunded' },
                            { value: 'failed', label: 'Failed' },
                          ]}
                        />
                      </Col>
                    </Row>
                  </Card>

                  <DataTable
                    columns={transactionColumns}
                    dataSource={transactions}
                    rowKey="id"
                    loading={txnsLoading}
                    pagination={{ pageSize: 15 }}
                    emptyTitle="No Transactions"
                    emptyDescription="No payment transactions found."
                  />
                </div>
              ),
            },

            // TAB 2: SECURITY DEPOSITS
            {
              key: 'deposits',
              label: (
                <span>
                  <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                  Deposits ({deposits.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCollectDepositOpen(true)}>
                      Collect Deposit
                    </Button>
                  </div>

                  <DataTable
                    columns={depositColumns}
                    dataSource={deposits}
                    rowKey="id"
                    loading={depositsLoading}
                    pagination={{ pageSize: 15 }}
                    emptyTitle="No Deposits"
                    emptyDescription="No security deposits found."
                  />
                </div>
              ),
            },

            // TAB 3: REFUND REQUESTS
            {
              key: 'refunds',
              label: (
                <span>
                  <RollbackOutlined style={{ marginRight: 6 }} />
                  Refunds ({refunds.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsInitiateRefundOpen(true)}>
                      Initiate Refund
                    </Button>
                  </div>

                  <DataTable
                    columns={refundColumns}
                    dataSource={refunds}
                    rowKey="id"
                    loading={refundsLoading}
                    pagination={{ pageSize: 15 }}
                    emptyTitle="No Refunds"
                    emptyDescription="No refund requests found."
                  />
                </div>
              ),
            },

            // TAB 4: INVOICES & BILLING
            {
              key: 'invoices',
              label: (
                <span>
                  <FileTextOutlined style={{ marginRight: 6 }} />
                  Invoices ({invoices.length})
                </span>
              ),
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateInvoiceOpen(true)}>
                      Create Invoice
                    </Button>
                  </div>

                  <DataTable
                    columns={invoiceColumns}
                    dataSource={invoices}
                    rowKey="id"
                    loading={invoicesLoading}
                    pagination={{ pageSize: 15 }}
                    emptyTitle="No Invoices"
                    emptyDescription="No billing invoices found."
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 3. TRANSACTION DETAILS & OFFICIAL RECEIPT MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
            <Space>
              <CreditCardOutlined style={{ color: '#1677ff' }} />
              <span>Transaction #{selectedTxn?.transactionNumber}</span>
            </Space>
            {selectedTxn && <StatusBadge status={selectedTxn.status || 'completed'} />}
          </div>
        }
        open={isViewTxnModalOpen}
        onCancel={handleCloseViewTxn}
        width={720}
        footer={[
          <Button key="close" onClick={handleCloseViewTxn}>
            Close
          </Button>,
          <Button
            key="refund"
            danger
            icon={<RollbackOutlined />}
            onClick={() => {
              if (selectedTxn) {
                refundForm.setFieldsValue({
                  customerId: selectedTxn.customerId,
                  bookingId: selectedTxn.bookingId,
                  amount: selectedTxn.amount,
                  transactionId: selectedTxn.id,
                  reason: `Refund for txn ${selectedTxn.transactionNumber}`,
                })
                setIsViewTxnModalOpen(false)
                setIsInitiateRefundOpen(true)
              }
            }}
          >
            Issue Refund
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            Print Receipt
          </Button>,
        ]}
      >
        {selectedTxn && (
          <div style={{ padding: '8px 4px' }}>
            {/* Branded Receipt Box */}
            <Card
              size="small"
              style={{
                borderRadius: 8,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                marginBottom: 16,
              }}
            >
              <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                <Col>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
                    Himalayan Rides Vehicle Rental Pvt. Ltd.
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Tax PAN / VAT: 600123456 • Kathmandu, Nepal</div>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                  <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px', fontWeight: 600 }}>
                    RECEIPT
                  </Tag>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Date: {formatDateTime(selectedTxn.timestamp || selectedTxn.createdAt)}
                  </div>
                </Col>
              </Row>

              <Divider style={{ margin: '8px 0 12px 0' }} />

              <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                <Descriptions.Item label="Transaction No.">
                  <strong>{selectedTxn.transactionNumber}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Category">
                  <Tag color="blue">{String(selectedTxn.category || 'rental').toUpperCase().replace(/_/g, ' ')}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Customer">
                  <span
                    style={{ color: '#1677ff', fontWeight: 600, cursor: selectedTxn.customerId ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (selectedTxn.customerId) {
                        navigate(`/customers/view/${selectedTxn.customerId}`)
                      }
                    }}
                  >
                    {selectedTxn.customerName}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Booking Code">
                  {selectedTxn.bookingCode ? (
                    <Tag
                      color="cyan"
                      style={{ cursor: selectedTxn.bookingId ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (selectedTxn.bookingId) {
                          navigate(`/operations/bookings?id=${selectedTxn.bookingId}`)
                        }
                      }}
                    >
                      {selectedTxn.bookingCode}
                    </Tag>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Payment Method">
                  {String(selectedTxn.method || 'cash').toUpperCase()}
                </Descriptions.Item>
                <Descriptions.Item label="Gateway / Terminal">
                  {selectedTxn.gateway || 'Direct Counter'}
                </Descriptions.Item>
                {selectedTxn.gatewayReference && (
                  <Descriptions.Item label="Gateway Ref" span={2}>
                    <code>{selectedTxn.gatewayReference}</code>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Amount Paid" span={2}>
                  <strong style={{ fontSize: 18, color: '#1677ff' }}>
                    <CurrencyDisplay amount={selectedTxn.amount} strong />
                  </strong>
                </Descriptions.Item>
              </Descriptions>

              {selectedTxn.notes && (
                <div style={{ marginTop: 12, padding: 8, backgroundColor: '#ffffff', borderRadius: 6, fontSize: 12 }}>
                  <strong>Notes:</strong> {selectedTxn.notes}
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>

      {/* 4. RECORD PAYMENT FORM DRAWER */}
      <FormDrawer
        title="Record Payment"
        open={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSubmit={() => paymentForm.submit()}
        confirmLoading={recordPaymentMutation.isPending}
        width={560}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={(values) => recordPaymentMutation.mutate(values)}
          initialValues={{
            category: 'rental',
            method: 'cash',
            status: 'completed',
          }}
        >
          <Form.Item
            name="customerId"
            label="Customer"
            rules={[{ required: true, message: 'Please select customer' }]}
          >
            <Select
              showSearch
              placeholder="Select customer"
              optionFilterProp="label"
              options={customers.map((c: any) => ({
                label: `${c.fullName} (${c.email || c.phone})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="bookingId" label="Booking">
            <Select
              showSearch
              allowClear
              placeholder="Select booking code"
              optionFilterProp="label"
              options={bookings.map((b: any) => ({
                label: `${b.bookingCode || b.id} - ${b.customerName} (${b.vehicleModel || 'Vehicle'})`,
                value: b.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount (NPR)"
                rules={[{ required: true, message: 'Amount is required' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 5000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category">
                <Select
                  options={[
                    { label: 'Rental Payment', value: 'rental' },
                    { label: 'Security Deposit', value: 'deposit' },
                    { label: 'Deposit Refund', value: 'deposit_refund' },
                    { label: 'Damage Settlement', value: 'damage_fee' },
                    { label: 'Rental Extension', value: 'extension' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="method" label="Payment Method">
                <Select
                  options={[
                    { label: 'Cash', value: 'cash' },
                    { label: 'Credit / Debit Card', value: 'card' },
                    { label: 'Bank Transfer', value: 'bank_transfer' },
                    { label: 'eSewa', value: 'esewa' },
                    { label: 'Khalti', value: 'khalti' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gateway" label="Terminal / Gateway">
                <Input placeholder="e.g. POS Terminal #1, eSewa QR" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="gatewayReference" label="Reference / Slip No.">
            <Input placeholder="e.g. ESEWA-9948214 or Bank Auth #8821" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Optional memo..." />
          </Form.Item>
        </Form>
      </FormDrawer>

      {/* 5. COLLECT DEPOSIT MODAL */}
      <Modal
        title="Collect Deposit"
        open={isCollectDepositOpen}
        onCancel={() => setIsCollectDepositOpen(false)}
        onOk={() => depositForm.submit()}
        confirmLoading={collectDepositMutation.isPending}
        okText="Collect Deposit"
        width={520}
      >
        <Form
          form={depositForm}
          layout="vertical"
          onFinish={(values) => collectDepositMutation.mutate(values)}
          initialValues={{ method: 'cash', amount: 15000 }}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="customerId"
            label="Customer"
            rules={[{ required: true, message: 'Please select customer' }]}
          >
            <Select
              showSearch
              placeholder="Select customer"
              optionFilterProp="label"
              options={customers.map((c: any) => ({
                label: `${c.fullName} (${c.phone})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="bookingId" label="Booking">
            <Select
              showSearch
              placeholder="Select booking code"
              optionFilterProp="label"
              options={bookings.map((b: any) => ({
                label: `${b.bookingCode || b.id} - ${b.customerName}`,
                value: b.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Amount (NPR)"
                rules={[{ required: true, message: 'Deposit amount is required' }]}
              >
                <InputNumber min={500} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="method" label="Method">
                <Select
                  options={[
                    { label: 'Cash', value: 'cash' },
                    { label: 'Credit Card Pre-Auth', value: 'card' },
                    { label: 'Bank Transfer Hold', value: 'bank_transfer' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="e.g. Refundable upon inspection at station check-in" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 6. SETTLE / RELEASE DEPOSIT MODAL */}
      <Modal
        title="Settle Deposit"
        open={isReleaseDepositOpen}
        onCancel={() => setIsReleaseDepositOpen(false)}
        onOk={() => releaseDepositMutation.mutate()}
        confirmLoading={releaseDepositMutation.isPending}
        okText="Confirm"
        width={520}
      >
        {targetDeposit && (
          <div style={{ marginTop: 12 }}>
            <Descriptions size="small" bordered column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Booking">{targetDeposit.bookingCode}</Descriptions.Item>
              <Descriptions.Item label="Customer">{targetDeposit.customerName}</Descriptions.Item>
              <Descriptions.Item label="Deposit Held">
                <CurrencyDisplay amount={targetDeposit.amount} strong />
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
                Settlement Type:
              </label>
              <Radio.Group
                value={depositReleaseAction}
                onChange={(e) => setDepositReleaseAction(e.target.value)}
              >
                <Radio value="full">Full Release</Radio>
                <Radio value="partial">Partial Deduction</Radio>
              </Radio.Group>
            </div>

            {depositReleaseAction === 'partial' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>
                    Deduction Amount (NPR):
                  </label>
                  <InputNumber
                    min={1}
                    max={targetDeposit.amount}
                    value={depositDeductionAmount}
                    onChange={(v) => setDepositDeductionAmount(Number(v) || 0)}
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4 }}>
                    Refund:{' '}
                    <strong>
                      <CurrencyDisplay amount={targetDeposit.amount - depositDeductionAmount} />
                    </strong>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 500, marginBottom: 4 }}>
                    Deduction Reason:
                  </label>
                  <Input
                    placeholder="e.g. Scratched front bumper / Fuel level under agreement"
                    value={depositDeductionReason}
                    onChange={(e) => setDepositDeductionReason(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 7. INITIATE REFUND MODAL */}
      <Modal
        title="Initiate Refund"
        open={isInitiateRefundOpen}
        onCancel={() => setIsInitiateRefundOpen(false)}
        onOk={() => refundForm.submit()}
        confirmLoading={createRefundMutation.isPending}
        okText="Submit Refund"
        width={520}
      >
        <Form
          form={refundForm}
          layout="vertical"
          onFinish={(values) => createRefundMutation.mutate(values)}
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="customerId"
            label="Customer"
            rules={[{ required: true, message: 'Please select customer' }]}
          >
            <Select
              showSearch
              placeholder="Select customer"
              optionFilterProp="label"
              options={customers.map((c: any) => ({
                label: `${c.fullName} (${c.phone})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="bookingId" label="Booking">
            <Select
              showSearch
              placeholder="Select booking code"
              optionFilterProp="label"
              options={bookings.map((b: any) => ({
                label: `${b.bookingCode || b.id} - ${b.customerName}`,
                value: b.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount (NPR)"
            rules={[{ required: true, message: 'Amount is required' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 2500" />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Reason is required' }]}
          >
            <TextArea rows={2} placeholder="e.g. Early return discount / security deposit balance" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 8. CREATE INVOICE FORM DRAWER */}
      <FormDrawer
        title="New Invoice"
        open={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        onSubmit={() => invoiceForm.submit()}
        confirmLoading={createInvoiceMutation.isPending}
        width={640}
      >
        <Form
          form={invoiceForm}
          layout="vertical"
          onFinish={(values) => createInvoiceMutation.mutate(values)}
          initialValues={{
            taxRate: 13,
            discountAmount: 0,
            items: [{ description: 'Vehicle Rental Period Charges', quantity: 1, unitPrice: 5000 }],
          }}
        >
          <Form.Item
            name="customerId"
            label="Customer"
            rules={[{ required: true, message: 'Select customer' }]}
          >
            <Select
              showSearch
              placeholder="Select customer"
              optionFilterProp="label"
              options={customers.map((c: any) => ({
                label: `${c.fullName} (${c.email || c.phone})`,
                value: c.id,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bookingId" label="Booking">
                <Select
                  showSearch
                  allowClear
                  placeholder="Select booking code"
                  optionFilterProp="label"
                  options={bookings.map((b: any) => ({
                    label: `${b.bookingCode || b.id} - ${b.vehicleModel}`,
                    value: b.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="Due Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0 16px 0' }}>Line Items</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={8} key={key} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: 'Missing description' }]}
                        style={{ margin: 0 }}
                      >
                        <Input placeholder="Item Description" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Qty' }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, 'unitPrice']}
                        rules={[{ required: true, message: 'Rate' }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber min={0} placeholder="Price" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => remove(name)}
                        />
                      )}
                    </Col>
                  </Row>
                ))}
                <Form.Item style={{ marginTop: 8 }}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Line Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="taxRate" label="VAT (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discountAmount" label="Discount (NPR)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="e.g. Net 7 days payment terms. Bank transfer details on footer." />
          </Form.Item>
        </Form>
      </FormDrawer>

      {/* 9. INVOICE PREVIEW & PRINT MODAL */}
      <Modal
        title={
          <Space>
            <span>Invoice: {selectedInvoice?.invoiceNumber}</span>
            {selectedInvoice && (
              <Tag color={selectedInvoice.status === 'paid' ? 'green' : 'blue'}>
                {selectedInvoice.status.toUpperCase()}
              </Tag>
            )}
          </Space>
        }
        open={isInvoicePreviewOpen}
        onCancel={() => setIsInvoicePreviewOpen(false)}
        width={760}
        footer={[
          <Button key="close" onClick={() => setIsInvoicePreviewOpen(false)}>
            Close
          </Button>,
          <Button
            key="server-pdf"
            icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
            onClick={() => {
              if (selectedInvoice) {
                documentsApi.viewDocumentPdf(selectedInvoice.id)
              }
            }}
          >
            Download PDF
          </Button>,
          <Button
            key="send"
            icon={<SendOutlined />}
            onClick={() => {
              message.success(`Invoice emailed to ${selectedInvoice?.customerEmail}`)
            }}
          >
            Email Invoice
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            Print / PDF
          </Button>,
        ]}
      >
        {selectedInvoice && (
          <div style={{ padding: '12px 4px' }}>
            <Row justify="space-between" align="top" style={{ marginBottom: 20 }}>
              <Col>
                <h3 style={{ margin: 0, color: '#1677ff' }}>Himalayan Rides Vehicle Rental Pvt. Ltd.</h3>
                <div style={{ color: '#8c8c8c', fontSize: 13 }}>Tax PAN / VAT: 600123456</div>
                <div style={{ color: '#8c8c8c', fontSize: 13 }}>Baluwatar, Kathmandu, Nepal</div>
                <div style={{ color: '#8c8c8c', fontSize: 13 }}>billing@himalayanrides.com</div>
              </Col>
              <Col style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0 }}>TAX INVOICE</h2>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.invoiceNumber}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  Date: {formatDate(selectedInvoice.issueDate)}
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  Due: {formatDate(selectedInvoice.dueDate)}
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />

            <Descriptions title="Billed To" size="small" column={2}>
              <Descriptions.Item label="Customer">{selectedInvoice.customerName}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedInvoice.customerEmail}</Descriptions.Item>
              <Descriptions.Item label="Booking Reference">
                <Tag color="purple">{selectedInvoice.bookingCode}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {selectedInvoice.customerAddress || 'Kathmandu, Nepal'}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0' }} />

            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={selectedInvoice.items}
              columns={[
                { title: 'Item & Description', dataIndex: 'description', key: 'desc' },
                { title: 'Qty', dataIndex: 'quantity', key: 'qty', align: 'center', width: 80 },
                {
                  title: 'Unit Rate',
                  dataIndex: 'unitPrice',
                  key: 'price',
                  align: 'right',
                  width: 130,
                  render: (v) => <CurrencyDisplay amount={v} />,
                },
                {
                  title: 'Total',
                  dataIndex: 'totalPrice',
                  key: 'total',
                  align: 'right',
                  width: 140,
                  render: (v) => <CurrencyDisplay amount={v} strong />,
                },
              ]}
              style={{ marginBottom: 16 }}
            />

            <Row justify="end">
              <Col xs={24} sm={12} md={10}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Subtotal:</span>
                  <span><CurrencyDisplay amount={selectedInvoice.subtotal} /></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>VAT ({selectedInvoice.taxRate}%):</span>
                  <span><CurrencyDisplay amount={selectedInvoice.taxAmount} /></span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#52c41a' }}>
                    <span>Discount:</span>
                    <span>-<CurrencyDisplay amount={selectedInvoice.discountAmount} /></span>
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 'bold', fontSize: 16 }}>
                  <span>Total Payable:</span>
                  <span style={{ color: '#1677ff' }}><CurrencyDisplay amount={selectedInvoice.totalAmount} strong /></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Paid Amount:</span>
                  <span style={{ color: '#52c41a' }}><CurrencyDisplay amount={selectedInvoice.paidAmount} /></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 600, color: selectedInvoice.balanceDue > 0 ? '#ff4d4f' : '#52c41a' }}>
                  <span>Balance Due:</span>
                  <span><CurrencyDisplay amount={selectedInvoice.balanceDue} strong /></span>
                </div>
              </Col>
            </Row>

            {selectedInvoice.notes && (
              <div style={{ marginTop: 16, padding: 10, background: '#fafafa', borderRadius: 6, fontSize: 12 }}>
                <strong>Remittance Instructions:</strong>
                <div>{selectedInvoice.notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageContainer>
  )
}

export default TransactionsPage
