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
} from 'antd'
import {
  SaveOutlined,
  PictureOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'
import { useThemeStore, type FontPreset } from '@/store/useThemeStore'

export const BrandingSettingsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { fontPreset, setFontPreset, setPrimaryColor } = useThemeStore()
  const [form] = Form.useForm()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings?.branding) {
      form.setFieldsValue({
        ...settings.branding,
        fontPreset: fontPreset || 'modern',
      })
    } else {
      form.setFieldsValue({ fontPreset: fontPreset || 'modern' })
    }
  }, [settings, form, fontPreset])

  const updateMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateBranding(values),
    onSuccess: () => {
      message.success('Branding saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: () => {
      message.error('Failed to save branding')
    },
  })

  const handleSave = (values: any) => {
    if (values.fontPreset) {
      setFontPreset(values.fontPreset as FontPreset)
    }
    if (values.primaryColor) {
      setPrimaryColor(values.primaryColor)
    }
    updateMutation.mutate(values)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Branding"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          <Divider titlePlacement="left">Brand Identity</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="companyName" label="Brand Name" rules={[{ required: true }]}>
                <Input placeholder="Rental Brand" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="portalDomain" label="Custom Domain">
                <Input prefix={<LinkOutlined />} placeholder="rent.example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="logoUrl" label="Logo URL">
                <Input prefix={<PictureOutlined />} placeholder="https://example.com/logo.svg" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="faviconUrl" label="Favicon URL">
                <Input prefix={<PictureOutlined />} placeholder="/favicon.ico" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Theme & Typography</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item name="primaryColor" label="Primary Color">
                <Input placeholder="#1677ff" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="secondaryColor" label="Secondary Color">
                <Input placeholder="#722ed1" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="fontPreset" label="Typography Font">
                <Select
                  onChange={(val) => setFontPreset(val as FontPreset)}
                  options={[
                    { label: 'Plus Jakarta Sans + Outfit', value: 'modern' },
                    { label: 'Plus Jakarta Sans', value: 'jakarta' },
                    { label: 'Outfit', value: 'outfit' },
                    { label: 'Inter', value: 'inter' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Support & Legal</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="publicSupportEmail" label="Support Email" rules={[{ required: true }]}>
                <Input placeholder="support@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="publicSupportPhone" label="Support Phone" rules={[{ required: true }]}>
                <Input placeholder="+977-1-4200000" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="termsUrl" label="Terms of Service URL">
                <Input placeholder="https://example.com/terms" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="privacyPolicyUrl" label="Privacy Policy URL">
                <Input placeholder="https://example.com/privacy" />
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

export default BrandingSettingsPage
