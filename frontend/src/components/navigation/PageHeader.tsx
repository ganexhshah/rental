import React from 'react'
import { Space, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { Breadcrumbs } from './Breadcrumbs'

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  backUrl?: string
  showBack?: boolean
  extra?: React.ReactNode
  tags?: React.ReactNode
  showBreadcrumbs?: boolean
  style?: React.CSSProperties
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backUrl,
  showBack = false,
  extra,
  tags,
  showBreadcrumbs = true,
  style,
}) => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl)
    } else {
      navigate(-1)
    }
  }

  return (
    <div style={{ marginBottom: 20, ...style }}>
      {showBreadcrumbs && <Breadcrumbs />}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showBack && (
            <Button
              icon={<ArrowLeftOutlined />}
              type="text"
              onClick={handleBack}
              style={{ fontSize: 16, padding: '4px 8px' }}
            />
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'inherit',
                  lineHeight: 1.3,
                }}
              >
                {title}
              </h1>
              {tags}
            </div>
            {subtitle && (
              <div
                style={{
                  fontSize: 13,
                  color: 'rgba(0, 0, 0, 0.45)',
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {extra && <Space wrap size="middle">{extra}</Space>}
      </div>
    </div>
  )
}
