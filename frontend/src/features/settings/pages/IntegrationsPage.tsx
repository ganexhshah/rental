import React, { useEffect } from 'react'
import {
  Card,
  Form,
  Input,
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
  GlobalOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'

export const IntegrationsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings?.integrations) {
      form.setFieldsValue(settings.integrations)
    }
  }, [settings, form])

  const updateMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateIntegrations(values),
    onSuccess: () => {
      message.success('Integrations saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: () => {
      message.error('Failed to save integrations')
    },
  })

  const handleSave = (values: any) => {
    updateMutation.mutate(values)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Integrations"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          <Divider titlePlacement="left">GPS Telematics</Divider>

          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item name="gpsProvider" label="GPS Provider">
                <Select
                  options={[
                    { label: 'Teltonika', value: 'teltonika' },
                    { label: 'Geotab', value: 'geotab' },
                    { label: 'Traccar', value: 'traccar' },
                    { label: 'None', value: 'none' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={14}>
              <Form.Item name="gpsApiKey" label="API Key">
                <Input.Password placeholder="API Key" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">SMS & Messaging</Divider>

          <Row gutter={16}>
            <Col xs={24} md={10}>
              <Form.Item name="smsProvider" label="SMS Provider">
                <Select
                  options={[
                    { label: 'Twilio', value: 'twilio' },
                    { label: 'Infobip', value: 'infobip' },
                    { label: 'None', value: 'none' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={14}>
              <Form.Item name="smsApiKey" label="API Token">
                <Input.Password placeholder="API Token" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="whatsappEnabled" valuePropName="checked">
            <Switch />
            <span style={{ marginLeft: 8 }}>Enable WhatsApp Notifications</span>
          </Form.Item>

          <Divider titlePlacement="left">Maps</Divider>

          <Form.Item name="googleMapsApiKey" label="Google Maps API Key">
            <Input prefix={<GlobalOutlined />} placeholder="AIzaSy..." />
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

export default IntegrationsPage
