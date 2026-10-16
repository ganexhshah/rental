import React, { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Segmented,
  Button,
  App,
  Tag,
  Checkbox,
  Collapse,
} from 'antd'
import {
  CheckCircleOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  HomeOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '@/features/customers/api'
import { FileUploader, uploadFileOnSave } from '@/components/forms/FileUploader'
import type { Customer, CustomerDocType, CustomerDocument } from '@/types/customer'
import type { UploadFile } from 'antd'

interface InstantCustomerKYCModalProps {
  open: boolean
  onClose: () => void
  onCustomerCreated: (customer: Customer) => void
}

const DOC_OPTIONS = [
  { label: 'Driving License', value: 'driving_licence' },
  { label: 'Citizenship', value: 'citizenship' },
  { label: 'Passport', value: 'passport' },
  { label: 'National ID (NIN)', value: 'national_id' },
  { label: 'Other Document', value: 'other' },
]

const LICENSE_CATEGORIES = [
  { label: 'Category A — Motorcycle / Scooter', value: 'A' },
  { label: 'Category B — Car / Jeep / Van', value: 'B' },
  { label: 'Category K — Scooter Only', value: 'K' },
  { label: 'Category C — Heavy Vehicle / Bus', value: 'C' },
  { label: 'International Driving Permit (IDP)', value: 'IDP' },
]

const QUICK_ADDRESS_PRESETS = [
  'Thamel, Kathmandu',
  'Lakeside, Pokhara',
  'Lalitpur / Patan',
  'Jhamsikhel, Lalitpur',
  'Boudha, Kathmandu',
  'Lazimpat, Kathmandu',
]

export const InstantCustomerKYCModal: React.FC<InstantCustomerKYCModalProps> = ({
  open,
  onClose,
  onCustomerCreated,
}) => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const [originType, setOriginType] = useState<'national' | 'international'>('national')
  const [docType, setDocType] = useState<CustomerDocType>('driving_licence')
  const [paperKycChecked, setPaperKycChecked] = useState<boolean>(true)
  const [docFiles, setDocFiles] = useState<UploadFile[]>([])

  const handleOriginChange = (type: 'national' | 'international') => {
    setOriginType(type)
    if (type === 'international') {
      setDocType('passport')
      form.setFieldsValue({
        nationality: 'Foreign Tourist',
        country: 'International',
        currentAddress: 'Thamel, Kathmandu',
      })
    } else {
      setDocType('driving_licence')
      form.setFieldsValue({
        nationality: 'Nepali',
        country: 'Nepal',
        currentAddress: 'Kathmandu, Nepal',
      })
    }
  }

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const customerId = `cust-${Date.now()}`
      const kycDocs: CustomerDocument[] = []

      if (docFiles.length > 0 && docFiles[0]) {
        try {
          const uploadedUrl = await uploadFileOnSave(docFiles[0], `customers/${customerId}/kyc`)
          if (uploadedUrl) {
            kycDocs.push({
              id: `doc-${Date.now()}`,
              customerId,
              customerName: values.fullName,
              docType,
              name: docType === 'driving_licence' ? 'Driving License' : docType === 'passport' ? 'Passport' : 'ID Document',
              documentNumber: values.documentNumber || '',
              fileUrl: uploadedUrl,
              status: 'valid',
              verificationStatus: 'verified',
              createdAt: new Date().toISOString(),
            })
          }
        } catch (e) {
          console.warn('Optional doc upload error:', e)
        }
      }

      const docNumber = values.documentNumber?.trim() || ''

      const newCustomerData: any = {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        secondaryPhone: values.secondaryPhone?.trim() || '',
        email: values.email.trim(),
        customerType: 'individual',
        originType,
        isInternational: originType === 'international',
        nationality: values.nationality || (originType === 'international' ? 'Foreign Tourist' : 'Nepali'),
        country: values.country || (originType === 'international' ? 'International' : 'Nepal'),
        currentAddress: values.currentAddress?.trim() || (originType === 'international' ? 'Thamel, Kathmandu' : 'Kathmandu, Nepal'),
        permanentAddress: values.permanentAddress?.trim() || values.currentAddress?.trim() || 'On file',
        address: values.currentAddress?.trim() || 'Kathmandu, Nepal',
        province: 'Bagmati Province',
        districtCity: 'Kathmandu',

        licenseNumber: docType === 'driving_licence' ? docNumber : values.licenseNumber || docNumber,
        licenseCategory: values.licenseCategory || 'A',
        citizenshipNumber: docType === 'citizenship' ? docNumber : values.citizenshipNumber || '',
        passportNumber: docType === 'passport' ? docNumber : values.passportNumber || '',
        nationalIdNumber: docType === 'national_id' ? docNumber : values.nationalIdNumber || '',

        verificationStatus: 'verified',
        status: 'active',
        rentalEligibilityStatus: 'eligible',
        paperKycCollected: paperKycChecked,
        notes: paperKycChecked
          ? `Paper KYC verified at counter. ${values.notes || ''}`.trim()
          : values.notes || '',

        emergencyContactName: values.emergencyContactName?.trim() || '',
        emergencyContactPhone: values.emergencyContactPhone?.trim() || '',
        emergencyContactRelationship: values.emergencyContactRelationship?.trim() || '',

        kycDocuments: kycDocs,
      }

      const created = await customersApi.createCustomer(newCustomerData)
      return created
    },
    onSuccess: (createdCustomer) => {
      message.success(`Customer ${createdCustomer.fullName} registered`)
      queryClient.setQueryData<Customer[]>(['customers-for-booking-creation'], (old = []) => {
        const exists = old.some((c) => c.id === createdCustomer.id)
        return exists ? old.map((c) => (c.id === createdCustomer.id ? createdCustomer : c)) : [createdCustomer, ...old]
      })
      queryClient.setQueryData<Customer[]>(['customers-for-new-booking'], (old = []) => {
        const exists = old.some((c) => c.id === createdCustomer.id)
        return exists ? old.map((c) => (c.id === createdCustomer.id ? createdCustomer : c)) : [createdCustomer, ...old]
      })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customers-for-booking-creation'] })
      queryClient.invalidateQueries({ queryKey: ['customers-for-new-booking'] })
      queryClient.invalidateQueries({ queryKey: ['customers-verification'] })
      onCustomerCreated(createdCustomer)
      onClose()
      form.resetFields()
      setDocFiles([])
    },
    onError: (err: any) => {
      message.error(err?.message || 'Failed to register customer')
    },
  })

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={620}
      destroyOnClose
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Customer Registration</span>
          <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 500 }}>
            Verified
          </Tag>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          nationality: 'Nepali',
          country: 'Nepal',
          currentAddress: 'Kathmandu, Nepal',
          licenseCategory: 'A',
        }}
        onFinish={(values) => createMutation.mutate(values)}
        style={{ marginTop: 12 }}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <Segmented
            value={originType}
            onChange={(val) => handleOriginChange(val as 'national' | 'international')}
            options={[
              { label: 'Nepali National', value: 'national' },
              { label: 'International Tourist', value: 'international' },
            ]}
          />
        </div>

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Please enter customer name' }]}
            >
              <Input
                size="large"
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Full Legal Name"
                autoFocus
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item
              name="phone"
              label="Phone Number"
              rules={[{ required: true, message: 'Please enter phone number' }]}
            >
              <Input
                size="large"
                prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Mobile Number"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="email"
          label="Email Address"
          rules={[
            { required: true, message: 'Please enter email address' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
        >
          <Input
            size="large"
            prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
            placeholder="customer@example.com"
          />
        </Form.Item>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '12px 14px',
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IdcardOutlined style={{ color: '#0284c7' }} />
            Identity Document
          </div>

          <Row gutter={12}>
            <Col xs={24} sm={10}>
              <Form.Item label="Type" style={{ marginBottom: 8 }}>
                <Select
                  value={docType}
                  onChange={(val) => setDocType(val)}
                  options={DOC_OPTIONS}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={14}>
              <Form.Item
                name="documentNumber"
                label="Number / Reference"
                style={{ marginBottom: 8 }}
              >
                <Input placeholder="ID / License Number" />
              </Form.Item>
            </Col>
          </Row>

          {docType === 'driving_licence' && (
            <Form.Item name="licenseCategory" label="Category" style={{ marginBottom: 4 }}>
              <Select options={LICENSE_CATEGORIES} />
            </Form.Item>
          )}
        </div>

        <Form.Item
          name="currentAddress"
          label="Stay Location / Address"
          style={{ marginBottom: 8 }}
        >
          <Input
            prefix={<HomeOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Address / Hotel"
          />
        </Form.Item>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {QUICK_ADDRESS_PRESETS.map((addr) => (
            <Tag
              key={addr}
              style={{ cursor: 'pointer', borderRadius: 4, background: '#f8fafc', border: '1px solid #e2e8f0' }}
              onClick={() => form.setFieldsValue({ currentAddress: addr })}
            >
              {addr}
            </Tag>
          ))}
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 14,
          }}
        >
          <Checkbox
            checked={paperKycChecked}
            onChange={(e) => setPaperKycChecked(e.target.checked)}
            style={{ fontWeight: 500, color: '#334155' }}
          >
            Physical paper photocopy collected at counter
          </Checkbox>
        </div>

        <Collapse
          ghost
          items={[
            {
              key: 'optional',
              label: <span style={{ fontSize: 12.5, color: '#64748b' }}>Additional Information (Optional)</span>,
              children: (
                <div style={{ paddingTop: 4 }}>
                  <Form.Item name="permanentAddress" label="Permanent Address">
                    <Input placeholder="Home address" />
                  </Form.Item>

                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="emergencyContactName" label="Emergency Contact">
                        <Input placeholder="Name" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="emergencyContactPhone" label="Emergency Phone">
                        <Input placeholder="Phone" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="Document Photo Attachment (Optional)">
                    <FileUploader
                      fileList={docFiles}
                      onChange={setDocFiles}
                      multiple={false}
                      accept="image/*,.pdf"
                      title="Upload ID Scan"
                    />
                  </Form.Item>

                  <Form.Item name="notes" label="Notes">
                    <Input.TextArea rows={2} placeholder="Additional notes or folder reference" />
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={createMutation.isPending}
            style={{ fontWeight: 600, backgroundColor: '#0f172a' }}
          >
            Save Customer
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

export default InstantCustomerKYCModal