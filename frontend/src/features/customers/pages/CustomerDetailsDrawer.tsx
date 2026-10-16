import React, { useState } from 'react'
import {
  Descriptions,
  Tabs,
  Tag,
  Avatar,
  Table,
  Button,
  Space,
  Modal,
  Input,
  message,
  Card,
  Row,
  Col,
  Badge,
  Form,
  Select,
  DatePicker,
  Popconfirm,
  Tooltip,
  Typography,
} from 'antd'

const { Text } = Typography
import {
  UserOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  DownloadOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  PhoneOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Customer, CustomerDocument, CustomerDriver, CreateCustomerDocumentInput, CreateDriverInput } from '@/types/customer'
import { DetailDrawer } from '@/components/overlays/DetailDrawer'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { FileUploader } from '@/components/forms/FileUploader'
import { customersApi } from '../api'
import { formatDate } from '@/lib/formatting/date'

const { TextArea } = Input

interface CustomerDetailsDrawerProps {
  customer: Customer | null
  open: boolean
  onClose: () => void
}

export const CustomerDetailsDrawer: React.FC<CustomerDetailsDrawerProps> = ({
  customer,
  open,
  onClose,
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')

  // Modals state
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false)
  const [blacklistReason, setBlacklistReason] = useState('')
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<'verified' | 'rejected'>('verified')
  const [verifyNotes, setVerifyNotes] = useState('')
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false)
  const [addDriverModalOpen, setAddDriverModalOpen] = useState(false)

  const [docForm] = Form.useForm()
  const [driverForm] = Form.useForm()
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])

  // Live customer rentals/bookings
  const { data: customerRentals = [] } = useQuery({
    queryKey: ['customer-rentals', customer?.id],
    queryFn: () => (customer ? customersApi.getCustomerBookings(customer.id) : []),
    enabled: Boolean(customer),
  })

  // Live customer documents
  const { data: customerDocs = [], refetch: refetchDocs } = useQuery({
    queryKey: ['customer-docs', customer?.id],
    queryFn: () => (customer ? customersApi.getCustomerDocuments(customer.id) : []),
    enabled: Boolean(customer),
  })

  // Live customer drivers
  const { data: customerDrivers = [], refetch: refetchDrivers } = useQuery({
    queryKey: ['customer-drivers-list', customer?.id],
    queryFn: () => (customer ? customersApi.getCustomerDrivers(customer.id) : []),
    enabled: Boolean(customer),
  })

  // Verification mutation
  const verifyMutation = useMutation({
    mutationFn: ({ status, notes }: { status: 'verified' | 'rejected'; notes?: string }) =>
      customersApi.verifyCustomer(customer!.id, status, notes),
    onSuccess: (updated) => {
      message.success(`Customer KYC status updated to: ${updated.verificationStatus}`)
      setVerifyModalOpen(false)
      setVerifyNotes('')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-summary'] })
    },
    onError: () => message.error('Failed to update KYC status.'),
  })

  // Blacklist mutation
  const blacklistMutation = useMutation({
    mutationFn: ({ isBlacklisted, reason }: { isBlacklisted: boolean; reason?: string }) =>
      customersApi.toggleBlacklist(customer!.id, isBlacklisted, reason),
    onSuccess: (updated) => {
      message.success(
        updated.isBlacklisted
          ? 'Customer added to blacklist restriction.'
          : 'Customer removed from blacklist.'
      )
      setBlacklistModalOpen(false)
      setBlacklistReason('')
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-summary'] })
    },
    onError: () => message.error('Failed to update blacklist status.'),
  })

  // Upload document mutation
  const uploadDocMutation = useMutation({
    mutationFn: (input: CreateCustomerDocumentInput) => customersApi.createCustomerDocument(input),
    onSuccess: () => {
      message.success('Document uploaded and attached to customer.')
      refetchDocs()
      queryClient.invalidateQueries({ queryKey: ['customer-documents'] })
      queryClient.invalidateQueries({ queryKey: ['customer-documents-summary'] })
      setUploadDocModalOpen(false)
      docForm.resetFields()
      setUploadedFiles([])
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message || 'Failed to upload document'),
  })

  // Add driver mutation
  const addDriverMutation = useMutation({
    mutationFn: (input: CreateDriverInput) => customersApi.createCustomerDriver(input),
    onSuccess: () => {
      message.success('Authorized driver linked to customer account.')
      refetchDrivers()
      queryClient.invalidateQueries({ queryKey: ['customer-drivers'] })
      setAddDriverModalOpen(false)
      driverForm.resetFields()
    },
    onError: (err: any) => message.error(err?.response?.data?.error?.message || 'Failed to add driver'),
  })

  // Delete driver mutation
  const deleteDriverMutation = useMutation({
    mutationFn: (driverId: string) => customersApi.deleteCustomerDriver(customer!.id, driverId),
    onSuccess: () => {
      message.success('Driver removed.')
      refetchDrivers()
      queryClient.invalidateQueries({ queryKey: ['customer-drivers'] })
    },
  })

  if (!customer) return null

  const items = [
    {
      key: 'overview',
      label: 'Overview & Profile',
      children: (
        <div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <Avatar size={64} src={customer.profilePhoto} icon={<UserOutlined />} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {customer.fullName}
                <Tag color={customer.customerType === 'business' ? 'purple' : 'blue'} style={{ marginLeft: 8 }}>
                  {customer.customerType?.toUpperCase()}
                </Tag>
              </div>
              <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, marginTop: 2 }}>
                {customer.email} • {customer.phone}
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={customer.verificationStatus} />
                <Badge
                  status={customer.isBlacklisted ? 'error' : 'success'}
                  text={customer.isBlacklisted ? 'Blacklisted' : 'Active Account'}
                />
              </div>
            </div>
          </div>

          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Customer Type">
              <Tag>{customer.customerType?.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Nationality">{customer.nationality || 'Nepalese'}</Descriptions.Item>
            <Descriptions.Item label="Date of Birth">{formatDate(customer.dateOfBirth)}</Descriptions.Item>
            <Descriptions.Item label="Gender">{customer.gender ? customer.gender.toUpperCase() : '-'}</Descriptions.Item>
            <Descriptions.Item label="Primary Phone">{customer.phone}</Descriptions.Item>
            <Descriptions.Item label="Secondary / WhatsApp">{customer.secondaryPhone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Province & City">
              {customer.province}, {customer.districtCity || customer.city}
            </Descriptions.Item>
            <Descriptions.Item label="Street Address" span={2}>
              {customer.address || '-'}
            </Descriptions.Item>
          </Descriptions>

          {/* Corporate info if applicable */}
          {customer.companyName && (
            <Card size="small" title="Corporate Details" style={{ marginBottom: 16, backgroundColor: '#f9f0ff' }}>
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="Company Legal Name">
                  <strong>{customer.companyName}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="PAN / VAT Number">
                  <strong>{customer.companyTaxId}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Billing Address" span={2}>
                  {customer.billingAddress || customer.address}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Driving Licence & Emergency */}
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Licence Number">
              <strong>{customer.licenseNumber || 'Not provided'}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Licence Category">
              Category {customer.licenseCategory || 'B'}
            </Descriptions.Item>
            <Descriptions.Item label="Licence Expiry">
              {formatDate(customer.licenseExpiry)}
            </Descriptions.Item>
            <Descriptions.Item label="Rental Eligibility">
              <Tag color={customer.rentalEligibilityStatus === 'eligible' ? 'success' : 'error'}>
                {customer.rentalEligibilityStatus?.toUpperCase() || 'ELIGIBLE'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Emergency Contact">
              {customer.emergencyContactName || '-'} ({customer.emergencyContactRelationship || 'N/A'})
            </Descriptions.Item>
            <Descriptions.Item label="Emergency Phone">
              {customer.emergencyContactPhone || '-'}
            </Descriptions.Item>
          </Descriptions>

          {/* Blacklist banner */}
          {customer.isBlacklisted && (
            <div
              style={{
                padding: 12,
                backgroundColor: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: 6,
                marginBottom: 16,
              }}
            >
              <div style={{ color: '#cf1322', fontWeight: 600 }}>Account Blacklisted</div>
              <div style={{ fontSize: 13, color: '#cf1322', marginTop: 4 }}>
                Reason: {customer.blacklistReason}
              </div>
              {customer.blacklistedBy && (
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                  Flagged by: {customer.blacklistedBy} on {formatDate(customer.blacklistedAt)}
                </div>
              )}
            </div>
          )}

          {customer.notes && (
            <div style={{ padding: 12, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 6, fontSize: 13 }}>
              <strong>Operational Staff Notes:</strong>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{customer.notes}</div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'documents',
      label: `Documents (${customerDocs.length})`,
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setUploadDocModalOpen(true)}
            >
              Upload Document
            </Button>
          </div>
          <Table
            dataSource={customerDocs}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Document Title',
                dataIndex: 'name',
                key: 'name',
                render: (t: any, r: CustomerDocument) => (
                  <div>
                    <Space size={6}>
                      <FileTextOutlined style={{ color: '#1677ff' }} />
                      <strong>{t}</strong>
                    </Space>
                    {r.documentNumber && (
                      <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                        No: {r.documentNumber}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                title: 'Classification',
                dataIndex: 'docType',
                key: 'type',
                render: (t: any) => <Tag color="blue">{t?.toUpperCase().replace('_', ' ')}</Tag>,
              },
              {
                title: 'Expiry',
                dataIndex: 'expiryDate',
                key: 'exp',
                render: (d: any) => formatDate(d),
              },
              {
                title: 'KYC Audit',
                dataIndex: 'verificationStatus',
                key: 'vst',
                render: (v: any) => (
                  <Tag color={v === 'verified' ? 'success' : v === 'rejected' ? 'error' : 'warning'}>
                    {(v || 'PENDING').toUpperCase()}
                  </Tag>
                ),
              },
              {
                title: 'File',
                key: 'file',
                render: (_: any, r: CustomerDocument) =>
                  r.fileUrl ? (
                    <Button
                      size="small"
                      type="link"
                      icon={<DownloadOutlined />}
                      onClick={() => window.open(r.fileUrl, '_blank')}
                    >
                      View
                    </Button>
                  ) : (
                    '-'
                  ),
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: 'drivers',
      label: `Drivers (${customerDrivers.length})`,
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setAddDriverModalOpen(true)}
            >
              Add Driver
            </Button>
          </div>
          <Table
            dataSource={customerDrivers}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Driver Name',
                dataIndex: 'fullName',
                key: 'name',
                render: (t, r) => (
                  <div>
                    <strong>{t}</strong>
                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{r.phone}</div>
                  </div>
                ),
              },
              {
                title: 'Relationship',
                dataIndex: 'relationship',
                key: 'rel',
                render: (r) => <Tag>{r?.replace('_', ' ')}</Tag>,
              },
              {
                title: 'Licence No.',
                dataIndex: 'licenseNumber',
                key: 'lic',
                render: (l, r) => (
                  <span>
                    {l} (Cat {r.licenseCategory})
                  </span>
                ),
              },
              {
                title: 'Expiry',
                dataIndex: 'licenseExpiryDate',
                key: 'exp',
                render: (d) => formatDate(d),
              },
              {
                title: 'Actions',
                key: 'act',
                render: (_, r) => (
                  <Popconfirm
                    title="Remove driver"
                    description={`Remove ${r.fullName}?`}
                    okText="Yes, Remove"
                    onConfirm={() => deleteDriverMutation.mutate(r.id)}
                  >
                    <Button size="small" danger>
                      Remove
                    </Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </div>
      ),
    },
    {
      key: 'rentals',
      label: `Rental History (${customerRentals.length})`,
      children: (
        <Table
          dataSource={customerRentals}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Booking Code',
              dataIndex: 'bookingCode',
              key: 'code',
              render: (t) => <strong>{t}</strong>,
            },
            { title: 'Vehicle', dataIndex: 'vehicleModel', key: 'veh' },
            {
              title: 'Rental Period',
              key: 'period',
              render: (_, r) => `${formatDate(r.startDate)} - ${formatDate(r.endDate)}`,
            },
            {
              title: 'Amount',
              dataIndex: 'totalAmount',
              key: 'amt',
              render: (a) => <CurrencyDisplay amount={a} />,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'st',
              render: (s) => <StatusBadge status={s} />,
            },
          ]}
        />
      ),
    },
  ]

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      width={760}
      title={customer.fullName}
      subtitle={`Customer Code: ${customer.customerCode || '#' + customer.id.slice(0, 8)} • ${customer.email}`}
      extraActions={
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => {
              onClose()
              navigate(`/customers/view/${customer.id}`)
            }}
          >
            Full Profile Page
          </Button>

          <Button
            icon={<AuditOutlined />}
            onClick={() => {
              setVerifyStatus(customer.verificationStatus === 'verified' ? 'verified' : 'verified')
              setVerifyModalOpen(true)
            }}
          >
            Audit KYC
          </Button>

          {!customer.isBlacklisted ? (
            <Button danger icon={<StopOutlined />} onClick={() => setBlacklistModalOpen(true)}>
              Blacklist
            </Button>
          ) : (
            <Button
              onClick={() => blacklistMutation.mutate({ isBlacklisted: false })}
              loading={blacklistMutation.isPending}
            >
              Remove Blacklist
            </Button>
          )}
        </Space>
      }
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />

      {/* Blacklist Modal */}
      <Modal
        open={blacklistModalOpen}
        title="Blacklist Customer & Restrict Rentals"
        okText="Confirm Blacklist"
        okType="danger"
        onCancel={() => setBlacklistModalOpen(false)}
        confirmLoading={blacklistMutation.isPending}
        onOk={() =>
          blacklistMutation.mutate({
            isBlacklisted: true,
            reason: blacklistReason || 'Non-compliance with rental agreement',
          })
        }
      >
        <p>
          Blacklisting will immediately mark this customer ineligible for bookings across all
          channels and trigger high-risk alerts in the reservation desk.
        </p>
        <TextArea
          rows={3}
          placeholder="State formal reason for restriction (e.g. fraudulent card, vehicle abuse, overdue return)..."
          value={blacklistReason}
          onChange={(e) => setBlacklistReason(e.target.value)}
        />
      </Modal>

      {/* KYC Verification Modal */}
      <Modal
        open={verifyModalOpen}
        title="Customer Identity & KYC Verification"
        okText="Save Verification Decision"
        onCancel={() => setVerifyModalOpen(false)}
        confirmLoading={verifyMutation.isPending}
        onOk={() => verifyMutation.mutate({ status: verifyStatus, notes: verifyNotes })}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Select verification decision for {customer.fullName}:</Text>
          <div style={{ marginTop: 8 }}>
            <Space direction="horizontal">
              <Button
                type={verifyStatus === 'verified' ? 'primary' : 'default'}
                icon={<CheckCircleOutlined />}
                onClick={() => setVerifyStatus('verified')}
                style={verifyStatus === 'verified' ? { backgroundColor: '#52c41a' } : {}}
              >
                Approve & Mark Verified
              </Button>
              <Button
                danger={verifyStatus === 'rejected'}
                type={verifyStatus === 'rejected' ? 'primary' : 'default'}
                icon={<CloseCircleOutlined />}
                onClick={() => setVerifyStatus('rejected')}
              >
                Reject KYC
              </Button>
            </Space>
          </div>
        </div>

        <Form.Item label="Auditor Remarks / Audit Trail">
          <TextArea
            rows={3}
            placeholder="e.g. Identity verified via original Driving Licence and physical inspection..."
            value={verifyNotes}
            onChange={(e) => setVerifyNotes(e.target.value)}
          />
        </Form.Item>
      </Modal>

      {/* Quick Upload Customer Document Modal */}
      <Modal
        open={uploadDocModalOpen}
        title="Attach Document to Customer"
        onCancel={() => setUploadDocModalOpen(false)}
        onOk={() => docForm.submit()}
        confirmLoading={uploadDocMutation.isPending}
        okText="Upload & Attach"
        width={520}
      >
        <Form
          form={docForm}
          layout="vertical"
          requiredMark="optional"
          onFinish={(values) => {
            const fileUrl =
              uploadedFiles.length > 0 && uploadedFiles[0].url
                ? uploadedFiles[0].url
                : values.fileUrl ||
                  'https://pub-1ccd4de4be1c4425b05bfbbde47ef4e5.r2.dev/customer-documents/doc.pdf'
            uploadDocMutation.mutate({
              customerId: customer.id,
              docType: values.docType,
              name: values.name.trim(),
              documentNumber: values.documentNumber?.trim(),
              issuingAuthority: values.issuingAuthority?.trim(),
              fileUrl,
              fileName: uploadedFiles[0]?.name || values.name,
              fileSize: uploadedFiles[0]?.size || 102400,
              mimeType: uploadedFiles[0]?.type || 'application/pdf',
              expiryDate: values.expiryDate ? values.expiryDate.format('YYYY-MM-DD') : undefined,
              notes: values.notes?.trim(),
            })
          }}
          initialValues={{ docType: 'driving_licence' }}
        >
          <Form.Item name="docType" label="Classification" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'driving_licence', label: 'Driving Licence' },
                { value: 'citizenship', label: 'Citizenship' },
                { value: 'passport', label: 'Passport' },
                { value: 'business_registration', label: 'Business Registration' },
                { value: 'tax_pan_vat', label: 'PAN / VAT' },
                { value: 'address_proof', label: 'Address Proof' },
                { value: 'other', label: 'Other Document' },
              ]}
            />
          </Form.Item>

          <Form.Item name="name" label="Document Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Smart Driving Licence Card" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="documentNumber" label="Doc / ID Number">
                <Input placeholder="e.g. 01-06-00452319" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expiryDate" label="Expiry Date">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Upload File">
            <FileUploader
              fileList={uploadedFiles}
              onChange={setUploadedFiles}
              folder="customer-documents"
              title="Drag or click to upload"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Quick Add Driver Modal */}
      <Modal
        open={addDriverModalOpen}
        title="Add Authorized Driver"
        onCancel={() => setAddDriverModalOpen(false)}
        onOk={() => driverForm.submit()}
        confirmLoading={addDriverMutation.isPending}
        okText="Add Driver"
        width={500}
      >
        <Form
          form={driverForm}
          layout="vertical"
          requiredMark="optional"
          onFinish={(values) => {
            addDriverMutation.mutate({
              customerId: customer.id,
              fullName: values.fullName.trim(),
              phone: values.phone.trim(),
              email: values.email?.trim(),
              licenseNumber: values.licenseNumber.trim(),
              licenseCategory: values.licenseCategory || 'B',
              relationship: values.relationship || 'authorized_driver',
              notes: values.notes?.trim(),
            })
          }}
          initialValues={{ relationship: 'authorized_driver', licenseCategory: 'B' }}
        >
          <Form.Item name="fullName" label="Driver Full Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Saroj Karki" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                <Input placeholder="+977-9800000000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="licenseNumber" label="Licence Number" rules={[{ required: true }]}>
                <Input placeholder="e.g. 01-06-00123456" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="relationship" label="Relationship">
                <Select
                  options={[
                    { value: 'authorized_driver', label: 'Authorized Driver' },
                    { value: 'spouse', label: 'Spouse' },
                    { value: 'employee', label: 'Employee' },
                    { value: 'family', label: 'Family Member' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="licenseCategory" label="Category">
                <Select
                  options={[
                    { value: 'B', label: 'Cat B — Car/Van' },
                    { value: 'A', label: 'Cat A — Bike/Scooter' },
                    { value: 'A/B', label: 'Cat A & B' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </DetailDrawer>
  )
}
