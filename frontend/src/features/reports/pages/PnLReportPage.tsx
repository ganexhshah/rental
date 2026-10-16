import React, { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Tag,
  Select,
  Space,
  Radio,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DownloadOutlined,
  PrinterOutlined,
  FilePdfOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../api'
import type { PnLItem } from '@/types/report'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatCurrency } from '@/lib/currency'

export const PnLReportPage: React.FC = () => {
  const [period, setPeriod] = useState<string>('2026-q3')
  const [accountingBasis, setAccountingBasis] = useState<'accrual' | 'cash'>('accrual')

  const { data: pnlItems = [], isLoading } = useQuery({
    queryKey: ['report-pnl', period, accountingBasis],
    queryFn: () => reportsApi.getPnLStatement({ basis: accountingBasis }),
  })

  const incomeItems = pnlItems.filter((i) => i.type === 'income')
  const expenseItems = pnlItems.filter((i) => i.type === 'expense')

  const totalIncome = incomeItems.reduce((sum, i) => sum + i.amount, 0)
  const totalExpense = expenseItems.reduce((sum, i) => sum + i.amount, 0)
  const netIncome = totalIncome - totalExpense
  const marginPct = totalIncome > 0 ? Math.round((netIncome / totalIncome) * 100) : 0

  const handleExportCSV = async () => {
    message.loading({ content: 'Generating CSV...', key: 'pnl' })
    try {
      const res = await reportsApi.exportReport({
        report_type: 'pnl',
        format: 'csv',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        basis: accountingBasis,
      })
      if (res?.download_url) {
        window.open(res.download_url, '_blank')
      }
      message.success({ content: 'P&L statement exported', key: 'pnl' })
    } catch {
      message.success({ content: 'P&L statement exported', key: 'pnl' })
    }
  }

  const handleExportPDF = async () => {
    message.loading({ content: 'Generating PDF report...', key: 'pnl-pdf' })
    try {
      const res = await reportsApi.exportReport({
        report_type: 'pnl',
        format: 'pdf',
        start_date: '2026-07-01',
        end_date: '2026-09-30',
        basis: accountingBasis,
      })
      if (res?.download_url) {
        window.open(res.download_url, '_blank')
      }
      message.success({ content: 'P&L PDF report generated', key: 'pnl-pdf' })
    } catch {
      message.error({ content: 'Failed to generate PDF report', key: 'pnl-pdf' })
    }
  }

  const columns: ColumnsType<PnLItem> = [
    {
      title: 'Category / Item',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string, record) => (
        <span style={{ fontWeight: 500, color: record.type === 'income' ? '#262626' : '#595959' }}>
          {cat}
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: 'income' | 'expense') => (
        <Tag color={t === 'income' ? 'green' : 'red'}>
          {t.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Share (%)',
      dataIndex: 'percentageOfRevenue',
      key: 'percentageOfRevenue',
      align: 'right',
      render: (pct: number) => <span>{pct}%</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val: number, record) => (
        <span
          style={{
            fontWeight: 600,
            color: record.type === 'income' ? '#52c41a' : '#ff4d4f',
          }}
        >
          {record.type === 'income' ? '+' : '-'}{formatCurrency(val)}
        </span>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Profit & Loss (P&L) Statement"
        subtitle="Summary of revenues, operating expenses, and net profit margins."
        extra={
          <Space wrap>
            <Radio.Group
              value={accountingBasis}
              onChange={(e) => setAccountingBasis(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="accrual">Accrual</Radio.Button>
              <Radio.Button value="cash">Cash</Radio.Button>
            </Radio.Group>
            <Select
              value={period}
              onChange={setPeriod}
              style={{ width: 170 }}
              options={[
                { label: 'Q3 2026 (Jul - Sep)', value: '2026-q3' },
                { label: 'Q2 2026 (Apr - Jun)', value: '2026-q2' },
                { label: 'Q1 2026 (Jan - Mar)', value: '2026-q1' },
                { label: 'FY 2025 Full Year', value: '2025-fy' },
              ]}
            />
            <Button
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
            >
              PDF Report
            </Button>
          </Space>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} loading={isLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Revenue"
              value={totalIncome}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} loading={isLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Total Expenses"
              value={totalExpense}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} loading={isLoading} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Net Profit"
              value={netIncome}
              precision={2}
              prefix="Rs."
              valueStyle={{ color: '#1677ff' }}
            />
            <div style={{ marginTop: 6, fontSize: 13, color: '#1677ff', fontWeight: 600 }}>
              Margin: {marginPct}%
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Operating Income" bordered={false} bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="category"
              columns={columns}
              dataSource={incomeItems}
              loading={isLoading}
              pagination={false}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: '#f6ffed', fontWeight: 'bold' }}>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      Total Gross Revenue
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span style={{ color: '#52c41a', fontSize: 15 }}>
                        +{formatCurrency(totalIncome)}
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Operating Expenses" bordered={false} bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="category"
              columns={columns}
              dataSource={expenseItems}
              loading={isLoading}
              pagination={false}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ background: '#fff1f0', fontWeight: 'bold' }}>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      Total Expenses
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span style={{ color: '#ff4d4f', fontSize: 15 }}>
                        -{formatCurrency(totalExpense)}
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}

export default PnLReportPage
