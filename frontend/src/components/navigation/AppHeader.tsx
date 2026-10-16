import React, { useState, useEffect } from 'react'
import {
  Layout,
  Button,
  Space,
  Dropdown,
  Avatar,
  Badge,
  Popover,
  List,
  Modal,
  Input,
  Tag,
  Divider,
  Empty,
  Grid,
  Spin,
  theme,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  PlusOutlined,
  SunOutlined,
  MoonOutlined,
  BellOutlined,
  UserOutlined,
  ShopOutlined,
  CheckCircleOutlined,
  CarOutlined,
  DollarOutlined,
  CheckSquareOutlined,
  SwapOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { apiGet } from '@/lib/api/client'
import type { UserRole } from '@/types/auth'

const { Header } = Layout
const { useBreakpoint } = Grid

export const AppHeader: React.FC = () => {
  const { collapsed, toggleCollapse, mobileOpen, setMobileOpen } = useSidebarStore()
  const { mode, toggleTheme, primaryColor } = useThemeStore()
  const { token } = theme.useToken()
  const { user, tenant, availableTenants, switchTenant, logout, fetchCurrentUser } = useAuthStore()
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = screens.md === false

  useEffect(() => {
    fetchCurrentUser()
    fetchNotifications()
    const pollInterval = setInterval(() => {
      fetchNotifications()
    }, 30000)
    return () => clearInterval(pollInterval)
  }, [user?.id, tenant.id])

  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    vehicles: any[]
    customers: any[]
    bookings: any[]
  }>({ vehicles: [], customers: [], bookings: [] })

  // Live Backend Search effect
  useEffect(() => {
    if (!searchModalOpen) {
      setSearchQuery('')
      setSearchResults({ vehicles: [], customers: [], bookings: [] })
      setIsSearching(false)
      return
    }
  }, [searchModalOpen])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults({ vehicles: [], customers: [], bookings: [] })
      setIsSearching(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const q = encodeURIComponent(trimmed)
      try {
        const [vRes, cRes, bRes] = await Promise.all([
          apiGet<any[]>(`/vehicles?search=${q}&limit=5`).catch(() => []),
          apiGet<any[]>(`/customers?search=${q}&limit=5`).catch(() => []),
          apiGet<any[]>(`/bookings?search=${q}&limit=5`).catch(() => []),
        ])
        setSearchResults({
          vehicles: Array.isArray(vRes) ? vRes : (vRes as any)?.items || [],
          customers: Array.isArray(cRes) ? cRes : (cRes as any)?.items || [],
          bookings: Array.isArray(bRes) ? bRes : (bRes as any)?.items || [],
        })
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const quickActionItems: MenuProps['items'] = [
    {
      key: 'new-booking',
      icon: <CheckSquareOutlined />,
      label: 'New Booking',
      onClick: () => navigate('/operations/bookings'),
    },
    {
      key: 'add-vehicle',
      icon: <CarOutlined />,
      label: 'Add Vehicle',
      onClick: () => navigate('/vehicles/new'),
    },
    {
      key: 'add-customer',
      icon: <UserOutlined />,
      label: 'Add Customer',
      onClick: () => navigate('/customers/all'),
    },
    {
      type: 'divider',
    },
    {
      key: 'record-payment',
      icon: <DollarOutlined />,
      label: 'Record Payment',
      onClick: () => navigate('/payments/transactions'),
    },
    {
      key: 'start-rental',
      icon: <CheckCircleOutlined />,
      label: 'Start Rental (Pickup)',
      onClick: () => navigate('/operations/pickup-return'),
    },
  ]

  const tenantItems: MenuProps['items'] = availableTenants.map((t) => ({
    key: t.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 200 }}>
        <div>
          <div style={{ fontWeight: t.id === tenant.id ? 700 : 400 }}>{t.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>{t.plan.toUpperCase()} • {t.currency}</div>
        </div>
        {t.id === tenant.id && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
      </div>
    ),
    onClick: () => switchTenant(t.id),
  }))

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-header',
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{user?.email}</div>
          <Tag color="blue" style={{ marginTop: 4 }}>
            Role: {user?.role?.toUpperCase()}
          </Tag>
        </div>
      ),
      disabled: true,
    },

    { type: 'divider' },
    {
      key: 'settings',
      label: 'Account & Company Settings',
      onClick: () => navigate('/settings/company'),
    },
    {
      key: 'logout',
      label: 'Sign Out',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => {
        logout()
        navigate('/login')
      },
    },
  ]

  const notificationContent = (
    <div style={{ width: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
        <span style={{ fontWeight: 600 }}>Notifications ({unreadCount})</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllAsRead}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Empty description="No notifications" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      ) : (
        <List
          size="small"
          dataSource={notifications.slice(0, 5)}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '8px 4px',
                backgroundColor: item.read ? 'transparent' : 'rgba(22, 119, 255, 0.04)',
                cursor: 'pointer',
                borderRadius: 4,
              }}
              onClick={() => {
                markAsRead(item.id)
                if (item.link) navigate(item.link)
              }}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ fontWeight: item.read ? 400 : 600 }}>{item.title}</span>
                    {!item.read && <Badge status="processing" />}
                  </div>
                }
                description={<div style={{ fontSize: 12 }}>{item.message}</div>}
              />
            </List.Item>
          )}
        />
      )}

      <Divider style={{ margin: '8px 0' }} />
      <Button type="link" block size="small" onClick={() => navigate('/notifications/center')}>
        View all notifications
      </Button>
    </div>
  )

  const handleGlobalSearch = (val: string) => {
    setSearchQuery(val)
    if (!val) return
    const q = val.toLowerCase()
    if (q.includes('veh') || q.includes('car') || q.includes('tesla')) {
      navigate('/vehicles/all')
      setSearchModalOpen(false)
    } else if (q.includes('book') || q.includes('rent')) {
      navigate('/operations/bookings')
      setSearchModalOpen(false)
    } else if (q.includes('cust') || q.includes('user')) {
      navigate('/customers/all')
      setSearchModalOpen(false)
    } else if (q.includes('pay') || q.includes('inv')) {
      navigate('/payments/transactions')
      setSearchModalOpen(false)
    }
  }

  return (
    <Header
      style={{
        padding: isMobile ? '0 12px' : '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 99,
        flexShrink: 0,
        background: token.colorBgContainer,
        color: token.colorText,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      <Space size={isMobile ? 'small' : 'middle'}>
        <Button
          type="text"
          icon={isMobile ? (mobileOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />) : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
          onClick={() => {
            if (isMobile) {
              setMobileOpen(!mobileOpen)
            } else {
              toggleCollapse()
            }
          }}
          style={{ fontSize: 16 }}
        />

        <Dropdown menu={{ items: tenantItems }} trigger={['click']}>
          <Button icon={<ShopOutlined />} style={{ fontWeight: 500, borderColor: token.colorBorderSecondary, maxWidth: isMobile ? 120 : 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tenant.name}
          </Button>
        </Dropdown>
      </Space>

      <Space size={isMobile ? 'small' : 'middle'}>
        {isMobile ? (
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchModalOpen(true)}
            type="text"
          />
        ) : (
          <Button
            icon={<SearchOutlined />}
            onClick={() => setSearchModalOpen(true)}
            style={{
              width: 180,
              textAlign: 'left',
              color: token.colorTextSecondary,
              background: token.colorFillAlter,
              borderColor: token.colorBorderSecondary,
            }}
          >
            Search... <span style={{ float: 'right', fontSize: 11, opacity: 0.6 }}>Ctrl+K</span>
          </Button>
        )}

        {!isMobile && (
          <Dropdown menu={{ items: quickActionItems }} trigger={['click']}>
            <Button type="primary" icon={<PlusOutlined />}>
              New
            </Button>
          </Dropdown>
        )}

        <Button
          type="text"
          icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        />

        <Popover content={notificationContent} trigger="click" placement="bottomRight">
          <Badge count={unreadCount} size="small" offset={[-2, 4]}>
            <Button type="text" icon={<BellOutlined style={{ fontSize: 17 }} />} />
          </Badge>
        </Popover>

        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Avatar src={user?.avatarUrl} icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary || '#1677ff' }} />
          </div>
        </Dropdown>
      </Space>

      <Modal
        open={searchModalOpen}
        onCancel={() => setSearchModalOpen(false)}
        footer={null}
        title="Global Search"
        destroyOnHidden
      >
        <div style={{ marginTop: 12 }}>
          <Input.Search
            placeholder="Search vehicles, customers, booking codes from backend..."
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            loading={isSearching}
            autoFocus
            allowClear
          />

          {isSearching && (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <Spin tip="Searching live backend database..." />
            </div>
          )}

          {!isSearching && searchQuery.trim() && (
            <div style={{ marginTop: 16, maxHeight: 380, overflowY: 'auto' }}>
              {searchResults.vehicles.length === 0 &&
              searchResults.customers.length === 0 &&
              searchResults.bookings.length === 0 ? (
                <Empty description={`No results found for "${searchQuery}"`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {searchResults.vehicles.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary, marginBottom: 8 }}>
                        🚗 VEHICLES ({searchResults.vehicles.length})
                      </div>
                      <List
                        size="small"
                        dataSource={searchResults.vehicles}
                        renderItem={(v) => (
                          <List.Item
                            style={{ cursor: 'pointer', borderRadius: 6, padding: '8px 12px', border: `1px solid ${token.colorBorderSecondary}`, marginBottom: 6 }}
                            onClick={() => {
                              navigate(`/vehicles/${v.id}`)
                              setSearchModalOpen(false)
                            }}
                          >
                            <List.Item.Meta
                              title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{v.make} {v.model} ({v.year})</span>
                                  <Tag color={v.status === 'available' ? 'green' : v.status === 'rented' ? 'orange' : 'blue'}>
                                    {v.status?.toUpperCase()}
                                  </Tag>
                                </div>
                              }
                              description={
                                <div style={{ fontSize: 12, color: token.colorTextTertiary }}>
                                  Plate: <span style={{ fontWeight: 600 }}>{v.plate_number}</span> • Daily Rate: Rs. {Number(v.daily_rate || 0).toLocaleString()}
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  )}

                  {searchResults.customers.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary, marginBottom: 8 }}>
                        👤 CUSTOMERS ({searchResults.customers.length})
                      </div>
                      <List
                        size="small"
                        dataSource={searchResults.customers}
                        renderItem={(c) => (
                          <List.Item
                            style={{ cursor: 'pointer', borderRadius: 6, padding: '8px 12px', border: `1px solid ${token.colorBorderSecondary}`, marginBottom: 6 }}
                            onClick={() => {
                              navigate(`/customers/${c.id}`)
                              setSearchModalOpen(false)
                            }}
                          >
                            <List.Item.Meta
                              title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>{c.full_name || `${c.first_name || ''} ${c.last_name || ''}`}</span>
                                  <Tag color={c.verification_status === 'verified' ? 'green' : 'gold'}>
                                    {c.verification_status?.toUpperCase() || 'ACTIVE'}
                                  </Tag>
                                </div>
                              }
                              description={
                                <div style={{ fontSize: 12, color: token.colorTextTertiary }}>
                                  Phone: {c.phone} • Email: {c.email || 'N/A'} • Code: {c.customer_code}
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  )}

                  {searchResults.bookings.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary, marginBottom: 8 }}>
                        📅 BOOKINGS ({searchResults.bookings.length})
                      </div>
                      <List
                        size="small"
                        dataSource={searchResults.bookings}
                        renderItem={(b) => (
                          <List.Item
                            style={{ cursor: 'pointer', borderRadius: 6, padding: '8px 12px', border: `1px solid ${token.colorBorderSecondary}`, marginBottom: 6 }}
                            onClick={() => {
                              navigate(`/operations/bookings`)
                              setSearchModalOpen(false)
                            }}
                          >
                            <List.Item.Meta
                              title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 600 }}>{b.booking_code}</span>
                                  <Tag color={b.status === 'confirmed' ? 'green' : b.status === 'active' ? 'blue' : 'gold'}>
                                    {b.status?.toUpperCase()}
                                  </Tag>
                                </div>
                              }
                              description={
                                <div style={{ fontSize: 12, color: token.colorTextTertiary }}>
                                  Customer: {b.customer_name} • Vehicle: {b.vehicle_make} {b.vehicle_model} • Total: Rs. {Number(b.total_amount || 0).toLocaleString()}
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!searchQuery.trim() && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>Quick Navigation</div>
              <Space wrap>
                <Tag style={{ cursor: 'pointer' }} onClick={() => { navigate('/vehicles/all'); setSearchModalOpen(false); }}>
                  Vehicles
                </Tag>
                <Tag style={{ cursor: 'pointer' }} onClick={() => { navigate('/operations/bookings'); setSearchModalOpen(false); }}>
                  Bookings
                </Tag>
                <Tag style={{ cursor: 'pointer' }} onClick={() => { navigate('/customers/all'); setSearchModalOpen(false); }}>
                  Customers
                </Tag>
                <Tag style={{ cursor: 'pointer' }} onClick={() => { navigate('/payments/transactions'); setSearchModalOpen(false); }}>
                  Payments
                </Tag>
                <Tag style={{ cursor: 'pointer' }} onClick={() => { navigate('/contracts/all'); setSearchModalOpen(false); }}>
                  Contracts
                </Tag>
              </Space>
            </div>
          )}
        </div>
      </Modal>
    </Header>
  )
}
