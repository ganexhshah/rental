import React from 'react'
import { Typography } from 'antd'
import { useAuthStore } from '@/store/useAuthStore'
import { formatCurrency } from '@/lib/formatting/currency'

const { Text } = Typography

export interface CurrencyDisplayProps {
  amount: number | null | undefined
  currency?: string
  strong?: boolean
  bold?: boolean
  type?: 'secondary' | 'success' | 'warning' | 'danger'
  style?: React.CSSProperties
  className?: string
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency,
  strong = false,
  bold = false,
  type,
  style,
  className,
}) => {
  const { tenant } = useAuthStore()
  const activeCurrency = currency || (tenant?.currency && tenant.currency !== 'USD' ? tenant.currency : 'NPR')
  const activeSymbol = (tenant?.currencySymbol && tenant.currencySymbol !== '$' ? tenant.currencySymbol : 'Rs.')

  const formatted = formatCurrency(amount, activeCurrency, activeSymbol)

  return (
    <Text
      strong={strong || bold}
      type={type}
      style={{
        fontFamily: 'inherit',
        ...style,
      }}
      className={`currency-display ${className || ''}`.trim()}
    >
      {formatted}
    </Text>
  )
}

export default CurrencyDisplay

