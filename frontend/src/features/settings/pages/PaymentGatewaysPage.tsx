import React, { useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Switch,
  Button,
  Tag,
  Row,
  Col,
  Divider,
  App,
} from 'antd'
import {
  SaveOutlined,
  CheckCircleOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'

export const PaymentGatewaysPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings?.paymentGateways) {
      form.setFieldsValue(settings.paymentGateways)
    }
  }, [settings, form])

  const updateMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updatePaymentGateways(values),
    onSuccess: () => {
      message.success('Payment methods saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: () => {
      message.error('Failed to save payment methods')
    },
  })

  const handleSave = (values: any) => {
    updateMutation.mutate(values)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Payment Methods"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          {/* Stripe */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Stripe Card Payments</h3>
              <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                Cards, Apple Pay, Google Pay
              </div>
            </div>
            <Form.Item name="stripeEnabled" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} md={16}>
              <Form.Item name="stripePublishableKey" label="Publishable Key">
                <Input prefix={<KeyOutlined />} placeholder="pk_live_..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Status">
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Connected
                </Tag>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '20px 0' }} />

          {/* PayPal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>PayPal</h3>
              <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                Digital wallet payments
              </div>
            </div>
            <Form.Item name="paypalEnabled" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>

          <Divider style={{ margin: '20px 0' }} />

          {/* Bank Transfer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Bank Transfer</h3>
              <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                Direct bank wire instructions
              </div>
            </div>
            <Form.Item name="bankTransferEnabled" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>

          <Form.Item
            name="bankAccountDetails"
            label="Bank Account Details"
            style={{ marginTop: 16 }}
          >
            <Input.TextArea
              rows={3}
              placeholder="Bank: Nabil Bank&#10;Account Name: Rental Company&#10;Account Number: 0101017500123"
            />
          </Form.Item>

          <Divider style={{ margin: '20px 0' }} />

          {/* Cash */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Cash & Counter Payments</h3>
              <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                Cash and physical POS transactions
              </div>
            </div>
            <Form.Item name="cashEnabled" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>

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
    </PageContainer>
  )
}

export default PaymentGatewaysPage
