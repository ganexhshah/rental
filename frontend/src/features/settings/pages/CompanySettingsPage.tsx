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
  Popconfirm,
  Tabs,
  Avatar,
  Tag,
  Spin,
  Flex,
  theme,
  Space,
  Typography,
} from 'antd'
import {
  BankOutlined,
  SaveOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  DeleteOutlined,
  WarningOutlined,
  UserOutlined,
  CloudUploadOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'
import { useAuthStore } from '@/store/useAuthStore'
import { uploadToR2 } from '@/lib/storage/r2'

const { Text, Paragraph } = Typography

export const CompanySettingsPage: React.FC = () => {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'company'

  const { user, tenant, updateUserProfile } = useAuthStore()

  // Company Form
  const [form] = Form.useForm()

  // Profile Forms
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarDragOver, setAvatarDragOver] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  // Prefill Company Form
  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        name: settings.name || tenant?.name,
        registrationNumber: settings.registrationNumber,
        taxId: settings.taxId,
        email: settings.email,
        phone: settings.phone,
        website: settings.website,
        headquartersAddress: settings.headquartersAddress,
        city: settings.city,
        country: settings.country,
        currency: settings.currency || tenant?.currency || 'NPR',
      })
    }
  }, [settings, tenant, form])

  // Prefill Profile Form
  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatarUrl || null)
      profileForm.setFieldsValue({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
      })
    }
  }, [user, profileForm])

  // Update Company Mutation
  const updateMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateCompanyInfo(values),
    onSuccess: () => {
      message.success('Company profile saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
      queryClient.invalidateQueries({ queryKey: ['current-tenant'] })
    },
    onError: () => {
      message.error('Failed to save company profile')
    },
  })

  const handleSaveCompany = (values: any) => {
    updateMutation.mutate(values)
  }

  // Handle Avatar Upload to Cloudflare R2
  const handleAvatarFileSelect = async (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      message.error('Please upload a valid image file (PNG, JPG, or WebP)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      message.error('Photo size must be less than 10MB')
      return
    }

    setIsUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const key = `avatars/${user?.id || 'profile'}-${Date.now()}.${ext}`
      const res = await uploadToR2(file, key, file.type)
      if (res?.url) {
        setAvatarUrl(res.url)
        await settingsApi.updateUserProfile({ avatarUrl: res.url })
        updateUserProfile({ avatarUrl: res.url })
        message.success('Profile photo uploaded to cloud successfully!')
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to upload photo')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      setAvatarUrl(null)
      await settingsApi.updateUserProfile({ avatarUrl: '' })
      updateUserProfile({ avatarUrl: undefined })
      message.info('Profile photo removed')
    } catch {
      message.error('Failed to remove photo')
    }
  }

  // Handle Save Personal Profile
  const handleSaveProfile = async (values: any) => {
    setIsSavingProfile(true)
    try {
      await settingsApi.updateUserProfile({
        fullName: values.name,
        phone: values.phone,
        avatarUrl: avatarUrl || '',
      })
      updateUserProfile({
        name: values.name,
        phone: values.phone,
        avatarUrl: avatarUrl || undefined,
      })
      message.success('Personal profile updated successfully!')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || 'Failed to update profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Handle Change Password
  const handleChangePassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('New password and confirmation do not match')
      return
    }

    setIsChangingPassword(true)
    try {
      await settingsApi.updateUserProfile({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      passwordForm.resetFields()
      message.success('Password updated successfully!')
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || 'Failed to change password. Please check your current password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const tabItems = [
    {
      key: 'company',
      label: (
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          Company Profile
        </span>
      ),
      children: (
        <div style={{ marginTop: 8 }}>
          <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
            <Form form={form} layout="vertical" size="large" onFinish={handleSaveCompany}>
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
                    rules={[{ required: true, message: 'Registration number is required' }]}
                  >
                    <Input placeholder="REG-102938" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="taxId" label="Tax ID / PAN" rules={[{ required: true, message: 'Tax ID is required' }]}>
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
                        { label: 'INR - Indian Rupee (₹)', value: 'INR' },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider titlePlacement="left">Business Contact</Divider>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="email" label="Company Email" rules={[{ required: true, type: 'email' }]}>
                    <Input prefix={<MailOutlined />} placeholder="contact@rental.com" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="phone" label="Company Phone" rules={[{ required: true }]}>
                    <Input prefix={<PhoneOutlined />} placeholder="+977-1-4200000" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="website" label="Website">
                    <Input prefix={<GlobalOutlined />} placeholder="https://example.com" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider titlePlacement="left">Headquarters Location</Divider>

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
                Save Company Profile
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
        </div>
      ),
    },
    {
      key: 'profile',
      label: (
        <span style={{ fontSize: 15, fontWeight: 500 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          My Profile &amp; Account
        </span>
      ),
      children: (
        <div style={{ marginTop: 8 }}>
          <Row gutter={[24, 24]}>
            {/* Left Column: Avatar & Account Card */}
            <Col xs={24} lg={8}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 14,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  textAlign: 'center',
                }}
              >
                {/* Hidden File Input for Avatar */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAvatarFileSelect(e.target.files[0])
                    }
                  }}
                />

                {/* Avatar Preview with Hover Drag */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '16px 0',
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setAvatarDragOver(true)
                  }}
                  onDragLeave={() => setAvatarDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setAvatarDragOver(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleAvatarFileSelect(e.dataTransfer.files[0])
                    }
                  }}
                >
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    style={{
                      position: 'relative',
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: `2.5px dashed ${avatarDragOver ? token.colorPrimary : token.colorBorder}`,
                      padding: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                    }}
                    title="Click or drop photo to change avatar"
                  >
                    {isUploadingAvatar ? (
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
                    ) : (
                      <Avatar
                        size={84}
                        src={avatarUrl}
                        icon={<UserOutlined />}
                        style={{
                          backgroundColor: token.colorPrimary,
                          fontSize: 32,
                        }}
                      >
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </Avatar>
                    )}
                  </div>

                  <h3 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 18, color: '#111827' }}>
                    {user?.name || 'Administrator'}
                  </h3>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>
                    {user?.email}
                  </div>

                  <Space size={6} style={{ marginBottom: 16 }}>
                    <Tag color="blue" style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}>
                      <IdcardOutlined style={{ marginRight: 4 }} />
                      {user?.role?.toUpperCase() || 'ADMIN'}
                    </Tag>
                    <Tag color="success" style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}>
                      <CheckCircleOutlined style={{ marginRight: 4 }} />
                      ACTIVE
                    </Tag>
                  </Space>

                  <Paragraph type="secondary" style={{ fontSize: 12, margin: '0 0 16px', lineHeight: 1.5 }}>
                    Your avatar is saved securely to Cloudflare R2 cloud storage and displayed across the navigation bar and audit activity.
                  </Paragraph>

                  <Flex gap={8} justify="center">
                    <Button
                      type="default"
                      size="small"
                      icon={<CloudUploadOutlined />}
                      loading={isUploadingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                      style={{ borderRadius: 6 }}
                    >
                      {avatarUrl ? 'Change Photo' : 'Upload Photo'}
                    </Button>

                    {avatarUrl && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={handleRemoveAvatar}
                        style={{ borderRadius: 6 }}
                      >
                        Remove
                      </Button>
                    )}
                  </Flex>
                </div>

                <Divider style={{ margin: '16px 0' }} />

                <div style={{ textAlign: 'left', fontSize: 13, color: '#475569' }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Organization:</span>
                    <strong>{tenant?.name || 'Main Tenant'}</strong>
                  </div>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Workspace Plan:</span>
                    <strong style={{ textTransform: 'capitalize' }}>{tenant?.plan || 'Enterprise'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Timezone:</span>
                    <span>{tenant?.timezone || 'Asia/Kathmandu'}</span>
                  </div>
                </div>
              </Card>
            </Col>

            {/* Right Column: Profile Edit & Password Change */}
            <Col xs={24} lg={16}>
              {/* Personal Details Form */}
              <Card
                title={
                  <Space>
                    <UserOutlined style={{ color: token.colorPrimary }} />
                    <span>Personal Details</span>
                  </Space>
                }
                bordered={false}
                style={{
                  borderRadius: 14,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  marginBottom: 24,
                }}
              >
                <Form
                  form={profileForm}
                  layout="vertical"
                  size="large"
                  onFinish={handleSaveProfile}
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="name"
                        label="Full Name"
                        rules={[{ required: true, message: 'Please enter your full name' }]}
                      >
                        <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Ganesh Shah" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="phone"
                        label="Phone Number"
                      >
                        <Input prefix={<PhoneOutlined style={{ color: '#94a3b8' }} />} placeholder="+977 9800000000" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="email"
                    label="Email Address (Login Username)"
                    extra="Your email address is your primary login identifier."
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
                      disabled
                      style={{ background: '#f8fafc', color: '#64748b' }}
                    />
                  </Form.Item>

                  <div style={{ textAlign: 'right', marginTop: 12 }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      htmlType="submit"
                      loading={isSavingProfile}
                      style={{ borderRadius: 6 }}
                    >
                      Save Profile Changes
                    </Button>
                  </div>
                </Form>
              </Card>

              {/* Change Password Card */}
              <Card
                title={
                  <Space>
                    <LockOutlined style={{ color: token.colorPrimary }} />
                    <span>Security &amp; Password</span>
                  </Space>
                }
                bordered={false}
                style={{
                  borderRadius: 14,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Form
                  form={passwordForm}
                  layout="vertical"
                  size="large"
                  onFinish={handleChangePassword}
                >
                  <Form.Item
                    name="currentPassword"
                    label="Current Password"
                    rules={[{ required: true, message: 'Please enter your current password' }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Enter current password"
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="newPassword"
                        label="New Password"
                        rules={[
                          { required: true, message: 'Please enter a new password' },
                          { min: 8, message: 'Password must be at least 8 characters' },
                        ]}
                      >
                        <Input.Password
                          prefix={<SafetyCertificateOutlined style={{ color: '#94a3b8' }} />}
                          placeholder="Min 8 characters"
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="confirmPassword"
                        label="Confirm New Password"
                        rules={[
                          { required: true, message: 'Please confirm your new password' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve()
                              }
                              return Promise.reject(new Error('The two passwords do not match'))
                            },
                          }),
                        ]}
                      >
                        <Input.Password
                          prefix={<SafetyCertificateOutlined style={{ color: '#94a3b8' }} />}
                          placeholder="Re-enter new password"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div style={{ textAlign: 'right', marginTop: 12 }}>
                    <Button
                      type="default"
                      icon={<SafetyCertificateOutlined />}
                      htmlType="submit"
                      loading={isChangingPassword}
                      style={{ borderRadius: 6, fontWeight: 500 }}
                    >
                      Update Password
                    </Button>
                  </div>
                </Form>
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Settings"
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setSearchParams({ tab: key })}
        items={tabItems}
        size="large"
        tabBarStyle={{
          marginBottom: 16,
          borderBottom: '1px solid #e2e8f0',
        }}
      />
    </PageContainer>
  )
}

export default CompanySettingsPage
