export interface KPIReportSummary {
  totalRevenue: number
  previousRevenue: number
  revenueGrowthPercent: number
  totalBookings: number
  fleetUtilizationPercent: number
  averageRentalDurationDays: number
  totalExpenses: number
  netProfit: number
  profitMarginPercent: number
}

export interface RevenueTrendPoint {
  date: string
  revenue: number
  expenses: number
  profit: number
  bookingsCount: number
}

export interface CategoryBreakdown {
  category: string
  revenue: number
  percentage: number
  bookingsCount: number
}

export interface VehicleUtilizationItem {
  vehicleId: string
  plateNumber: string
  model: string
  type: string
  rentedDays: number
  totalDays: number
  utilizationPercent: number
  revenueGenerated: number
  maintenanceCost: number
}

export interface PnLItem {
  category: string
  type: 'income' | 'expense'
  amount: number
  percentageOfRevenue: number
}
