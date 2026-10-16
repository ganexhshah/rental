import React, { useMemo } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp, theme as antTheme } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useThemeStore, FONT_STACKS } from '@/store/useThemeStore'
import { AppRouter } from '@/app/router/AppRouter'

// Instantiate QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
})

export const App: React.FC = () => {
  const { mode, primaryColor, borderRadius, compact, fontPreset } = useThemeStore()

  const currentFont = useMemo(() => {
    return FONT_STACKS[fontPreset] || FONT_STACKS.modern
  }, [fontPreset])

  React.useEffect(() => {
    document.documentElement.style.setProperty('--font-sans', currentFont.primary)
    document.documentElement.style.setProperty('--font-display', currentFont.display)
  }, [currentFont])

  const algorithm = useMemo(() => {
    const algos = []
    if (mode === 'dark') {
      algos.push(antTheme.darkAlgorithm)
    } else {
      algos.push(antTheme.defaultAlgorithm)
    }
    if (compact) {
      algos.push(antTheme.compactAlgorithm)
    }
    return algos
  }, [mode, compact])

  const themeConfig = useMemo(
    () => ({
      algorithm,
      token: {
        colorPrimary: primaryColor || '#1677ff',
        borderRadius: borderRadius || 8,
        fontFamily: currentFont.primary,
        fontFamilyCode: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
        colorBgLayout: mode === 'dark' ? '#0f172a' : '#ffffff',
        colorBgContainer: mode === 'dark' ? '#1e293b' : '#ffffff',
        colorBgBase: mode === 'dark' ? '#0f172a' : '#ffffff',
      },
      components: {
        Layout: {
          headerBg: mode === 'dark' ? '#1e293b' : '#ffffff',
          headerColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.88)',
          siderBg: mode === 'dark' ? '#1e293b' : '#ffffff',
          bodyBg: mode === 'dark' ? '#0f172a' : '#ffffff',
        },
      },
    }),
    [algorithm, primaryColor, borderRadius, currentFont, mode]
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={themeConfig}>
        <AntApp>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default App
