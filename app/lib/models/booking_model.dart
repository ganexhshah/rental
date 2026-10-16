class Booking {
  final String id;
  final String tenantId;
  final String bookingCode;
  final String customerId;
  final String customerName;
  final String customerEmail;
  final String customerPhone;
  final String? customerKycStatus;
  final String? primaryDriverId;
  final String vehicleId;
  final String vehicleMake;
  final String vehicleModel;
  final String vehiclePlate;
  final String vehicleType;
  final String? vehicleCategoryId;
  final String? categoryName;
  final String pickupLocationId;
  final String pickupLocation;
  final String returnLocationId;
  final String returnLocation;
  final DateTime startDate;
  final DateTime endDate;
  final DateTime? actualPickupAt;
  final DateTime? actualReturnAt;
  final String status;
  final String paymentStatus;
  final double rentalAmount;
  final double insuranceAmount;
  final double discountAmount;
  final double taxAmount;
  final double extraCharges;
  final double totalAmount;
  final double depositAmount;
  final double paidAmount;
  final double balanceDue;
  final int? pickupOdometer;
  final int? returnOdometer;
  final String? pickupFuel;
  final String? returnFuel;
  final String? pickupNotes;
  final String? returnNotes;
  final List<String> pickupPhotos;
  final List<String> returnPhotos;
  final String? notes;
  final PricingSnapshot? pricingSnapshot;
  final DateTime createdAt;
  final DateTime updatedAt;

  Booking({
    required this.id,
    required this.tenantId,
    required this.bookingCode,
    required this.customerId,
    required this.customerName,
    this.customerEmail = '',
    this.customerPhone = '',
    this.customerKycStatus,
    this.primaryDriverId,
    required this.vehicleId,
    required this.vehicleMake,
    required this.vehicleModel,
    required this.vehiclePlate,
    this.vehicleType = 'car',
    this.vehicleCategoryId,
    this.categoryName,
    required this.pickupLocationId,
    required this.pickupLocation,
    required this.returnLocationId,
    required this.returnLocation,
    required this.startDate,
    required this.endDate,
    this.actualPickupAt,
    this.actualReturnAt,
    required this.status,
    required this.paymentStatus,
    required this.rentalAmount,
    this.insuranceAmount = 0.0,
    this.discountAmount = 0.0,
    this.taxAmount = 0.0,
    this.extraCharges = 0.0,
    required this.totalAmount,
    this.depositAmount = 0.0,
    this.paidAmount = 0.0,
    required this.balanceDue,
    this.pickupOdometer,
    this.returnOdometer,
    this.pickupFuel,
    this.returnFuel,
    this.pickupNotes,
    this.returnNotes,
    this.pickupPhotos = const [],
    this.returnPhotos = const [],
    this.notes,
    this.pricingSnapshot,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isPickupReady =>
      status == 'confirmed' || status == 'pickup_scheduled' || status == 'pending';
  bool get isActiveRental => status == 'active' || status == 'pickup_in_progress';
  bool get isReturnReady => status == 'active' || status == 'return_in_progress';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled' || status == 'no_show';

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] ?? '',
      tenantId: json['tenant_id'] ?? '',
      bookingCode: json['booking_code'] ?? 'BK-PENDING',
      customerId: json['customer_id'] ?? '',
      customerName: json['customer_name'] ?? 'Unknown Customer',
      customerEmail: json['customer_email'] ?? '',
      customerPhone: json['customer_phone'] ?? '',
      customerKycStatus: json['customer_kyc_status'],
      primaryDriverId: json['primary_driver_id'],
      vehicleId: json['vehicle_id'] ?? '',
      vehicleMake: json['vehicle_make'] ?? '',
      vehicleModel: json['vehicle_model'] ?? 'Assigned Vehicle',
      vehiclePlate: json['vehicle_plate'] ?? '—',
      vehicleType: json['vehicle_type'] ?? 'car',
      vehicleCategoryId: json['vehicle_category_id'],
      categoryName: json['category_name'],
      pickupLocationId: json['pickup_location_id'] ?? '',
      pickupLocation: json['pickup_location'] ?? 'Kathmandu Hub',
      returnLocationId: json['return_location_id'] ?? '',
      returnLocation: json['return_location'] ?? 'Kathmandu Hub',
      startDate: json['start_date'] != null
          ? DateTime.tryParse(json['start_date']) ?? DateTime.now()
          : DateTime.now(),
      endDate: json['end_date'] != null
          ? DateTime.tryParse(json['end_date']) ?? DateTime.now().add(const Duration(days: 3))
          : DateTime.now().add(const Duration(days: 3)),
      actualPickupAt: json['actual_pickup_at'] != null
          ? DateTime.tryParse(json['actual_pickup_at'])
          : null,
      actualReturnAt: json['actual_return_at'] != null
          ? DateTime.tryParse(json['actual_return_at'])
          : null,
      status: json['status'] ?? 'pending',
      paymentStatus: json['payment_status'] ?? 'unpaid',
      rentalAmount: (json['rental_amount'] as num?)?.toDouble() ?? 0.0,
      insuranceAmount: (json['insurance_amount'] as num?)?.toDouble() ?? 0.0,
      discountAmount: (json['discount_amount'] as num?)?.toDouble() ?? 0.0,
      taxAmount: (json['tax_amount'] as num?)?.toDouble() ?? 0.0,
      extraCharges: (json['extra_charges'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      depositAmount: (json['deposit_amount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paid_amount'] as num?)?.toDouble() ?? 0.0,
      balanceDue: (json['balance_due'] as num?)?.toDouble() ?? 0.0,
      pickupOdometer: json['pickup_odometer'],
      returnOdometer: json['return_odometer'],
      pickupFuel: json['pickup_fuel'],
      returnFuel: json['return_fuel'],
      pickupNotes: json['pickup_notes'],
      returnNotes: json['return_notes'],
      pickupPhotos: json['pickup_photos'] is List
          ? List<String>.from(json['pickup_photos'])
          : const [],
      returnPhotos: json['return_photos'] is List
          ? List<String>.from(json['return_photos'])
          : const [],
      notes: json['notes'],
      pricingSnapshot: json['pricing_snapshot'] is Map<String, dynamic>
          ? PricingSnapshot.fromJson(json['pricing_snapshot'])
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'tenant_id': tenantId,
        'booking_code': bookingCode,
        'customer_id': customerId,
        'customer_name': customerName,
        'customer_email': customerEmail,
        'customer_phone': customerPhone,
        'vehicle_id': vehicleId,
        'vehicle_make': vehicleMake,
        'vehicle_model': vehicleModel,
        'vehicle_plate': vehiclePlate,
        'vehicle_type': vehicleType,
        'pickup_location_id': pickupLocationId,
        'pickup_location': pickupLocation,
        'return_location_id': returnLocationId,
        'return_location': returnLocation,
        'start_date': startDate.toIso8601String(),
        'end_date': endDate.toIso8601String(),
        'status': status,
        'payment_status': paymentStatus,
        'rental_amount': rentalAmount,
        'total_amount': totalAmount,
        'deposit_amount': depositAmount,
        'paid_amount': paidAmount,
        'balance_due': balanceDue,
      };
}

class PricingSnapshot {
  final int rentalDays;
  final double baseRentalRate;
  final double rentalAmount;
  final double insuranceAmount;
  final double discountAmount;
  final double extraCharges;
  final double taxableBase;
  final double taxRate;
  final double taxAmount;
  final double depositAmount;
  final double totalAmount;
  final String currency;
  final String currencySymbol;

  PricingSnapshot({
    required this.rentalDays,
    required this.baseRentalRate,
    required this.rentalAmount,
    this.insuranceAmount = 0.0,
    this.discountAmount = 0.0,
    this.extraCharges = 0.0,
    this.taxableBase = 0.0,
    this.taxRate = 0.13,
    this.taxAmount = 0.0,
    this.depositAmount = 0.0,
    required this.totalAmount,
    this.currency = 'NPR',
    this.currencySymbol = 'Rs.',
  });

  factory PricingSnapshot.fromJson(Map<String, dynamic> json) {
    return PricingSnapshot(
      rentalDays: json['rental_days'] ?? 0,
      baseRentalRate: (json['base_rental_rate'] as num?)?.toDouble() ?? 0.0,
      rentalAmount: (json['rental_amount'] as num?)?.toDouble() ?? 0.0,
      insuranceAmount: (json['insurance_amount'] as num?)?.toDouble() ?? 0.0,
      discountAmount: (json['discount_amount'] as num?)?.toDouble() ?? 0.0,
      extraCharges: (json['extra_charges'] as num?)?.toDouble() ?? 0.0,
      taxableBase: (json['taxable_base'] as num?)?.toDouble() ?? 0.0,
      taxRate: (json['tax_rate'] as num?)?.toDouble() ?? 0.13,
      taxAmount: (json['tax_amount'] as num?)?.toDouble() ?? 0.0,
      depositAmount: (json['deposit_amount'] as num?)?.toDouble() ?? 0.0,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] ?? 'NPR',
      currencySymbol: json['currency_symbol'] ?? 'Rs.',
    );
  }
}

class OperationsSummary {
  final int activeRentalsCount;
  final int pickupsTodayCount;
  final int returnsTodayCount;
  final int pendingConfirmationCount;
  final int overdueReturnsCount;
  final double totalDepositsHeld;
  final int totalFleetCount;
  final int rentedFleetCount;
  final int availableFleetCount;
  final String currency;
  final String currencySymbol;

  OperationsSummary({
    this.activeRentalsCount = 0,
    this.pickupsTodayCount = 0,
    this.returnsTodayCount = 0,
    this.pendingConfirmationCount = 0,
    this.overdueReturnsCount = 0,
    this.totalDepositsHeld = 0.0,
    this.totalFleetCount = 0,
    this.rentedFleetCount = 0,
    this.availableFleetCount = 0,
    this.currency = 'NPR',
    this.currencySymbol = 'Rs.',
  });

  factory OperationsSummary.fromJson(Map<String, dynamic> json) {
    return OperationsSummary(
      activeRentalsCount: (json['active_rentals_count'] as num?)?.toInt() ?? 0,
      pickupsTodayCount: (json['pickups_today_count'] as num?)?.toInt() ?? 0,
      returnsTodayCount: (json['returns_today_count'] as num?)?.toInt() ?? 0,
      pendingConfirmationCount: (json['pending_confirmation_count'] as num?)?.toInt() ?? 0,
      overdueReturnsCount: (json['overdue_returns_count'] as num?)?.toInt() ?? 0,
      totalDepositsHeld: (json['total_deposits_held'] as num?)?.toDouble() ?? 0.0,
      totalFleetCount: (json['total_fleet_count'] as num?)?.toInt() ?? 0,
      rentedFleetCount: (json['rented_fleet_count'] as num?)?.toInt() ?? 0,
      availableFleetCount: (json['available_fleet_count'] as num?)?.toInt() ?? 0,
      currency: json['currency'] ?? 'NPR',
      currencySymbol: json['currency_symbol'] ?? 'Rs.',
    );
  }
}

class RentalChecklist {
  final String id;
  final String bookingId;
  final String checklistType; // pickup, return
  final int odometer;
  final String fuelLevel;
  final String? exteriorCondition;
  final String? interiorCondition;
  final List<String> photos;
  final String? customerSignature;
  final DateTime createdAt;

  RentalChecklist({
    required this.id,
    required this.bookingId,
    required this.checklistType,
    required this.odometer,
    required this.fuelLevel,
    this.exteriorCondition,
    this.interiorCondition,
    this.photos = const [],
    this.customerSignature,
    required this.createdAt,
  });

  factory RentalChecklist.fromJson(Map<String, dynamic> json) {
    return RentalChecklist(
      id: json['id'] ?? '',
      bookingId: json['booking_id'] ?? '',
      checklistType: json['checklist_type'] ?? 'pickup',
      odometer: json['odometer'] ?? 0,
      fuelLevel: json['fuel_level'] ?? '100%',
      exteriorCondition: json['exterior_condition'],
      interiorCondition: json['interior_condition'],
      photos: json['photos'] is List ? List<String>.from(json['photos']) : const [],
      customerSignature: json['customer_signature'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
