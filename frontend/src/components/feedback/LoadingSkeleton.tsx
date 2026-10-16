import React from 'react'
import { Skeleton, Card, Row, Col } from 'antd'

interface LoadingSkeletonProps {
  type?: 'table' | 'card' | 'details' | 'stats'
  rows?: number
  count?: number
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'table',
  rows = 5,
  count = 4,
}) => {
  if (type === 'stats') {
    return (
      <Row gutter={[16, 16]}>
        {Array.from({ length: count }).map((_, i) => (
          <Col xs={24} sm={12} lg={6} key={i}>
            <Card bordered={false}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  if (type === 'card') {
    return (
      <Row gutter={[16, 16]}>
        {Array.from({ length: count }).map((_, i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={i}>
            <Card bordered={false} cover={<div style={{ height: 180, background: '#f0f0f0' }} />}>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  if (type === 'details') {
    return (
      <Card bordered={false}>
        <Skeleton active avatar paragraph={{ rows: 8 }} />
      </Card>
    )
  }

  return (
    <Card bordered={false}>
      <Skeleton active paragraph={{ rows }} />
    </Card>
  )
}
