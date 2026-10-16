import React from 'react'
import { Row, Col } from 'antd'

interface StatsGridProps {
  children: React.ReactNode
  gutter?: [number, number]
  columns?: 1 | 2 | 3 | 4 | 5 | 6
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  children,
  gutter = [16, 16],
  columns = 4,
}) => {
  const childArray = React.Children.toArray(children)

  const getColSpan = () => {
    switch (columns) {
      case 1:
        return { xs: 24 }
      case 2:
        return { xs: 24, sm: 12 }
      case 3:
        return { xs: 24, sm: 12, md: 8 }
      case 4:
        return { xs: 24, sm: 12, md: 12, lg: 6 }
      case 5:
      case 6:
        return { xs: 24, sm: 12, md: 8, lg: 4 }
      default:
        return { xs: 24, sm: 12, lg: 6 }
    }
  }

  const span = getColSpan()

  return (
    <Row gutter={gutter} style={{ marginBottom: 20 }}>
      {childArray.map((child, index) => (
        <Col {...span} key={index}>
          {child}
        </Col>
      ))}
    </Row>
  )
}
