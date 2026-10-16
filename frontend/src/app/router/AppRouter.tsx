import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/app/layouts/AppLayout'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { ProtectedRoute } from '@/components/common/ProtectedRoute'

// Auth
import { LoginPage } from '@/features/auth/pages/LoginPage'

// Dashboard
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

// Operations & Bookings
import { BookingsListPage } from '@/features/bookings/pages/BookingsListPage'
import { CreateBookingPage } from '@/features/bookings/pages/CreateBookingPage'
import { BookingViewPage } from '@/features/bookings/pages/BookingViewPage'
import { OperationsCalendarPage } from '@/features/bookings/pages/OperationsCalendarPage'
import { PickupReturnPage } from '@/features/bookings/pages/PickupReturnPage'
import { ActiveRentalsPage } from '@/features/bookings/pages/ActiveRentalsPage'
import { FleetAvailabilityPage } from '@/features/bookings/pages/FleetAvailabilityPage'

// Vehicles
import { VehiclesListPage } from '@/features/vehicles/pages/VehiclesListPage'
import { AddEditVehiclePage } from '@/features/vehicles/pages/AddEditVehiclePage'
import { VehicleViewPage } from '@/features/vehicles/pages/VehicleViewPage'
import { VehicleCategoriesPage } from '@/features/vehicles/pages/VehicleCategoriesPage'
import { VehicleDocumentsPage } from '@/features/vehicles/pages/VehicleDocumentsPage'
import { VehicleLocationsPage } from '@/features/vehicles/pages/VehicleLocationsPage'

// Customers
import { CustomersListPage } from '@/features/customers/pages/CustomersListPage'
import { CustomerViewPage } from '@/features/customers/pages/CustomerViewPage'
import { AddCustomerPage } from '@/features/customers/pages/AddCustomerPage'
import { CustomerVerificationPage } from '@/features/customers/pages/CustomerVerificationPage'
import { CustomerDocumentsPage } from '@/features/customers/pages/CustomerDocumentsPage'
import { CustomerDriversPage } from '@/features/customers/pages/CustomerDriversPage'
import { CustomerRentalHistoryPage } from '@/features/customers/pages/CustomerRentalHistoryPage'
import { CustomerBlacklistPage } from '@/features/customers/pages/CustomerBlacklistPage'

// Payments
import { TransactionsPage } from '@/features/payments/pages/TransactionsPage'
import { PendingPaymentsPage } from '@/features/payments/pages/PendingPaymentsPage'
import { DepositsPage } from '@/features/payments/pages/DepositsPage'
import { RefundsPage } from '@/features/payments/pages/RefundsPage'
import { InvoicesPage } from '@/features/payments/pages/InvoicesPage'
import { DocumentsListPage } from '@/features/documents/pages/DocumentsListPage'

// Contracts
import { ContractsListPage } from '@/features/contracts/pages/ContractsListPage'
import { ContractTemplatesPage } from '@/features/contracts/pages/ContractTemplatesPage'
import { SignaturesPage } from '@/features/contracts/pages/SignaturesPage'
import { ExpiringContractsPage } from '@/features/contracts/pages/ExpiringContractsPage'

// Maintenance
import { MaintenanceQueuePage } from '@/features/maintenance/pages/MaintenanceQueuePage'
import { MaintenanceSchedulesPage } from '@/features/maintenance/pages/MaintenanceSchedulesPage'
import { MaintenanceVendorsPage } from '@/features/maintenance/pages/MaintenanceVendorsPage'

// Expenses
import { ExpensesListPage } from '@/features/expenses/pages/ExpensesListPage'
import { ExpenseCategoriesPage } from '@/features/expenses/pages/ExpenseCategoriesPage'

// Reports
import { RevenueReportPage } from '@/features/reports/pages/RevenueReportPage'
import { FleetUtilizationReportPage } from '@/features/reports/pages/FleetUtilizationReportPage'
import { PnLReportPage } from '@/features/reports/pages/PnLReportPage'

// Marketing
import { CouponsPage } from '@/features/marketing/pages/CouponsPage'
import { CampaignsPage } from '@/features/marketing/pages/CampaignsPage'
import { ReferralsPage } from '@/features/marketing/pages/ReferralsPage'

// Staff
import { StaffListPage } from '@/features/staff/pages/StaffListPage'
import { RolesPermissionsPage } from '@/features/staff/pages/RolesPermissionsPage'
import { ActivityLogsPage } from '@/features/staff/pages/ActivityLogsPage'

