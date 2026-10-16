import React, { useState, useEffect, useRef } from 'react'
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
  Spin,
  Flex,
  theme,
} from 'antd'
import {
  SaveOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  LoadingOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { onboardingApi } from '@/features/onboarding/api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'
import { useThemeStore, type FontPreset } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'

export const BrandingSettingsPage: React.FC = () => {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { fontPreset, setFontPreset, setPrimaryColor } = useThemeStore()
  const { tenant, updateTenant } = useAuthStore()
  const [form] = Form.useForm()

  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [dragOverLogo, setDragOverLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings) {
      const activeLogo = settings.branding?.logoUrl || settings.logoUrl || tenant?.logoUrl || null
      setLogoUrl(activeLogo)
      form.setFieldsValue({
        companyName: settings.branding?.companyName || settings.name || tenant?.name || '',
        primaryColor: settings.branding?.primaryColor || '#1677ff',
        secondaryColor: settings.branding?.secondaryColor || '#722ed1',
        fontPreset: settings.branding?.fontPreset || fontPreset || 'modern',
        publicSupportEmail: settings.branding?.publicSupportEmail || settings.email || '',
        publicSupportPhone: settings.branding?.publicSupportPhone || settings.phone || '',
      })
    }
  }, [settings, tenant, form, fontPreset])

  const handleLogoFileSelect = async (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      message.error('Please upload a valid image file (PNG, JPG, SVG, WebP, or GIF)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      message.error('Logo file size must be less than 10MB')
      return
    }

    setIsUploadingLogo(true)
    try {
      const res = await onboardingApi.uploadLogo(file)
      if (res?.url) {
        setLogoUrl(res.url)
        updateTenant({ logoUrl: res.url })
        message.success('Company logo uploaded successfully!')
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to upload logo.')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl(null)
    updateTenant({ logoUrl: undefined })
    message.info('Logo removed')
  }

  const updateMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateBranding(values),
    onSuccess: () => {
      message.success('Branding saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
      queryClient.invalidateQueries({ queryKey: ['current-tenant'] })
    },
    onError: () => {
      message.error('Failed to save branding')
    },
  })

  const handleSave = (values: any) => {
    const payload = {
      ...values,
      logoUrl: logoUrl || '',
    }
    if (values.fontPreset) {
      setFontPreset(values.fontPreset as FontPreset)
    }
    if (values.primaryColor) {
      setPrimaryColor(values.primaryColor)
    }
    updateTenant({
      name: values.companyName || tenant.name,
      logoUrl: logoUrl || undefined,
    })
    updateMutation.mutate(payload)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Branding"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          <Divider titlePlacement="left">Brand Identity</Divider>

          {/* Interactive Logo Uploader */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 24,
              padding: '16px 20px',
              background: '#fafafa',
              borderRadius: 12,
              border: '1px solid #f0f0f0',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleLogoFileSelect(e.target.files[0])
                }
              }}
            />

            {/* Logo Preview Container */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverLogo(true)
              }}
              onDragLeave={() => setDragOverLogo(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverLogo(false)
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleLogoFileSelect(e.dataTransfer.files[0])
                }
              }}
              style={{
                width: 72,
                height: 72,
                minWidth: 72,
                borderRadius: 14,
                background: '#ffffff',
                border: `2px dashed ${dragOverLogo ? token.colorPrimary : token.colorBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
              title="Click or drop file to upload logo"
            >
              {isUploadingLogo ? (
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              ) : logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Brand Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <ShopOutlined style={{ fontSize: 28, color: token.colorPrimary }} />
              )}
            </div>

            {/* Actions & Description */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#1f2937' }}>
                Company Brand Logo
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                Upload your company logo (PNG, JPG, SVG, WebP up to 10MB). It will appear on your sidebar, dashboard, and invoices.
              </div>
              <Flex align="center" gap={10}>
                <Button
                  type="default"
                  size="small"
                  icon={<CloudUploadOutlined />}
                  loading={isUploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ borderRadius: 6, fontWeight: 500 }}
                >
                  {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>

                {logoUrl && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={handleRemoveLogo}
                    style={{ borderRadius: 6 }}
                  >
                    Remove
                  </Button>
                )}
              </Flex>
            </div>
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={24}>
              <Form.Item name="companyName" label="Brand Name" rules={[{ required: true, message: 'Please enter your brand name' }]}>
                <Input placeholder="Rental Brand" />
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

          <Divider titlePlacement="left">Public Support Information</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="publicSupportEmail" label="Support Email" rules={[{ required: true, message: 'Please enter support email' }]}>
                <Input placeholder="support@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="publicSupportPhone" label="Support Phone" rules={[{ required: true, message: 'Please enter support phone' }]}>
                <Input placeholder="+977-1-4200000" />
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
