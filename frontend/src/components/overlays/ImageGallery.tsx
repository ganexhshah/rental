import React from 'react'
import { Image, Row, Col, Typography } from 'antd'

const { Text } = Typography

interface ImageGalleryProps {
  images: string[]
  title?: string
  height?: number | string
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title, height = 120 }) => {
  if (!images || images.length === 0) {
    return <Text type="secondary">No photos available</Text>
  }

  // Filter out falsy or duplicate URLs while preserving order
  const cleanImages = Array.from(new Set(images.filter(Boolean)))

  return (
    <div>
      {title && <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>}
      <Image.PreviewGroup>
        <Row gutter={[8, 8]}>
          {cleanImages.map((img, index) => (
            <Col xs={12} sm={8} md={6} key={`${img}-${index}`}>
              <Image
                src={img}
                alt={`Photo ${index + 1}`}
                style={{
                  width: '100%',
                  height,
                  objectFit: 'cover',
                  borderRadius: 6,
                }}
              />
            </Col>
          ))}
        </Row>
      </Image.PreviewGroup>
    </div>
  )
}

