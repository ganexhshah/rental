import React, { useEffect } from 'react'
import {
  Card,
  Form,
  InputNumber,
  Select,
  Switch,
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

export const RentalRulesSettingsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings?.rentalRules) {
      form.setFieldsValue(settings.rentalRules)
    }
  }, [settings, form])

  const updateMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateRentalRules(values),
    onSuccess: () => {
      message.success('Rental rules saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: () => {
      message.error('Failed to save rental rules')
    },
  })

  const handleSave = (values: any) => {
    updateMutation.mutate(values)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Rental Rules"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          <Divider titlePlacement="left">Durations & Grace Buffer</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="minRentalHours"
                label="Min Rental Duration (Hours)"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={72} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="maxRentalDays"
                label="Max Single Lease (Days)"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="gracePeriodMinutes"
                label="Return Grace Buffer (Mins)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={180} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Age Requirements</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="minDriverAgeCar"
                label="Min Age (Cars & SUVs)"
                rules={[{ required: true }]}
              >
                <InputNumber min={18} max={35} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="minDriverAgeTwoWheeler"
                label="Min Age (Bikes & Scooters)"
                rules={[{ required: true }]}
              >
                <InputNumber min={16} max={30} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Fuel & Cancellation</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="fuelPolicy" label="Fuel Policy" rules={[{ required: true }]}>
                <Select
                  options={[
                    { label: 'Same-to-Same (Matched level)', value: 'same_to_same' },
                    { label: 'Full-to-Full (Always 100%)', value: 'full_to_full' },
                    { label: 'Pay per Liter', value: 'pay_per_liter' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="cancellationFreeHoursBefore"
                label="Free Cancellation Notice (Hours)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={168} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Verification</Divider>

          <Form.Item name="allowInstantBooking" valuePropName="checked">
            <Switch />
            <span style={{ marginLeft: 8 }}>Instant Booking Approval</span>
          </Form.Item>

          <Form.Item name="requireDriverLicenseUpload" valuePropName="checked">
            <Switch />
            <span style={{ marginLeft: 8 }}>Require Driver License / Document Verification</span>
          </Form.Item>

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

export default RentalRulesSettingsPage
