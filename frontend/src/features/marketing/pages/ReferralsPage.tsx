import React from 'react'
import {
  Table,
  Button,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  UserSwitchOutlined,
  DollarCircleOutlined,
  GiftOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { marketingApi } from '../api'
import type { ReferralCode } from '@/types/marketing'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { CurrencyDisplay } from '@/components/data-display/CurrencyDisplay'
import { formatCurrency } from '@/lib/currency'

export const ReferralsPage: React.FC = () => {
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => marketingApi.getReferrals(),
  })

  const totalReferrals = referrals.reduce((sum, r) => sum + r.usesCount, 0)
  const totalRewards = referrals.reduce((sum, r) => sum + r.totalRewardsEarned, 0)

  const columns: ColumnsType<ReferralCode> = [
    {
      title: 'Referral Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Space>
          <Tag color="purple" style={{ fontWeight: 700, padding: '2px 8px' }}>
            {code}
          </Tag>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => {
              navigator.clipboard?.writeText(code)
              message.success(`Copied ${code}`)
            }}
          />
        </Space>
      ),
    },
    {
      title: 'Advocate / Customer',
      dataIndex: 'referrerName',
      key: 'referrerName',
      render: (name: string) => <span style={{ fontWeight: 600 }}>{name}</span>,
    },
    {
      title: 'Advocate Reward',
      dataIndex: 'referrerRewardAmount',
      key: 'referrerRewardAmount',
      render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 600 }}>${v} credit</span>,
    },
    {
      title: 'Friend Discount',
      dataIndex: 'referredDiscountPercent',
      key: 'referredDiscountPercent',
      render: (pct: number) => <Tag color="blue">{pct}% off first trip</Tag>,
    },
    {
      title: 'Successful Invites',
      dataIndex: 'usesCount',
      key: 'usesCount',
      align: 'right',
      render: (cnt: number) => <strong>{cnt} friends</strong>,
    },
    {
      title: 'Total Rewards Earned',
      dataIndex: 'totalRewardsEarned',
      key: 'totalRewardsEarned',
      align: 'right',
      render: (amt: number) => <CurrencyDisplay amount={amt} bold />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) => (
        <Tag color={st === 'active' ? 'success' : 'default'}>{st.toUpperCase()}</Tag>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Customer Referral Program"
        subtitle="Incentivize organic customer word-of-mouth acquisition with dual-sided discount rewards and ambassador tracking."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="New Customers Acquired"
              value={totalReferrals}
              prefix={<UserSwitchOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Rewards Disbursed"
              value={totalRewards}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Avg. Acquisition Cost (CAC)"
              value={totalReferrals > 0 ? totalRewards / totalReferrals : 25}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={referrals}
          loading={isLoading}
          pagination={false}
        />
      </Card>
    </PageContainer>
  )
}

export default ReferralsPage
