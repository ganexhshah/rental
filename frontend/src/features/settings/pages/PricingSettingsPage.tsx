import React, { useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Row,
  Col,
  Divider,
  App,
} from 'antd'
import {
  SaveOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'

export const PricingSettingsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings?.pricing) {
      form.setFieldsValue(settings.pricing)
    }
  }, [settings, form])

  const updateMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updatePricing(values),
    onSuccess: () => {
      message.success('Pricing and tax rules saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: () => {
      message.error('Failed to save pricing rules')
    },
  })

  const handleSave = (values: any) => {
    updateMutation.mutate(values)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Pricing & Taxes"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          <Divider titlePlacement="left">Taxes</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="taxLabel" label="Tax Label" rules={[{ required: true }]}>
                <Input placeholder="VAT / Tax" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="taxPercentage" label="Tax Rate (%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={40} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Pricing Surcharges</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="weekendSurchargePercent"
                label="Weekend Surcharge (%)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="peakSeasonMultiplier"
                label="Peak Season Multiplier"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={3} step={0.05} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Late Returns & Penalties</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="lateReturnFeePerHour"
                label="Late Fee (Rs. / Hour)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Default Security Deposits</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="securityDepositCars"
                label="Deposit (Cars / SUVs)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="securityDepositBikes"
                label="Deposit (Bikes & Scooters)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
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
    </PageContainer>
  )
}

export default PricingSettingsPage
