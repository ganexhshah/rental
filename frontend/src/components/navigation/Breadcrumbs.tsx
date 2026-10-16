import React from 'react'
import { Breadcrumb } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import { HomeOutlined } from '@ant-design/icons'

const ROUTE_NAME_MAP: Record<string, string> = {
  operations: 'Operations',
  bookings: 'Bookings',
  calendar: 'Calendar',
  pickup_return: 'Pickup & Return',
  active_rentals: 'Active Rentals',
  availability: 'Availability',
  vehicles: 'Vehicles',
  all: 'All',
  new: 'New Vehicle',
  categories: 'Categories',
  documents: 'Documents',
  maintenance: 'Maintenance',
  locations: 'Locations',
  customers: 'Customers',
  verification: 'Verification',
  history: 'Rental History',
  blacklist: 'Blacklist',
  payments: 'Payments',
  transactions: 'Transactions',
  deposits: 'Deposits',
  refunds: 'Refunds',
  invoices: 'Invoices',
  contracts: 'Contracts',
  templates: 'Templates',
  signatures: 'Signatures',
  expiring: 'Expiring Contracts',
  expenses: 'Expenses',
  fuel: 'Fuel',
  reports: 'Reports',
  revenue: 'Revenue',
  fleet: 'Fleet Utilization',
  pnl: 'Profit & Loss',
  marketing: 'Marketing',
  coupons: 'Coupons',
  campaigns: 'Campaigns',
  referrals: 'Referral Codes',
  staff: 'Staff & Roles',
  roles: 'Roles & Permissions',
  activity: 'Activity Logs',
  notifications: 'Notifications',
  settings: 'Settings',
  company: 'Company Profile',
  branding: 'Branding',
  rules: 'Rental Rules',
  pricing: 'Pricing & Taxes',
  integrations: 'Integrations',
  security: 'Security',
}

export const Breadcrumbs: React.FC = () => {
  const location = useLocation()
  const pathSnippets = location.pathname.split('/').filter(Boolean)

  const items = [
    {
      title: (
        <Link to="/dashboard">
          <HomeOutlined />
        </Link>
      ),
    },
    ...pathSnippets.map((snippet, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join('/')}`
      const isLast = index === pathSnippets.length - 1
      const title =
        ROUTE_NAME_MAP[snippet.replace('-', '_')] ||
        snippet.charAt(0).toUpperCase() + snippet.slice(1).replace('-', ' ')

      return {
        title: isLast ? <span>{title}</span> : <Link to={url}>{title}</Link>,
      }
    }),
  ]

  return <Breadcrumb items={items} style={{ marginBottom: 16 }} />
}
