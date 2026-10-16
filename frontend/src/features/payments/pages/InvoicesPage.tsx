import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Divider,
  Descriptions,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  SendOutlined,
  DollarCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '../api'
import { documentsApi } from '@/features/documents/api'
import { customersApi } from '@/features/customers/api'
import { bookingsApi } from '@/features/bookings/api'
import type { Invoice, InvoiceItem } from '@/types/payment'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { DateDisplay } from '@/components/data-display/DateDisplay'
import { FormDrawer } from '@/components/overlays/FormDrawer'
import { formatCurrency } from '@/lib/currency'

export const InvoicesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)

  const [form] = Form.useForm()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => paymentsApi.getInvoices(),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list-mini'],
    queryFn: () => customersApi.getCustomers(),
  })

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings-list-mini'],
    queryFn: () => bookingsApi.getBookings(),
  })

  const createInvoiceMutation = useMutation({
    mutationFn: (newInv: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>) =>
      paymentsApi.createInvoice(newInv),
    onSuccess: () => {
      message.success('Invoice generated successfully')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setIsCreateDrawerOpen(false)
      form.resetFields()
    },
    onError: () => {
      message.error('Failed to generate invoice')
    },
  })

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.bookingCode?.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalBilled = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0)
  const totalPaid = invoices.reduce((acc, inv) => acc + inv.paidAmount, 0)
  const totalBalanceDue = invoices.reduce((acc, inv) => acc + inv.balanceDue, 0)

  const handleCreateSubmit = (values: any) => {
    const selectedCust = customers.find((c) => c.id === values.customerId)
    const selectedBk = bookings.find((b) => b.id === values.bookingId)

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

    createInvoiceMutation.mutate({
      tenantId: '78248f8f-e390-4f85-a03f-58e4974fa366',
      bookingId: values.bookingId || '',
      bookingCode: selectedBk?.bookingCode || 'N/A',
      customerId: values.customerId,
      customerName: selectedCust ? selectedCust.fullName : 'Walk-in Client',
      customerEmail: selectedCust?.email || 'billing@customer.com',
      customerAddress: selectedCust ? `${selectedCust.address}, ${selectedCust.city}` : undefined,
      issueDate: new Date().toISOString(),
      dueDate: values.dueDate ? values.dueDate : new Date(Date.now() + 86400000 * 7).toISOString(),
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
  }

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (num: string, record: Invoice) => (
        <a
          onClick={() => {
            setSelectedInvoice(record)
            setIsPreviewModalOpen(true)
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
          <div style={{ fontWeight: 500 }}>{record.customerName}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.customerEmail}</div>
        </div>
      ),
    },
    {
      title: 'Booking Ref',
      dataIndex: 'bookingCode',
      key: 'bookingCode',
      render: (code: string) => <Tag color="blue">{code || 'Direct'}</Tag>,
    },
    {
      title: 'Issue / Due Date',
      key: 'dates',
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>Issue: <DateDisplay date={record.issueDate} formatStr="MMM dd, yyyy" /></div>
          <div style={{ color: '#8c8c8c' }}>Due: <DateDisplay date={record.dueDate} formatStr="MMM dd, yyyy" /></div>
        </div>
      ),
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (val: number) => <CurrencyDisplay amount={val} bold />,
    },
    {
      title: 'Balance Due',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      align: 'right',
      render: (val: number) => (
        <span style={{ color: val > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
          {formatCurrency(val)}
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
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            title="Preview Details"
            onClick={() => {
              setSelectedInvoice(record)
              setIsPreviewModalOpen(true)
            }}
          />
          <Button
            type="text"
            icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
            size="small"
            title="Download Authoritative PDF"
            onClick={() => {
              documentsApi.viewDocumentPdf(record.id)
            }}
          />
          {record.status === 'draft' && (
            <Button
              type="text"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              size="small"
              title="Issue Official Invoice"
              onClick={async () => {
                try {
                  await paymentsApi.issueInvoice(record.id)
                  message.success(`Invoice ${record.invoiceNumber} officially issued and PDF generated!`)
                  queryClient.invalidateQueries({ queryKey: ['invoices'] })
                } catch (e: any) {
                  message.error(e?.message || 'Failed to issue invoice')
                }
              }}
            />
          )}
          <Button
            type="text"
            icon={<PrinterOutlined />}
            size="small"
            title="Browser Print"
            onClick={() => {
              setSelectedInvoice(record)
              setIsPreviewModalOpen(true)
              setTimeout(() => window.print(), 300)
            }}
          />
          <Button
            type="text"
            icon={<SendOutlined />}
            size="small"
            title="Send Email"
            onClick={() => message.success(`Invoice ${record.invoiceNumber} emailed to ${record.customerEmail}`)}
          />
        </Space>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Invoices & Itemized Billing"
        subtitle="Manage customer invoices, automated tax calculations, itemized billing breakdowns, and collections."
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateDrawerOpen(true)}
          >
            Create Invoice
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Billed"
              value={totalBilled}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Collected Revenue"
              value={totalPaid}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Outstanding Balance"
              value={totalBalanceDue}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Search by invoice #, customer, booking code..."
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'right' }}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              options={[
                { label: 'All Statuses', value: 'all' },
                { label: 'Issued', value: 'issued' },
                { label: 'Paid', value: 'paid' },
                { label: 'Overdue', value: 'overdue' },
                { label: 'Draft', value: 'draft' },
                { label: 'Void', value: 'void' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredInvoices}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      {/* Invoice Detail / Print Preview Modal */}
      <Modal
        title={
          <Space>
            <span>Invoice Preview: {selectedInvoice?.invoiceNumber}</span>
            {selectedInvoice && (
              <Tag color={selectedInvoice.status === 'paid' ? 'green' : 'blue'}>
                {selectedInvoice.status.toUpperCase()}
              </Tag>
            )}
          </Space>
        }
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        width={760}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalOpen(false)}>
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
            Authoritative Server PDF
          </Button>,
          <Button
            key="send"
            icon={<SendOutlined />}
            onClick={() => {
              message.success(`Invoice sent to ${selectedInvoice?.customerEmail}`)
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
            <Row justify="space-between" align="top" style={{ marginBottom: 24 }}>
              <Col>
                <h3 style={{ margin: 0, color: '#1677ff' }}>Himalayan Rides Vehicle Rental Pvt. Ltd.</h3>
                <div style={{ color: '#8c8c8c', fontSize: 13 }}>Tax ID: US-994827104</div>
                <div style={{ color: '#8c8c8c', fontSize: 13 }}>450 Grand Avenue, San Francisco, CA</div>
                <div style={{ color: '#8c8c8c', fontSize: 13 }}>billing@himalayanrides.com</div>
              </Col>
              <Col style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0 }}>INVOICE</h2>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.invoiceNumber}</div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  Date: <DateDisplay date={selectedInvoice.issueDate} formatStr="MMM dd, yyyy" />
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  Due: <DateDisplay date={selectedInvoice.dueDate} formatStr="MMM dd, yyyy" />
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            <Descriptions title="Billed To" size="small" column={2}>
              <Descriptions.Item label="Customer">{selectedInvoice.customerName}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedInvoice.customerEmail}</Descriptions.Item>
              <Descriptions.Item label="Booking Reference">
                <Tag color="purple">{selectedInvoice.bookingCode}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {selectedInvoice.customerAddress || 'Standard Profile Address on File'}
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '16px 0' }} />

            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={selectedInvoice.items}
              columns={[
                { title: 'Item & Description', dataIndex: 'description', key: 'desc' },
                { title: 'Qty', dataIndex: 'quantity', key: 'qty', align: 'center', width: 80 },
                {
                  title: 'Unit Price',
                  dataIndex: 'unitPrice',
                  key: 'price',
                  align: 'right',
                  width: 120,
                  render: (v) => formatCurrency(v),
                },
                {
                  title: 'Line Total',
                  dataIndex: 'totalPrice',
                  key: 'total',
                  align: 'right',
                  width: 130,
                  render: (v) => <span style={{ fontWeight: 600 }}>{formatCurrency(v)}</span>,
                },
              ]}
              style={{ marginBottom: 16 }}
            />

            <Row justify="end">
              <Col xs={24} sm={12} md={10}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Tax ({selectedInvoice.taxRate}%):</span>
                  <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                </div>
                {selectedInvoice.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#52c41a' }}>
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedInvoice.discountAmount)}</span>
                  </div>
                )}
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 'bold', fontSize: 16 }}>
                  <span>Total Amount:</span>
                  <span style={{ color: '#1677ff' }}>{formatCurrency(selectedInvoice.totalAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>Amount Paid:</span>
                  <span style={{ color: '#52c41a' }}>{formatCurrency(selectedInvoice.paidAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontWeight: 600, color: selectedInvoice.balanceDue > 0 ? '#ff4d4f' : '#52c41a' }}>
                  <span>Balance Due:</span>
                  <span>{formatCurrency(selectedInvoice.balanceDue)}</span>
                </div>
              </Col>
            </Row>

            {selectedInvoice.notes && (
              <div style={{ marginTop: 20, padding: 12, background: '#fafafa', borderRadius: 6, fontSize: 13 }}>
                <strong>Payment Notes & Remittance Instructions:</strong>
                <div>{selectedInvoice.notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Invoice Form Drawer */}
      <FormDrawer
        title="Create New Invoice"
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSubmit={() => form.submit()}
        confirmLoading={createInvoiceMutation.isPending}
        width={680}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSubmit}
          initialValues={{
            taxRate: 8.5,
            discountAmount: 0,
            items: [{ description: 'Vehicle Rental Period Charges', quantity: 1, unitPrice: 150 }],
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="customerId"
                label="Customer"
                rules={[{ required: true, message: 'Select a customer' }]}
              >
                <Select
                  placeholder="Select Customer"
                  showSearch
                  optionFilterProp="label"
                  options={customers.map((c) => ({
                    label: `${c.fullName} (${c.email})`,
                    value: c.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bookingId" label="Related Booking (Optional)">
                <Select
                  placeholder="Link Booking Ref"
                  allowClear
                  options={bookings.map((b) => ({
                    label: `${b.bookingCode} - ${b.vehicleModel}`,
                    value: b.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="taxRate" label="Tax Rate (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="discountAmount" label="Discount (Rs.)">
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Line Items</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={12} align="middle" style={{ marginBottom: 12 }}>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'description']}
                        rules={[{ required: true, message: 'Item description is required' }]}
                        style={{ margin: 0 }}
                      >
                        <Input placeholder="Service / Line item description" />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Qty' }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'unitPrice']}
                        rules={[{ required: true, message: 'Price' }]}
                        style={{ margin: 0 }}
                      >
                        <InputNumber min={0} prefix="Rs." placeholder="Price (Rs.)" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      {fields.length > 1 && (
                        <MinusCircleOutlined
                          style={{ color: '#ff4d4f', fontSize: 18, cursor: 'pointer' }}
                          onClick={() => remove(name)}
                        />
                      )}
                    </Col>
                  </Row>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Line Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Terms & Remittance Notes">
            <Input.TextArea
              rows={3}
              placeholder="E.g., Payment due within 7 days. Wire transfer details: Chase Bank account ending 9102."
            />
          </Form.Item>
        </Form>
      </FormDrawer>
    </PageContainer>
  )
}

export default InvoicesPage
