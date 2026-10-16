import React, { useState, useEffect } from 'react'
import {
  Card,
  Steps,
  Form,
  Input,
  Button,
  Select,
  Switch,
  InputNumber,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  theme,
  App,
  Divider,
  Radio,
  Result,
  Flex,
  Spin,
  Tooltip,
} from 'antd'
import {
  ShopOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
  CarOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
  GlobalOutlined,
  DollarOutlined,
  PhoneOutlined,
  MailOutlined,
  PlusOutlined,
  PictureOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  LoadingOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { settingsApi } from '@/features/settings/api'
import { vehiclesApi } from '@/features/vehicles/api'
import { onboardingApi } from '@/features/onboarding/api'
import type { Vehicle } from '@/types/vehicle'

const { Title, Text, Paragraph } = Typography

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()
  const { tenant, user, login } = useAuthStore()
  const { token } = theme.useToken()
  const { message } = App.useApp()

  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Form instances for steps
  const [companyForm] = Form.useForm()
  const [branchForm] = Form.useForm()
  const [rulesForm] = Form.useForm()

  // Selected starter option for Step 3
  const [starterOption, setStarterOption] = useState<'sample' | 'blank'>('blank')
  const [completed, setCompleted] = useState(false)

  // Logo upload state
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant?.logoUrl || null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [dragOverLogo, setDragOverLogo] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

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
        companyForm.setFieldsValue({ logoUrl: res.url })
        message.success('Company logo uploaded to backend successfully!')

        if (tenant && user) {
          login(user, localStorage.getItem('rental_auth_token') || '', {
            ...tenant,
            logoUrl: res.url,
          })
        }
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to upload logo.')
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl(null)
    companyForm.setFieldsValue({ logoUrl: '' })
    if (tenant && user) {
      login(user, localStorage.getItem('rental_auth_token') || '', {
        ...tenant,
        logoUrl: undefined,
      })
    }
    message.info('Logo removed')
  }

  // Initialize initial form values cleanly from user/tenant context
  useEffect(() => {
    companyForm.setFieldsValue({
      name: tenant?.name || '',
      registrationNumber: '',
      taxId: '',
      email: user?.email || '',
      phone: user?.phone || '',
      headquartersAddress: '',
      city: '',
      country: 'Nepal',
      currency: tenant?.currency || 'NPR',
      timezone: tenant?.timezone || 'Asia/Kathmandu',
    })

    branchForm.setFieldsValue({
      branchName: '',
      branchCode: '',
      branchCity: '',
      branchAddress: '',
      branchPhone: user?.phone || '',
      vehicleTypes: ['car', 'bike'],
    })

    rulesForm.setFieldsValue({
      minRentalHours: 24,
      fuelPolicy: 'same_to_same',
      depositBikes: 5000,
      depositCars: 15000,
      minDriverAgeBike: 18,
      minDriverAgeCar: 21,
      requireLicenseUpload: true,
      allowInstantBooking: true,
    })

    // Fetch live backend status if previously saved
    onboardingApi.getStatus().then((status) => {
      if (status && status.completed) {
        if (status.logo_url) {
          setLogoUrl(status.logo_url)
        }
        if (status.company_name) {
          companyForm.setFieldsValue({
            name: status.company_name,
            currency: status.currency || 'NPR',
            timezone: status.timezone || 'Asia/Kathmandu',
          })
        }
        if (status.primary_branch) {
          branchForm.setFieldsValue({
            branchName: status.primary_branch.name,
            branchCode: status.primary_branch.code,
            branchCity: status.primary_branch.city,
            branchAddress: status.primary_branch.address,
            branchPhone: status.primary_branch.contact_phone,
          })
        }
      }
    })
  }, [tenant, user, companyForm, branchForm, rulesForm])

  // Step 1: Save Company Profile
  const handleNextFromCompany = async () => {
    try {
      const values = await companyForm.validateFields()
      setIsSaving(true)
      await settingsApi.updateCompanyInfo({
        name: values.name,
        registrationNumber: values.registrationNumber,
        taxId: values.taxId,
        email: values.email,
        phone: values.phone,
        headquartersAddress: values.headquartersAddress,
        city: values.city,
        country: values.country,
        currency: values.currency,
      })

      // Update auth store with the new tenant name/currency
      if (tenant && user) {
        const symbol = values.currency === 'USD' ? '$' : values.currency === 'EUR' ? '€' : values.currency === 'INR' ? '₹' : 'Rs.'
        login(user, localStorage.getItem('rental_auth_token') || '', {
          ...tenant,
          name: values.name,
          currency: values.currency,
          currencySymbol: symbol,
          timezone: values.timezone,
        })
      }

      setCurrentStep(1)
    } catch (err: any) {
      if (err?.errorFields) {
        message.error('Please complete all required company details')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Step 2: Save Primary Branch
  const handleNextFromBranch = async () => {
    try {
      const values = await branchForm.validateFields()
      setIsSaving(true)
      await vehiclesApi.saveLocation({
        name: values.branchName,
        code: values.branchCode,
        city: values.branchCity,
        address: values.branchAddress,
        contactPhone: values.branchPhone,
        activeVehiclesCount: 0,
      })
      setCurrentStep(2)
    } catch (err: any) {
      if (err?.errorFields) {
        message.error('Please complete all required branch details')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Step 3: Save Rental Rules
  const handleNextFromRules = async () => {
    try {
      const values = await rulesForm.validateFields()
      setIsSaving(true)
      await settingsApi.updateRentalRules({
        minRentalHours: values.minRentalHours,
        fuelPolicy: values.fuelPolicy,
        minDriverAgeCar: values.minDriverAgeCar,
        minDriverAgeTwoWheeler: values.minDriverAgeBike,
        requireDriverLicenseUpload: values.requireLicenseUpload,
        allowInstantBooking: values.allowInstantBooking,
      })

      await settingsApi.updatePricing({
        securityDepositBikes: values.depositBikes,
        securityDepositCars: values.depositCars,
      })

      setCurrentStep(3)
    } catch (err: any) {
      if (err?.errorFields) {
        message.error('Please verify rental policies')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Step 4: Finalize & Launch
  const handleFinishOnboarding = async () => {
    setIsSaving(true)
    try {
      const companyVals = companyForm.getFieldsValue()
      const branchVals = branchForm.getFieldsValue()
      const rulesVals = rulesForm.getFieldsValue()

      // Submit full onboarding setup to backend API
      await onboardingApi.completeOnboarding({
        company_name: companyVals.name || tenant?.name || 'Himalayan Rides Nepal',
        registration_number: companyVals.registrationNumber || '',
        tax_id: companyVals.taxId || '',
        email: companyVals.email || user?.email || '',
        phone: companyVals.phone || '',
        headquarters_address: companyVals.headquartersAddress || '',
        city: companyVals.city || 'Kathmandu',
        country: companyVals.country || 'Nepal',
        currency: companyVals.currency || 'NPR',
        currency_symbol: companyVals.currency === 'USD' ? '$' : companyVals.currency === 'EUR' ? '€' : companyVals.currency === 'INR' ? '₹' : 'Rs.',
        timezone: companyVals.timezone || 'Asia/Kathmandu',
        logo_url: logoUrl || '',
        primary_branch: {
          name: branchVals.branchName || 'Kathmandu HQ Hub',
          code: branchVals.branchCode || 'KTM-HQ',
          city: branchVals.branchCity || 'Kathmandu',
          address: branchVals.branchAddress || '',
          contact_phone: branchVals.branchPhone || '',
        },
        rental_rules: {
          default_deposit: rulesVals.depositCars || 15000,
          min_rental_hours: rulesVals.minRentalHours || 24,
          allowed_km_per_day: 200,
          extra_km_rate: 20,
          fuel_policy: rulesVals.fuelPolicy || 'same_to_same',
          grace_period_mins: 60,
        },
        starter_option: starterOption,
      })

      // Update auth store so sidebar and headers reflect company name and logo immediately
      if (tenant && user) {
        const symbol = companyVals.currency === 'USD' ? '$' : companyVals.currency === 'EUR' ? '€' : companyVals.currency === 'INR' ? '₹' : 'Rs.'
        login(user, localStorage.getItem('rental_auth_token') || '', {
          ...tenant,
          name: companyVals.name || tenant.name,
          currency: companyVals.currency || tenant.currency,
          currencySymbol: symbol,
          logoUrl: logoUrl || tenant.logoUrl,
        })
      }

      if (starterOption === 'sample') {
        // Seed 3 popular sample vehicles so dashboard and bookings look alive immediately
        const sampleVehicles: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>[] = [
          {
            tenantId: tenant?.id || '78248f8f-e390-4f85-a03f-58e4974fa366',
            make: 'Royal Enfield',
            model: 'Himalayan 450 (Summit Edition)',
            year: 2025,
            plateNumber: 'BA-02-PA-8841',
            type: 'bike',
            categoryId: 'cat-3',
            categoryName: 'Adventure Motorcycle',
            locationId: 'loc-1',
            locationName: 'Kathmandu HQ (Thamel)',
            status: 'available',
            pricing: {
              dailyRate: 3500,
              weeklyRate: 22000,
              monthlyRate: 85000,
              depositAmount: 10000,
              allowedKmPerDay: 200,
            },
            specs: {
              seatingCapacity: 2,
              transmission: 'manual',
              fuelType: 'petrol',
              engineCapacity: '452cc',
              mileageOdometer: 3420,
              features: ['ABS', 'TFT Tripper Navigation', 'Luggage Panniers', 'Crash Guard'],
            },
            images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80'],
            primaryImage: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
          },
          {
            tenantId: tenant?.id || '78248f8f-e390-4f85-a03f-58e4974fa366',
            make: 'Mahindra',
            model: 'Scorpio-N 4x4 Z8 Luxury',
            year: 2024,
            plateNumber: 'BA-01-CHA-4920',
            type: 'car',
            categoryId: 'cat-1',
            categoryName: 'SUV / 4x4',
            locationId: 'loc-1',
            locationName: 'Kathmandu HQ (Thamel)',
            status: 'available',
            pricing: {
              dailyRate: 8500,
              weeklyRate: 52000,
              monthlyRate: 195000,
              depositAmount: 25000,
              allowedKmPerDay: 250,
            },
            specs: {
              seatingCapacity: 7,
              transmission: 'automatic',
              fuelType: 'diesel',
              engineCapacity: '2200cc',
              mileageOdometer: 14200,
              features: ['4WD', 'Sunroof', 'Touchscreen Apple CarPlay', 'Reverse Camera'],
            },
            images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'],
            primaryImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
          },
          {
            tenantId: tenant?.id || '78248f8f-e390-4f85-a03f-58e4974fa366',
            make: 'Honda',
            model: 'Activa 125cc Disc (Smart Key)',
            year: 2025,
            plateNumber: 'BA-03-PA-1052',
            type: 'scooter',
            categoryId: 'cat-4',
            categoryName: 'Scooter',
            locationId: 'loc-1',
            locationName: 'Kathmandu HQ (Thamel)',
            status: 'available',
            pricing: {
              dailyRate: 1400,
              weeklyRate: 8500,
              monthlyRate: 30000,
              depositAmount: 5000,
              allowedKmPerDay: 150,
            },
            specs: {
              seatingCapacity: 2,
              transmission: 'automatic',
              fuelType: 'petrol',
              engineCapacity: '124cc',
              mileageOdometer: 5120,
              features: ['Tubeless Tyres', 'Front Disc Brake', 'Smart Keyless Ignition'],
            },
            images: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80'],
            primaryImage: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
          },
        ]

        for (const veh of sampleVehicles) {
          await vehiclesApi.createVehicle(veh)
        }
      }

      localStorage.setItem('rental_onboarding_completed', 'true')
      setCompleted(true)
      message.success('Rental workspace configured successfully!')
      setTimeout(() => {
        navigate('/dashboard')
      }, 1500)
    } catch {
      localStorage.setItem('rental_onboarding_completed', 'true')
      navigate('/dashboard')
    } finally {
      setIsSaving(false)
    }
  }

  const stepsItems = [
    {
      title: 'Company Profile',
      icon: <ShopOutlined />,
    },
    {
      title: 'Branch & Fleet',
      icon: <EnvironmentOutlined />,
    },
    {
      title: 'Rental Rules',
      icon: <SafetyCertificateOutlined />,
    },
    {
      title: 'Launch Platform',
      icon: <RocketOutlined />,
    },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at top, #ffffff 0%, #f4f6fa 70%, #ebedf3 100%)`,
        padding: '36px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ width: '100%', maxWidth: 760 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: token.colorPrimary,
              color: '#fff',
              fontSize: 26,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 8px 20px ${token.colorPrimary}40`,
              marginBottom: 12,
            }}
          >
            <CarOutlined />
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Welcome to ApexFleet Setup
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 14, marginTop: 4 }}>
            Configure your rental business in 4 simple steps to start renting today.
          </Paragraph>
        </div>

        {/* Steps Progress Card */}
        <Card
          bordered
          style={{
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
            marginBottom: 24,
          }}
          bodyStyle={{ padding: '20px 24px' }}
        >
          <Steps current={currentStep} items={stepsItems} responsive />
        </Card>

        {/* Main Content Card */}
        <Card
          bordered
          style={{
            borderRadius: 16,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.06)',
            background: '#ffffff',
          }}
          bodyStyle={{ padding: '32px 32px' }}
        >
          {/* ================= STEP 0: COMPANY PROFILE ================= */}
          {currentStep === 0 && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                  Rental Company &amp; Regional Details
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Your business name and registration will appear on printed contracts and invoices.
                </Text>
              </div>

              <Form form={companyForm} layout="vertical" requiredMark={false}>
                {/* Centered Small Brand Logo Upload */}
                <Flex
                  vertical
                  align="center"
                  justify="center"
                  style={{
                    marginBottom: 20,
                    padding: '4px 0',
                  }}
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

                  {/* Small Centered Logo Preview Avatar */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      background: '#ffffff',
                      border: `1.5px dashed ${dragOverLogo ? token.colorPrimary : token.colorBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      marginBottom: 8,
                    }}
                    title="Click to upload logo"
                  >
                    {isUploadingLogo ? (
                      <Spin indicator={<LoadingOutlined style={{ fontSize: 20 }} spin />} />
                    ) : logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Company Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <ShopOutlined style={{ fontSize: 22, color: token.colorPrimary }} />
                    )}
                  </div>

                  {/* Compact Controls */}
                  <Flex align="center" gap={8}>
                    <Button
                      type="default"
                      size="small"
                      shape="round"
                      icon={<CloudUploadOutlined />}
                      loading={isUploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ fontSize: 12 }}
                    >
                      {logoUrl ? 'Change' : 'Upload Logo'}
                    </Button>

                    {logoUrl && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={handleRemoveLogo}
                        style={{ fontSize: 12, padding: '0 6px' }}
                      >
                        Remove
                      </Button>
                    )}
                  </Flex>
                </Flex>

                <Row gutter={16}>
                  <Col xs={24} sm={16}>
                    <Form.Item
                      name="name"
                      label={<Text strong>Company / Rental Agency Name</Text>}
                      rules={[{ required: true, message: 'Please enter company name' }]}
                    >
                      <Input prefix={<ShopOutlined />} size="large" placeholder="Himalayan Rides Nepal Pvt. Ltd." />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="taxId"
                      label={<Text strong>Tax / PAN ID</Text>}
                      rules={[{ required: true, message: 'PAN or Tax ID is required' }]}
                    >
                      <Input size="large" placeholder="PAN: 601234567" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="email"
                      label={<Text strong>Support / Official Email</Text>}
                      rules={[{ required: true, type: 'email' }]}
                    >
                      <Input prefix={<MailOutlined />} size="large" placeholder="operations@company.com" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="phone"
                      label={<Text strong>Primary Phone Number</Text>}
                      rules={[{ required: true }]}
                    >
                      <Input prefix={<PhoneOutlined />} size="large" placeholder="+977-1-4700000" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="headquartersAddress"
                  label={<Text strong>Headquarters Street Address</Text>}
                  rules={[{ required: true }]}
                >
                  <Input prefix={<EnvironmentOutlined />} size="large" placeholder="Thamel Marg, Ward 26" />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item name="city" label={<Text strong>City</Text>} rules={[{ required: true }]}>
                      <Input size="large" placeholder="Kathmandu" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="currency" label={<Text strong>Base Currency</Text>} rules={[{ required: true }]}>
                      <Select size="large">
                        <Select.Option value="NPR">NPR (Rs. - Nepalese Rupee)</Select.Option>
                        <Select.Option value="USD">USD ($ - US Dollar)</Select.Option>
                        <Select.Option value="EUR">EUR (€ - Euro)</Select.Option>
                        <Select.Option value="INR">INR (₹ - Indian Rupee)</Select.Option>
                        <Select.Option value="GBP">GBP (£ - British Pound)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="timezone" label={<Text strong>Timezone</Text>} rules={[{ required: true }]}>
                      <Select size="large">
                        <Select.Option value="Asia/Kathmandu">Asia/Kathmandu (UTC+5:45)</Select.Option>
                        <Select.Option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</Select.Option>
                        <Select.Option value="UTC">UTC (Universal Time)</Select.Option>
                        <Select.Option value="America/New_York">America/New_York (EST)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Divider style={{ margin: '20px 0' }} />

                <Flex justify="space-between" align="center">
                  <Button type="text" onClick={() => navigate('/dashboard')}>
                    Skip for now
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    loading={isSaving}
                    onClick={handleNextFromCompany}
                    style={{ minWidth: 160, height: 44, fontWeight: 600 }}
                  >
                    Continue to Branch
                  </Button>
                </Flex>
              </Form>
            </div>
          )}

          {/* ================= STEP 1: BRANCH & FLEET ================= */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                  Primary Rental Branch &amp; Fleet Types
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Set up your main vehicle pickup location and the types of vehicles you rent.
                </Text>
              </div>

              <Form form={branchForm} layout="vertical" requiredMark={false}>
                <Row gutter={16}>
                  <Col xs={24} sm={16}>
                    <Form.Item
                      name="branchName"
                      label={<Text strong>Primary Location / Branch Name</Text>}
                      rules={[{ required: true }]}
                    >
                      <Input prefix={<EnvironmentOutlined />} size="large" placeholder="Kathmandu Central Hub (HQ)" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="branchCode"
                      label={<Text strong>Station Code</Text>}
                      rules={[{ required: true }]}
                    >
                      <Input size="large" placeholder="KTM-HQ" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={14}>
                    <Form.Item
                      name="branchAddress"
                      label={<Text strong>Station Address</Text>}
                      rules={[{ required: true }]}
                    >
                      <Input size="large" placeholder="Kantipath, Near Garden of Dreams" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={10}>
                    <Form.Item
                      name="branchPhone"
                      label={<Text strong>Branch Contact Number</Text>}
                      rules={[{ required: true }]}
                    >
                      <Input size="large" placeholder="+977 1-4428901" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="vehicleTypes"
                  label={<Text strong>Fleet Categories You Operate</Text>}
                  rules={[{ required: true, message: 'Select at least one vehicle category' }]}
                  style={{ marginTop: 8 }}
                >
                  <Select
                    mode="multiple"
                    size="large"
                    placeholder="Select vehicle types"
                    style={{ width: '100%' }}
                    options={[
                      { label: '🏍️ Motorcycle / Adventure Bike', value: 'bike' },
                      { label: '🛵 Automatic City Scooter', value: 'scooter' },
                      { label: '🚗 Passenger Car / Sedan / SUV', value: 'car' },
                      { label: '🚐 Passenger Van / Microbus', value: 'van' },
                    ]}
                  />
                </Form.Item>

                <Divider style={{ margin: '20px 0' }} />

                <Flex justify="space-between" align="center">
                  <Button
                    size="large"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setCurrentStep(0)}
                  >
                    Back
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    loading={isSaving}
                    onClick={handleNextFromBranch}
                    style={{ minWidth: 160, height: 44, fontWeight: 600 }}
                  >
                    Continue to Rules
                  </Button>
                </Flex>
              </Form>
            </div>
          )}

          {/* ================= STEP 2: RENTAL RULES ================= */}
          {currentStep === 2 && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
                  Rental &amp; Security Deposit Policies
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Define security deposit values and default rental rules for booking contracts.
                </Text>
              </div>

              <Form form={rulesForm} layout="vertical" requiredMark={false}>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="depositBikes"
                      label={<Text strong>Security Deposit: Bikes &amp; Scooters (Rs.)</Text>}
                      rules={[{ required: true }]}
                    >
                      <InputNumber size="large" style={{ width: '100%' }} prefix="Rs." min={0} step={500} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="depositCars"
                      label={<Text strong>Security Deposit: Cars &amp; SUVs (Rs.)</Text>}
                      rules={[{ required: true }]}
                    >
                      <InputNumber size="large" style={{ width: '100%' }} prefix="Rs." min={0} step={1000} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="minRentalHours" label={<Text strong>Minimum Rental Duration</Text>}>
                      <Select size="large">
                        <Select.Option value={12}>12 Hours (Half-Day)</Select.Option>
                        <Select.Option value={24}>24 Hours (1 Full Day)</Select.Option>
                        <Select.Option value={48}>48 Hours (2 Days)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="fuelPolicy" label={<Text strong>Fuel Return Policy</Text>}>
                      <Select size="large">
                        <Select.Option value="same_to_same">Same-to-Same (Return with pickup fuel)</Select.Option>
                        <Select.Option value="full_to_full">Full-to-Full (Always 100% full tank)</Select.Option>
                        <Select.Option value="free_tank">Prepaid Fuel Included</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 8,
                    marginBottom: 20,
                  }}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <Flex justify="space-between" align="center">
                        <div>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>Require Driving License</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>Mandatory license upload during booking</Text>
                        </div>
                        <Form.Item name="requireLicenseUpload" valuePropName="checked" noStyle>
                          <Switch />
                        </Form.Item>
                      </Flex>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Flex justify="space-between" align="center">
                        <div>
                          <Text strong style={{ fontSize: 13, display: 'block' }}>Allow Instant Booking</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>Renter can confirm without admin triage</Text>
                        </div>
                        <Form.Item name="allowInstantBooking" valuePropName="checked" noStyle>
                          <Switch />
                        </Form.Item>
                      </Flex>
                    </Col>
                  </Row>
                </div>

                <Divider style={{ margin: '20px 0' }} />

                <Flex justify="space-between" align="center">
                  <Button
                    size="large"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setCurrentStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ArrowRightOutlined />}
                    loading={isSaving}
                    onClick={handleNextFromRules}
                    style={{ minWidth: 160, height: 44, fontWeight: 600 }}
                  >
                    Continue to Launch
                  </Button>
                </Flex>
              </Form>
            </div>
          )}

          {/* ================= STEP 3: FINISH & LAUNCH ================= */}
          {currentStep === 3 && (
            <div>
              {completed ? (
                <Result
                  status="success"
                  title="Your Fleet Platform is Live!"
                  subTitle="Redirecting to your dashboard..."
                  icon={<CheckCircleFilled style={{ color: '#52c41a', fontSize: 64 }} />}
                />
              ) : (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        background: '#f0fdf4',
                        color: '#16a34a',
                        fontSize: 28,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                        border: '2px solid #bbf7d0',
                      }}
                    >
                      <RocketOutlined />
                    </div>
                    <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                      Setup Complete! Ready to Launch
                    </Title>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Choose how you would like to start your vehicle inventory:
                    </Text>
                  </div>

                  <Radio.Group
                    value={starterOption}
                    onChange={(e) => setStarterOption(e.target.value)}
                    style={{ width: '100%', marginBottom: 28 }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12}>
                        <Card
                          hoverable
                          onClick={() => setStarterOption('sample')}
                          style={{
                            borderColor: starterOption === 'sample' ? token.colorPrimary : '#e2e8f0',
                            borderWidth: 2,
                            background: starterOption === 'sample' ? '#f0f7ff' : '#ffffff',
                            borderRadius: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <Radio value="sample" style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                            Load Sample Nepal Fleet (Recommended)
                          </Radio>
                          <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                            Pre-loads 3 popular vehicles (Royal Enfield Himalayan 450, Scorpio 4x4, Honda Activa) so you can test booking, contracts, and invoicing immediately.
                          </Paragraph>
                          <div style={{ marginTop: 12 }}>
                            <Tag color="blue">3 Vehicles</Tag>
                            <Tag color="green">Ready for Bookings</Tag>
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} sm={12}>
                        <Card
                          hoverable
                          onClick={() => setStarterOption('blank')}
                          style={{
                            borderColor: starterOption === 'blank' ? token.colorPrimary : '#e2e8f0',
                            borderWidth: 2,
                            background: starterOption === 'blank' ? '#f0f7ff' : '#ffffff',
                            borderRadius: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <Radio value="blank" style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                            Start with Blank Fleet
                          </Radio>
                          <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                            Keep your inventory completely clean. You will add your vehicles manually via the Vehicles manager or CSV upload.
                          </Paragraph>
                          <div style={{ marginTop: 12 }}>
                            <Tag>Clean Slate</Tag>
                            <Tag>Manual Setup</Tag>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </Radio.Group>

                  <Divider style={{ margin: '24px 0' }} />

                  <Flex justify="space-between" align="center">
                    <Button
                      size="large"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => setCurrentStep(2)}
                    >
                      Back
                    </Button>
                    <Button
                      type="primary"
                      size="large"
                      icon={<RocketOutlined />}
                      loading={isSaving}
                      onClick={handleFinishOnboarding}
                      style={{
                        minWidth: 220,
                        height: 48,
                        fontWeight: 700,
                        fontSize: 15,
                        background: '#16a34a',
                        borderColor: '#16a34a',
                      }}
                    >
                      Launch Rental Workspace
                    </Button>
                  </Flex>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default OnboardingPage
