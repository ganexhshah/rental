class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  // Dashboard & Metrics
  static const String dashboardSummary = '/dashboard/summary';
  static const String dashboardRevenue = '/dashboard/revenue';
  static const String dashboardBookings = '/dashboard/bookings';
  static const String dashboardUtilization = '/dashboard/fleet-utilization';

  // Bookings & Operations
  static const String bookings = '/bookings';
  static const String bookingOperationsSummary = '/bookings/operations-summary';
  static const String bookingQuote = '/bookings/quote';
  static const String bookingCalendar = '/calendar';
  static const String activeRentals = '/rentals/active';
  static const String vehicleAvailability = '/availability';

  // Booking Actions
  static String bookingDetail(String id) => '/bookings/$id';
  static String bookingConfirm(String id) => '/bookings/$id/confirm';
  static String bookingCancel(String id) => '/bookings/$id/cancel';
  static String bookingExtend(String id) => '/bookings/$id/extend';
  static String bookingSchedule(String id) => '/bookings/$id/schedule';
  static String bookingPickup(String id) => '/bookings/$id/pickup';
  static String bookingReturn(String id) => '/bookings/$id/return';
  static String bookingStatus(String id) => '/bookings/$id/status';
  static String bookingNoShow(String id) => '/bookings/$id/no-show';
  static String bookingAssignVehicle(String id) => '/bookings/$id/assign-vehicle';
  static String bookingVerifyEligibility(String id) => '/bookings/$id/verify-eligibility';
  static String bookingChecklists(String id) => '/bookings/$id/checklists';
  static String bookingHistory(String id) => '/bookings/$id/history';

  // Fleet & Vehicles
  static const String vehicles = '/vehicles';
  static const String vehicleLocations = '/vehicles/locations';
  static String vehicleLocationDetail(String id) => '/vehicles/locations/$id';
  static const String vehicleCategories = '/vehicles/categories';
  static String vehicleCategoryDetail(String id) => '/vehicles/categories/$id';
  static String vehicleDetail(String id) => '/vehicles/$id';
  static String vehicleDocuments(String id) => '/vehicles/$id/documents';
  static String vehicleMaintenance(String id) => '/vehicles/$id/maintenance';
  static String vehicleDamage(String id) => '/vehicles/$id/damage';
  static const String vehicleDocumentsAll = '/vehicle-documents';

  // Customers
  static const String customers = '/customers';
  static String customerDetail(String id) => '/customers/$id';
  static String customerDocuments(String id) => '/customers/$id/documents';
  static String customerDrivers(String id) => '/customers/$id/drivers';
  static String customerRentals(String id) => '/customers/$id/rentals';
  static const String customerDocumentsAll = '/customer-documents';

  // Contracts & Signatures
  static const String contracts = '/contracts';
  static String contractDetail(String id) => '/contracts/$id';
  static String contractSign(String id) => '/contracts/$id/sign';
  static const String contractTemplates = '/contract-templates';

  // Financials & Payments
  static const String payments = '/payments';
  static const String invoices = '/invoices';
  static const String deposits = '/deposits';

  // Maintenance & Inspections
  static const String maintenance = '/maintenance';
  static const String inspections = '/inspections';
  static const String damage = '/damage';

  // Expenses & Cost Tracking
  static const String expenses = '/expenses';
  static const String expenseCategories = '/expense-categories';

  // Marketing & Growth
  static const String coupons = '/coupons';
  static const String marketingCampaigns = '/marketing/campaigns';

  // Staff & Administration
  static const String users = '/users';
  static const String roles = '/roles';
  static const String auditLogs = '/audit-logs';

  // Notifications
  static const String notifications = '/notifications';
  static const String notificationTemplates = '/notification-templates';

  // Reports
  static const String reports = '/reports';
  static const String reportRevenue = '/reports/revenue';
  static const String reportUtilization = '/reports/fleet-utilization';
  static const String reportPnL = '/reports/pnl';

  // System & Settings
  static const String settings = '/settings';
  static const String tenants = '/tenants';
  static const String subscriptions = '/subscriptions';
  static const String integrations = '/integrations';
  static const String publicPortal = '/public';
}
