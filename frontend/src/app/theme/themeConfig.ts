import { theme as antdTheme, ThemeConfig } from 'antd'

export function getThemeConfig(isDark: boolean, primaryColor: string = '#1677ff', borderRadius: number = 8): ThemeConfig {
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: primaryColor,
      borderRadius: borderRadius,
      fontFamily: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
      colorLink: primaryColor,
      fontSize: 14,
      controlHeight: 36,
      colorBgBase: isDark ? '#141414' : '#ffffff',
      colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
      colorBgElevated: isDark ? '#262626' : '#ffffff',
      colorBgLayout: isDark ? '#0f0f0f' : '#f5f7fa',
      colorBorder: isDark ? '#303030' : '#e5e7eb',
      colorBorderSecondary: isDark ? '#262626' : '#f0f2f5',
      boxShadow: isDark
        ? '0 4px 12px rgba(0, 0, 0, 0.45)'
        : '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
      boxShadowSecondary: isDark
        ? '0 8px 24px rgba(0, 0, 0, 0.65)'
        : '0 4px 16px rgba(0, 0, 0, 0.08)',
    },
    components: {
      Layout: {
        headerBg: isDark ? '#1a1a1a' : '#ffffff',
        siderBg: isDark ? '#141414' : '#ffffff',
        bodyBg: isDark ? '#0f0f0f' : '#f5f7fa',
        headerHeight: 64,
        headerPadding: '0 24px',
      },
      Menu: {
        itemBorderRadius: borderRadius - 2,
        itemMarginInline: 8,
        itemMarginBlock: 4,
        subMenuItemBg: 'transparent',
      },
      Card: {
        borderRadiusLG: borderRadius + 2,
        colorBgContainer: isDark ? '#1f1f1f' : '#ffffff',
        boxShadowTertiary: isDark
          ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      },
      Table: {
        headerBg: isDark ? '#262626' : '#fafafa',
        headerColor: isDark ? 'rgba(255, 255, 255, 0.85)' : '#374151',
        rowHoverBg: isDark ? '#262626' : '#f9fafb',
        borderRadiusLG: borderRadius,
      },
      Button: {
        controlHeight: 36,
        borderRadius: borderRadius,
        fontWeight: 500,
      },
      Input: {
        controlHeight: 36,
        borderRadius: borderRadius,
      },
      Select: {
        controlHeight: 36,
        borderRadius: borderRadius,
      },
      Tabs: {
        titleFontSize: 14,
      },
    },
  }
}