// Notifications
import { NotificationCenterPage } from '@/features/notifications/pages/NotificationCenterPage'
import { NotificationTemplatesPage } from '@/features/notifications/pages/NotificationTemplatesPage'
import { AutomationRulesPage } from '@/features/notifications/pages/AutomationRulesPage'

// Documents & Print Engine
import { PrintDocumentPage } from '@/features/documents/pages/PrintDocumentPage'

// Settings
import { CompanySettingsPage } from '@/features/settings/pages/CompanySettingsPage'
import { BusinessHoursPage } from '@/features/settings/pages/BusinessHoursPage'
import { PrintTemplatesSettingsPage } from '@/features/settings/pages/PrintTemplatesSettingsPage'
import { RentalRulesSettingsPage } from '@/features/settings/pages/RentalRulesSettingsPage'
import { PricingSettingsPage } from '@/features/settings/pages/PricingSettingsPage'
import { PaymentGatewaysPage } from '@/features/settings/pages/PaymentGatewaysPage'
import { IntegrationsPage } from '@/features/settings/pages/IntegrationsPage'
import { BrandingSettingsPage } from '@/features/settings/pages/BrandingSettingsPage'
import { SecuritySettingsPage } from '@/features/settings/pages/SecuritySettingsPage'

// Public Tenant Landing Page
import { TenantLandingPage } from '@/features/public/pages/TenantLandingPage'

