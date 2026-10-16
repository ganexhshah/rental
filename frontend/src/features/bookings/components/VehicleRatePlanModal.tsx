import React, { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Radio,
  InputNumber,
  Button,
  Space,
  Row,
  Col,
  Typography,
} from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import type { Vehicle } from '@/types/vehicle'

const { Text } = Typography

export type RatePlanType = 'daily' | 'weekly' | 'monthly' | 'hourly' | 'custom'

export interface CompoundDuration {
  months: number
  weeks: number
  days: number
  totalDays: number
}

interface VehicleRatePlanModalProps {
  open: boolean
  vehicle: Vehicle | null
  rentalDays: number
  currentRatePlan: RatePlanType
  currentCustomRate?: number
  onClose: () => void
  onApply: (
    plan: RatePlanType,
    customRate?: number,
    compoundDuration?: CompoundDuration
  ) => void
}

export function splitDaysToCompound(totalDays: number): CompoundDuration {
  const safeDays = Math.max(1, Math.round(totalDays))
  const months = Math.floor(safeDays / 30)
  const remAfterMonths = safeDays % 30
  const weeks = Math.floor(remAfterMonths / 7)
  const days = remAfterMonths % 7

  return { months, weeks, days, totalDays: safeDays }
}

export const VehicleRatePlanModal: React.FC<VehicleRatePlanModalProps> = ({
  open,
  vehicle,
  rentalDays,
  currentRatePlan,
  currentCustomRate,
  onClose,
  onApply,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<RatePlanType>(currentRatePlan)
  const [customRateInput, setCustomRateInput] = useState<number | undefined>(currentCustomRate)
  const [months, setMonths] = useState<number>(0)
  const [weeks, setWeeks] = useState<number>(0)
  const [days, setDays] = useState<number>(1)

  useEffect(() => {
    if (open) {
      setSelectedPlan(currentRatePlan)
      setCustomRateInput(currentCustomRate || vehicle?.pricing?.dailyRate)
      const compound = splitDaysToCompound(rentalDays || 1)
      if (currentRatePlan === 'monthly' && compound.months === 0) {
        setMonths(1)
        setWeeks(0)
        setDays(0)
      } else if (currentRatePlan === 'weekly' && compound.weeks === 0 && compound.months === 0) {
        setMonths(0)
        setWeeks(1)
        setDays(0)
      } else {
        setMonths(compound.months)
        setWeeks(compound.weeks)
        setDays(compound.days)
      }
    }
  }, [open, currentRatePlan, currentCustomRate, vehicle, rentalDays])

  const totalCalculatedDays = useMemo(() => {
    return Math.max(1, (months || 0) * 30 + (weeks || 0) * 7 + (days || 0))
  }, [months, weeks, days])

  const rates = useMemo(() => {
    const daily = vehicle?.pricing?.dailyRate || 0
    const weekly = vehicle?.pricing?.weeklyRate || Math.round(daily * 7 * 0.88)
    const weeklyPerDay = Math.round(weekly / 7)
    const monthly = vehicle?.pricing?.monthlyRate || Math.round(daily * 30 * 0.72)
    const monthlyPerDay = Math.round(monthly / 30)
    const hourly = vehicle?.pricing?.hourlyRate || Math.round(daily / 8)

    return { daily, weekly, weeklyPerDay, monthly, monthlyPerDay, hourly }
  }, [vehicle])

  const calculation = useMemo(() => {
    const safeDays = totalCalculatedDays

    if (selectedPlan === 'custom') {
      const rate = customRateInput !== undefined && customRateInput >= 0 ? customRateInput : rates.daily
      return {
        total: rate * safeDays,
        effectiveDailyRate: rate,
        formula: `${safeDays}d × Rs. ${rate.toLocaleString()}/d (Custom)`,
      }
    }

    if (selectedPlan === 'hourly') {
      const total = rates.hourly * 24 * safeDays
      return {
        total,
        effectiveDailyRate: rates.hourly * 24,
        formula: `${safeDays}d (${safeDays * 24} hrs) × Rs. ${rates.hourly.toLocaleString()}/hr`,
      }
    }

    if (selectedPlan === 'weekly') {
      const fullWeeks = Math.floor(safeDays / 7)
      const remainderDays = safeDays % 7
      const weeksTotal = fullWeeks * rates.weekly
      const daysTotal = remainderDays * rates.weeklyPerDay
      const total = weeksTotal + daysTotal
      const parts: string[] = []
      if (fullWeeks > 0) parts.push(`${fullWeeks} Wk (Rs. ${weeksTotal.toLocaleString()})`)
      if (remainderDays > 0) parts.push(`${remainderDays}d (Rs. ${daysTotal.toLocaleString()})`)
      return {
        total,
        effectiveDailyRate: Math.round(total / safeDays),
        formula: parts.join(' + ') || `${safeDays}d @ Rs. ${rates.weeklyPerDay.toLocaleString()}/d`,
      }
    }

    if (selectedPlan === 'monthly') {
      const fullMonths = Math.floor(safeDays / 30)
      const remAfterMonths = safeDays % 30
      const fullWeeks = Math.floor(remAfterMonths / 7)
      const remainderDays = remAfterMonths % 7
      const monthsTotal = fullMonths * rates.monthly
      const weeksTotal = fullWeeks * rates.weekly
      const daysTotal = remainderDays * rates.monthlyPerDay
      const total = monthsTotal + weeksTotal + daysTotal
      const parts: string[] = []
      if (fullMonths > 0) parts.push(`${fullMonths} Mo (Rs. ${monthsTotal.toLocaleString()})`)
      if (fullWeeks > 0) parts.push(`${fullWeeks} Wk (Rs. ${weeksTotal.toLocaleString()})`)
      if (remainderDays > 0) parts.push(`${remainderDays}d (Rs. ${daysTotal.toLocaleString()})`)
      return {
        total,
        effectiveDailyRate: Math.round(total / safeDays),
        formula: parts.join(' + ') || `${safeDays}d @ Rs. ${rates.monthlyPerDay.toLocaleString()}/d`,
      }
    }

    return {
      total: rates.daily * safeDays,
      effectiveDailyRate: rates.daily,
      formula: `${safeDays}d × Rs. ${rates.daily.toLocaleString()}/d`,
    }
  }, [selectedPlan, customRateInput, totalCalculatedDays, rates])

  const handleConfirm = () => {
    onApply(
      selectedPlan,
      selectedPlan === 'custom' ? customRateInput : undefined,
      { months, weeks, days, totalDays: totalCalculatedDays }
    )
    onClose()
  }

  const handlePlanSelect = (newPlan: RatePlanType) => {
    setSelectedPlan(newPlan)
    if (newPlan === 'monthly') {
      if (months === 0) {
        setMonths(1)
        setWeeks(0)
        setDays(0)
      }
    } else if (newPlan === 'weekly') {
      if (weeks === 0 && months === 0) {
        setMonths(0)
        setWeeks(1)
        setDays(0)
      }
    } else if (newPlan === 'daily') {
      if (months === 0 && weeks === 0 && days === 0) {
        setDays(1)
      }
    }
  }

  const handleMonthsChange = (val: number | null) => {
    const m = Math.max(0, val || 0)
    setMonths(m)
    if (m >= 1 && selectedPlan !== 'monthly' && selectedPlan !== 'custom') {
      setSelectedPlan('monthly')
    } else if (m === 0 && selectedPlan === 'monthly') {
      setSelectedPlan(weeks >= 1 ? 'weekly' : 'daily')
    }
  }

  const handleWeeksChange = (val: number | null) => {
    const w = Math.max(0, val || 0)
    setWeeks(w)
    if (w >= 1 && months === 0 && selectedPlan !== 'weekly' && selectedPlan !== 'custom') {
      setSelectedPlan('weekly')
    } else if (w === 0 && months === 0 && selectedPlan === 'weekly') {
      setSelectedPlan('daily')
    }
  }

  const handleDaysChange = (val: number | null) => {
    const d = Math.max(0, val || 0)
    setDays(d)
    if (d >= 1 && months === 0 && weeks === 0 && (selectedPlan === 'weekly' || selectedPlan === 'monthly')) {
      setSelectedPlan('daily')
    }
  }

  if (!vehicle) return null

  return (
    <Modal
      title="Vehicle Rate Plan & Duration"
      open={open}
      onCancel={onClose}
      centered
      width={540}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="apply"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={handleConfirm}
        >
          Apply Rate & Duration
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">Vehicle: </Text>
        <Text strong>{vehicle.make} {vehicle.model} ({vehicle.plateNumber})</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>Duration Breakdown</Text>
        <Row gutter={10}>
          <Col span={8}>
            <InputNumber
              min={0}
              max={24}
              value={months}
              onChange={handleMonthsChange}
              addonAfter="Mo"
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <InputNumber
              min={0}
              max={52}
              value={weeks}
              onChange={handleWeeksChange}
              addonAfter="Wk"
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <InputNumber
              min={0}
              max={31}
              value={days}
              onChange={handleDaysChange}
              addonAfter="Days"
              style={{ width: '100%' }}
            />
          </Col>
        </Row>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Total Duration: <strong>{totalCalculatedDays} days</strong>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 6 }}>Select Rate Plan</Text>
        <Radio.Group
          value={selectedPlan}
          onChange={(e) => handlePlanSelect(e.target.value)}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <Radio value="daily" style={{ display: 'flex', alignItems: 'center', width: '100%', margin: 0, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <span>Daily Standard (Rs. {rates.daily.toLocaleString()}/d)</span>
          </Radio>
          <Radio value="weekly" style={{ display: 'flex', alignItems: 'center', width: '100%', margin: 0, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <span>Weekly Plan (Rs. {rates.weeklyPerDay.toLocaleString()}/d • Rs. {rates.weekly.toLocaleString()}/wk)</span>
          </Radio>
          <Radio value="monthly" style={{ display: 'flex', alignItems: 'center', width: '100%', margin: 0, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <span>Monthly Plan (Rs. {rates.monthlyPerDay.toLocaleString()}/d • Rs. {rates.monthly.toLocaleString()}/mo)</span>
          </Radio>
          <Radio value="hourly" style={{ display: 'flex', alignItems: 'center', width: '100%', margin: 0, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <span>Hourly Plan (Rs. {rates.hourly.toLocaleString()}/hr)</span>
          </Radio>
          <Radio value="custom" style={{ display: 'flex', alignItems: 'center', width: '100%', margin: 0, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <Space>
              <span>Custom Daily Rate:</span>
              {selectedPlan === 'custom' && (
                <InputNumber
                  size="small"
                  min={0}
                  value={customRateInput}
                  onChange={(val) => setCustomRateInput(val || 0)}
                  addonBefore="Rs."
                  style={{ width: 130 }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </Space>
          </Radio>
        </Radio.Group>
      </div>

      <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <Text type="secondary">Calculation:</Text>
          <Text strong>{calculation.formula}</Text>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
          <Text type="secondary">Estimated Base Total:</Text>
          <strong style={{ color: '#1d4ed8' }}>Rs. {calculation.total.toLocaleString()}</strong>
        </div>
      </div>
    </Modal>
  )
}
