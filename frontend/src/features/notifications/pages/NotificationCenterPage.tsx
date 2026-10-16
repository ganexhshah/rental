import React, { useState, useEffect } from 'react'
import {
  List,
  Button,
  Tag,
  Card,
  Space,
  Badge,
  Tabs,
  Typography,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  Table,
  Spin,
  Tooltip,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  MailOutlined,
  MessageOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNotificationStore } from '@/store/useNotificationStore'
import { notificationsApi, type NotificationDelivery } from '../api'
import type { NotificationType } from '@/types/notification'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { DateDisplay } from '@/components/data-display/DateDisplay'

const { Text, Paragraph } = Typography

export const NotificationCenterPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    notifications,
    unreadCount,
    isLoading: storeLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    addNotification,
  } = useNotificationStore()

  const [mainTab, setMainTab] = useState<'inbox' | 'deliveries'>('inbox')
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'booking' | 'payment' | 'maintenance'>('all')
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchNotifications()
  }, [])

  // Fetch delivery logs from backend
  const { data: deliveries = [], isLoading: deliveriesLoading, refetch: refetchDeliveries } = useQuery({
    queryKey: ['notification-deliveries'],
    queryFn: () => notificationsApi.getDeliveries(),
    enabled: mainTab === 'deliveries',
  })

  const filteredNotifications = notifications.filter((n) => {
    if (inboxFilter === 'unread') return !n.read
    if (inboxFilter === 'booking') return n.type.includes('booking')
    if (inboxFilter === 'payment') return n.type.includes('payment')
    if (inboxFilter === 'maintenance') return n.type.includes('maintenance') || n.type.includes('overdue')
    return true
  })

  const handleSendBroadcast = async (values: any) => {
    setIsSending(true)
    try {
      await addNotification({
        title: values.title,
        message: values.body,
        type: values.type || 'system_alert',
        link: values.link,
      })
      message.success('Notification dispatched successfully')
      form.resetFields()
      setIsSendModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['notification-deliveries'] })
    } catch {
      message.error('Failed to dispatch notification')
    } finally {
      setIsSending(false)
    }
  }

  const deliveryColumns: ColumnsType<NotificationDelivery> = [
    {
      title: 'Recipient',
      dataIndex: 'recipient',
      key: 'recipient',
      render: (r: string) => <span style={{ fontWeight: 600 }}>{r}</span>,
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (ch: string) => {
        let icon = <BellOutlined />
        let color = 'default'
        if (ch === 'email') {
          icon = <MailOutlined />
          color = 'blue'
        } else if (ch === 'sms') {
          icon = <MessageOutlined />
          color = 'green'
        } else if (ch === 'whatsapp') {
          icon = <WhatsAppOutlined />
          color = 'success'
        }
        return (
          <Tag icon={icon} color={color}>
            {ch.toUpperCase()}
          </Tag>
        )
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'sent' || st === 'delivered' ? 'green' : st === 'failed' ? 'red' : 'gold'}>
          {st.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Attempts',
      dataIndex: 'attempts',
      key: 'attempts',
      align: 'center',
    },
    {
      title: 'Dispatched At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => <DateDisplay date={d} showTime />,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Notification Center"
        subtitle="Operational broadcast alerts, automated customer milestones, fleet warnings, and live system delivery logs."
        extra={
          <Space wrap size="small">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchNotifications()
                if (mainTab === 'deliveries') refetchDeliveries()
                message.info('Refreshed notifications')
              }}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setIsSendModalOpen(true)}
            >
              Send Alert
            </Button>
            {unreadCount > 0 && (
              <Button icon={<CheckCircleOutlined />} onClick={markAllAsRead}>
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button danger icon={<DeleteOutlined />} onClick={clearAll}>
                Clear
              </Button>
            )}
          </Space>
        }
      />

      <Card bordered={false} bodyStyle={{ padding: 20 }}>
        <Tabs
          activeKey={mainTab}
          onChange={(k) => setMainTab(k as any)}
          items={[
            {
              key: 'inbox',
              label: (
                <Space>
                  <BellOutlined />
                  <span>Inbox ({notifications.length})</span>
                  {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
                </Space>
              ),
            },
            {
              key: 'deliveries',
              label: (
                <Space>
                  <SendOutlined />
                  <span>Live Delivery Logs</span>
                </Space>
              ),
            },
          ]}
        />

        {mainTab === 'inbox' && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button
                size="small"
                type={inboxFilter === 'all' ? 'primary' : 'default'}
                onClick={() => setInboxFilter('all')}
              >
                All ({notifications.length})
              </Button>
              <Button
                size="small"
                type={inboxFilter === 'unread' ? 'primary' : 'default'}
                onClick={() => setInboxFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
              <Button
                size="small"
                type={inboxFilter === 'booking' ? 'primary' : 'default'}
                onClick={() => setInboxFilter('booking')}
              >
                Bookings
              </Button>
              <Button
                size="small"
                type={inboxFilter === 'payment' ? 'primary' : 'default'}
                onClick={() => setInboxFilter('payment')}
              >
                Payments
              </Button>
              <Button
                size="small"
                type={inboxFilter === 'maintenance' ? 'primary' : 'default'}
                onClick={() => setInboxFilter('maintenance')}
              >
                Fleet & Maintenance
              </Button>
            </div>

            {storeLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" tip="Loading notifications..." />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <Empty
                  description={
                    <div>
                      <Paragraph strong style={{ fontSize: 16, marginBottom: 4 }}>
                        {inboxFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                      </Paragraph>
                      <Text type="secondary">
                        {inboxFilter === 'unread'
                          ? "You've read all alerts. You're completely up to date!"
                          : 'Your workspace inbox has no alerts. Real operational events will appear here automatically.'}
                      </Text>
                    </div>
                  }
                >
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => setIsSendModalOpen(true)}
                    style={{ marginTop: 12 }}
                  >
                    Send Test Alert
                  </Button>
                </Empty>
              </div>
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={filteredNotifications}
                renderItem={(item) => (
                  <List.Item
                    style={{
                      background: item.read ? 'transparent' : 'rgba(22, 119, 255, 0.04)',
                      padding: '16px 20px',
                      borderRadius: 8,
                      marginBottom: 8,
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                    }}
                    actions={[
                      !item.read && (
                        <Button
                          size="small"
                          type="link"
                          onClick={() => markAsRead(item.id)}
                        >
                          Mark read
                        </Button>
                      ),
                      item.link && (
                        <Button
                          size="small"
                          type="primary"
                          ghost
                          icon={<ArrowRightOutlined />}
                          onClick={() => {
                            markAsRead(item.id)
                            navigate(item.link!)
                          }}
                        >
                          View
                        </Button>
                      ),
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeNotification(item.id)}
                      />,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        item.type.includes('overdue') || item.type.includes('alert') ? (
                          <WarningOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                        ) : item.type.includes('payment') ? (
                          <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        ) : (
                          <InfoCircleOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                        )
                      }
                      title={
                        <Space>
                          <span style={{ fontWeight: item.read ? 500 : 700 }}>{item.title}</span>
                          {!item.read && <Badge status="processing" />}
                          <Tag style={{ fontSize: 11 }}>{item.type.replace('_', ' ').toUpperCase()}</Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div style={{ color: '#595959', fontSize: 13, marginBottom: 4 }}>
                            {item.message}
                          </div>
                          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                            <DateDisplay date={item.createdAt} showTime />
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        )}

        {mainTab === 'deliveries' && (
          <div>
            <Table
              rowKey="id"
              columns={deliveryColumns}
              dataSource={deliveries}
              loading={deliveriesLoading}
              pagination={{ pageSize: 15 }}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      <div>
                        <Paragraph strong style={{ fontSize: 15, marginBottom: 2 }}>
                          No dispatch logs found
                        </Paragraph>
                        <Text type="secondary">
                          Automated email, SMS, and in-app logs will appear here when notifications are triggered.
                        </Text>
                      </div>
                    }
                  />
                ),
              }}
            />
          </div>
        )}
      </Card>

      {/* Send Notification Modal */}
      <Modal
        title="Broadcast / Send Notification"
        open={isSendModalOpen}
        onCancel={() => setIsSendModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={isSending}
        okText="Dispatch Alert"
        width={560}
      >
        <Form form={form} layout="vertical" onFinish={handleSendBroadcast} initialValues={{ type: 'system_alert', channel: 'in_app' }}>
          <Form.Item
            name="title"
            label="Notification Title"
            rules={[{ required: true, message: 'Please enter notification title' }]}
          >
            <Input placeholder="e.g. Schedule Maintenance Alert or Fleet Milestone" size="large" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Notification Category"
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Select.Option value="system_alert">System Alert / Broadcast</Select.Option>
              <Select.Option value="booking_created">Booking / Reservation Event</Select.Option>
              <Select.Option value="payment_received">Payment & Invoicing</Select.Option>
              <Select.Option value="maintenance_due">Fleet & Maintenance</Select.Option>
              <Select.Option value="pickup_due">Pickup Reminder</Select.Option>
              <Select.Option value="return_overdue">Return Overdue</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="body"
            label="Notification Message / Body"
            rules={[{ required: true, message: 'Please enter message content' }]}
          >
            <Input.TextArea rows={4} placeholder="Enter description or operational details..." />
          </Form.Item>

          <Form.Item
            name="link"
            label="Target Navigation Route (Optional)"
          >
            <Input placeholder="/operations/bookings, /vehicles/all, /payments/transactions" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}

export default NotificationCenterPage