// Onboarding Wizard
import { OnboardingPage } from '@/features/onboarding/pages/OnboardingPage'

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Tenant Landing Pages */}
      <Route path="/ridersone" element={<TenantLandingPage />} />
      <Route path="/portal/:tenantSlug" element={<TenantLandingPage />} />
      <Route path="/rentals/:tenantSlug" element={<TenantLandingPage />} />

      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage initialMode="signup" />} />
        <Route path="/signup" element={<LoginPage initialMode="signup" />} />
      </Route>

      {/* Dedicated Standalone Modern Print Engine */}
      <Route path="/print" element={<PrintDocumentPage />} />
      <Route path="/print/:docType" element={<PrintDocumentPage />} />
      <Route path="/print/:docType/:id" element={<PrintDocumentPage />} />

      {/* Full-screen Standalone Onboarding Wizard */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Protected App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Operations */}
        <Route path="/operations/bookings" element={<BookingsListPage />} />
        <Route path="/operations/bookings/new" element={<CreateBookingPage />} />
        <Route path="/operations/bookings/:id" element={<BookingViewPage />} />
        <Route path="/operations/calendar" element={<OperationsCalendarPage />} />
        <Route path="/operations/pickup-return" element={<PickupReturnPage />} />
        <Route path="/operations/active-rentals" element={<ActiveRentalsPage />} />
        <Route path="/operations/availability" element={<FleetAvailabilityPage />} />
        {/* Alias shortcuts */}
        <Route path="/bookings/new" element={<CreateBookingPage />} />
        <Route path="/bookings/:id" element={<BookingViewPage />} />
        <Route path="/bookings" element={<Navigate to="/operations/bookings" replace />} />
        <Route path="/bookings/*" element={<Navigate to="/operations/bookings" replace />} />

        {/* Vehicles */}
        <Route path="/vehicles" element={<Navigate to="/vehicles/all" replace />} />
        <Route path="/vehicles/all" element={<VehiclesListPage />} />
        <Route path="/vehicles/new" element={<AddEditVehiclePage />} />
        <Route path="/vehicles/:id" element={<VehicleViewPage />} />
        <Route path="/vehicles/view/:id" element={<VehicleViewPage />} />
        <Route path="/vehicles/edit/:id" element={<AddEditVehiclePage />} />
        <Route path="/vehicles/categories" element={<VehicleCategoriesPage />} />
        <Route path="/vehicles/documents" element={<VehicleDocumentsPage />} />
        <Route path="/vehicles/maintenance" element={<MaintenanceQueuePage />} />
        <Route path="/vehicles/locations" element={<VehicleLocationsPage />} />

        {/* Customers */}
        <Route path="/customers" element={<Navigate to="/customers/all" replace />} />
        <Route path="/customers/all" element={<CustomersListPage />} />
        <Route path="/customers/new" element={<AddCustomerPage />} />
        <Route path="/customers/:id" element={<CustomerViewPage />} />
        <Route path="/customers/view/:id" element={<CustomerViewPage />} />
        <Route path="/customers/verification" element={<CustomerVerificationPage />} />
        <Route path="/customers/documents" element={<CustomerDocumentsPage />} />
        <Route path="/customers/drivers" element={<CustomerDriversPage />} />
        <Route path="/customers/history" element={<CustomerRentalHistoryPage />} />
        <Route path="/customers/blacklist" element={<CustomerBlacklistPage />} />

        {/* Payments */}
        <Route path="/payments" element={<Navigate to="/payments/transactions" replace />} />
        <Route path="/payments/transactions" element={<TransactionsPage />} />
        <Route path="/payments/transactions/:id" element={<TransactionsPage />} />
        <Route path="/payments/transactions/view/:id" element={<TransactionsPage />} />
        <Route path="/payments/view/:id" element={<TransactionsPage />} />
        <Route path="/payments/pending" element={<PendingPaymentsPage />} />
        <Route path="/payments/deposits" element={<DepositsPage />} />
        <Route path="/payments/refunds" element={<RefundsPage />} />
        <Route path="/payments/invoices" element={<InvoicesPage />} />
        <Route path="/payments/documents" element={<DocumentsListPage />} />
        <Route path="/documents" element={<DocumentsListPage />} />

        {/* Contracts */}
        <Route path="/contracts" element={<Navigate to="/contracts/all" replace />} />
        <Route path="/contracts/all" element={<ContractsListPage />} />
        <Route path="/contracts/templates" element={<ContractTemplatesPage />} />
        <Route path="/contracts/signatures" element={<SignaturesPage />} />
        <Route path="/contracts/expiring" element={<ExpiringContractsPage />} />

        {/* Maintenance */}
        <Route path="/maintenance" element={<MaintenanceQueuePage />} />
        <Route path="/maintenance/queue" element={<MaintenanceQueuePage />} />
        <Route path="/maintenance/schedules" element={<MaintenanceSchedulesPage />} />
        <Route path="/maintenance/vendors" element={<MaintenanceVendorsPage />} />

        {/* Expenses */}
        <Route path="/expenses" element={<Navigate to="/expenses/all" replace />} />
        <Route path="/expenses/all" element={<ExpensesListPage />} />
        <Route path="/expenses/fuel" element={<ExpensesListPage />} />
        <Route path="/expenses/maintenance" element={<ExpensesListPage />} />
        <Route path="/expenses/other" element={<ExpensesListPage />} />
        <Route path="/expenses/categories" element={<ExpenseCategoriesPage />} />

        {/* Reports */}
        <Route path="/reports" element={<Navigate to="/reports/revenue" replace />} />
        <Route path="/reports/revenue" element={<RevenueReportPage />} />
        <Route path="/reports/fleet" element={<FleetUtilizationReportPage />} />
        <Route path="/reports/pnl" element={<PnLReportPage />} />

        {/* Marketing */}
        <Route path="/marketing" element={<Navigate to="/marketing/coupons" replace />} />
        <Route path="/marketing/coupons" element={<CouponsPage />} />
        <Route path="/marketing/discounts" element={<CouponsPage />} />
        <Route path="/marketing/campaigns" element={<CampaignsPage />} />
        <Route path="/marketing/referrals" element={<ReferralsPage />} />

        {/* Staff */}
        <Route path="/staff" element={<Navigate to="/staff/members" replace />} />
        <Route path="/staff/members" element={<StaffListPage />} />
        <Route path="/staff/roles" element={<RolesPermissionsPage />} />
        <Route path="/staff/activity" element={<ActivityLogsPage />} />

        {/* Notifications */}
        <Route path="/notifications" element={<Navigate to="/notifications/center" replace />} />
        <Route path="/notifications/center" element={<NotificationCenterPage />} />
        <Route path="/notifications/templates" element={<NotificationTemplatesPage />} />
        <Route path="/notifications/rules" element={<AutomationRulesPage />} />

        {/* Settings */}
        <Route path="/settings" element={<Navigate to="/settings/company" replace />} />
        <Route path="/settings/company" element={<CompanySettingsPage />} />
        <Route path="/settings/templates" element={<PrintTemplatesSettingsPage />} />
        <Route path="/settings/documents" element={<PrintTemplatesSettingsPage />} />
        <Route path="/settings/locations" element={<VehicleLocationsPage />} />
        <Route path="/settings/hours" element={<BusinessHoursPage />} />
        <Route path="/settings/rules" element={<RentalRulesSettingsPage />} />
        <Route path="/settings/pricing" element={<PricingSettingsPage />} />
        <Route path="/settings/payments" element={<PaymentGatewaysPage />} />
        <Route path="/settings/integrations" element={<IntegrationsPage />} />
        <Route path="/settings/branding" element={<BrandingSettingsPage />} />
        <Route path="/settings/security" element={<SecuritySettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default AppRouter

