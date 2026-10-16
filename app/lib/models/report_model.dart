class MaintenanceTask {
  final String id;
  final String vehicleId;
  final String vehiclePlate;
  final String title;
  final String status; // scheduled, in_progress, completed, overdue
  final String priority; // low, medium, high, urgent
  final double cost;
  final String? vendorName;
  final DateTime dueDate;
  final DateTime? completedAt;

  MaintenanceTask({
    required this.id,
    required this.vehicleId,
    required this.vehiclePlate,
    required this.title,
    required this.status,
    this.priority = 'medium',
    this.cost = 0.0,
    this.vendorName,
    required this.dueDate,
    this.completedAt,
  });

  factory MaintenanceTask.fromJson(Map<String, dynamic> json) {
    return MaintenanceTask(
      id: json['id'] ?? '',
      vehicleId: json['vehicle_id'] ?? '',
      vehiclePlate: json['vehicle_plate'] ?? '—',
      title: json['title'] ?? 'Scheduled Maintenance',
      status: json['status'] ?? 'scheduled',
      priority: json['priority'] ?? 'medium',
      cost: (json['cost'] as num?)?.toDouble() ?? 0.0,
      vendorName: json['vendor_name'],
      dueDate: json['due_date'] != null
          ? DateTime.tryParse(json['due_date']) ?? DateTime.now()
          : DateTime.now(),
      completedAt: json['completed_at'] != null
          ? DateTime.tryParse(json['completed_at'])
          : null,
    );
  }
}

class RentalContract {
  final String id;
  final String contractNumber;
  final String bookingId;
  final String bookingCode;
  final String customerName;
  final String vehiclePlate;
  final String status; // draft, signed, expired, void
  final bool customerSigned;
  final String? customerSignatureUrl;
  final DateTime? signedAt;
  final String? termsAndConditions;

  RentalContract({
    required this.id,
    required this.contractNumber,
    required this.bookingId,
    required this.bookingCode,
    required this.customerName,
    required this.vehiclePlate,
    required this.status,
    this.customerSigned = false,
    this.customerSignatureUrl,
    this.signedAt,
    this.termsAndConditions,
  });

  factory RentalContract.fromJson(Map<String, dynamic> json) {
    return RentalContract(
      id: json['id'] ?? '',
      contractNumber: json['contract_number'] ?? 'CNT-000',
      bookingId: json['booking_id'] ?? '',
      bookingCode: json['booking_code'] ?? 'BK-CONTRACT',
      customerName: json['customer_name'] ?? 'Customer',
      vehiclePlate: json['vehicle_plate'] ?? '—',
      status: json['status'] ?? 'signed',
      customerSigned: json['customer_signed'] ?? false,
      customerSignatureUrl: json['customer_signature_url'],
      signedAt: json['signed_at'] != null
          ? DateTime.tryParse(json['signed_at'])
          : null,
      termsAndConditions: json['terms_and_conditions'],
    );
  }
}

class AppNotification {
  final String id;
  final String title;
  final String message;
  final String type; // booking, payment, maintenance, alert
  final bool isRead;
  final String? entityId;
  final String? entityType;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    this.type = 'booking',
    this.isRead = false,
    this.entityId,
    this.entityType,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Operational Notification',
      message: json['message'] ?? '',
      type: json['type'] ?? 'booking',
      isRead: json['is_read'] ?? false,
      entityId: json['entity_id'],
      entityType: json['entity_type'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class DashboardSummary {
  final int totalVehicles;
  final int availableVehicles;
  final int rentedVehicles;
  final int maintenanceVehicles;
  final double utilizationRate;
  final int activeBookings;
  final double totalRevenue;
  final double todayRevenue;
  final int todayBookings;
  final int pendingPayments;
  final double totalExpenses;
  final double netProfit;
  final double outstandingBalance;
  final String currency;
  final String currencySymbol;

  DashboardSummary({
    this.totalVehicles = 0,
    this.availableVehicles = 0,
    this.rentedVehicles = 0,
    this.maintenanceVehicles = 0,
    this.utilizationRate = 0.0,
    this.activeBookings = 0,
    this.totalRevenue = 0.0,
    this.todayRevenue = 0.0,
    this.todayBookings = 0,
    this.pendingPayments = 0,
    this.totalExpenses = 0.0,
    this.netProfit = 0.0,
    this.outstandingBalance = 0.0,
    this.currency = 'NPR',
    this.currencySymbol = 'Rs.',
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    return DashboardSummary(
      totalVehicles: (json['total_vehicles'] as num?)?.toInt() ?? 0,
      availableVehicles: (json['available_vehicles'] as num?)?.toInt() ?? 0,
      rentedVehicles: (json['rented_vehicles'] as num?)?.toInt() ?? 0,
      maintenanceVehicles: (json['maintenance_vehicles'] as num?)?.toInt() ?? 0,
      utilizationRate: (json['utilization_rate'] as num?)?.toDouble() ?? 0.0,
      activeBookings: (json['active_bookings'] as num?)?.toInt() ?? 0,
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0.0,
      todayRevenue: (json['today_revenue'] as num?)?.toDouble() ?? 0.0,
      todayBookings: (json['today_bookings'] as num?)?.toInt() ?? 0,
      pendingPayments: (json['pending_payments'] as num?)?.toInt() ?? 0,
      totalExpenses: (json['total_expenses'] as num?)?.toDouble() ?? 0.0,
      netProfit: (json['net_profit'] as num?)?.toDouble() ?? 0.0,
      outstandingBalance: (json['outstanding_balance'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] ?? 'NPR',
      currencySymbol: json['currency_symbol'] ?? 'Rs.',
    );
  }
}
