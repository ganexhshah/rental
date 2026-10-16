import React, { useEffect } from 'react'
import {
  Card,
  Form,
  TimePicker,
  Switch,
  InputNumber,
  Button,
  Row,
  Col,
  Divider,
  Space,
  App,
} from 'antd'
import {
  ClockCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { settingsApi } from '../api'
import { PageContainer } from '@/components/navigation/PageContainer'
import { PageHeader } from '@/components/navigation/PageHeader'

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

export const BusinessHoursPage: React.FC = () => {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const { data: hours, isLoading } = useQuery({
    queryKey: ['business-hours'],
    queryFn: () => settingsApi.getBusinessHours(),
  })

  useEffect(() => {
    if (hours) {
      const formValues: any = {
        twentyFourSeven: hours.twentyFourSeven || false,
        allowAfterHours: hours.allowAfterHours !== false,
        afterHoursFee: hours.afterHoursFee || 0,
      }

      DAYS.forEach((d) => {
        const dayData = hours[d.key] || { open: '08:00', close: '20:00', enabled: true }
        formValues[`${d.key}_enabled`] = dayData.enabled !== false
        formValues[`${d.key}_open`] = dayData.open ? dayjs(dayData.open, 'HH:mm') : dayjs('08:00', 'HH:mm')
        formValues[`${d.key}_close`] = dayData.close ? dayjs(dayData.close, 'HH:mm') : dayjs('20:00', 'HH:mm')
      })

      form.setFieldsValue(formValues)
    }
  }, [hours, form])

  const updateMutation = useMutation({
    mutationFn: (values: any) => {
      const payload: any = {
        twentyFourSeven: values.twentyFourSeven,
        allowAfterHours: values.allowAfterHours,
        afterHoursFee: values.afterHoursFee,
      }

      DAYS.forEach((d) => {
        payload[d.key] = {
          enabled: values[`${d.key}_enabled`],
          open: values[`${d.key}_open`] ? values[`${d.key}_open`].format('HH:mm') : '08:00',
          close: values[`${d.key}_close`] ? values[`${d.key}_close`].format('HH:mm') : '20:00',
        }
      })

      return settingsApi.updateBusinessHours(payload)
    },
    onSuccess: () => {
      message.success('Business hours saved successfully')
      queryClient.invalidateQueries({ queryKey: ['business-hours'] })
    },
    onError: () => {
      message.error('Failed to save business hours')
    },
  })

  const handleSave = (values: any) => {
    updateMutation.mutate(values)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Business Hours"
      />

      <Card bordered={false} style={{ width: '100%' }} loading={isLoading}>
        <Form form={form} layout="vertical" size="large" onFinish={handleSave}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>24/7 Operations</div>
              <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>Open all day and night every day</div>
            </div>
            <Form.Item name="twentyFourSeven" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {DAYS.map((d) => (
              <Row key={d.key} align="middle" gutter={16}>
                <Col xs={8} sm={6} md={4}>
                  <strong style={{ fontSize: 13 }}>{d.label}</strong>
                </Col>
                <Col xs={6} sm={4} md={3}>
                  <Form.Item name={`${d.key}_enabled`} valuePropName="checked" noStyle>
                    <Switch checkedChildren="Open" unCheckedChildren="Closed" />
                  </Form.Item>
                </Col>
                <Col xs={10} sm={14} md={17}>
                  <Space wrap>
                    <Form.Item name={`${d.key}_open`} noStyle>
                      <TimePicker format="HH:mm" placeholder="Open" />
                    </Form.Item>
                    <span>to</span>
                    <Form.Item name={`${d.key}_close`} noStyle>
                      <TimePicker format="HH:mm" placeholder="Close" />
                    </Form.Item>
                  </Space>
                </Col>
              </Row>
            ))}
          </div>

          <Divider titlePlacement="left" style={{ marginTop: 24 }}>After-Hours Policies</Divider>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="allowAfterHours" valuePropName="checked">
                <Switch />
                <span style={{ marginLeft: 8, fontSize: 13 }}>
                  Allow After-Hours Pickup & Return
                </span>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="afterHoursFee" label="After-Hours Fee (Rs.)">
                <InputNumber min={0} step={100} style={{ width: '100%' }} />
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

export default BusinessHoursPage

