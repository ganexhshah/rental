import React, { useMemo } from 'react'
import { Layout, Menu, Drawer, Grid, theme, Badge } from 'antd'
import type { MenuProps } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  CalendarOutlined,
  CarOutlined,
  UserOutlined,
  CreditCardOutlined,
  FileDoneOutlined,
  ToolOutlined,
  DollarOutlined,
  BarChartOutlined,
  GiftOutlined,
  TeamOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { apiGet } from '@/lib/api/client'
import { hasPermission } from '@/lib/permissions'
import type { Permission } from '@/types/auth'

const { Sider } = Layout
const { useBreakpoint } = Grid

type MenuItem = Required<MenuProps>['items'][number] & {
  requiredPermission?: Permission
  children?: MenuItem[]
}

export const AppSidebar: React.FC = () => {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebarStore()
  const { user, tenant } = useAuthStore()
  const { mode } = useThemeStore()
  const { token } = theme.useToken()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const location = useLocation()
  const screens = useBreakpoint()
  const isMobile = screens.md === false

  const { data: summary } = useQuery({
    queryKey: ['sidebar', 'summary'],
    queryFn: async () => {
      try {
        const res = await apiGet<any>('/dashboard/summary')
        return res
      } catch {
        return null
      }
    },
    refetchInterval: 30000,
  })

  const menuConfig: MenuItem[] = useMemo(
    () => [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
        requiredPermission: 'dashboard:view',
      },
      {
        key: '/operations',
        icon: <CalendarOutlined />,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Operations</span>
            {summary?.today_bookings ? (
              <Badge count={summary.today_bookings} size="small" style={{ backgroundColor: '#13c2c2' }} />
            ) : null}
          </div>
        ),
        requiredPermission: 'bookings:view',
        children: [
          {
            key: '/operations/bookings',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>All Bookings</span>
                {summary?.today_bookings ? <Badge count={summary.today_bookings} size="small" /> : null}
              </div>
            ),
          },
          { key: '/operations/calendar', label: 'Calendar' },
          { key: '/operations/pickup-return', label: 'Pickup & Return' },
          {
            key: '/operations/active-rentals',
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Active Rentals</span>
                {summary?.active_bookings ? <Badge count={summary.active_bookings} size="small" style={{ backgroundColor: '#722ed1' }} /> : null}
              </div>
            ),
          },
          { key: '/operations/availability', label: 'Availability' },
        ],
      },
      {
        key: '/vehicles',
        icon: <CarOutlined />,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Vehicles</span>
            {summary?.total_vehicles ? <Badge count={summary.total_vehicles} size="small" style={{ backgroundColor: '#52c41a' }} /> : null}
          </div>
        ),
        requiredPermission: 'vehicles:view',
        children: [
          { key: '/vehicles/all', label: 'All Vehicles' },
          { key: '/vehicles/categories', label: 'Categories' },
          { key: '/vehicles/documents', label: 'Documents' },
          { key: '/vehicles/maintenance', label: 'Maintenance' },
          { key: '/vehicles/locations', label: 'Locations' },
        ],
      },
      {
        key: '/customers',
        icon: <UserOutlined />,
        label: 'Customers',
        requiredPermission: 'customers:view',
        children: [
          { key: '/customers/all', label: 'All Customers' },
          { key: '/customers/documents', label: 'Documents' },
          { key: '/customers/drivers', label: 'Drivers' },
          { key: '/customers/history', label: 'Rental History' },
          { key: '/customers/blacklist', label: 'Blacklist' },
        ],
      },
      {
        key: '/payments/transactions',
        icon: <CreditCardOutlined />,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Payments</span>
            {summary?.pending_payments ? <Badge count={summary.pending_payments} size="small" style={{ backgroundColor: '#faad14' }} /> : null}
          </div>
        ),
        requiredPermission: 'payments:view',
      },
      {
        key: '/contracts',
        icon: <FileDoneOutlined />,
        label: 'Contracts',
        requiredPermission: 'contracts:view',
        children: [
          { key: '/contracts/all', label: 'All Contracts' },
          { key: '/contracts/templates', label: 'Templates' },
          { key: '/contracts/signatures', label: 'Signatures' },
          { key: '/contracts/expiring', label: 'Expiring Contracts' },
        ],
      },
      {
        key: '/maintenance',
        icon: <ToolOutlined />,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Maintenance</span>
            {summary?.maintenance_vehicles ? <Badge count={summary.maintenance_vehicles} size="small" style={{ backgroundColor: '#ff4d4f' }} /> : null}
          </div>
        ),
        requiredPermission: 'maintenance:view',
      },
      {
        key: '/expenses',
        icon: <DollarOutlined />,
        label: 'Expenses',
        requiredPermission: 'expenses:view',
        children: [
          { key: '/expenses/all', label: 'All Expenses' },
          { key: '/expenses/fuel', label: 'Fuel' },
          { key: '/expenses/maintenance', label: 'Maintenance Costs' },
          { key: '/expenses/other', label: 'Other Expenses' },
          { key: '/expenses/categories', label: 'Categories' },
        ],
      },
      {
        key: '/reports',
        icon: <BarChartOutlined />,
        label: 'Reports',
        requiredPermission: 'reports:view',
        children: [
          { key: '/reports/revenue', label: 'Revenue' },
          { key: '/reports/fleet', label: 'Fleet Utilization' },
          { key: '/reports/pnl', label: 'Profit & Loss' },
        ],
      },
      {
        key: '/marketing',
        icon: <GiftOutlined />,
        label: 'Marketing',
        requiredPermission: 'marketing:manage',
        children: [
          { key: '/marketing/coupons', label: 'Coupons' },
          { key: '/marketing/discounts', label: 'Discounts' },
          { key: '/marketing/campaigns', label: 'Campaigns' },
          { key: '/marketing/referrals', label: 'Referral Codes' },
        ],
      },
      {
        key: '/staff',
        icon: <TeamOutlined />,
        label: 'Staff',
        requiredPermission: 'staff:view',
        children: [
          { key: '/staff/members', label: 'Staff' },
          { key: '/staff/roles', label: 'Roles & Permissions', requiredPermission: 'staff:manage' },
          { key: '/staff/activity', label: 'Activity Logs' },
        ],
      },
      {
        key: '/notifications',
        icon: <BellOutlined />,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span>Notifications</span>
            {unreadCount > 0 ? <Badge count={unreadCount} size="small" /> : null}
          </div>
        ),
        children: [
          { key: '/notifications/center', label: 'Notification Center' },
          { key: '/notifications/templates', label: 'Templates' },
          { key: '/notifications/rules', label: 'Automation Rules' },
        ],
      },
      {
        key: '/settings',
        icon: <SettingOutlined />,
        label: 'Settings',
        requiredPermission: 'settings:view',
        children: [
          { key: '/settings/company', label: 'Company' },
          { key: '/settings/templates', label: 'Print Templates' },
          { key: '/settings/locations', label: 'Locations' },
          { key: '/settings/hours', label: 'Business Hours' },
          { key: '/settings/rules', label: 'Rental Rules' },
          { key: '/settings/pricing', label: 'Pricing & Taxes' },
          { key: '/settings/payments', label: 'Payment Methods' },
          { key: '/settings/integrations', label: 'Integrations' },
          { key: '/settings/branding', label: 'Branding' },
          { key: '/settings/security', label: 'Security' },
        ],
      },
    ],
    [summary, unreadCount]
  )

  const filteredMenuItems: MenuProps['items'] = useMemo(() => {
    const filterItem = (item: MenuItem): any => {
      if (item.requiredPermission && !hasPermission(user, item.requiredPermission)) {
        return null
      }
      const { requiredPermission, ...cleanItem } = item
      if (cleanItem.children) {
        const validChildren = cleanItem.children
          .map(filterItem)
          .filter(Boolean)
        if (validChildren.length === 0) return null
        return { ...cleanItem, children: validChildren }
      }
      return cleanItem
    }

    return menuConfig.map(filterItem).filter(Boolean) as MenuProps['items']
  }, [menuConfig, user])

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/payments')) {
      return '/payments/transactions'
    }
    return location.pathname
  }, [location.pathname])
  const openKeys = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean)
    if (parts.length > 0) {
      return [`/${parts[0]}`]
    }
    return ['/dashboard']
  }, [location.pathname])

  const handleMenuClick = (key: string) => {
    navigate(key)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const renderBrand = (isDrawer = false) => (
    <div
      style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed && !isDrawer ? 'center' : 'flex-start',
        padding: collapsed && !isDrawer ? '0' : '0 20px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        cursor: 'pointer',
        flexShrink: 0,
      }}
      onClick={() => {
        navigate('/dashboard')
        if (isDrawer) setMobileOpen(false)
      }}
    >
      {tenant?.logoUrl ? (
        <img
          src={tenant.logoUrl}
          alt={tenant.name}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            objectFit: 'cover',
            backgroundColor: '#ffffff',
            border: `1px solid ${token.colorBorderSecondary}`,
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: token.colorPrimary || '#1677ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {tenant?.name ? tenant.name.trim().charAt(0).toUpperCase() : 'R'}
        </div>
      )}
      {(!collapsed || isDrawer) && (
        <div style={{ marginLeft: 12, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: token.colorText }}>
            {tenant?.name || 'Rider zone'}
          </div>
          <div style={{ fontSize: 11, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {tenant?.plan ? `${tenant.plan} Edition` : 'Fleet Operations'}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile Slide-Out Drawer */}
      <Drawer
        placement="left"
        open={mobileOpen && isMobile}
        onClose={() => setMobileOpen(false)}
        size={280}
        styles={{
          body: {
            padding: 0,
            backgroundColor: token.colorBgContainer,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
          header: { display: 'none' },
        }}
      >
        {renderBrand(true)}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
          <Menu
            mode="inline"
            className="sidebar-menu"
            selectedKeys={[selectedKey]}
            defaultOpenKeys={openKeys}
            items={filteredMenuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{
              border: 'none',
              background: 'transparent',
              paddingTop: 8,
            }}
          />
        </div>
      </Drawer>

      {/* Desktop Sider */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={250}
        className="desktop-sidebar"
        theme={mode === 'dark' ? 'dark' : 'light'}
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          height: '100vh',
          position: 'relative',
          flexShrink: 0,
          zIndex: 100,
          background: token.colorBgContainer,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          display: isMobile ? 'none' : 'block',
        }}
      >
        {renderBrand(false)}

        <Menu
          mode="inline"
          className="sidebar-menu"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={filteredMenuItems}
          onClick={({ key }) => handleMenuClick(key)}
          style={{
            border: 'none',
            borderRight: 'none',
            borderInlineEnd: 'none',
            marginTop: 8,
            background: 'transparent',
          }}
        />
      </Sider>
    </>
  )
}
