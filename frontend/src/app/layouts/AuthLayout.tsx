import React from 'react'
import { Layout, theme } from 'antd'
import { Outlet } from 'react-router-dom'
import { useThemeStore } from '@/store/useThemeStore'

const { Content } = Layout

export const AuthLayout: React.FC = () => {
  const { token } = theme.useToken()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'

  return (
    <Layout
      style={{
        minHeight: '100vh',
        background: isDark
          ? '#0f0f0f'
          : `radial-gradient(ellipse at top, #ffffff 0%, #f4f6fa 70%, #ebedf3 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle modern geometric background accent */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: isDark
            ? 'radial-gradient(circle, rgba(22, 119, 255, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(22, 119, 255, 0.07) 0%, rgba(22, 119, 255, 0.02) 40%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />

      <Content
        style={{
          width: '100%',
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  )
}

export default AuthLayout
