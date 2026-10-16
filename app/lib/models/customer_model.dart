class Customer {
  final String id;
  final String tenantId;
  final String customerType; // individual, business, organization
  final String? customerCode;
  final String fullName;
  final String email;
  final String phone;
  final String? secondaryPhone;
  final String nationality;
  final String status; // active, pending_verification, suspended, blacklisted
  final String verificationStatus; // verified, pending, rejected
  final String rentalEligibilityStatus; // eligible, restricted, ineligible
  final String address;
  final String country;
  final String province;
  final String districtCity;
  final String? licenseNumber;
  final String? licenseCategory;
  final String? emergencyContactName;
  final String? emergencyContactRelationship;
  final String? emergencyContactPhone;
  final bool isBlacklisted;
  final String? notes;
  final String? avatarUrl;
  final DateTime createdAt;
  final DateTime updatedAt;

  Customer({
    required this.id,
    required this.tenantId,
    this.customerType = 'individual',
    this.customerCode,
    required this.fullName,
    required this.email,
    required this.phone,
    this.secondaryPhone,
    this.nationality = 'Nepalese',
    this.status = 'active',
    this.verificationStatus = 'pending',
    this.rentalEligibilityStatus = 'eligible',
    this.address = '',
    this.country = 'Nepal',
    this.province = 'Bagmati',
    this.districtCity = 'Kathmandu',
    this.licenseNumber,
    this.licenseCategory,
    this.emergencyContactName,
    this.emergencyContactRelationship,
    this.emergencyContactPhone,
    this.isBlacklisted = false,
    this.notes,
    this.avatarUrl,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isVerified => verificationStatus == 'verified';
  bool get isEligible => rentalEligibilityStatus == 'eligible' && !isBlacklisted;

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] ?? '',
      tenantId: json['tenant_id'] ?? '',
      customerType: json['customer_type'] ?? 'individual',
      customerCode: json['customer_code'],
      fullName: json['full_name'] ?? 'Unknown Customer',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      secondaryPhone: json['secondary_phone'],
      nationality: json['nationality'] ?? 'Nepalese',
      status: json['status'] ?? 'active',
      verificationStatus: json['verification_status'] ?? 'pending',
      rentalEligibilityStatus: json['rental_eligibility_status'] ?? 'eligible',
      address: json['address'] ?? '',
      country: json['country'] ?? 'Nepal',
      province: json['province'] ?? 'Bagmati',
      districtCity: json['district_city'] ?? 'Kathmandu',
      licenseNumber: json['license_number'],
      licenseCategory: json['license_category'],
      emergencyContactName: json['emergency_contact_name'],
      emergencyContactRelationship: json['emergency_contact_relationship'],
      emergencyContactPhone: json['emergency_contact_phone'],
      isBlacklisted: json['is_blacklisted'] ?? false,
      notes: json['notes'],
      avatarUrl: json['avatar_url'] ?? json['profile_photo'],
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at']) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class CustomerDocument {
  final String id;
  final String customerId;
  final String docType; // citizenship, driving_licence, passport
  final String name;
  final String? documentNumber;
  final String fileUrl;
  final DateTime? expiryDate;
  final String status; // valid, expiring_soon, expired
  final String verificationStatus; // verified, pending, rejected

  CustomerDocument({
    required this.id,
    required this.customerId,
    required this.docType,
    required this.name,
    this.documentNumber,
    required this.fileUrl,
    this.expiryDate,
    this.status = 'valid',
    this.verificationStatus = 'pending',
  });

  factory CustomerDocument.fromJson(Map<String, dynamic> json) {
    return CustomerDocument(
      id: json['id'] ?? '',
      customerId: json['customer_id'] ?? '',
      docType: json['doc_type'] ?? 'citizenship',
      name: json['name'] ?? 'Identity Document',
      documentNumber: json['document_number'],
      fileUrl: json['file_url'] ?? '',
      expiryDate: json['expiry_date'] != null
          ? DateTime.tryParse(json['expiry_date'])
          : null,
      status: json['status'] ?? 'valid',
      verificationStatus: json['verification_status'] ?? 'pending',
    );
  }
}

class CustomerDriver {
  final String id;
  final String customerId;
  final String fullName;
  final String phone;
  final String licenseNumber;
  final String licenseCategory;
  final String verificationStatus;

  CustomerDriver({
    required this.id,
    required this.customerId,
    required this.fullName,
    required this.phone,
    required this.licenseNumber,
    required this.licenseCategory,
    this.verificationStatus = 'verified',
  });

  factory CustomerDriver.fromJson(Map<String, dynamic> json) {
    return CustomerDriver(
      id: json['id'] ?? '',
      customerId: json['customer_id'] ?? '',
      fullName: json['full_name'] ?? '',
      phone: json['phone'] ?? '',
      licenseNumber: json['license_number'] ?? '',
      licenseCategory: json['license_category'] ?? 'B',
      verificationStatus: json['verification_status'] ?? 'verified',
    );
  }
}

class RentalEligibility {
  final bool isEligible;
  final String customerKycStatus;
  final bool isBlacklisted;
  final bool driverLicenseValid;
  final List<String> warnings;
  final List<String> errors;

  RentalEligibility({
    required this.isEligible,
    required this.customerKycStatus,
    this.isBlacklisted = false,
    this.driverLicenseValid = true,
    this.warnings = const [],
    this.errors = const [],
  });

  factory RentalEligibility.fromJson(Map<String, dynamic> json) {
    return RentalEligibility(
      isEligible: json['is_eligible'] ?? true,
      customerKycStatus: json['customer_kyc_status'] ?? 'verified',
      isBlacklisted: json['is_blacklisted'] ?? false,
      driverLicenseValid: json['driver_license_valid'] ?? true,
      warnings: json['warnings'] is List ? List<String>.from(json['warnings']) : const [],
      errors: json['errors'] is List ? List<String>.from(json['errors']) : const [],
    );
  }
}
