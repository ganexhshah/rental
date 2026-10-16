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
  Space,
  Tabs,
  App,
} from 'antd'
import {
  FileTextOutlined,
  PrinterOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'
import type { DocumentTemplateSettings } from '@/types/settings'
import {
  printBookingAgreement,
  printBookingInvoice,
  printHandoverSheet,
} from '@/features/bookings/utils/printTemplates'

const { TextArea } = Input

export const PrintTemplatesSettingsPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsApi.getSettings(),
  })

  useEffect(() => {
    if (settings) {
      const docSettings: Partial<DocumentTemplateSettings> = settings.documentTemplates || {}
      form.setFieldsValue({
        name: settings.name || 'Rental Company Pvt. Ltd.',
        registrationNumber: settings.registrationNumber || 'REG-102938',
        taxId: settings.taxId || 'PAN: 601234567',
        headquartersAddress: settings.headquartersAddress || 'Kathmandu, Nepal',
        phone: settings.phone || '+977-1-4200000',
        email: settings.email || 'contact@rental.com',

        agreementPrefix: docSettings.agreementPrefix || 'BRA-',
        agreementTerms:
          docSettings.agreementTerms ||
          `1. The renter must hold a valid driving licence for the rented vehicle category and obey all traffic laws.\n2. Only authorized drivers may operate the vehicle.\n3. Report any accident or breakdown promptly.\n4. Extensions require prior approval.\n5. Vehicle condition, fuel level, and odometer must match handover inspection.\n6. Security deposit is refunded upon vehicle return inspection.`,
        depositPolicy:
          docSettings.depositPolicy ||
          'Refundable security deposit is returned upon inspection minus any fines or extra charges.',
        authorizedRepresentative: docSettings.authorizedRepresentative || 'Operations Officer',

        invoicePrefix: docSettings.invoicePrefix || 'INV-',
        invoiceVatRate: docSettings.invoiceVatRate || 13,
        invoicePaymentTerms:
          docSettings.invoicePaymentTerms ||
          'Payment accepted via Cash, Card, Fonepay, or Bank Transfer.',
        invoiceSignatory: docSettings.invoiceSignatory || 'Authorized Signatory',

        handoverPrefix: docSettings.handoverPrefix || 'HO-',
        checklistItems:
          docSettings.checklistItems ||
          'Bluebook / Registration Document in Glovebox\nInsurance Policy\nSpare Wheel & Tool Kit\nRoad Tax & Pollution Token\nLights & Indicators\nHelmets (Two-Wheeler)\nClean Interior & Exterior',
      })
    }
  }, [settings, form])

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      await settingsApi.updateCompanyInfo({
        name: values.name,
        registrationNumber: values.registrationNumber,
        taxId: values.taxId,
        headquartersAddress: values.headquartersAddress,
        phone: values.phone,
        email: values.email,
      })

      const docSettings = {
        agreementPrefix: values.agreementPrefix,
        agreementTerms: values.agreementTerms,
        depositPolicy: values.depositPolicy,
        authorizedRepresentative: values.authorizedRepresentative,
        invoicePrefix: values.invoicePrefix,
        invoiceVatRate: values.invoiceVatRate,
        invoicePaymentTerms: values.invoicePaymentTerms,
        invoiceSignatory: values.invoiceSignatory,
        handoverPrefix: values.handoverPrefix,
        checklistItems: values.checklistItems,
      }
      await settingsApi.updateDocumentTemplates(docSettings)

      try {
        const currentPayload = JSON.parse(localStorage.getItem('rental_print_payload') || '{}')
        localStorage.setItem(
          'rental_print_payload',
          JSON.stringify({
            ...currentPayload,
            company: {
              name: values.name,
              registrationNumber: values.registrationNumber,
              taxId: values.taxId,
              headquartersAddress: values.headquartersAddress,
              phone: values.phone,
              email: values.email,
            },
            docSettings,
          })
        )
      } catch (_) {}

      return values
    },
    onSuccess: () => {
      message.success('Print templates saved successfully')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: () => {
      message.error('Failed to save print templates')
    },
  })

  const handleOpenPreview = (type: 'agreement' | 'invoice' | 'handover') => {
    const sampleBooking: any = {
      id: 'sample-preview',
      bookingCode: 'HRN-2026-0089',
      customerName: 'Aarav Sharma',
      customerPhone: '+977 9841234567',
      vehicleModel: 'Royal Enfield Classic 350',
      vehiclePlate: 'BA 21 PA 8821',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      totalDays: 3,
      dailyRate: 2500,
      rentalAmount: 7500,
      extraCharges: 500,
      taxAmount: 1040,
      totalAmount: 9040,
      paidAmount: 5000,
      balanceDue: 4040,
      depositAmount: 10000,
      pickupLocationName: 'Kathmandu Central Station',
      returnLocationName: 'Kathmandu Central Station',
      paymentMethod: 'Cash / Bank Transfer',
      status: 'confirmed',
    }
    const sampleVehicle: any = {
      make: 'Royal Enfield',
      model: 'Classic 350',
      year: 2024,
      plateNumber: 'BA 21 PA 8821',
      color: 'Black Matte',
      odometer: 14200,
      specs: { engineCc: '350 CC' },
      pricing: { dailyRate: 2500, allowedKmPerDay: 200, extraKmRate: 20 },
    }
    const sampleCustomer: any = {
      fullName: 'Aarav Sharma',
      phone: '+977 9841234567',
      email: 'aarav.sharma@example.com',
      citizenshipNumber: '27-01-78-04432',
      licenseNumber: '01-06-00998234',
      nationality: 'Nepali',
      originType: 'national',
      address: 'Lazimpat, Kathmandu',
      currentAddress: 'Lazimpat, Kathmandu',
      permanentAddress: 'Biratnagar-4, Morang',
      emergencyContactName: 'Bikash Sharma',
      emergencyContactRelationship: 'Brother',
      emergencyContactPhone: '+977 9801234567',
    }
    const sampleCollateral: any = {
      collateralType: 'bank_cheque',
      depositAmount: 10000,
      isBlankCheque: true,
      chequeBankName: 'Nabil Bank Ltd.',
      chequeNumber: '00984321',
      chequeAccountHolder: 'Aarav Sharma',
    }

    if (type === 'invoice') {
      printBookingInvoice(sampleBooking, sampleVehicle, sampleCustomer)
    } else if (type === 'handover') {
      printHandoverSheet(sampleBooking, sampleVehicle, sampleCustomer)
    } else {
      printBookingAgreement(sampleBooking, sampleVehicle, sampleCustomer, sampleCollateral)
    }
  }

  const items = [
    {
      key: 'agreement',
      label: 'Rental Agreement',
      children: (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="agreementPrefix" label="Agreement Prefix" rules={[{ required: true }]}>
                <Input placeholder="BRA-" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="authorizedRepresentative" label="Representative Title">
                <Input placeholder="Operations Officer" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="agreementTerms"
            label="Terms & Conditions (Numbered List)"
            rules={[{ required: true }]}
          >
            <TextArea rows={6} placeholder="Enter contract clauses..." />
          </Form.Item>

          <Form.Item name="depositPolicy" label="Security Deposit Policy">
            <TextArea rows={3} placeholder="Enter security deposit policy..." />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'invoice',
      label: 'Invoice',
      children: (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="invoicePrefix" label="Invoice Prefix" rules={[{ required: true }]}>
                <Input placeholder="INV-" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="invoiceVatRate" label="Tax Rate (%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="invoiceSignatory" label="Signatory Title">
                <Input placeholder="Authorized Signatory" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="invoicePaymentTerms" label="Payment Terms Note">
            <TextArea rows={3} placeholder="Payment settlement instructions..." />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'handover',
      label: 'Handover & Inspection Sheet',
      children: (
        <>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="handoverPrefix" label="Sheet Prefix" rules={[{ required: true }]}>
                <Input placeholder="HO-" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="checklistItems" label="Inspection Checklist Items (One per line)">
            <TextArea rows={6} placeholder="Enter checklist items..." />
          </Form.Item>
        </>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Print Templates"
        extra={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => handleOpenPreview('agreement')}>
              Preview Agreement
            </Button>
            <Button icon={<FileTextOutlined />} onClick={() => handleOpenPreview('invoice')}>
              Preview Invoice
            </Button>
            <Button icon={<SafetyCertificateOutlined />} onClick={() => handleOpenPreview('handover')}>
              Preview Handover
            </Button>
          </Space>
        }
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={(values) => saveMutation.mutate(values)}>
          <Divider titlePlacement="left">Header Information</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="Business Name" rules={[{ required: true }]}>
                <Input placeholder="Rental Company Pvt. Ltd." />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="registrationNumber" label="Registration #">
                <Input placeholder="REG-102938" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="taxId" label="PAN / Tax ID" rules={[{ required: true }]}>
                <Input placeholder="PAN: 601234567" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="headquartersAddress" label="Address">
                <Input placeholder="Kathmandu, Nepal" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="+977-1-4200000" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name="email" label="Email">
                <Input placeholder="contact@rental.com" />
              </Form.Item>
            </Col>
          </Row>

          <Divider titlePlacement="left">Templates</Divider>

          <Tabs defaultActiveKey="agreement" items={items} />

          <Divider style={{ margin: '24px 0' }} />

          <Button
            type="primary"
            size="large"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
          >
            Save Changes
          </Button>
        </Form>
      </Card>
    </PageContainer>
  )
}

export default PrintTemplatesSettingsPage
