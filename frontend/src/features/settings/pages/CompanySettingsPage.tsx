import React, { useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Divider,
  App,
  Popconfirm,
} from 'antd'
import {
  BankOutlined,
  SaveOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  DeleteOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'

export const CompanySettingsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        name: settings.name,
        registrationNumber: settings.registrationNumber,
        taxId: settings.taxId,
        email: settings.email,
        phone: settings.phone,
        website: settings.website,
        headquartersAddress: settings.headquartersAddress,
        city: settings.city,
        country: settings.country,
        currency: settings.currency,
      })
    }
  }, [settings, form])

  const updateMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateCompanyInfo(values),
    onSuccess: () => {
      message.success('Company profile saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: () => {
      message.error('Failed to save company profile')
    },
  })

  const handleSave = (values: any) => {
    updateMutation.mutate(values)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Company"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          <Divider titlePlacement="left">Business Profile</Divider>

          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Form.Item
                name="name"
                label="Company Name"
                rules={[{ required: true, message: 'Company name is required' }]}
              >
                <Input prefix={<BankOutlined />} placeholder="Rental Company Pvt. Ltd." />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                name="registrationNumber"
                label="Registration Number"
                rules={[{ required: true }]}
              >
                <Input placeholder="REG-102938" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="taxId" label="Tax ID / PAN" rules={[{ required: true }]}>
                <Input placeholder="609823145" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'NPR - Nepalese Rupee (Rs.)', value: 'NPR' },
                    { label: 'USD - US Dollar ($)', value: 'USD' },
                    { label: 'EUR - Euro (€)', value: 'EUR' },
                    { label: 'GBP - British Pound (£)', value: 'GBP' },
                    { label: 'AUD - Australian Dollar ($)', value: 'AUD' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Contact</Divider>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input prefix={<MailOutlined />} placeholder="contact@rental.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                <Input prefix={<PhoneOutlined />} placeholder="+977-1-4200000" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="website" label="Website">
                <Input prefix={<GlobalOutlined />} placeholder="https://example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Location</Divider>

          <Form.Item name="headquartersAddress" label="Address" rules={[{ required: true }]}>
            <Input placeholder="Durbar Marg, Ward 1" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="city" label="City" rules={[{ required: true }]}>
                <Input placeholder="Kathmandu" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="country" label="Country" rules={[{ required: true }]}>
                <Input placeholder="Nepal" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '24px 0' }} />

          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            htmlType="submit"
            loading={updateMutation.isPending}
          >
            Save Changes
          </Button>
        </Form>
      </Card>

      <Card
        style={{ marginTop: 24, borderColor: '#ff4d4f' }}
        title={
          <span style={{ color: '#cf1322' }}>
            <WarningOutlined style={{ marginRight: 8 }} />
            Danger Zone
          </span>
        }
      >
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
          Wipe all local operational data (bookings, customers, vehicles, transactions, local cache) and reset the application to a blank state.
        </p>
        <Popconfirm
          title="Delete All Data?"
          description="Are you sure you want to delete all local data? This action cannot be undone."
          okText="Yes, Delete Everything"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            localStorage.clear()
            sessionStorage.clear()
            message.success('All local data cleared. Reloading...')
            setTimeout(() => {
              window.location.reload()
            }, 800)
          }}
        >
          <Button danger type="primary" icon={<DeleteOutlined />}>
            Delete All Data
          </Button>
        </Popconfirm>
      </Card>
    </PageContainer>
  )
}

export default CompanySettingsPage
