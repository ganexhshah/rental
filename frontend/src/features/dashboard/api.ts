import { apiGet } from '@/lib/api/client'
import { bookingsApi } from '@/features/bookings/api'
import { vehiclesApi } from '@/features/vehicles/api'
import { paymentsApi } from '@/features/payments/api'
import type { Booking } from '@/types/booking'
import type { Vehicle } from '@/types/vehicle'
import type { PaymentTransaction } from '@/types/payment'

export interface DashboardKPIs {
  totalRevenue: number
  todayRevenue: number
  activeRentalsCount: number
  todayBookingsCount: number
  availableVehiclesCount: number
  rentedVehiclesCount: number
  pendingPaymentsCount: number
  maintenanceVehiclesCount: number
  totalFleetCount: number
  revenueGrowthPercent: number
  activeRentalsGrowthPercent: number
  utilizationRate: number
  outstandingBalance: number
}

export interface ChartDataPoint {
  date: string
  revenue: number
  bookings: number
}

export interface CategoryRevenueItem {
  category: string
  revenue: number
  count: number
}

export const dashboardApi = {
  getKPIs: async (): Promise<DashboardKPIs> => {
    let summary: any = null
    try {
      summary = await apiGet<any>('/dashboard/summary')
    } catch {
      try {
        summary = await apiGet<any>('/reports/summary')
      } catch (e) {
        console.warn('Backend dashboard summary unavailable, calculating from live entities:', e)
      }
    }

    let bookings: Booking[] = []
    let vehicles: Vehicle[] = []
    let payments: PaymentTransaction[] = []

    try {
      ;[bookings, vehicles, payments] = await Promise.all([
        bookingsApi.getBookings().catch(() => []),
        vehiclesApi.getVehicles().catch(() => []),
        paymentsApi.getTransactions().catch(() => []),
      ])
    } catch (e) {
      console.warn('Live entities lookup error:', e)
    }

    const todayStr = new Date().toISOString().split('T')[0]

    // Calculate today's revenue from payments
    const todayPayments = payments.filter(
      (p) => (p.status === 'completed' || !p.status) && (p.createdAt?.startsWith(todayStr) || p.timestamp?.startsWith(todayStr))
    )
    const todayRevenueCalculated = todayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // Calculate total completed revenue from payments or bookings
    const totalPaymentsCalculated = payments
      .filter((p) => p.status === 'completed' || !p.status)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const totalBookingsRevenue = bookings
      .filter((b) => b.status !== 'cancelled' && b.status !== 'rejected')
      .reduce((sum, b) => sum + (Number(b.paidAmount) || Number(b.totalAmount) || 0), 0)

    const liveCalculatedRevenue = totalPaymentsCalculated > 0 ? totalPaymentsCalculated : totalBookingsRevenue

    // Calculate today's bookings
    const todayBookingsCount = bookings.filter(
      (b) => b.createdAt?.startsWith(todayStr) || b.startDate?.startsWith(todayStr)
    ).length

    // Active rentals
    const activeRentalsCount = bookings.filter((b) => b.status === 'active').length

    // Pending payments
    const pendingPaymentsCount = bookings.filter(
      (b) => b.paymentStatus === 'unpaid' || b.paymentStatus === 'partially_paid' || (Number(b.balanceDue) > 0)
    ).length

    // Fleet breakdown
    const availableVehiclesCount = vehicles.filter((v) => v.status === 'available').length
    const rentedVehiclesCount = vehicles.filter((v) => v.status === 'rented').length
    const maintenanceVehiclesCount = vehicles.filter((v) => v.status === 'maintenance').length
    const totalFleetCount = vehicles.length

    const totalRevenue = typeof summary?.total_revenue === 'number'
      ? summary.total_revenue
      : liveCalculatedRevenue

    const todayRevenue = typeof summary?.today_revenue === 'number'
      ? summary.today_revenue
      : todayRevenueCalculated

    const utilizationRate = typeof summary?.utilization_rate === 'number'
      ? summary.utilization_rate
      : (totalFleetCount > 0 ? Math.round((rentedVehiclesCount / totalFleetCount) * 100) : 0)

    const outstandingBalance = typeof summary?.outstanding_balance === 'number'
      ? summary.outstanding_balance
      : bookings.reduce((sum, b) => sum + (Number(b.balanceDue) || 0), 0)

    return {
      totalRevenue,
      todayRevenue,
      activeRentalsCount: typeof summary?.active_bookings === 'number' ? summary.active_bookings : activeRentalsCount,
      todayBookingsCount: typeof summary?.today_bookings === 'number' ? summary.today_bookings : todayBookingsCount,
      availableVehiclesCount: typeof summary?.available_vehicles === 'number' ? summary.available_vehicles : availableVehiclesCount,
      rentedVehiclesCount: typeof summary?.rented_vehicles === 'number' ? summary.rented_vehicles : rentedVehiclesCount,
      pendingPaymentsCount: typeof summary?.pending_payments === 'number' ? summary.pending_payments : pendingPaymentsCount,
      maintenanceVehiclesCount: typeof summary?.maintenance_vehicles === 'number' ? summary.maintenance_vehicles : maintenanceVehiclesCount,
      totalFleetCount: typeof summary?.total_vehicles === 'number' ? summary.total_vehicles : totalFleetCount,
      revenueGrowthPercent: 0,
      activeRentalsGrowthPercent: 0,
      utilizationRate,
      outstandingBalance,
    }
  },

  getRevenueTrends: async (): Promise<ChartDataPoint[]> => {
    try {
      const [revResp, bkResp] = await Promise.all([
        apiGet<any[]>('/dashboard/revenue').catch(() => apiGet<any[]>('/reports/revenue')),
        apiGet<any[]>('/dashboard/bookings').catch(() => apiGet<any[]>('/reports/bookings')),
      ])

      if (Array.isArray(revResp) && revResp.length > 0) {
        const bookingsMap = new Map<string, number>()
        if (Array.isArray(bkResp)) {
          bkResp.forEach((b: any) => {
            if (b.date) bookingsMap.set(b.date, b.count || 0)
          })
        }

        return revResp.map((pt: any) => {
          const d = new Date(pt.date)
          const formatted = isNaN(d.getTime())
            ? pt.date
            : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
          return {
            date: formatted,
            revenue: Number(pt.amount) || Number(pt.revenue) || 0,
            bookings: bookingsMap.get(pt.date) || pt.count || 0,
          }
        })
      }
    } catch (e) {
      console.warn('Backend trends fetch error, using clean timeline:', e)
    }

    // Default clean 7-day timeline with real 0 amounts
    const days: ChartDataPoint[] = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      days.push({
        date: label,
        revenue: 0,
        bookings: 0,
      })
    }
    return days
  },

  getCategoryRevenue: async (): Promise<CategoryRevenueItem[]> => {
    try {
      const backendData = await apiGet<any[]>('/dashboard/category-revenue').catch(() =>
        apiGet<any[]>('/reports/category-revenue')
      )

      if (Array.isArray(backendData) && backendData.length > 0) {
        return backendData.map((item: any) => ({
          category: item.category || item.category_name || 'Standard Fleet',
          revenue: Number(item.revenue) || Number(item.total_revenue) || 0,
          count: Number(item.count) || Number(item.booking_count) || 0,
        }))
      }
    } catch (e) {
      console.warn('Backend category revenue lookup error:', e)
    }

    try {
      const [vehicles, bookings] = await Promise.all([
        vehiclesApi.getVehicles().catch(() => []),
        bookingsApi.getBookings().catch(() => []),
      ])

      if (vehicles.length > 0) {
        const categoryMap = new Map<string, { revenue: number; count: number }>()

        vehicles.forEach((v) => {
          const cat = v.categoryName || (v.type === 'car' ? 'Sedan / SUV' : v.type === 'bike' ? 'Motorcycle' : 'Scooter')
          if (!categoryMap.has(cat)) {
            categoryMap.set(cat, { revenue: 0, count: 0 })
          }
        })

        bookings.forEach((b) => {
          const v = vehicles.find((veh) => veh.id === b.vehicleId)
          const cat = v?.categoryName || (v?.type === 'car' ? 'Sedan / SUV' : v?.type === 'bike' ? 'Motorcycle' : 'Scooter') || 'Standard Fleet'
          const existing = categoryMap.get(cat) || { revenue: 0, count: 0 }
          categoryMap.set(cat, {
            revenue: existing.revenue + (Number(b.totalAmount) || Number(b.rentalAmount) || 0),
            count: existing.count + 1,
          })
        })

        const dynamicList: CategoryRevenueItem[] = []
        categoryMap.forEach((val, key) => {
          dynamicList.push({
            category: key,
            revenue: val.revenue,
            count: val.count,
          })
        })

        if (dynamicList.length > 0) {
          return dynamicList.sort((a, b) => b.revenue - a.revenue)
        }
      }
    } catch (err) {
      console.warn('Category revenue calculation error:', err)
    }

    return []
  },

  getOperationalLists: async () => {
    try {
      const [bookings, vehicles, payments] = await Promise.all([
        bookingsApi.getBookings().catch(() => []),
        vehiclesApi.getVehicles().catch(() => []),
        paymentsApi.getTransactions().catch(() => []),
      ])

      const todayPickups = bookings.filter((b) => b.status === 'confirmed')
      const todayReturns = bookings.filter((b) => b.status === 'active')
      const overdueReturns = bookings.filter((b) => b.status === 'overdue')
      const needingService = vehicles.filter((v) => v.status === 'maintenance')
      const recentBookings = [...bookings].slice(0, 5)
      const recentPayments = [...payments].slice(0, 5)

      return {
        todayPickups,
        todayReturns,
        overdueReturns,
        needingService,
        recentBookings,
        recentPayments,
      }
    } catch (e) {
      console.warn('Operational lists lookup error:', e)
      return {
        todayPickups: [],
        todayReturns: [],
        overdueReturns: [],
        needingService: [],
        recentBookings: [],
        recentPayments: [],
      }
    }
  },
}
