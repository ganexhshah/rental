import React, { useMemo } from 'react'
import { ConfigProvider, App as AntdApp } from 'antd'
import enUS from 'antd/locale/en_US'
import { useThemeStore } from '@/store/useThemeStore'
import { getThemeConfig } from './themeConfig'

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { mode, primaryColor, borderRadius } = useThemeStore()
  const isDark = mode === 'dark'

  const themeConfig = useMemo(
    () => getThemeConfig(isDark, primaryColor, borderRadius),
    [isDark, primaryColor, borderRadius]
  )

  return (
    <ConfigProvider theme={themeConfig} locale={enUS}>
      <AntdApp>
        <div className={isDark ? 'dark-theme' : 'light-theme'} style={{ minHeight: '100vh' }}>
          {children}
        </div>
      </AntdApp>
    </ConfigProvider>
  )
}
