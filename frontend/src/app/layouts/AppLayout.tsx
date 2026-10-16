import React from 'react'
import { Layout, Grid, theme } from 'antd'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/navigation/AppSidebar'
import { AppHeader } from '@/components/navigation/AppHeader'

const { Content } = Layout
const { useBreakpoint } = Grid

export const AppLayout: React.FC = () => {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = screens.md === false

  return (
    <Layout style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: token.colorBgLayout }}>
      <AppSidebar />
      <Layout
        style={{
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          flex: 1,
          background: token.colorBgLayout,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <AppHeader />
        <Content
          style={{
            margin: 0,
            padding: isMobile ? '12px 12px 28px' : '24px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            background: token.colorBgLayout,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout

