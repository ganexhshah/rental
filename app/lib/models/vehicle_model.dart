class Vehicle {
  final String id;
  final String tenantId;
  final String? categoryId;
  final String? categoryName;
  final String? locationId;
  final String? locationName;
  final String make;
  final String model;
  final int year;
  final String plateNumber;
  final String vehicleType; // car, bike, scooter
  final String status; // available, rented, maintenance, reserved, retired
  final int odometer;
  final String fuelType; // petrol, diesel, electric, hybrid
  final String transmission; // automatic, manual
  final int seatingCapacity;
  final double dailyRate;
  final double weeklyRate;
  final double monthlyRate;
  final double depositAmount;
  final int allowedKmPerDay;
  final double extraKmRate;
  final String? primaryPhoto;
  final List<String> photos;
  final Map<String, dynamic>? specs;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  Vehicle({
    required this.id,
    required this.tenantId,
    this.categoryId,
    this.categoryName,
    this.locationId,
    this.locationName,
    required this.make,
    required this.model,
    required this.year,
    required this.plateNumber,
    this.vehicleType = 'car',
    required this.status,
    required this.odometer,
    this.fuelType = 'petrol',
    this.transmission = 'manual',
    this.seatingCapacity = 5,
    required this.dailyRate,
    this.weeklyRate = 0.0,
    this.monthlyRate = 0.0,
    required this.depositAmount,
    this.allowedKmPerDay = 250,
    this.extraKmRate = 25.0,
    this.primaryPhoto,
    this.photos = const [],
    this.specs,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  String get displayName => '$make $model';
  String get category => categoryName ?? vehicleType;
  String get registrationNumber => plateNumber;
  int get odometerReading => odometer;
  bool get isAvailable => status == 'available';
  bool get isRented => status == 'rented';
  bool get isInMaintenance => status == 'maintenance';

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'] ?? '',
      tenantId: json['tenant_id'] ?? '',
      categoryId: json['category_id'],
      categoryName: json['category_name'] ?? 'Standard Fleet',
      locationId: json['location_id'],
      locationName: json['location_name'] ?? 'Kathmandu Hub',
      make: json['make'] ?? '',
      model: json['model'] ?? 'Vehicle',
      year: json['year'] ?? 2024,
      plateNumber: json['plate_number'] ?? '—',
      vehicleType: json['vehicle_type'] ?? 'car',
      status: json['status'] ?? 'available',
      odometer: json['odometer'] ?? 0,
      fuelType: json['fuel_type'] ?? 'petrol',
      transmission: json['transmission'] ?? 'manual',
      seatingCapacity: json['seating_capacity'] ?? 5,
      dailyRate: (json['daily_rate'] as num?)?.toDouble() ?? 0.0,
      weeklyRate: (json['weekly_rate'] as num?)?.toDouble() ?? 0.0,
      monthlyRate: (json['monthly_rate'] as num?)?.toDouble() ?? 0.0,
      depositAmount: (json['deposit_amount'] as num?)?.toDouble() ?? 0.0,
      allowedKmPerDay: json['allowed_km_per_day'] ?? 250,
      extraKmRate: (json['extra_km_rate'] as num?)?.toDouble() ?? 25.0,
      primaryPhoto: json['primary_photo'],
      photos: json['photos'] is List ? List<String>.from(json['photos']) : const [],
      specs: json['specs'] is Map ? Map<String, dynamic>.from(json['specs']) : null,
      notes: json['notes'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class VehicleCategory {
  final String id;
  final String name;
  final String slug;
  final String vehicleType;
  final double defaultDailyRate;
  final double defaultDeposit;
  final String? description;

  VehicleCategory({
    required this.id,
    required this.name,
    required this.slug,
    required this.vehicleType,
    required this.defaultDailyRate,
    this.defaultDeposit = 5000.0,
    this.description,
  });

  factory VehicleCategory.fromJson(Map<String, dynamic> json) {
    return VehicleCategory(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      vehicleType: json['vehicle_type']?.toString() ?? json['vehicleType']?.toString() ?? 'car',
      defaultDailyRate: (json['base_daily_rate'] ?? json['default_daily_rate'] ?? json['daily_rate'] ?? json['baseDailyRate'] as num?)?.toDouble() ?? 0.0,
      defaultDeposit: (json['default_deposit'] ?? json['deposit_amount'] ?? json['defaultDeposit'] as num?)?.toDouble() ?? 5000.0,
      description: json['description']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id.isNotEmpty) 'id': id,
      'name': name,
      'slug': slug.isNotEmpty ? slug : name.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]'), '-'),
      'vehicle_type': vehicleType,
      'base_daily_rate': defaultDailyRate,
      'description': description ?? '',
    };
  }
}

class VehicleLocation {
  final String id;
  final String name;
  final String code;
  final String address;
  final String city;
  final String? country;
  final String phone;
  final bool isActive;
  final int activeVehiclesCount;

  VehicleLocation({
    required this.id,
    required this.name,
    required this.code,
    required this.address,
    required this.city,
    this.country = 'Nepal',
    required this.phone,
    this.isActive = true,
    this.activeVehiclesCount = 0,
  });

  factory VehicleLocation.fromJson(Map<String, dynamic> json) {
    return VehicleLocation(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      city: json['city']?.toString() ?? 'Kathmandu',
      country: json['country']?.toString() ?? 'Nepal',
      phone: json['phone']?.toString() ?? '',
      isActive: json['is_active'] == true || json['isActive'] == true || json['is_active'] == null,
      activeVehiclesCount: (json['active_vehicles_count'] ?? json['activeVehiclesCount'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id.isNotEmpty) 'id': id,
      'name': name,
      'code': code,
      'address': address,
      'city': city,
      if (country != null) 'country': country,
      'phone': phone,
      'is_active': isActive,
    };
  }
}

class VehicleDocument {
  final String id;
  final String vehicleId;
  final String? vehiclePlate;
  final String? vehicleName;
  final String docType; // bluebook, insurance, road_tax, pollution, permit, fitness, other
  final String name;
  final String? documentNumber;
  final String? issuingAuthority;
  final String fileUrl;
  final DateTime? issueDate;
  final DateTime? expiryDate;
  final String status; // valid, expiring_soon, expired
  final String verificationStatus; // verified, pending, rejected
  final String? notes;

  VehicleDocument({
    required this.id,
    required this.vehicleId,
    this.vehiclePlate,
    this.vehicleName,
    required this.docType,
    required this.name,
    this.documentNumber,
    this.issuingAuthority,
    required this.fileUrl,
    this.issueDate,
    this.expiryDate,
    this.status = 'valid',
    this.verificationStatus = 'verified',
    this.notes,
  });

  bool get isExpired => status == 'expired';
  bool get isExpiringSoon => status == 'expiring_soon';
  bool get isVerified => verificationStatus == 'verified';

  factory VehicleDocument.fromJson(Map<String, dynamic> json) {
    return VehicleDocument(
      id: json['id'] ?? '',
      vehicleId: json['vehicle_id'] ?? '',
      vehiclePlate: json['vehicle_plate'],
      vehicleName: json['vehicle_name'],
      docType: json['doc_type'] ?? 'bluebook',
      name: json['name'] ?? 'Vehicle Document',
      documentNumber: json['document_number'],
      issuingAuthority: json['issuing_authority'],
      fileUrl: json['file_url'] ?? '',
      issueDate: json['issue_date'] != null ? DateTime.tryParse(json['issue_date']) : null,
      expiryDate: json['expiry_date'] != null ? DateTime.tryParse(json['expiry_date']) : null,
      status: json['status'] ?? 'valid',
      verificationStatus: json['verification_status'] ?? 'pending',
      notes: json['notes'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id.isNotEmpty) 'id': id,
      'vehicle_id': vehicleId,
      'doc_type': docType,
      'name': name,
      if (documentNumber != null) 'document_number': documentNumber,
      if (issuingAuthority != null) 'issuing_authority': issuingAuthority,
      'file_url': fileUrl.isNotEmpty ? fileUrl : 'https://storage.rental.app/docs/sample.pdf',
      if (issueDate != null) 'issue_date': issueDate!.toIso8601String(),
      if (expiryDate != null) 'expiry_date': expiryDate!.toIso8601String(),
      'status': status,
      'verification_status': verificationStatus,
      if (notes != null) 'notes': notes,
    };
  }
}

class DamageRecord {
  final String id;
  final String vehicleId;
  final String? bookingId;
  final String description;
  final String severity; // minor, moderate, severe
  final double estimatedCost;
  final String status; // reported, under_repair, repaired
  final List<String> photos;
  final DateTime reportedAt;

  DamageRecord({
    required this.id,
    required this.vehicleId,
    this.bookingId,
    required this.description,
    required this.severity,
    required this.estimatedCost,
    required this.status,
    this.photos = const [],
    required this.reportedAt,
  });

  factory DamageRecord.fromJson(Map<String, dynamic> json) {
    return DamageRecord(
      id: json['id'] ?? '',
      vehicleId: json['vehicle_id'] ?? '',
      bookingId: json['booking_id'],
      description: json['description'] ?? '',
      severity: json['severity'] ?? 'minor',
      estimatedCost: (json['estimated_cost'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'reported',
      photos: json['photos'] is List ? List<String>.from(json['photos']) : const [],
      reportedAt: json['reported_at'] != null
          ? DateTime.tryParse(json['reported_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

typedef VehicleModel = Vehicle;
