import React, { useState } from 'react'
import {
  Table,
  Button,
  Tag,
  Checkbox,
  Card,
  Space,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SafetyCertificateOutlined,
  SaveOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

interface PermissionRow {
  key: string
  module: string
  action: string
  owner: boolean
  admin: boolean
  manager: boolean
  agent: boolean
  mechanic: boolean
}

const INITIAL_MATRIX: PermissionRow[] = [
  { key: '1', module: 'Fleet & Vehicles', action: 'Create & Edit Vehicles', owner: true, admin: true, manager: true, agent: false, mechanic: false },
  { key: '2', module: 'Fleet & Vehicles', action: 'View Telematics & Locations', owner: true, admin: true, manager: true, agent: true, mechanic: true },
  { key: '3', module: 'Bookings & Operations', action: 'Create & Modify Reservations', owner: true, admin: true, manager: true, agent: true, mechanic: false },
  { key: '4', module: 'Bookings & Operations', action: 'Process Pickup & Returns', owner: true, admin: true, manager: true, agent: true, mechanic: false },
  { key: '5', module: 'Customers & CRM', action: 'Verify Documents & Approve', owner: true, admin: true, manager: true, agent: true, mechanic: false },
  { key: '6', module: 'Customers & CRM', action: 'Blacklist / Pardon Customers', owner: true, admin: true, manager: true, agent: false, mechanic: false },
  { key: '7', module: 'Billing & Payments', action: 'Process Transactions & Deposits', owner: true, admin: true, manager: true, agent: true, mechanic: false },
  { key: '8', module: 'Billing & Payments', action: 'Disburse Refunds & Release Holds', owner: true, admin: true, manager: true, agent: false, mechanic: false },
  { key: '9', module: 'Contracts & Legal', action: 'Execute Signatures & Agreements', owner: true, admin: true, manager: true, agent: true, mechanic: false },
  { key: '10', module: 'Contracts & Legal', action: 'Edit Master Contract Templates', owner: true, admin: true, manager: false, agent: false, mechanic: false },
  { key: '11', module: 'Maintenance & Service', action: 'Create & Complete Work Orders', owner: true, admin: true, manager: true, agent: false, mechanic: true },
  { key: '12', module: 'Financial Reports', action: 'View Revenue & P&L Statements', owner: true, admin: true, manager: false, agent: false, mechanic: false },
  { key: '13', module: 'Tenant Settings', action: 'Edit Gateway & API Credentials', owner: true, admin: true, manager: false, agent: false, mechanic: false },
]

export const RolesPermissionsPage: React.FC = () => {
  const [matrix, setMatrix] = useState<PermissionRow[]>(INITIAL_MATRIX)

  const handleToggle = (key: string, role: 'admin' | 'manager' | 'agent' | 'mechanic', val: boolean) => {
    setMatrix((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [role]: val } : row))
    )
  }

  const handleSave = () => {
    message.success('Role permissions matrix saved successfully')
  }

  const columns: ColumnsType<PermissionRow> = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      render: (m: string) => <Tag color="blue">{m}</Tag>,
    },
    {
      title: 'Action Capability',
      dataIndex: 'action',
      key: 'action',
      render: (a: string) => <span style={{ fontWeight: 500 }}>{a}</span>,
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      align: 'center',
      render: () => <Checkbox checked disabled />,
    },
    {
      title: 'Admin',
      dataIndex: 'admin',
      key: 'admin',
      align: 'center',
      render: (val: boolean, record) => (
        <Checkbox
          checked={val}
          onChange={(e) => handleToggle(record.key, 'admin', e.target.checked)}
        />
      ),
    },
    {
      title: 'Manager',
      dataIndex: 'manager',
      key: 'manager',
      align: 'center',
      render: (val: boolean, record) => (
        <Checkbox
          checked={val}
          onChange={(e) => handleToggle(record.key, 'manager', e.target.checked)}
        />
      ),
    },
    {
      title: 'Rental Agent',
      dataIndex: 'agent',
      key: 'agent',
      align: 'center',
      render: (val: boolean, record) => (
        <Checkbox
          checked={val}
          onChange={(e) => handleToggle(record.key, 'agent', e.target.checked)}
        />
      ),
    },
    {
      title: 'Mechanic',
      dataIndex: 'mechanic',
      key: 'mechanic',
      align: 'center',
      render: (val: boolean, record) => (
        <Checkbox
          checked={val}
          onChange={(e) => handleToggle(record.key, 'mechanic', e.target.checked)}
        />
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Role-Based Access Control (RBAC)"
        subtitle="Configure granular read/write privileges and policy access across operational roles and system resources."
        extra={
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            Save Permissions
          </Button>
        }
      />

      <Card bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="key"
          columns={columns}
          dataSource={matrix}
          pagination={false}
        />
      </Card>
    </PageContainer>
  )
}

export default RolesPermissionsPage
