export const DEFAULT_CURRENCY = 'NPR'
export const DEFAULT_CURRENCY_SYMBOL = 'Rs.'

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  symbol: string = DEFAULT_CURRENCY_SYMBOL
): string {
  const activeSymbol = !symbol || symbol === '$' ? DEFAULT_CURRENCY_SYMBOL : symbol

  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${activeSymbol} 0.00`
  }

  const num = Number(amount)
  try {
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${activeSymbol} ${formatted}`
  } catch {
    return `${activeSymbol} ${num.toFixed(2)}`
  }
}

