import React, { useEffect, useState } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Row,
  Col,
  Divider,
  App,
} from 'antd'
import {
  SaveOutlined,
  KeyOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'

export const SecuritySettingsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [apiToken, setApiToken] = useState('apx_sec_live_9948210384729104')

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings?.security) {
      form.setFieldsValue({
        twoFactorRequired: settings.security.twoFactorRequired,
        sessionTimeoutMinutes: settings.security.sessionTimeoutMinutes,
        passwordMinLength: settings.security.passwordMinLength,
        ipAllowlist: settings.security.ipAllowlist?.join(', '),
      })
    }
  }, [settings, form])

  const updateMutation = useMutation({
    mutationFn: (values: any) =>
      settingsApi.updateSecurity({
        twoFactorRequired: values.twoFactorRequired,
        sessionTimeoutMinutes: values.sessionTimeoutMinutes,
        passwordMinLength: values.passwordMinLength,
        ipAllowlist: values.ipAllowlist
          ? values.ipAllowlist.split(',').map((s: string) => s.trim())
          : [],
      }),
    onSuccess: () => {
      message.success('Security settings saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: () => {
      message.error('Failed to save security settings')
    },
  })

  const handleSave = (values: any) => {
    updateMutation.mutate(values)
  }

  const handleRegenerateToken = () => {
    const newToken = `apx_sec_live_${Math.random().toString(36).substring(2)}${Date.now()}`
    setApiToken(newToken)
    message.success('New API access token generated')
  }

  return (
    <PageContainer>
      <PageHeader
        title="Security"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          <Divider titlePlacement="left">Authentication</Divider>

          <Form.Item name="twoFactorRequired" valuePropName="checked">
            <Switch />
            <span style={{ marginLeft: 8 }}>Require Two-Factor Authentication (2FA) for Staff</span>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="sessionTimeoutMinutes"
                label="Session Timeout (Minutes)"
                rules={[{ required: true }]}
              >
                <InputNumber min={5} max={480} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="passwordMinLength"
                label="Minimum Password Length"
                rules={[{ required: true }]}
              >
                <InputNumber min={8} max={32} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">IP Whitelist</Divider>

          <Form.Item
            name="ipAllowlist"
            label="Allowed IP Addresses (Comma-separated, leave blank for all)"
          >
            <Input.TextArea
              rows={2}
              placeholder="198.51.100.1, 203.0.113.50"
            />
          </Form.Item>

          <Divider titlePlacement="left">API Token</Divider>

          <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', padding: 16, borderRadius: 6, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 13 }}>System API Secret Key:</strong>
                <div style={{ fontFamily: 'monospace', fontSize: 13, marginTop: 4, color: '#1677ff' }}>
                  {apiToken}
                </div>
              </div>
              <Button icon={<KeyOutlined />} onClick={handleRegenerateToken}>
                Regenerate
              </Button>
            </div>
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

export default SecuritySettingsPage
