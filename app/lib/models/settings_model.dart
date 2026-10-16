class CompanySettingsModel {
  final String companyName;
  final String legalBusinessName;
  final String email;
  final String phone;
  final String address;
  final String panVatNumber;
  final String currency;
  final String currencySymbol;
  final String timezone;
  final String fuelPolicy; // same_to_same, full_to_full
  final double lateFeePerHour;
  final double securityDepositDefault;
  final int minDriverAge;
  final bool enableOnlineBooking;
  final bool requireKycBeforePickup;

  CompanySettingsModel({
    required this.companyName,
    required this.legalBusinessName,
    required this.email,
    required this.phone,
    required this.address,
    required this.panVatNumber,
    this.currency = 'NPR',
    this.currencySymbol = 'Rs.',
    this.timezone = 'Asia/Kathmandu',
    this.fuelPolicy = 'same_to_same',
    this.lateFeePerHour = 250,
    this.securityDepositDefault = 5000,
    this.minDriverAge = 21,
    this.enableOnlineBooking = true,
    this.requireKycBeforePickup = true,
  });

  factory CompanySettingsModel.fromJson(Map<String, dynamic> json) {
    return CompanySettingsModel(
      companyName: json['company_name'] ?? json['name'] ?? 'Himalayan Rides',
      legalBusinessName: json['legal_business_name'] ?? 'Himalayan Rides Pvt. Ltd.',
      email: json['email'] ?? 'support@himalayanrides.com',
      phone: json['phone'] ?? '+977-1-4422331',
      address: json['address'] ?? 'Thamel Marg, Kathmandu, Nepal',
      panVatNumber: json['pan_vat_number'] ?? '609823145',
      currency: json['currency'] ?? 'NPR',
      currencySymbol: json['currency_symbol'] ?? 'Rs.',
      timezone: json['timezone'] ?? 'Asia/Kathmandu',
      fuelPolicy: json['fuel_policy'] ?? 'same_to_same',
      lateFeePerHour: (json['late_fee_per_hour'] ?? 250).toDouble(),
      securityDepositDefault: (json['security_deposit_default'] ?? 5000).toDouble(),
      minDriverAge: json['min_driver_age'] ?? 21,
      enableOnlineBooking: json['enable_online_booking'] ?? true,
      requireKycBeforePickup: json['require_kyc_before_pickup'] ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'company_name': companyName,
    'legal_business_name': legalBusinessName,
    'email': email,
    'phone': phone,
    'address': address,
    'pan_vat_number': panVatNumber,
    'currency': currency,
    'currency_symbol': currencySymbol,
    'timezone': timezone,
    'fuel_policy': fuelPolicy,
    'late_fee_per_hour': lateFeePerHour,
    'security_deposit_default': securityDepositDefault,
    'min_driver_age': minDriverAge,
    'enable_online_booking': enableOnlineBooking,
    'require_kyc_before_pickup': requireKycBeforePickup,
  };
}

class BranchLocationModel {
  final String id;
  final String name;
  final String address;
  final String phone;
  final bool isAirportHub;
  final int activeVehicles;

  BranchLocationModel({
    required this.id,
    required this.name,
    required this.address,
    required this.phone,
    this.isAirportHub = false,
    this.activeVehicles = 0,
  });

  factory BranchLocationModel.fromJson(Map<String, dynamic> json) {
    return BranchLocationModel(
      id: json['id']?.toString() ?? '',
      name: json['name'] ?? 'Branch',
      address: json['address'] ?? '',
      phone: json['phone'] ?? '',
      isAirportHub: json['is_airport_hub'] ?? false,
      activeVehicles: json['active_vehicles'] ?? 0,
    );
  }
}
